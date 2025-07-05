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

@Injectable()
export class WalletService {
  private readonly logger = new Logger();
  constructor(
    @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
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
    await this.walletRepository.manager.transaction(async (entityManager) => {
      const senderWallet = await entityManager.findOne(Wallet, {
        where: { id: transferFundsDto.senderWalletId },
        lock: { mode: 'pessimistic_write' },
      });
      const receiverWallet = await entityManager.findOne(Wallet, {
        where: { id: transferFundsDto.receiverWalletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!senderWallet || !receiverWallet) {
        throw new NotFoundException('Sender or receiver wallet not found');
      }

      const senderCurrentBalance = parseFloat(senderWallet.balance.toString());
      const receiverCurrentBalance = parseFloat(
        receiverWallet.balance.toString(),
      );
      const transferAmount = parseFloat(transferFundsDto.amount.toString());

      if (transferAmount <= 0) {
        throw new BadRequestException(
          'Transfer amount must be greater than zero',
        );
      }

      if (senderCurrentBalance < transferAmount) {
        throw new BadRequestException('Insufficient funds');
      }

      senderWallet.balance = parseFloat(
        (senderCurrentBalance - transferAmount).toFixed(2),
      );
      receiverWallet.balance = parseFloat(
        (receiverCurrentBalance + transferAmount).toFixed(2),
      );

      await entityManager.save([senderWallet, receiverWallet]);
    });
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
