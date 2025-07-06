import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyLog } from './entities/idempotency.entity';

import { BullModule } from '@nestjs/bullmq';
import { WalletProcessor } from './jobs/wallet.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, IdempotencyLog]),
    BullModule.registerQueue({
      name: 'wallet-queue',
      connection: {
        host: process.env.REDIS_HOST,
        port: 6379,
      },

      defaultJobOptions: {
        priority: 1,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletProcessor],
})
export class WalletModule {}
