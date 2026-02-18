import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CouponService } from '../../src/modules/coupons/coupon.service';

describe('CouponService', () => {
  let service: CouponService;

  const mockCoupon = {
    id: 'coupon-1',
    code: 'SAVE10',
    description: '10% off',
    discountType: 'percentage',
    discountValue: 1000, // 10% in basis points
    maxDiscountAmount: null,
    appliesTo: 'all',
    productIds: [],
    categoryIds: [],
    productTypes: [],
    excludedProductIds: [],
    excludedCategoryIds: [],
    minOrderAmount: null,
    maxOrderAmount: null,
    minItemCount: null,
    maxUsageCount: null,
    usagePerUser: null,
    currentUsage: 0,
    stackable: false,
    stackGroup: null,
    priority: 0,
    buyXQuantity: null,
    getYQuantity: null,
    stripeCouponId: null,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    coupon: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a coupon with uppercase code', async () => {
      mockPrisma.coupon.create.mockResolvedValue(mockCoupon);

      const result = await service.create({
        code: 'save10',
        discountType: 'percentage',
        discountValue: 1000,
      });

      expect(result.code).toBe('SAVE10');
      expect(mockPrisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'SAVE10' }),
        }),
      );
    });

    it('should set default values for optional fields', async () => {
      mockPrisma.coupon.create.mockResolvedValue(mockCoupon);

      await service.create({
        code: 'TEST',
        discountType: 'fixed_amount',
        discountValue: 500,
      });

      expect(mockPrisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appliesTo: 'all',
            stackable: false,
            currentUsage: 0,
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated coupons', async () => {
      mockPrisma.coupon.findMany.mockResolvedValue([mockCoupon]);
      mockPrisma.coupon.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should handle custom pagination', async () => {
      mockPrisma.coupon.findMany.mockResolvedValue([]);
      mockPrisma.coupon.count.mockResolvedValue(50);

      const result = await service.findAll(2, 10);

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(5);
    });
  });

  describe('findById', () => {
    it('should return coupon when found', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.findById('coupon-1');

      expect(result.id).toBe('coupon-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should find coupon by code (case insensitive)', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.findByCode('save10');

      expect(mockPrisma.coupon.findUnique).toHaveBeenCalledWith({
        where: { code: 'SAVE10' },
      });
      expect(result.code).toBe('SAVE10');
    });

    it('should throw NotFoundException when code not found', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.findByCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validate', () => {
    it('should validate a valid coupon with percentage discount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.validate('SAVE10', { subtotal: 10000 });

      expect(result.valid).toBe(true);
      // 10000 * (1000 / 10000) = 1000
      expect(result.discount).toBe(1000);
    });

    it('should return invalid for inactive coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        isActive: false,
      });

      const result = await service.validate('SAVE10', { subtotal: 10000 });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon is not active');
    });

    it('should return invalid for expired coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        expiresAt: new Date('2020-01-01'),
      });

      const result = await service.validate('SAVE10', { subtotal: 10000 });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon has expired');
    });

    it('should return invalid when coupon is not yet active', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        startsAt: new Date('2099-01-01'),
      });

      const result = await service.validate('SAVE10', { subtotal: 10000 });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon is not yet active');
    });

    it('should return invalid when usage limit reached', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        maxUsageCount: 5,
        currentUsage: 5,
      });

      const result = await service.validate('SAVE10', { subtotal: 10000 });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon usage limit reached');
    });

    it('should return invalid when min order amount not met', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        minOrderAmount: 5000,
      });

      const result = await service.validate('SAVE10', { subtotal: 3000 });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Minimum order amount');
    });

    it('should return invalid when max order amount exceeded', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        maxOrderAmount: 5000,
      });

      const result = await service.validate('SAVE10', { subtotal: 10000 });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('only valid for orders up to');
    });

    it('should return invalid when min item count not met', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        minItemCount: 3,
      });

      const result = await service.validate('SAVE10', { subtotal: 10000, itemCount: 1 });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('qualifying items required');
    });

    it('should return invalid for non-matching product types', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        productTypes: ['physical'],
      });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        productTypes: ['virtual'],
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('product types');
    });

    it('should return invalid for non-matching specific products', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        appliesTo: 'specific_products',
        productIds: ['prod-1'],
      });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        productIds: ['prod-2'],
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('does not apply to these products');
    });

    it('should return invalid for non-matching specific categories', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        appliesTo: 'specific_categories',
        categoryIds: ['cat-1'],
      });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        categoryIds: ['cat-2'],
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('does not apply to these categories');
    });

    it('should return invalid when all products are excluded', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        excludedProductIds: ['prod-1'],
      });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        productIds: ['prod-1'],
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('excluded');
    });

    it('should return invalid when all categories are excluded', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        excludedCategoryIds: ['cat-1'],
      });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        categoryIds: ['cat-1'],
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('excluded');
    });

    it('should return invalid when non-stackable and other coupons applied', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        stackable: false,
      });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        otherCouponCodes: ['OTHER'],
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('cannot be combined');
    });

    it('should return invalid for same stack group', async () => {
      // First call returns the coupon being validated, second returns the other coupon
      mockPrisma.coupon.findUnique
        .mockResolvedValueOnce({
          ...mockCoupon,
          stackable: true,
          stackGroup: 'group-A',
        })
        .mockResolvedValueOnce({
          ...mockCoupon,
          code: 'OTHER',
          stackable: true,
          stackGroup: 'group-A',
        });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        otherCouponCodes: ['OTHER'],
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('same discount group');
    });

    it('should validate fixed_amount discount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        discountType: 'fixed_amount',
        discountValue: 500,
      });

      const result = await service.validate('SAVE5', { subtotal: 10000 });

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(500);
    });

    it('should validate free_shipping discount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        discountType: 'free_shipping',
        discountValue: 0,
      });

      const result = await service.validate('FREESHIP', { subtotal: 10000 });

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(0);
    });

    it('should validate buy_x_get_y discount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        discountType: 'buy_x_get_y',
        discountValue: 5000, // 50% off
        buyXQuantity: 2,
        getYQuantity: 1,
      });

      const result = await service.validate('BOGO', { subtotal: 10000 });

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(5000);
    });

    it('should cap discount at maxDiscountAmount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        discountType: 'percentage',
        discountValue: 5000, // 50%
        maxDiscountAmount: 2000,
      });

      const result = await service.validate('HALF', { subtotal: 10000 });

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(2000);
    });

    it('should cap discount at subtotal', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        discountType: 'fixed_amount',
        discountValue: 50000,
      });

      const result = await service.validate('BIG', { subtotal: 10000 });

      expect(result.valid).toBe(true);
      expect(result.discount).toBe(10000);
    });

    it('should return invalid for non-existent coupon code', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      const result = await service.validate('INVALID', { subtotal: 10000 });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid coupon code');
    });

    it('should return invalid when specific_products coupon has no matching productIds', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        appliesTo: 'specific_products',
        productIds: ['prod-1'],
      });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        // no productIds in context
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('No qualifying products');
    });

    it('should return invalid when specific_categories coupon has no matching categoryIds', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        ...mockCoupon,
        appliesTo: 'specific_categories',
        categoryIds: ['cat-1'],
      });

      const result = await service.validate('SAVE10', {
        subtotal: 10000,
        // no categoryIds in context
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('No qualifying categories');
    });
  });

  describe('update', () => {
    it('should update coupon fields', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.coupon.update.mockResolvedValue({
        ...mockCoupon,
        discountValue: 2000,
      });

      const result = await service.update('coupon-1', { discountValue: 2000 });

      expect(result.discountValue).toBe(2000);
    });

    it('should uppercase code on update', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.coupon.update.mockResolvedValue({
        ...mockCoupon,
        code: 'NEWCODE',
      });

      await service.update('coupon-1', { code: 'newcode' });

      expect(mockPrisma.coupon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'NEWCODE' }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { discountValue: 500 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrisma.coupon.delete.mockResolvedValue(mockCoupon);

      await service.remove('coupon-1');

      expect(mockPrisma.coupon.delete).toHaveBeenCalledWith({ where: { id: 'coupon-1' } });
    });

    it('should throw NotFoundException for non-existent coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
