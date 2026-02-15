import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { LicenseKeyService } from '../../src/modules/license-keys/license-key.service';

describe('LicenseKeyService', () => {
  let service: LicenseKeyService;

  const mockPool = {
    id: 'pool-1',
    productId: 'prod-1',
    name: 'Test Pool',
    keys: [
      { id: 'key-1', status: 'available', keyValue: 'AAA-111' },
      { id: 'key-2', status: 'allocated', keyValue: 'BBB-222' },
    ],
    createdAt: new Date('2024-01-01'),
  };

  const mockKey = {
    id: 'key-1',
    poolId: 'pool-1',
    keyValue: 'AAA-111',
    status: 'available',
    orderId: null,
    allocatedAt: null,
    expiresAt: null,
    createdAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    licenseKeyPool: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    licenseKey: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseKeyService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LicenseKeyService>(LicenseKeyService);
    jest.clearAllMocks();
  });

  describe('createPool', () => {
    it('should create a license key pool', async () => {
      mockPrisma.licenseKeyPool.create.mockResolvedValue({
        ...mockPool,
        keys: [],
      });

      const result = await service.createPool({
        productId: 'prod-1',
        name: 'Test Pool',
      });

      expect(result.id).toBe('pool-1');
      expect(result.productId).toBe('prod-1');
      expect(result.name).toBe('Test Pool');
      expect(result.totalKeys).toBe(0);
      expect(result.availableKeys).toBe(0);
    });
  });

  describe('listPools', () => {
    it('should return all pools when no filter provided', async () => {
      mockPrisma.licenseKeyPool.findMany.mockResolvedValue([mockPool]);

      const result = await service.listPools();

      expect(result).toHaveLength(1);
      expect(result[0].totalKeys).toBe(2);
      expect(result[0].availableKeys).toBe(1); // only 'available' status
    });

    it('should filter by productId', async () => {
      mockPrisma.licenseKeyPool.findMany.mockResolvedValue([mockPool]);

      await service.listPools('prod-1');

      expect(mockPrisma.licenseKeyPool.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        include: { keys: true },
      });
    });

    it('should return empty array when no pools exist', async () => {
      mockPrisma.licenseKeyPool.findMany.mockResolvedValue([]);

      const result = await service.listPools();

      expect(result).toEqual([]);
    });
  });

  describe('addKeysToPool', () => {
    it('should add keys to an existing pool', async () => {
      mockPrisma.licenseKeyPool.findUnique.mockResolvedValue(mockPool);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.licenseKey.count.mockResolvedValue(5);

      const result = await service.addKeysToPool('pool-1', ['KEY-1', 'KEY-2', 'KEY-3']);

      expect(result.added).toBe(3);
      expect(result.total).toBe(5);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for non-existent pool', async () => {
      mockPrisma.licenseKeyPool.findUnique.mockResolvedValue(null);

      await expect(
        service.addKeysToPool('nonexistent', ['KEY-1']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('claimKey', () => {
    it('should claim an available key from the pool', async () => {
      mockPrisma.licenseKey.findFirst.mockResolvedValue(mockKey);
      mockPrisma.licenseKey.update.mockResolvedValue({
        ...mockKey,
        status: 'allocated',
        orderId: 'order-1',
        allocatedAt: new Date(),
      });

      const result = await service.claimKey('pool-1', 'order-1', 'li-1');

      expect(result.status).toBe('allocated');
      expect(result.orderId).toBe('order-1');
    });

    it('should throw BadRequestException when no keys available', async () => {
      mockPrisma.licenseKey.findFirst.mockResolvedValue(null);

      await expect(
        service.claimKey('pool-1', 'order-1', 'li-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findKeyById', () => {
    it('should return key when found', async () => {
      mockPrisma.licenseKey.findUnique.mockResolvedValue(mockKey);

      const result = await service.findKeyById('key-1');

      expect(result.id).toBe('key-1');
      expect(result.keyValue).toBe('AAA-111');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.licenseKey.findUnique.mockResolvedValue(null);

      await expect(service.findKeyById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeKey', () => {
    it('should revoke an active key', async () => {
      mockPrisma.licenseKey.findUnique.mockResolvedValue({
        ...mockKey,
        status: 'allocated',
      });
      mockPrisma.licenseKey.update.mockResolvedValue({
        ...mockKey,
        status: 'revoked',
      });

      const result = await service.revokeKey('key-1', 'Fraud');

      expect(result.status).toBe('revoked');
    });

    it('should throw NotFoundException for non-existent key', async () => {
      mockPrisma.licenseKey.findUnique.mockResolvedValue(null);

      await expect(service.revokeKey('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already revoked key', async () => {
      mockPrisma.licenseKey.findUnique.mockResolvedValue({
        ...mockKey,
        status: 'revoked',
      });

      await expect(service.revokeKey('key-1')).rejects.toThrow(BadRequestException);
    });
  });
});
