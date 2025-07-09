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
  TransferFundsDto,
  WithDrawFundsDto,
} from './dto/wallet.dto';
import { WalletService } from './wallet.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Wallet')

@Controller('wallet')
export class WalletController { 
  private readonly logger = new Logger();
  constructor(private walletService: WalletService) {}

  @Post('/create')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
        error: 'Bad request',
        message: ['property should exist'],
        statusCode: 400,
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Deposit funds into a wallet' })
  @ApiBody({ type: DepositFundsDto })
  @ApiResponse({  
    status: 200,
    description: 'Deposit request queued successfully',
    schema: {
      example: {
        status: 'queued',     
        transactionId: 'uuid-string',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    schema: {
      example: {
        error: 'Bad request',
        message: ['property should exist'],
        statusCode: 400,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found',
    schema: {
      example: {
        message: 'Wallet not found',
        error: 'Not Found',
        statusCode: 404,
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
      throw error;
    }
  }

  @Post('/withdraw')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Withdraw funds from a wallet' })
  @ApiBody({ type: WithDrawFundsDto })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request queued successfully',
    schema: {
      example: {
        status: 'queued',
        transactionId: 'uuid-string',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    schema: {
      example: {
        error: 'Bad request',
        message: ['property should exist'],
        statusCode: 400,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found',
    schema: {
      example: {
        message: 'Wallet not found',
        error: 'Not Found',
        statusCode: 404,
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
      throw error;
    }
  }

  @Post('/transfer')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Transfer funds between wallets' })
  @ApiBody({ type: TransferFundsDto })
  @ApiResponse({
    status: 200,
    description: 'Transfer request queued successfully',
    schema: {
      example: {
        status: 'queued',
        transactionId: 'uuid-string',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    schema: {
      example: {
        error: 'Bad request',
        message: ['property should exist'],
        statusCode: 400,
      },
    },
  })
  @ApiNotFoundResponse({
    description: ' wallet not found',
    schema: {
      example: {
        message: 'Receiver wallet not found',
        error: 'Not Found',
        statusCode: 404,
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
        ...transfer,
      };
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }
  @Get('/transactions/:walletId')
  @ApiOperation({ summary: 'Retrieve transactions for a wallet' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Transactions found',
        transactions: {
          data: [
            {
              id: 'txn-1234',
              type: 'deposit',
              status: 'SUCCESS',
              amount: 1000,
              createdAt: '2024-07-06T10:00:00.000Z',
            },
          ],
          total: 1,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid take/skip parameters',
    schema: {
      example: {
        success: false,
        message: 'error retrieving transactions',
        error: 'take must be a number',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found',
    schema: {
      example: {
        message: 'Wallet not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  async retrieveTransactionsForWallet(
    @Param('walletId') walletId: string,
    @Query('take') take: number,
    @Query('skip') skip: number,
  ) {
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
      this.logger.error(error.message);
      throw error;
    }
  }
}
