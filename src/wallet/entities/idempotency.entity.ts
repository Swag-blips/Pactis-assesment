import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class IdempotencyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transactionId: string;

  @Column()
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';

  @Column('jsonb', { nullable: true })
  responsePayload: any;

  @CreateDateColumn()
  createdAt: Date;
}
