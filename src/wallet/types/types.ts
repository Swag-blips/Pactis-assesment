export interface DepositJobData {
  transactionId: string;
  walletId: string;
  amount: number;
  clientTransactionId: string;
}

export interface WithdrawalJobData {
  transactionId: string;
  walletId: string;
  amount: number;
  clientTransactionId: string;
}

export interface TransferJobData {
  transactionId: string;
  senderWalletId: string;
  receiverWalletId: string;
  amount: string;
  clientTransactionId: string;
}