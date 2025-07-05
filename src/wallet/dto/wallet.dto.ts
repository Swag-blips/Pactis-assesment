import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({
    example: 100.0,
    description: 'The amount to deposit. Must be a number ending in .00.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance: number;
}

export class DepositFundsDto {
  @ApiProperty({
    example: 100.0,
    description: 'The amount to deposit. Must be a number ending in .00.',
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @IsUUID()
  walletId: string;

  @IsUUID()
  transactionId: string;
}

export class WithDrawFundsDto {
  @ApiProperty({
    example: 100.0,
    description: 'The amount to deposit. Must be a number ending in .00.',
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @IsUUID()
  walletId: string;

  @IsUUID()
  transactionId: string;
}

export class TransferFundsDto {
  @ApiProperty({
    example: 100.0,
    description: 'The amount to transfer. Must be a positive number.',
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: 'b3e1c2d4-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
    description: 'The UUID of the sender wallet.',
  })
  @IsUUID()
  senderWalletId: string;

  @ApiProperty({
    example: 'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'The UUID of the receiver wallet.',
  })
  @IsUUID()
  receiverWalletId: string;

  @ApiProperty({
    example: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
    description: 'The UUID of the idempotency transaction.',
  })
  @IsUUID()
  transactionId: string;
}

export class GetTransactionsDto {
  @IsUUID()
  walletId: string;
}
