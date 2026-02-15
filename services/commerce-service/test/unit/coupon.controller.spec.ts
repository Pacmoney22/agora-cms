import { Test, TestingModule } from '@nestjs/testing';

import { CouponController } from '../../src/modules/coupons/coupon.controller';
import { CouponService } from '../../src/modules/coupons/coupon.service';

describe('CouponController', () => {
  let controller: CouponController;
  const mockService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    validate: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponController],
      providers: [{ provide: CouponService, useValue: mockService }],
    }).compile();

    controller = module.get<CouponController>(CouponController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should call couponService.findAll with page and limit', async () => {
      const expected = { data: [], meta: { total: 0 } };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.list(1, 20);

      expect(mockService.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(expected);
    });

    it('should call couponService.findAll with undefined when no params', async () => {
      mockService.findAll.mockResolvedValue({ data: [] });

      await controller.list(undefined, undefined);

      expect(mockService.findAll).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('create', () => {
    it('should call couponService.create with the dto', async () => {
      const dto = { code: 'SAVE10', discountType: 'percentage', discountValue: 10 };
      const expected = { id: 'c1', ...dto };
      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(dto as any);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call couponService.findById with the id', async () => {
      const expected = { id: 'c1', code: 'SAVE10' };
      mockService.findById.mockResolvedValue(expected);

      const result = await controller.findOne('c1');

      expect(mockService.findById).toHaveBeenCalledWith('c1');
      expect(result).toEqual(expected);
    });
  });

  describe('validate', () => {
    it('should call couponService.validate with code and context', async () => {
      const context = { cartTotal: 100, userId: 'user-1' };
      const expected = { valid: true, discount: 10 };
      mockService.validate.mockResolvedValue(expected);

      const result = await controller.validate('SAVE10', context as any);

      expect(mockService.validate).toHaveBeenCalledWith('SAVE10', context);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call couponService.update with id and dto', async () => {
      const dto = { discountValue: 20 };
      const expected = { id: 'c1', discountValue: 20 };
      mockService.update.mockResolvedValue(expected);

      const result = await controller.update('c1', dto as any);

      expect(mockService.update).toHaveBeenCalledWith('c1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call couponService.remove with the id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('c1');

      expect(mockService.remove).toHaveBeenCalledWith('c1');
      expect(result).toBeUndefined();
    });
  });
});
