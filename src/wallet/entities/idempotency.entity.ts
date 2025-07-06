import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class IdempotencyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  clientTransactionId: string;

  @Column()
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';

  @Column('jsonb', { nullable: true })
  responsePayload: any;

  @CreateDateColumn()
  createdAt: Date;
}
