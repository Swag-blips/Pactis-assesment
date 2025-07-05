import { Body, Controller, Logger, Post } from '@nestjs/common';
import { createWalletDto, depositFundsDto } from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger();
  constructor(private walletService: WalletService) {}
  @Post('/create')
  async createWallet(@Body() createWalletDto: createWalletDto) {
    try {
      this.logger.log('create wallet endpoint hit');
      const wallet = await this.walletService.createWallet(createWalletDto);
      return {
        success: true,
        message: 'Wallet created successfully',
        data: wallet.id,
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Error creating wallet',
        error: error.message,
      };
    }
  }

  @Post('/deposit')
  async depositFunds(@Body() depositFundsDto: depositFundsDto) {
    this.logger.log('deposit funds endpoint hit');
    try {
      const deposit = await this.walletService.depositFunds(depositFundsDto);
      return {
        success: true,
        message: 'Funds deposited successfully',
        data: deposit.balance,
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'error depositing funds',
        error: error.message,
      };
    }
  }
}
