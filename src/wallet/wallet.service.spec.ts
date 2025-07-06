import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyLog } from './entities/idempotency.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WalletController } from './wallet.controller';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: jest.Mocked<Repository<Wallet>>;
  let controller: WalletController;

  const transactionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const idempotencyRepo = {
    findOne: jest.fn(),
    insert: jest.fn(),
  };

  const queue = {
    add: jest.fn(),
  };

  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepo,
        },
        {
          provide: getRepositoryToken(IdempotencyLog),
          useValue: idempotencyRepo,
        },
        {
          provide: 'BullQueue_wallet-queue',
          useValue: queue,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cache,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepo = module.get(getRepositoryToken(Wallet));
    controller = module.get<WalletController>(WalletController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a wallet with default balance 0', async () => {
    const walletData = { balance: 0 };
    const walletResult = {
      id: 'id-1',
      balance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    walletRepo.create.mockReturnValue(walletData as Wallet);
    walletRepo.save.mockResolvedValue(walletResult as Wallet);

    const result = await service.createWallet({ balance: 0 });

    expect(walletRepo.create).toHaveBeenCalledWith({ balance: 0 });
    expect(walletRepo.save).toHaveBeenCalledWith(walletData);
    expect(result).toEqual(walletResult);
  });

  it('should create wallet with given balance', async () => {
    const walletData = { balance: 1500.75 };
    const walletResult = {
      id: 'id-2',
      balance: 1500.75,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    walletRepo.create.mockReturnValue(walletData as Wallet);
    walletRepo.save.mockResolvedValue(walletResult as Wallet);

    const result = await service.createWallet({ balance: 1500.75 });

    expect(walletRepo.create).toHaveBeenCalledWith({ balance: 1500.75 });
    expect(result.balance).toBe(1500.75);
  });

  describe('depositFunds', () => {
    const dto = {
      walletId: 'wallet-id',
      amount: 500,
      clientTransactionId: 'txn-1',
    };

    const mockWallet = { id: 'wallet-id' } as Wallet;

    beforeEach(() => {
      walletRepo.findOne.mockReset();
      transactionRepo.create.mockReset();
      transactionRepo.save.mockReset();
      idempotencyRepo.findOne.mockReset();
      idempotencyRepo.insert.mockReset();
      queue.add.mockReset();
    });

    it('should throw NotFoundException if wallet not found', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(service.depositFunds(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return success if transaction already processed', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      idempotencyRepo.findOne.mockResolvedValue({ status: 'SUCCESS' });

      const result = await service.depositFunds(dto);
      expect(result.status).toBe('success');
      expect(result.transactionId).toBe(dto.clientTransactionId);
    });

    it('should throw ConflictException if idempotency insert fails', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      idempotencyRepo.findOne.mockResolvedValue(null);
      idempotencyRepo.insert.mockRejectedValue({ code: '23505' });

      await expect(service.depositFunds(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create transaction and queue deposit job', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      idempotencyRepo.findOne.mockResolvedValue(null);
      idempotencyRepo.insert.mockResolvedValue({});
      transactionRepo.create.mockReturnValue({ id: 'txn-id' });
      transactionRepo.save.mockResolvedValue({});

      const result = await service.depositFunds(dto);

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deposit',
          receiverWallet: { id: dto.walletId },
          status: 'PENDING',
          amount: dto.amount,
        }),
      );

      expect(queue.add).toHaveBeenCalledWith(
        'deposit',
        expect.objectContaining({
          walletId: dto.walletId,
          amount: dto.amount,
          clientTransactionId: dto.clientTransactionId,
        }),
        expect.objectContaining({
          delay: 5000,
          attempts: 3,
        }),
      );

      expect(result.status).toBe('queued');
      expect(result.transactionId).toBe('txn-id');
    });
  });

  describe('withDrawFunds', () => {
    const dto = {
      walletId: 'wallet-id',
      amount: 200,
      clientTransactionId: 'withdraw-txn-1',
    };
    const mockWallet = { id: 'wallet-id' } as Wallet;

    beforeEach(() => {
      walletRepo.findOne.mockReset();
      transactionRepo.create.mockReset();
      transactionRepo.save.mockReset();
      idempotencyRepo.findOne.mockReset();
      idempotencyRepo.insert.mockReset();
      queue.add.mockReset();
    });

    it('should throw NotFoundException if wallet not found', async () => {
      walletRepo.findOne.mockResolvedValue(null);
      await expect(service.withDrawFunds(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return success if transaction already processed', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      idempotencyRepo.findOne.mockResolvedValue({ status: 'SUCCESS' });
      const result = await service.withDrawFunds(dto);
      expect(result.status).toBe('success');
      expect(result.transactionId).toBe(dto.clientTransactionId);
    });

    it('should throw ConflictException if idempotency insert fails', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      idempotencyRepo.findOne.mockResolvedValue(null);
      idempotencyRepo.insert.mockRejectedValue({ code: '23505' });
      await expect(service.withDrawFunds(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create transaction and queue withdrawal job', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      idempotencyRepo.findOne.mockResolvedValue(null);
      idempotencyRepo.insert.mockResolvedValue({});
      transactionRepo.create.mockReturnValue({ id: 'withdraw-txn-id' });
      transactionRepo.save.mockResolvedValue({});

      const result = await service.withDrawFunds(dto);

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'withdrawal',
          senderWallet: { id: dto.walletId },
          status: 'PENDING',
          amount: dto.amount,
        }),
      );

      expect(queue.add).toHaveBeenCalledWith(
        'withdrawal',
        expect.objectContaining({
          walletId: dto.walletId,
          amount: dto.amount,
          clientTransactionId: dto.clientTransactionId,
        }),
        expect.objectContaining({
          delay: 5000,
          attempts: 3,
        }),
      );

      expect(result.status).toBe('queued');
      expect(result.transactionId).toBe('withdraw-txn-id');
    });
  });

  describe('transferFunds', () => {
    const dto = {
      senderWalletId: 'wallet-1',
      receiverWalletId: 'wallet-2',
      amount: 100,
      clientTransactionId: 'transfer-txn-1',
    };
    const mockSenderWallet = { id: 'wallet-1' } as Wallet;
    const mockReceiverWallet = { id: 'wallet-2' } as Wallet;

    beforeEach(() => {
      walletRepo.findOne.mockReset();
      transactionRepo.create.mockReset();
      transactionRepo.save.mockReset();
      idempotencyRepo.findOne.mockReset();
      idempotencyRepo.insert.mockReset();
      queue.add.mockReset();
    });

    it('should return success if transaction already processed', async () => {
      idempotencyRepo.findOne.mockResolvedValue({ status: 'SUCCESS' });
      const result = await service.transferFunds(dto);
      expect(result.status).toBe('success');
      expect(result.transactionId).toBe(dto.clientTransactionId);
    });

    it('should throw ConflictException if idempotency insert fails', async () => {
      idempotencyRepo.findOne.mockResolvedValue(null);
      idempotencyRepo.insert.mockRejectedValue({ code: '23505' });
      await expect(service.transferFunds(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create transaction and queue transfer job', async () => {
      idempotencyRepo.findOne.mockResolvedValue(null);
      idempotencyRepo.insert.mockResolvedValue({});
      transactionRepo.create.mockReturnValue({ id: 'transfer-txn-id' });
      transactionRepo.save.mockResolvedValue({});

      const result = await service.transferFunds(dto);

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transfer',
          senderWallet: { id: dto.senderWalletId },
          receiverWallet: { id: dto.receiverWalletId },
          status: 'PENDING',
          amount: dto.amount,
        }),
      );

      expect(queue.add).toHaveBeenCalledWith(
        'transfer',
        expect.objectContaining({
          senderWalletId: dto.senderWalletId,
          receiverWalletId: dto.receiverWalletId,
          amount: dto.amount,
          clientTransactionId: dto.clientTransactionId,
        }),
        expect.objectContaining({
          delay: 5000,
          attempts: 3,
        }),
      );

      expect(result.status).toBe('queued');
      expect(result.transactionId).toBe('transfer-txn-id');
    });
  });
});
