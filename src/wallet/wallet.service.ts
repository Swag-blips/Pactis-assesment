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

  async withDrawFundsDto(withDrawFundsDto: WithDrawFundsDto): Promise<Wallet> {
    const wallet = await this.findWalletOrThrow(withDrawFundsDto.walletId);

    const currentBalance = parseFloat(wallet.balance.toString());
    const withdrawAmount = parseFloat(withDrawFundsDto.amount.toString());

    if (withdrawAmount <= 0) {
      throw new BadRequestException('Withdraw amount must be greater than zero');
    }

    if (currentBalance < withdrawAmount) {
      throw new BadRequestException('Insufficient funds');
    }

    wallet.balance = parseFloat((currentBalance - withdrawAmount).toFixed(2));

    const updatedWallet = await this.walletRepository.save(wallet);

    return updatedWallet;
  }

  private async findWalletOrThrow(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }
}
