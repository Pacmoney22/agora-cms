import { Test, TestingModule } from '@nestjs/testing';

import { VariantController } from '../../src/modules/variants/variant.controller';
import { VariantService } from '../../src/modules/variants/variant.service';

describe('VariantController', () => {
  let controller: VariantController;
  const mockService = {
    findById: jest.fn(),
    updateById: jest.fn(),
    removeById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantController],
      providers: [{ provide: VariantService, useValue: mockService }],
    }).compile();

    controller = module.get<VariantController>(VariantController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('should call variantService.findById with the id', async () => {
      const expected = { id: 'v1', sku: 'SKU-001', price: 19.99 };
      mockService.findById.mockResolvedValue(expected);

      const result = await controller.findOne('v1');

      expect(mockService.findById).toHaveBeenCalledWith('v1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call variantService.updateById with id and dto', async () => {
      const dto = { price: 24.99, sku: 'SKU-002' };
      const expected = { id: 'v1', ...dto };
      mockService.updateById.mockResolvedValue(expected);

      const result = await controller.update('v1', dto);

      expect(mockService.updateById).toHaveBeenCalledWith('v1', dto);
      expect(result).toEqual(expected);
    });

    it('should pass empty dto', async () => {
      mockService.updateById.mockResolvedValue({});

      await controller.update('v1', {});

      expect(mockService.updateById).toHaveBeenCalledWith('v1', {});
    });
  });

  describe('remove', () => {
    it('should call variantService.removeById with the id', async () => {
      mockService.removeById.mockResolvedValue(undefined);

      const result = await controller.remove('v1');

      expect(mockService.removeById).toHaveBeenCalledWith('v1');
      expect(result).toBeUndefined();
    });
  });
});
