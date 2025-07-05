import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { createWalletDto, depositFundsDto } from './dto/wallet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Repository } from 'typeorm';

@Injectable()
export class WalletService {
  private readonly logger = new Logger();
  constructor(
    @InjectRepository(Wallet) private walletRepository: Repository<Wallet>,
  ) {}
  async createWallet(createWalletDto: createWalletDto): Promise<Wallet> {
    const newWallet = this.walletRepository.create({
      balance: createWalletDto.balance,
    });

    const savedWallet = await this.walletRepository.save(newWallet);
    this.logger.log(`Wallet created with ID: ${savedWallet.id}`);
    return savedWallet;
  }

  async depositFunds(depositFundsDto: depositFundsDto): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: depositFundsDto.walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const currentBalance = parseFloat(wallet.balance.toString());
    const depositAmount = parseFloat(depositFundsDto.amount.toString());
    wallet.balance = parseFloat((currentBalance + depositAmount).toFixed(2));

    const updatedBalance = await this.walletRepository.save(wallet);

    return updatedBalance;
  }
}
