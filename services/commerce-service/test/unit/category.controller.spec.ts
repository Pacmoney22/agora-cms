import { Test, TestingModule } from '@nestjs/testing';

import { CategoryController } from '../../src/modules/categories/category.controller';
import { CategoryService } from '../../src/modules/categories/category.service';

describe('CategoryController', () => {
  let controller: CategoryController;
  const mockService = {
    findAll: jest.fn(),
    getTree: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockService }],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should call categoryService.findAll with the query', async () => {
      const query = { page: 1, limit: 50 };
      const expected = { data: [], meta: { total: 0 } };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.list(query as any);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });

    it('should pass filters like parentId and status', async () => {
      const query = { parentId: 'cat-parent', status: 'active' };
      mockService.findAll.mockResolvedValue({ data: [] });

      await controller.list(query as any);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getTree', () => {
    it('should call categoryService.getTree', async () => {
      const expected = [{ id: 'cat-1', children: [] }];
      mockService.getTree.mockResolvedValue(expected);

      const result = await controller.getTree();

      expect(mockService.getTree).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('create', () => {
    it('should call categoryService.create with the dto', async () => {
      const dto = { name: 'Electronics' };
      const expected = { id: 'cat-1', name: 'Electronics', slug: 'electronics' };
      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(dto as any);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call categoryService.findById with the id', async () => {
      const expected = { id: 'cat-1', name: 'Electronics' };
      mockService.findById.mockResolvedValue(expected);

      const result = await controller.findOne('cat-1');

      expect(mockService.findById).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call categoryService.update with id and dto', async () => {
      const dto = { name: 'Updated Category' };
      const expected = { id: 'cat-1', name: 'Updated Category' };
      mockService.update.mockResolvedValue(expected);

      const result = await controller.update('cat-1', dto as any);

      expect(mockService.update).toHaveBeenCalledWith('cat-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call categoryService.remove with the id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('cat-1');

      expect(mockService.remove).toHaveBeenCalledWith('cat-1');
      expect(result).toBeUndefined();
    });
  });
});
