import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateWalletDto,
  DepositFundsDto,
  GetTransactionsDto,
  TransferFundsDto,
  WithDrawFundsDto,
} from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger();
  constructor(private walletService: WalletService) {}

  @Post('/create')
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiBody({ type: CreateWalletDto })
  @ApiCreatedResponse({
    description: 'Wallet created successfully',
    schema: {
      example: {
        success: true,
        message: 'Wallet created successfully',
        data: 'uuid-string',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    schema: {
      example: {
        success: false,
        message: 'Error creating wallet',
        error: 'Validation failed',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Wallet creation conflict',
    schema: {
      example: {
        success: false,
        message: 'Error creating wallet',
        error: 'Conflict',
      },
    },
  })
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
  @ApiOperation({ summary: 'Deposit funds into a wallet' })
  @ApiBody({ type: DepositFundsDto })
  @ApiResponse({
    status: 200,
    description: 'Deposit request queued successfully',
    schema: {
      example: {
        status: 'queued',
        message: 'Deposit request received and is being processed.',
        transactionId: 'uuid-string',
        expectedState:
          'Check transaction status with this ID after a few seconds.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Deposit amount must be greater than zero',
    schema: {
      example: {
        success: false,
        message: 'error depositing funds',
        error: 'Deposit amount must be greater than zero',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found',
    schema: {
      example: {
        success: false,
        message: 'error depositing funds',
        error: 'Wallet not found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Transaction is still being processed. Please retry later.',
    schema: {
      example: {
        success: false,
        message: 'error depositing funds',
        error: 'Transaction is still being processed. Please retry later.',
      },
    },
  })
  async depositFunds(@Body() depositFundsDto: DepositFundsDto) {
    this.logger.log('deposit funds endpoint hit');
    try {
      const deposit = await this.walletService.depositFunds(depositFundsDto);
      return {
        ...deposit,
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
  @ApiOperation({ summary: 'Withdraw funds from a wallet' })
  @ApiBody({ type: WithDrawFundsDto })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request queued successfully',
    schema: {
      example: {
        status: 'queued',
        message: 'Withdrawal request received and is being processed.',
        transactionId: 'uuid-string',
        expectedState:
          'Check transaction status with this ID after a few seconds.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Withdraw amount must be greater than zero',
    schema: {
      example: {
        success: false,
        message: 'error withdrawing funds',
        error: 'Withdraw amount must be greater than zero',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found',
    schema: {
      example: {
        success: false,
        message: 'error withdrawing funds',
        error: 'Wallet not found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Transaction is still being processed. Please retry later.',
    schema: {
      example: {
        success: false,
        message: 'error withdrawing funds',
        error: 'Transaction is still being processed. Please retry later.',
      },
    },
  })
  async withDrawFunds(@Body() withdrawFundsDto: WithDrawFundsDto) {
    this.logger.log('withdrawing funds endpoint hit');
    try {
      const withdrawal =
        await this.walletService.withDrawFunds(withdrawFundsDto);
      return {
        ...withdrawal,
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

  @Post('/transfer')
  @ApiOperation({ summary: 'Transfer funds between wallets' })
  @ApiBody({ type: TransferFundsDto })
  @ApiResponse({
    status: 200,
    description: 'Transfer request queued successfully',
    schema: {
      example: {
        status: 'queued',
        message: 'Transfer request received and is being processed.',
        transactionId: 'uuid-string',
        expectedState:
          'Check transaction status with this ID after a few seconds.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Transfer amount must be greater than zero',
    schema: {
      example: {
        success: false,
        message: 'error transfering funds',
        error: 'Transfer amount must be greater than zero',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Sender or receiver wallet not found',
    schema: {
      example: {
        success: false,
        message: 'error transfering funds',
        error: 'Sender or receiver wallet not found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Transaction is still being processed. Please retry later.',
    schema: {
      example: {
        success: false,
        message: 'error transfering funds',
        error: 'Transaction is still being processed. Please retry later.',
      },
    },
  })
  async transferFunds(@Body() transferFundsDto: TransferFundsDto) {
    this.logger.log('transfer funds endpoint hit');
    try {
      const transfer = await this.walletService.transferFunds(transferFundsDto);
      return {
        status: 'queued',
        message: 'Transfer request received and is being processed.',
        transactionId: transfer.transactionId,
        expectedState:
          'Check transaction status with this ID after a few seconds.',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'error transfering funds',
        error: error.message,
      };
    }
  }

  @Get('/transactions/:walletId')
  async retrieveTransactionsForWallet(
    @Param('walletId') walletId: string,
    @Query('take') take: number,
    @Query('skip') skip: number,
  ) {
    this.logger.log('take and skip', take, skip);
    try {
      const transactions = await this.walletService.getTransactions(
        walletId,
        take,
        skip,
      );

      return {
        success: true,
        message: 'Transactions found',
        transactions,
      };
    } catch (error) {
      return {
        success: false,
        message: 'error transfering funds',
        error: error.message,
      };
    }
  }
}
