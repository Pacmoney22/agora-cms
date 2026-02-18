import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@agora-cms/shared', () => ({
  generateSlug: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
}));

import { CategoryService } from '../../src/modules/categories/category.service';

describe('CategoryService', () => {
  let service: CategoryService;

  const mockCategory = {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic goods',
    parentId: null,
    position: 0,
    image: null,
    seo: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    category: {
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
        CategoryService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      mockPrisma.category.create.mockResolvedValue(mockCategory);

      const result = await service.create({ name: 'Electronics' });

      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Electronics');
      expect(mockPrisma.category.create).toHaveBeenCalledTimes(1);
    });

    it('should use provided slug', async () => {
      mockPrisma.category.create.mockResolvedValue({
        ...mockCategory,
        slug: 'custom-slug',
      });

      await service.create({ name: 'Electronics', slug: 'custom-slug' });

      expect(mockPrisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'custom-slug' }),
        }),
      );
    });

    it('should validate parent exists when parentId is provided', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.create.mockResolvedValue({
        ...mockCategory,
        id: 'cat-2',
        parentId: 'cat-1',
      });

      const result = await service.create({
        name: 'Laptops',
        parentId: 'cat-1',
      });

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });

    it('should throw NotFoundException when parent does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Laptops', parentId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated categories with defaults', async () => {
      mockPrisma.category.findMany.mockResolvedValue([mockCategory]);
      mockPrisma.category.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it('should filter by parentId', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.category.count.mockResolvedValue(0);

      await service.findAll({ parentId: 'cat-1' });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ parentId: 'cat-1' }),
        }),
      );
    });

    it('should handle custom pagination', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.category.count.mockResolvedValue(100);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(10);
    });
  });

  describe('findById', () => {
    it('should return category when found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findById('cat-1');

      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Electronics');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update category fields', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.update.mockResolvedValue({
        ...mockCategory,
        name: 'Updated',
      });

      const result = await service.update('cat-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should auto-generate slug when name is updated without slug', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.update.mockResolvedValue({
        ...mockCategory,
        name: 'New Name',
        slug: 'new-name',
      });

      await service.update('cat-1', { name: 'New Name' });

      expect(mockPrisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'new-name' }),
        }),
      );
    });

    it('should throw BadRequestException when setting self as parent', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.update('cat-1', { parentId: 'cat-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate new parent exists', async () => {
      // First call for findById(id), second for findById(dto.parentId)
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(mockCategory) // findById(id)
        .mockResolvedValueOnce(null); // findById(parentId)

      await expect(
        service.update('cat-1', { parentId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a category without children', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue(mockCategory);

      await service.remove('cat-1');

      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });

    it('should throw BadRequestException when category has children', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.count.mockResolvedValue(3);

      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTree', () => {
    it('should return hierarchical tree', async () => {
      const categories = [
        { ...mockCategory, id: 'cat-1', parentId: null, position: 0 },
        { ...mockCategory, id: 'cat-2', name: 'Laptops', parentId: 'cat-1', position: 0 },
        { ...mockCategory, id: 'cat-3', name: 'Phones', parentId: 'cat-1', position: 1 },
      ];
      mockPrisma.category.findMany.mockResolvedValue(categories);

      const tree = await service.getTree();

      expect(tree).toHaveLength(1); // Only root categories
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].id).toBe('cat-2');
    });

    it('should return empty array when no categories exist', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const tree = await service.getTree();

      expect(tree).toEqual([]);
    });
  });
});
