import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
@Index(['clientTransactionId'], { unique: true })
export class IdempotencyLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clientTransactionId: string;

  @Column()
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';

  @Column('jsonb', { nullable: true })
  responsePayload: any;

  @CreateDateColumn()
  createdAt: Date;
}
