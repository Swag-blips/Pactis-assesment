import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyLog } from './entities/idempotency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Transaction, IdempotencyLog])],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
