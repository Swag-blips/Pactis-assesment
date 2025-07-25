import { Job } from 'bullmq';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { IdempotencyLog } from '../entities/idempotency.entity';
import {
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';

import {
  DepositJobData,
  WithdrawalJobData,
  TransferJobData,
} from '../types/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Processor('wallet-queue', { concurrency: 5 })
export class WalletProcessor extends WorkerHost {
  private readonly logger = new Logger(WalletProcessor.name);

  constructor(
    @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(IdempotencyLog)
    private idempotencyLogRepository: Repository<IdempotencyLog>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { name, data } = job;
    this.logger.log(`Processing job: ${name}`);
    if (name === 'withdrawal') {
      return await this.handleWithdrawalJob(data);
    }
    if (name === 'deposit') {
      return await this.handleDepositJob(data);
    }
    if (name === 'transfer') {
      return await this.handleTransferJob(data);
    }
    return null;
  }
  async handleTransferJob(data: TransferJobData) {
    const {
      transactionId,
      senderWalletId,
      receiverWalletId,
      clientTransactionId,
      amount,
    } = data;

    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id: transactionId },
      });

      this.logger.log('TRANSACTION', transaction);
      if (!transaction) throw new NotFoundException('Transaction not found');
      if (transaction.type !== 'transfer') {
        throw new BadRequestException(
          `Invalid transaction type: expected 'transfer', got '${transaction.type}'`,
        );
      }

      const idempotency = await this.idempotencyLogRepository.findOne({
        where: { clientTransactionId },
      });
      if (idempotency?.status === 'SUCCESS') {
        this.logger.log(`Already processed`);
        return idempotency.responsePayload;
      }

      await this.walletRepository.manager.transaction(async (em) => {
        const senderWallet = await em.findOne(Wallet, {
          where: { id: senderWalletId },
          lock: { mode: 'pessimistic_write' },
        }); 
        const receiverWallet = await em.findOne(Wallet, {
          where: { id: receiverWalletId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!senderWallet || !receiverWallet) {
          throw new NotFoundException('Sender or receiver wallet not found');
        }

        const senderBalance = parseFloat(senderWallet.balance.toString());
        const receiverBalance = parseFloat(receiverWallet.balance.toString());
        const transferAmount = parseFloat(amount.toString());

        if (transferAmount <= 0) {
          throw new BadRequestException(
            'Transfer amount must be greater than zero',
          );
        }
        if (senderBalance < transferAmount) {
          throw new BadRequestException('Insufficient funds');
        }

        senderWallet.balance = parseFloat(
          (senderBalance - transferAmount).toFixed(2),
        );
        receiverWallet.balance = parseFloat(
          (receiverBalance + transferAmount).toFixed(2),
        );

        await em.save([senderWallet, receiverWallet]);
        await this.invalidateTransactionCache(senderWallet.id);
        await this.invalidateTransactionCache(receiverWallet.id);

        transaction.status = 'SUCCESS'; 
        await em.save(transaction);

        await em.update(
          IdempotencyLog,
          { clientTransactionId },
          {
            status: 'SUCCESS',
            responsePayload: {
              transaction: {
                id: transaction.id,
                amount: transaction.amount,
                type: transaction.type,
              },
              senderWallet: {
                id: senderWallet.id,
              },
              receiverWallet: {
                id: receiverWallet.id,
              },
            } as any,
          },
        );
      });

      this.logger.log(
        `Transfer completed for sender ${senderWalletId} to receiver ${receiverWalletId}`,
      ); 
      return { status: 'completed', transactionId };
    } catch (err) {
      this.logger.error(
        `Transfer failed for tx ${transactionId}: ${err.message}`,
      );

      await this.markTransactionAsFailed(
        transactionId,
        clientTransactionId,
        err,
      );

      throw err;
    }
  }

  async handleDepositJob(data: DepositJobData) {
    const { transactionId, walletId, amount, clientTransactionId } = data;

    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id: transactionId },
      });
      if (!transaction) throw new NotFoundException('Transaction not found');
      if (transaction.type !== 'deposit') {
        throw new BadRequestException(
          `Invalid transaction type: expected 'deposit', got '${transaction.type}'`,
        );
      } 

      const idempotency = await this.idempotencyLogRepository.findOne({
        where: { clientTransactionId },
      });
      if (idempotency?.status === 'SUCCESS') {
        this.logger.log(`Already processed`);
        return idempotency.responsePayload; 
      }

      await this.walletRepository.manager.transaction(async (em) => {
        const wallet = await em.findOne(Wallet, {
          where: { id: walletId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) throw new NotFoundException('Wallet not found');

        const currentBalance = parseFloat(wallet.balance.toString());
        const depositAmount = parseFloat(amount.toString());
        if (depositAmount <= 0) {
          throw new BadRequestException('Deposit must be greater than 0');
        }

        wallet.balance = parseFloat(
          (currentBalance + depositAmount).toFixed(2),
        );
        await em.save(wallet);

        await this.cacheManager.del(`wallets:${wallet.id}`);

        transaction.status = 'SUCCESS';
        await em.save(transaction);

        await em.update(
          IdempotencyLog,
          { clientTransactionId },
          {
            status: 'SUCCESS',
            responsePayload: {
              id: wallet.id,
              balance: wallet.balance,
              updatedAt: wallet.updatedAt,
            } as any,
          },
        );
      });

      this.logger.log(`Deposit completed for wallet ${walletId}`);
      return { status: 'completed', transactionId };
    } catch (err) {
      this.logger.error(
        `Deposit failed for tx ${transactionId}: ${err.message}`,
      );

      await this.markTransactionAsFailed(
        transactionId,
        clientTransactionId,
        err,
      );

      throw err;
    }
  }

  private async invalidateTransactionCache(walletId: string): Promise<void> {
    const cacheKey = `transactions:${walletId}:all`;
    await this.cacheManager.del(cacheKey);
    this.logger.log(`Cache invalidated for wallet ${walletId}`);
  }

  async handleWithdrawalJob(data: WithdrawalJobData) {
    const { transactionId, walletId, amount, clientTransactionId } = data;
    this.logger.log('Withdrawal job');

    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id: transactionId },
      }); 
      if (!transaction) throw new NotFoundException('Transaction not found');
      if (transaction.type !== 'withdrawal') {
        throw new BadRequestException(
          `Invalid transaction type: expected 'withdrawal', got '${transaction.type}'`,
        );
      }

      const idempotency = await this.idempotencyLogRepository.findOne({
        where: { clientTransactionId },
      });

      if (idempotency?.status === 'SUCCESS') {
        this.logger.log(`Already processed`);
        return idempotency.responsePayload;
      }

      await this.walletRepository.manager.transaction(async (em) => {
        const wallet = await em.findOne(Wallet, {
          where: { id: walletId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) throw new NotFoundException('Wallet not found');

        const currentBalance = parseFloat(wallet.balance.toString());
        const withdrawAmount = parseFloat(amount.toString());
        if (withdrawAmount <= 0) {
          throw new BadRequestException('Withdraw amount must be greater 0');
        }
        if (currentBalance < withdrawAmount) {
          throw new BadRequestException('Insufficient funds');
        }

        wallet.balance = parseFloat(
          (currentBalance - withdrawAmount).toFixed(2),
        );
        await em.save(wallet);

        await this.cacheManager.del(`wallets:${wallet.id}`);

        transaction.status = 'SUCCESS';
        await em.save(transaction);

        await em.update(
          IdempotencyLog,
          { clientTransactionId },
          {
            status: 'SUCCESS',
            responsePayload: {
              id: wallet.id,
              balance: wallet.balance,
              updatedAt: wallet.updatedAt,
            } as any,
          },
        );
      });

      this.logger.log(`Withdrawal completed for wallet ${walletId}`);
      return { status: 'completed', transactionId };
    } catch (err) {
      this.logger.error(
        `Withdrawal failed for tx ${transactionId}: ${err.message}`,
      );
      await this.markTransactionAsFailed(
        transactionId,
        clientTransactionId,
        err,
      );

      throw err;
    }
  }

  private async markTransactionAsFailed(
    transactionId: string,
    clientTransactionId: string,
    error: Error,
  ) {
    const payload = {
      errorMessage: error.message,
      errorName: error.name,
    };
    await this.transactionRepository.update(transactionId, {
      status: 'FAILED',
      errorMessage: error.message,
    }); 

    await this.idempotencyLogRepository.update(
      { clientTransactionId },
      {
        status: 'FAILED',
        responsePayload: payload as any,
      },
    );

    this.logger.error(`Transaction ${transactionId} failed: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job failed: ${job.id}, reason: ${err.message}`);
  }
}
