import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyLog } from './entities/idempotency.entity';

import { BullModule } from '@nestjs/bullmq';
import { WalletProcessor } from './jobs/wallet.processor';
import { CacheableMemory, Keyv } from 'cacheable';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, IdempotencyLog]),
    CacheModule.registerAsync({
      useFactory: async () => {
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            createKeyv('redis://localhost:6379'),
          ],
        };
      },
    }),

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
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    WalletProcessor,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class WalletModule {}
