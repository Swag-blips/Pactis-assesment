import { IsNumber, IsOptional, Min } from 'class-validator';

export class createWalletDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance: number;
}

export class depositFundsDto {
  @IsNumber()
  amount: number;
}
