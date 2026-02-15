import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    }),
  })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-res'),
}));

jest.mock('@agora-cms/shared', () => ({
  EVENTS: {
    INVENTORY_RESERVED: 'inventory.reserved',
  },
}));

import { ReservationService } from '../../src/modules/inventory/reservation.service';
import { ProductService } from '../../src/modules/products/product.service';

describe('ReservationService', () => {
  let service: ReservationService;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incrby: jest.fn(),
    decrby: jest.fn(),
    scan: jest.fn(),
  };

  const mockPrisma = {
    product: {
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(() => undefined),
  };

  const mockProductService = {
    findById: jest.fn(),
  };

  const mockProductWithVariants = {
    id: 'prod-1',
    sku: 'SKU-001',
    variants: [
      {
        variantId: 'v-1',
        sku: 'SKU-001-RED',
        inventory: {
          tracked: true,
          quantity: 50,
          lowStockThreshold: 10,
          allowBackorder: false,
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: 'REDIS', useValue: mockRedis },
        { provide: 'PRISMA', useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    (service as any).kafkaProducer = null;
    jest.clearAllMocks();
  });

  describe('reserve', () => {
    it('should create a reservation for available items', async () => {
      mockProductService.findById.mockResolvedValue(mockProductWithVariants);
      mockRedis.get.mockResolvedValue(null); // no existing reservations
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.incrby.mockResolvedValue(2);

      const result = await service.reserve([
        { productId: 'prod-1', variantId: 'v-1', quantity: 2 },
      ]);

      expect(result.reservationId).toBe('test-uuid-res');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'reservation:test-uuid-res',
        expect.any(String),
        'EX',
        900, // 15 minutes
      );
      expect(mockRedis.incrby).toHaveBeenCalledWith('reserved:prod-1:v-1', 2);
    });

    it('should throw BadRequestException for empty items', async () => {
      await expect(service.reserve([])).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      mockProductService.findById.mockResolvedValue(mockProductWithVariants);
      mockRedis.get.mockResolvedValue('45'); // 45 already reserved, only 5 available

      await expect(
        service.reserve([
          { productId: 'prod-1', variantId: 'v-1', quantity: 10 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default key when variantId is not provided', async () => {
      mockProductService.findById.mockResolvedValue(mockProductWithVariants);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.incrby.mockResolvedValue(1);

      await service.reserve([
        { productId: 'prod-1', quantity: 1 },
      ]);

      expect(mockRedis.incrby).toHaveBeenCalledWith('reserved:prod-1:default', 1);
    });
  });

  describe('confirm', () => {
    it('should confirm a reservation and decrement inventory', async () => {
      const reservationData = {
        reservationId: 'res-1',
        items: [{ productId: 'prod-1', variantId: 'v-1', quantity: 2 }],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'reservation:res-1') {
          return JSON.stringify(reservationData);
        }
        if (key === 'reserved:prod-1:v-1') {
          return '0';
        }
        return null;
      });
      mockRedis.decrby.mockResolvedValue(0);
      mockRedis.del.mockResolvedValue(1);
      mockProductService.findById.mockResolvedValue(mockProductWithVariants);
      mockPrisma.product.update.mockResolvedValue({});

      await service.confirm('res-1');

      expect(mockPrisma.product.update).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith('reserved:prod-1:v-1');
      expect(mockRedis.del).toHaveBeenCalledWith('reservation:res-1');
    });

    it('should throw NotFoundException for non-existent reservation', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.confirm('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel a reservation and release reserved counts', async () => {
      const reservationData = {
        reservationId: 'res-1',
        items: [{ productId: 'prod-1', variantId: 'v-1', quantity: 2 }],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'reservation:res-1') {
          return JSON.stringify(reservationData);
        }
        if (key === 'reserved:prod-1:v-1') {
          return '0';
        }
        return null;
      });
      mockRedis.decrby.mockResolvedValue(0);
      mockRedis.del.mockResolvedValue(1);

      await service.cancel('res-1');

      expect(mockRedis.decrby).toHaveBeenCalledWith('reserved:prod-1:v-1', 2);
      expect(mockRedis.del).toHaveBeenCalledWith('reserved:prod-1:v-1');
      expect(mockRedis.del).toHaveBeenCalledWith('reservation:res-1');
    });

    it('should throw NotFoundException for non-existent reservation', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should not delete reserved key when count is still positive', async () => {
      const reservationData = {
        reservationId: 'res-1',
        items: [{ productId: 'prod-1', variantId: 'v-1', quantity: 2 }],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'reservation:res-1') {
          return JSON.stringify(reservationData);
        }
        if (key === 'reserved:prod-1:v-1') {
          return '5'; // still positive
        }
        return null;
      });
      mockRedis.decrby.mockResolvedValue(5);
      mockRedis.del.mockResolvedValue(1);

      await service.cancel('res-1');

      // Should not delete the reserved key (still positive), only the reservation key
      expect(mockRedis.del).toHaveBeenCalledWith('reservation:res-1');
      // The reserved key should NOT be deleted since val > 0
    });
  });

  describe('getReservedQuantity', () => {
    it('should return reserved quantity from Redis', async () => {
      mockRedis.get.mockResolvedValue('10');

      const result = await service.getReservedQuantity('prod-1', 'v-1');

      expect(result).toBe(10);
    });

    it('should return 0 when no reservation exists', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getReservedQuantity('prod-1', 'v-1');

      expect(result).toBe(0);
    });

    it('should return 0 for negative values', async () => {
      mockRedis.get.mockResolvedValue('-2');

      const result = await service.getReservedQuantity('prod-1', 'v-1');

      expect(result).toBe(0);
    });
  });

  describe('getAvailableQuantity', () => {
    it('should return stock minus reserved', async () => {
      mockProductService.findById.mockResolvedValue(mockProductWithVariants);
      mockRedis.get.mockResolvedValue('10');

      const result = await service.getAvailableQuantity('prod-1', 'v-1');

      expect(result).toBe(40); // 50 stock - 10 reserved
    });

    it('should return 0 when all stock is reserved', async () => {
      mockProductService.findById.mockResolvedValue(mockProductWithVariants);
      mockRedis.get.mockResolvedValue('50');

      const result = await service.getAvailableQuantity('prod-1', 'v-1');

      expect(result).toBe(0);
    });

    it('should return 0 when over-reserved', async () => {
      mockProductService.findById.mockResolvedValue(mockProductWithVariants);
      mockRedis.get.mockResolvedValue('100');

      const result = await service.getAvailableQuantity('prod-1', 'v-1');

      expect(result).toBe(0);
    });
  });

  describe('cleanupStaleReservations', () => {
    it('should clean up stale reservation keys with zero or negative values', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['reserved:prod-1:v-1', 'reserved:prod-2:v-2']]);
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'reserved:prod-1:v-1') return '0';
        if (key === 'reserved:prod-2:v-2') return '-1';
        return null;
      });
      mockRedis.del.mockResolvedValue(2);

      await service.cleanupStaleReservations();

      expect(mockRedis.del).toHaveBeenCalledWith('reserved:prod-1:v-1', 'reserved:prod-2:v-2');
    });

    it('should not delete keys with positive values', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['reserved:prod-1:v-1']]);
      mockRedis.get.mockResolvedValue('5');

      await service.cleanupStaleReservations();

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle empty scan results', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]);

      await service.cleanupStaleReservations();

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
