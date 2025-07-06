import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateWalletDto,
  DepositFundsDto,
  TransferFundsDto,
  WithDrawFundsDto,
} from './dto/wallet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Wallet } from './entities/wallet.entity';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyLog } from './entities/idempotency.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class WalletService {
  private readonly logger = new Logger();
  constructor(
    @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(IdempotencyLog)
    private idempotencyLogRepository: Repository<IdempotencyLog>,
    @InjectQueue('wallet-queue') private walletQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async createWallet(createWalletDto: CreateWalletDto): Promise<Wallet> {
    const newWallet = this.walletRepository.create({
      balance: createWalletDto.balance,
    });

    const savedWallet = await this.walletRepository.save(newWallet);
    this.logger.log(`Wallet created with ID: ${savedWallet.id}`);
    await this.cacheManager.set(
      `wallets:${savedWallet.id}`,
      JSON.stringify(savedWallet),
    );
    return savedWallet;
  }

  async depositFunds(
    depositFundsDto: DepositFundsDto,
  ): Promise<{ status: string; transactionId: string }> {
    const { walletId, amount, clientTransactionId } = depositFundsDto;

    await this.findWalletOrThrow(walletId);

    const existing = await this.idempotencyLogRepository.findOne({
      where: { transactionId: clientTransactionId },
    });
    if (existing?.status === 'SUCCESS') {
      return { status: 'success', transactionId: clientTransactionId };
    }
    try {
      await this.idempotencyLogRepository.insert({
        transactionId: clientTransactionId,
        status: 'PROCESSING',
      });
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictException('Transaction is being processed');
      }
      throw err;
    }

    const transaction = this.transactionRepository.create({
      amount,
      type: 'deposit',
      receiverWallet: { id: walletId },
      status: 'PENDING',
    });
    await this.transactionRepository.save(transaction);

    await this.walletQueue.add(
      'deposit',
      {
        transactionId: transaction.id,
        clientTransactionId,
        walletId,
        amount,
      },
      {
        priority: 1,
        delay: 5000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    return {
      status: 'queued',
      transactionId: transaction.id,
    };
  }

  async withDrawFunds(
    dto: WithDrawFundsDto,
  ): Promise<{ status: string; transactionId: string }> {
    const { walletId, amount, clientTransactionId } = dto;

    await this.findWalletOrThrow(walletId);

    const existing = await this.idempotencyLogRepository.findOne({
      where: { transactionId: clientTransactionId },
    });

    if (existing?.status === 'SUCCESS') {
      return { status: 'success', transactionId: clientTransactionId };
    }

    try {
      await this.idempotencyLogRepository.insert({
        transactionId: clientTransactionId,
        status: 'PROCESSING',
      });
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictException('Transaction is being processed');
      }
      throw err;
    }

    const transaction = this.transactionRepository.create({
      amount,
      type: 'withdrawal',
      senderWallet: { id: walletId },
      status: 'PENDING',
    });
    await this.transactionRepository.save(transaction);

    await this.walletQueue.add(
      'withdrawal',
      {
        transactionId: transaction.id,
        clientTransactionId,
        walletId,
        amount,
      },
      {
        priority: 1,
        delay: 5000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    return {
      status: 'queued',
      transactionId: transaction.id,
    };
  }

  async transferFunds(
    transferFundsDto: TransferFundsDto,
  ): Promise<{ status: string; transactionId: string }> {
    const { senderWalletId, receiverWalletId, amount, clientTransactionId } =
      transferFundsDto;

    const existing = await this.idempotencyLogRepository.findOne({
      where: { transactionId: clientTransactionId },
    });
    if (existing?.status === 'SUCCESS') {
      return { status: 'success', transactionId: clientTransactionId };
    }
    try {
      await this.idempotencyLogRepository.insert({
        transactionId: clientTransactionId,
        status: 'PROCESSING',
      });
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictException('Transaction is being processed');
      }
      throw err;
    }

    const transaction = this.transactionRepository.create({
      amount,
      type: 'transfer',
      senderWallet: { id: senderWalletId },
      receiverWallet: { id: receiverWalletId },
      status: 'PENDING',
    });
    await this.transactionRepository.save(transaction);

    await this.walletQueue.add(
      'transfer',
      {
        transactionId: transaction.id,
        clientTransactionId,
        senderWalletId,
        receiverWalletId,
        amount,
      },
      {
        priority: 1,
        delay: 5000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    return {
      status: 'queued',
      transactionId: transaction.id,
    };
  }

  async getTransactions(
    walletId: string,
    take: number,
    skip: number,
  ): Promise<{ data: Transaction[]; total: number }> {
    const wallet = await this.findWalletOrThrow(walletId);

    const cacheKey = `transactions:${walletId}:take:${take || 10}:skip:${skip || 0}`;
    const cachedTransactions: string | undefined =
      await this.cacheManager.get(cacheKey);
    if (cachedTransactions) {
      this.logger.log('serving from cache');
      return JSON.parse(cachedTransactions);
    }
    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: [
          { receiverWallet: { id: wallet.id } },
          { senderWallet: { id: wallet.id } },
        ],
        relations: ['senderWallet', 'receiverWallet'],
        order: { timestamp: 'DESC' },
        take: take || 10,
        skip: skip || 0,
      },
    );

    await this.cacheManager.set(
      cacheKey,
      JSON.stringify({ data: transactions, total }),
    );
    this.logger.log('transactions', transactions);
    return { data: transactions, total };
  }
  private async findWalletOrThrow(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }
}
