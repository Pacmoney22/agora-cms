import { Test, TestingModule } from '@nestjs/testing';

import { ProductController } from '../../src/modules/products/product.controller';
import { ProductService } from '../../src/modules/products/product.service';

describe('ProductController', () => {
  let controller: ProductController;
  const mockService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    listVariants: jest.fn(),
    addVariant: jest.fn(),
    updateVariant: jest.fn(),
    generateVariants: jest.fn(),
    configureProduct: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockService }],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---- Product CRUD ----

  describe('list', () => {
    it('should call productService.findAll with the query', async () => {
      const query = { page: 1, limit: 10 };
      const expected = { data: [], meta: { total: 0 } };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.list(query as any);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });

    it('should pass empty query object', async () => {
      mockService.findAll.mockResolvedValue({ data: [] });
      await controller.list({} as any);
      expect(mockService.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('create', () => {
    it('should call productService.create with the dto', async () => {
      const dto = { name: 'Test Product', type: 'physical', price: 9.99 };
      const expected = { id: 'p1', ...dto };
      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(dto as any);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call productService.findById with the id', async () => {
      const expected = { id: 'p1', name: 'Test' };
      mockService.findById.mockResolvedValue(expected);

      const result = await controller.findOne('p1');

      expect(mockService.findById).toHaveBeenCalledWith('p1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call productService.update with id and dto', async () => {
      const dto = { name: 'Updated' };
      const expected = { id: 'p1', name: 'Updated' };
      mockService.update.mockResolvedValue(expected);

      const result = await controller.update('p1', dto as any);

      expect(mockService.update).toHaveBeenCalledWith('p1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call productService.remove with the id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('p1');

      expect(mockService.remove).toHaveBeenCalledWith('p1');
      expect(result).toBeUndefined();
    });
  });

  // ---- Variants ----

  describe('listVariants', () => {
    it('should call productService.listVariants with product id', async () => {
      const expected = [{ id: 'v1', sku: 'SKU-1' }];
      mockService.listVariants.mockResolvedValue(expected);

      const result = await controller.listVariants('p1');

      expect(mockService.listVariants).toHaveBeenCalledWith('p1');
      expect(result).toEqual(expected);
    });
  });

  describe('addVariant', () => {
    it('should call productService.addVariant with product id and dto', async () => {
      const dto = { sku: 'SKU-NEW', price: 19.99 };
      const expected = { id: 'v1', ...dto };
      mockService.addVariant.mockResolvedValue(expected);

      const result = await controller.addVariant('p1', dto as any);

      expect(mockService.addVariant).toHaveBeenCalledWith('p1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('updateVariant', () => {
    it('should call productService.updateVariant with product id, variant id, and dto', async () => {
      const dto = { price: 29.99 };
      const expected = { id: 'v1', price: 29.99 };
      mockService.updateVariant.mockResolvedValue(expected);

      const result = await controller.updateVariant('p1', 'v1', dto as any);

      expect(mockService.updateVariant).toHaveBeenCalledWith('p1', 'v1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('generateVariants', () => {
    it('should call productService.generateVariants with product id and dto', async () => {
      const dto = { attributes: { color: ['red', 'blue'], size: ['S', 'M'] } };
      const expected = [{ id: 'v1' }, { id: 'v2' }];
      mockService.generateVariants.mockResolvedValue(expected);

      const result = await controller.generateVariants('p1', dto as any);

      expect(mockService.generateVariants).toHaveBeenCalledWith('p1', dto);
      expect(result).toEqual(expected);
    });
  });

  // ---- Configure ----

  describe('configureProduct', () => {
    it('should call productService.configureProduct with id and dto', async () => {
      const dto = { selections: { color: 'red' } };
      const expected = { resolvedPrice: 29.99, resolvedSku: 'SKU-RED' };
      mockService.configureProduct.mockResolvedValue(expected);

      const result = await controller.configureProduct('p1', dto as any);

      expect(mockService.configureProduct).toHaveBeenCalledWith('p1', dto);
      expect(result).toEqual(expected);
    });
  });
});
