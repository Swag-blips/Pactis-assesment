import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
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

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'SUCCESS' | 'FAILED';

  @Index()
  @ManyToOne(() => Wallet, { nullable: true })
  senderWallet?: Wallet;
  @Index()
  @ManyToOne(() => Wallet, { nullable: true })
  receiverWallet?: Wallet;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;
  @CreateDateColumn()
  timestamp: Date;
}
