import { WalletProcessor } from './wallet.processor';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WalletProcessor', () => {
  let processor: WalletProcessor;
  let walletRepository: any;
  let transactionRepository: any;
  let idempotencyLogRepository: any;
  ``;
  let cacheManager: any;

  beforeEach(() => {
    walletRepository = {
      manager: {
        transaction: (cb: any) =>
          cb({
            findOne: jest.fn().mockResolvedValue({
              id: 'wallet1',
              balance: 100,
              updatedAt: new Date(),
              toString: function () {
                return this.balance.toString();
              },
            }),
            save: jest.fn(),
            update: jest.fn(),
          }),
      },
    };
    transactionRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tx1',
        status: 'PENDING',
        amount: 50,
        type: 'deposit',
        save: jest.fn(),
      }),
      update: jest.fn(),
      save: jest.fn(),
    };
    idempotencyLogRepository = {
      findOne: jest.fn().mockResolvedValue(undefined),
      update: jest.fn(),
    };
    cacheManager = { del: jest.fn() };
    processor = new WalletProcessor(
      walletRepository,
      transactionRepository,
      idempotencyLogRepository,
      cacheManager,
    );
  });

  it('should process a successful deposit', async () => {
    const data = {
      transactionId: 'tx1',
      walletId: 'wallet1',
      amount: 50,
      clientTransactionId: 'client-tx-1',
    };
    const result = await processor.handleDepositJob(data);
    expect(result).toEqual({ status: 'completed', transactionId: 'tx1' });
    expect(cacheManager.del).toHaveBeenCalled();
  });

  it('should throw on withdrawal if insufficient funds', async () => {
    walletRepository.manager = {
      transaction: (cb: any) =>
        cb({
          findOne: jest.fn().mockResolvedValue({
            id: 'wallet1',
            balance: 10,
            updatedAt: new Date(),
            toString: function () {
              return this.balance.toString();
            },
          }),
          save: jest.fn(),
          update: jest.fn(),
        }),
    };
    const data = {
      transactionId: 'tx2',
      walletId: 'wallet1',
      amount: 100,
      clientTransactionId: 'client-tx-2',
    };
    transactionRepository.findOne = jest.fn().mockResolvedValue({
      id: 'tx2',
      status: 'PENDING',
      amount: 100,
      type: 'withdrawal',
      save: jest.fn(),
    });
    await expect(processor.handleWithdrawalJob(data)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw NotFoundException if wallet does not exist', async () => {
    walletRepository.manager = {
      transaction: (cb: any) =>
        cb({
          findOne: jest.fn().mockResolvedValue(undefined), // wallet not found
          save: jest.fn(),
          update: jest.fn(),
        }),
    };
    const data = {
      transactionId: 'tx3',
      walletId: 'wallet-not-exist',
      amount: 50,
      clientTransactionId: 'client-tx-3',
    };
    transactionRepository.findOne = jest.fn().mockResolvedValue({
      id: 'tx3',
      status: 'PENDING',
      amount: 50,
      type: 'deposit',
      save: jest.fn(),
    });
    await expect(processor.handleDepositJob(data)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException for zero deposit amount', async () => {
    walletRepository.manager = {
      transaction: (cb: any) =>
        cb({
          findOne: jest.fn().mockResolvedValue({
            id: 'wallet1',
            balance: 100,
            updatedAt: new Date(),
            toString: function () {
              return this.balance.toString();
            },
          }),
          save: jest.fn(),
          update: jest.fn(),
        }),
    };
    const data = {
      transactionId: 'tx4',
      walletId: 'wallet1',
      amount: 0,
      clientTransactionId: 'client-tx-4',
    };
    transactionRepository.findOne = jest.fn().mockResolvedValue({
      id: 'tx4',
      status: 'PENDING',
      amount: 0,
      type: 'deposit',
      save: jest.fn(),
    });
    await expect(processor.handleDepositJob(data)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should update transaction and idempotency log status on success', async () => {
    const loggerLogSpy = jest.spyOn(processor['logger'], 'log');
    transactionRepository.findOne = jest.fn().mockResolvedValue({
      id: 'tx6',
      status: 'PENDING',
      amount: 100,
      type: 'transfer',
      save: jest.fn(),
    });
    idempotencyLogRepository.findOne = jest.fn().mockResolvedValue(undefined);
    const senderWallet = {
      id: 'wallet1',
      balance: 200,
      toString: function () {
        return this.balance.toString();
      },
    };
    const receiverWallet = {
      id: 'wallet2',
      balance: 50,
      toString: function () {
        return this.balance.toString();
      },
    };
    walletRepository.manager = {
      transaction: async (cb: any) => {
        await cb({
          findOne: jest
            .fn()
            .mockImplementationOnce(() => Promise.resolve(senderWallet))
            .mockImplementationOnce(() => Promise.resolve(receiverWallet)),
          save: jest.fn(),
          update: jest.fn(),
        });
      },
    };
    const data = {
      transactionId: 'tx6',
      senderWalletId: 'wallet1',
      receiverWalletId: 'wallet2',
      clientTransactionId: 'client-tx-6',
      amount: '100',
    };
    const result = await processor.handleTransferJob(data);
    expect(result).toEqual({ status: 'completed', transactionId: 'tx6' });
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Transfer completed for sender wallet1 to receiver wallet2',
      ),
    );
  });
  it('should skip deposit if idempotency log indicates it is already processed', async () => {
    idempotencyLogRepository.findOne = jest.fn().mockResolvedValue({
      clientTransactionId: 'client-tx-1',
      status: 'COMPLETED',
    });

    const data = {
      transactionId: 'tx1',
      walletId: 'wallet1',
      amount: 50,
      clientTransactionId: 'client-tx-1',
    };

    const result = await processor.handleDepositJob(data);

    expect(result).toEqual({ status: 'completed', transactionId: 'tx1' });
    expect(transactionRepository.update).not.toHaveBeenCalled();
  });
  it('should throw BadRequestException for unsupported transaction type', async () => {
    transactionRepository.findOne = jest.fn().mockResolvedValue({
      id: 'tx7',
      status: 'PENDING',
      amount: 50,
      type: 'invalid_type',
      save: jest.fn(),
    });

    const data = {
      transactionId: 'tx7',
      walletId: 'wallet1',
      amount: 50,
      clientTransactionId: 'client-tx-7',
    };

    await expect(processor.handleDepositJob(data)).rejects.toThrow(
      BadRequestException,
    );
  });
});
