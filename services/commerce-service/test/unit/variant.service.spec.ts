import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { VariantService } from '../../src/modules/variants/variant.service';

describe('VariantService', () => {
  let service: VariantService;

  const mockVariant = {
    variantId: 'v-1',
    sku: 'SKU-001-RED',
    attributes: { color: 'red' },
    priceOverride: null,
    salePrice: null,
    inventory: {
      tracked: true,
      quantity: 50,
      lowStockThreshold: 10,
      allowBackorder: false,
    },
    weight: 500,
    dimensions: null,
    images: [],
    status: 'active',
    barcode: null,
  };

  const mockProductRow = {
    id: 'prod-1',
    variants: [
      mockVariant,
      {
        variantId: 'v-2',
        sku: 'SKU-001-BLUE',
        attributes: { color: 'blue' },
        priceOverride: null,
        salePrice: null,
        inventory: {
          tracked: true,
          quantity: 30,
          lowStockThreshold: 10,
          allowBackorder: false,
        },
        weight: 500,
        dimensions: null,
        images: [],
        status: 'active',
        barcode: null,
      },
    ],
  };

  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VariantService>(VariantService);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a variant across all products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProductRow]);

      const result = await service.findById('v-1');

      expect(result.productId).toBe('prod-1');
      expect(result.variant.variantId).toBe('v-1');
      expect(result.variant.sku).toBe('SKU-001-RED');
    });

    it('should throw NotFoundException when variant not found', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProductRow]);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle products with null variants', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-2', variants: null },
        mockProductRow,
      ]);

      const result = await service.findById('v-1');

      expect(result.productId).toBe('prod-1');
    });

    it('should throw NotFoundException when no products have variants', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-2', variants: null },
      ]);

      await expect(service.findById('v-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no products exist', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await expect(service.findById('v-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateById', () => {
    it('should update a variant by its variantId', async () => {
      // findById calls findMany
      mockPrisma.product.findMany.mockResolvedValue([mockProductRow]);
      // updateById calls findUnique to get the product
      mockPrisma.product.findUnique.mockResolvedValue(mockProductRow);
      mockPrisma.product.update.mockResolvedValue({});

      const result = await service.updateById('v-1', { sku: 'SKU-001-RED-NEW' });

      expect(result.sku).toBe('SKU-001-RED-NEW');
      expect(result.variantId).toBe('v-1');
      expect(mockPrisma.product.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for non-existent variant', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProductRow]);

      await expect(
        service.updateById('nonexistent', { sku: 'NEW' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if product is missing on second lookup', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProductRow]);
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.updateById('v-1', { sku: 'NEW' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeById', () => {
    it('should remove a variant by its variantId', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProductRow]);
      mockPrisma.product.findUnique.mockResolvedValue(mockProductRow);
      mockPrisma.product.update.mockResolvedValue({});

      await service.removeById('v-1');

      expect(mockPrisma.product.update).toHaveBeenCalledTimes(1);
      // The update should only contain v-2 (v-1 is removed)
      const updateCall = mockPrisma.product.update.mock.calls[0][0];
      const updatedVariants = updateCall.data.variants;
      expect(updatedVariants).toHaveLength(1);
      expect(updatedVariants[0].variantId).toBe('v-2');
    });

    it('should throw NotFoundException for non-existent variant', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProductRow]);

      await expect(service.removeById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if product is missing on second lookup', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProductRow]);
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.removeById('v-1')).rejects.toThrow(NotFoundException);
    });
  });
});
