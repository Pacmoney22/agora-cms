import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

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
  v4: jest.fn().mockReturnValue('test-uuid-inv'),
}));

jest.mock('@agora-cms/shared', () => ({
  EVENTS: {
    INVENTORY_UPDATED: 'inventory.updated',
    INVENTORY_LOW: 'inventory.low',
  },
}));

import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { ProductService } from '../../src/modules/products/product.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockProductService = {
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => undefined),
  };

  const mockProductWithVariants = {
    id: 'prod-1',
    sku: 'SKU-001',
    name: 'Test Product',
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
      {
        variantId: 'v-2',
        sku: 'SKU-001-BLUE',
        inventory: {
          tracked: true,
          quantity: 5,
          lowStockThreshold: 10,
          allowBackorder: true,
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    (service as any).kafkaProducer = null;
    jest.clearAllMocks();
  });

  const freshProduct = () => structuredClone(mockProductWithVariants);

  describe('getInventory', () => {
    it('should return inventory levels for all variants', async () => {
      mockProductService.findById.mockResolvedValue(freshProduct());

      const result = await service.getInventory('prod-1');

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('prod-1');
      expect(result[0].variantId).toBe('v-1');
      expect(result[0].quantity).toBe(50);
      expect(result[0].isLowStock).toBe(false);
      expect(result[1].isLowStock).toBe(true);
    });

    it('should return empty array for product without variants', async () => {
      mockProductService.findById.mockResolvedValue({
        ...mockProductWithVariants,
        variants: [],
      });

      const result = await service.getInventory('prod-1');

      expect(result).toEqual([]);
    });

    it('should return empty array for product with null variants', async () => {
      mockProductService.findById.mockResolvedValue({
        ...mockProductWithVariants,
        variants: null,
      });

      const result = await service.getInventory('prod-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateVariantInventory', () => {
    it('should update variant inventory quantity', async () => {
      mockProductService.findById.mockResolvedValue(freshProduct());
      mockProductService.update.mockResolvedValue({});

      const result = await service.updateVariantInventory('prod-1', 'v-1', {
        quantity: 100,
      });

      expect(result.quantity).toBe(100);
      expect(result.isLowStock).toBe(false);
    });

    it('should update allowBackorder and lowStockThreshold', async () => {
      mockProductService.findById.mockResolvedValue(freshProduct());
      mockProductService.update.mockResolvedValue({});

      const result = await service.updateVariantInventory('prod-1', 'v-1', {
        quantity: 50,
        allowBackorder: true,
        lowStockThreshold: 20,
      });

      expect(result.allowBackorder).toBe(true);
      expect(result.lowStockThreshold).toBe(20);
    });

    it('should throw NotFoundException for non-existent variant', async () => {
      mockProductService.findById.mockResolvedValue(freshProduct());

      await expect(
        service.updateVariantInventory('prod-1', 'nonexistent', { quantity: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should detect and report low stock', async () => {
      mockProductService.findById.mockResolvedValue(freshProduct());
      mockProductService.update.mockResolvedValue({});

      const result = await service.updateVariantInventory('prod-1', 'v-1', {
        quantity: 5,
      });

      expect(result.isLowStock).toBe(true);
    });
  });

  describe('getLowStockItems', () => {
    it('should return variants with low stock', async () => {
      mockProductService.findAll.mockResolvedValue({
        data: [freshProduct()],
      });

      const result = await service.getLowStockItems();

      expect(result).toHaveLength(1);
      expect(result[0].variantId).toBe('v-2');
      expect(result[0].isLowStock).toBe(true);
    });

    it('should use custom threshold when provided', async () => {
      mockProductService.findAll.mockResolvedValue({
        data: [freshProduct()],
      });

      const result = await service.getLowStockItems(60);

      // Both variants have quantity <= 60
      expect(result).toHaveLength(2);
    });

    it('should skip products without variants', async () => {
      mockProductService.findAll.mockResolvedValue({
        data: [{ ...mockProductWithVariants, variants: null }],
      });

      const result = await service.getLowStockItems();

      expect(result).toEqual([]);
    });

    it('should skip untracked variants', async () => {
      mockProductService.findAll.mockResolvedValue({
        data: [{
          ...mockProductWithVariants,
          variants: [
            {
              variantId: 'v-3',
              sku: 'SKU-UNTRACKED',
              inventory: {
                tracked: false,
                quantity: 0,
                lowStockThreshold: 10,
                allowBackorder: false,
              },
            },
          ],
        }],
      });

      const result = await service.getLowStockItems();

      expect(result).toEqual([]);
    });
  });
});
