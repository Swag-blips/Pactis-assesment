import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class createWalletDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance: number;
}

export class depositFundsDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsUUID()
  walletId: string;
}
