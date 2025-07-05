import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateWalletDto,
  DepositFundsDto,
  TransferFundsDto,
  WithDrawFundsDto,
} from './dto/wallet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyLog } from './entities/idempotency.entity';

@Injectable()
export class WalletService {
  private readonly logger = new Logger();
  constructor(
    @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(IdempotencyLog)
    private idempotencyLogRepository: Repository<IdempotencyLog>,
  ) {}
  async createWallet(createWalletDto: CreateWalletDto): Promise<Wallet> {
    const newWallet = this.walletRepository.create({
      balance: createWalletDto.balance,
    });

    const savedWallet = await this.walletRepository.save(newWallet);
    this.logger.log(`Wallet created with ID: ${savedWallet.id}`);
    return savedWallet;
  }

  async depositFunds(depositFundsDto: DepositFundsDto): Promise<Wallet> {
    const wallet = await this.findWalletOrThrow(depositFundsDto.walletId);

    const currentBalance = parseFloat(wallet.balance.toString());
    const depositAmount = parseFloat(depositFundsDto.amount.toString());
    wallet.balance = parseFloat((currentBalance + depositAmount).toFixed(2));

    const updatedBalance = await this.walletRepository.save(wallet);

    return updatedBalance;
  }

  async withDrawFunds(withDrawFundsDto: WithDrawFundsDto): Promise<Wallet> {
    const wallet = await this.findWalletOrThrow(withDrawFundsDto.walletId);

    const currentBalance = parseFloat(wallet.balance.toString());
    const withdrawAmount = parseFloat(withDrawFundsDto.amount.toString());

    if (withdrawAmount <= 0) {
      throw new BadRequestException(
        'Withdraw amount must be greater than zero',
      );
    }

    if (currentBalance < withdrawAmount) {
      throw new BadRequestException('Insufficient funds');
    }

    wallet.balance = parseFloat((currentBalance - withdrawAmount).toFixed(2));

    const updatedWallet = await this.walletRepository.save(wallet);

    return updatedWallet;
  }
  async transferFunds(transferFundsDto: TransferFundsDto) {
    const { senderWalletId, receiverWalletId, amount, transactionId } = transferFundsDto;


    const existing = await this.idempotencyLogRepository.findOne({ where: { transactionId } });
    this.logger.log('existing', existing);
    if (existing?.status === 'SUCCESS') {
      this.logger.log(`Idempotent hit: ${transactionId}`);
      return existing.responsePayload;
    }

    let resultPayload: any;

    await this.walletRepository.manager.transaction(async (entityManager) => {
     
      try {
        await entityManager.insert(IdempotencyLog, {
          transactionId,
          status: 'PROCESSING',
        });
      } catch (err) {
        
        if (!err?.code || err.code !== '23505') { 
          throw err;
        }
      }

  
      const senderWallet = await entityManager.findOne(Wallet, {
        where: { id: senderWalletId },
        lock: { mode: 'pessimistic_write' },
      });
      const receiverWallet = await entityManager.findOne(Wallet, {
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
        throw new BadRequestException('Transfer amount must be greater than zero');
      }
      if (senderBalance < transferAmount) {
        throw new BadRequestException('Insufficient funds');
      }

      senderWallet.balance = parseFloat((senderBalance - transferAmount).toFixed(2));
      receiverWallet.balance = parseFloat((receiverBalance + transferAmount).toFixed(2));

      await entityManager.save([senderWallet, receiverWallet]);

      const transaction = await entityManager.save(Transaction, {
        amount: transferAmount,
        type: 'transfer',
        senderWallet,
        receiverWallet,
      });

      resultPayload = {
        transaction,
        senderWallet: { id: senderWallet.id, balance: senderWallet.balance },
        receiverWallet: {
          id: receiverWallet.id,
          balance: receiverWallet.balance,
        },
      };


      await entityManager.update(IdempotencyLog, { transactionId }, {
        status: 'SUCCESS',
        responsePayload: resultPayload,
      });
    });

    return resultPayload;
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
