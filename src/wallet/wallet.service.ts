import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { createWalletDto } from './dto/wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger();
  async createWallet(createWalletDto: createWalletDto) {
    const walletId = uuidv4();
  }
}
