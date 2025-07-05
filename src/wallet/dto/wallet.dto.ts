import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateWalletDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance: number;
}

export class DepositFundsDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsUUID()
  walletId: string;
}

export class WithDrawFundsDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsUUID()
  walletId: string;
}

export class TransferFundsDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsUUID()
  senderWalletId: string;

  @IsUUID()
  receiverWalletId: string;

  @IsUUID()
  transactionId: string;
}
