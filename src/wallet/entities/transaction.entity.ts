import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['deposit', 'withdrawal', 'transfer'] })
  type: TransactionType;

  @ManyToOne(() => Wallet, { nullable: true })
  senderWallet?: Wallet;

  @ManyToOne(() => Wallet, { nullable: true })
  receiverWallet?: Wallet;

  @CreateDateColumn()
  timestamp: Date;
}
