import { Body, Controller, Logger, Post } from '@nestjs/common';
import { createWalletDto, depositFundsDto } from './dto/wallet.dto';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger();
  @Post('/create')
  async createWallet(@Body() createWalletDto: createWalletDto) {
    this.logger.log('create wallet endpoint hit');
  }

  @Post('/deposit')
  async depositFunds(@Body() depositFundsDto: depositFundsDto) {
    this.logger.log('deposit funds hit');
  }
}
