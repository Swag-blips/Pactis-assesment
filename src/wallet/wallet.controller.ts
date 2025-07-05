import { Body, Controller, Logger, Post } from '@nestjs/common';
import {
  CreateWalletDto,
  DepositFundsDto,
  WithDrawFundsDto,
} from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger();
  constructor(private walletService: WalletService) {}
  @Post('/create')
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
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
  async depositFunds(@Body() depositFundsDto: DepositFundsDto) {
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

  @Post('/withdraw')
  async withDrawFundsDto(@Body() withdrawFundsDto: WithDrawFundsDto) {
    this.logger.log('withdrawing funds endpoint hit');
    try {
      const withdrawal = await this.walletService.withDrawFundsDto(withdrawFundsDto);
      return {
        success: true,
        message: 'Funds withdrawn successfully',
        data: withdrawal.balance,
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'error withdrawing funds',
        error: error.message,
      };
    }
  }
}
