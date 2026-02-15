import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { VersionsService } from '../../src/modules/versions/versions.service';

describe('VersionsService', () => {
  let service: VersionsService;

  const mockPrisma = {
    pageVersion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // findByPageId
  // -----------------------------------------------------------------------
  describe('findByPageId', () => {
    it('should return paginated versions for a page', async () => {
      const versions = [
        { id: 'v2', version: 2, title: 'V2' },
        { id: 'v1', version: 1, title: 'V1' },
      ];
      mockPrisma.pageVersion.findMany.mockResolvedValue(versions);
      mockPrisma.pageVersion.count.mockResolvedValue(2);

      const result = await service.findByPageId('p1', {});

      expect(result.data).toEqual(versions);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      expect(mockPrisma.pageVersion.findMany).toHaveBeenCalledWith({
        where: { pageId: 'p1' },
        skip: 0,
        take: 20,
        orderBy: { version: 'desc' },
      });
    });

    it('should handle custom pagination', async () => {
      mockPrisma.pageVersion.findMany.mockResolvedValue([]);
      mockPrisma.pageVersion.count.mockResolvedValue(50);

      const result = await service.findByPageId('p1', {
        page: 3,
        limit: 10,
      });

      expect(result.meta).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
      expect(mockPrisma.pageVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should return empty data when no versions exist', async () => {
      mockPrisma.pageVersion.findMany.mockResolvedValue([]);
      mockPrisma.pageVersion.count.mockResolvedValue(0);

      const result = await service.findByPageId('p1', {});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return version when found', async () => {
      const version = {
        id: 'v1',
        pageId: 'p1',
        version: 1,
        title: 'Version 1',
        componentTree: {},
        seo: {},
      };
      mockPrisma.pageVersion.findUnique.mockResolvedValue(version);

      const result = await service.findById('v1');

      expect(result).toEqual(version);
      expect(mockPrisma.pageVersion.findUnique).toHaveBeenCalledWith({
        where: { id: 'v1' },
      });
    });

    it('should throw NotFoundException when version not found', async () => {
      mockPrisma.pageVersion.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // compare
  // -----------------------------------------------------------------------
  describe('compare', () => {
    it('should compare two versions with no changes', async () => {
      const versionA = {
        id: 'v1',
        version: 1,
        title: 'Same Title',
        componentTree: { root: 'same' },
        seo: { title: 'same' },
        createdAt: new Date('2024-01-01'),
      };
      const versionB = {
        id: 'v2',
        version: 2,
        title: 'Same Title',
        componentTree: { root: 'same' },
        seo: { title: 'same' },
        createdAt: new Date('2024-01-02'),
      };

      mockPrisma.pageVersion.findUnique
        .mockResolvedValueOnce(versionA)
        .mockResolvedValueOnce(versionB);

      const result = await service.compare('v1', 'v2');

      expect(result.titleChanged).toBe(false);
      expect(result.componentTreeChanged).toBe(false);
      expect(result.seoChanged).toBe(false);
      expect(result.versionA).toEqual({
        id: 'v1',
        version: 1,
        createdAt: versionA.createdAt,
      });
      expect(result.versionB).toEqual({
        id: 'v2',
        version: 2,
        createdAt: versionB.createdAt,
      });
    });

    it('should detect title changes', async () => {
      mockPrisma.pageVersion.findUnique
        .mockResolvedValueOnce({
          id: 'v1',
          version: 1,
          title: 'Old Title',
          componentTree: {},
          seo: {},
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'v2',
          version: 2,
          title: 'New Title',
          componentTree: {},
          seo: {},
          createdAt: new Date(),
        });

      const result = await service.compare('v1', 'v2');

      expect(result.titleChanged).toBe(true);
    });

    it('should detect componentTree changes', async () => {
      mockPrisma.pageVersion.findUnique
        .mockResolvedValueOnce({
          id: 'v1',
          version: 1,
          title: 'Title',
          componentTree: { old: true },
          seo: {},
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'v2',
          version: 2,
          title: 'Title',
          componentTree: { new: true },
          seo: {},
          createdAt: new Date(),
        });

      const result = await service.compare('v1', 'v2');

      expect(result.componentTreeChanged).toBe(true);
    });

    it('should detect SEO changes', async () => {
      mockPrisma.pageVersion.findUnique
        .mockResolvedValueOnce({
          id: 'v1',
          version: 1,
          title: 'Title',
          componentTree: {},
          seo: { metaTitle: 'Old' },
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'v2',
          version: 2,
          title: 'Title',
          componentTree: {},
          seo: { metaTitle: 'New' },
          createdAt: new Date(),
        });

      const result = await service.compare('v1', 'v2');

      expect(result.seoChanged).toBe(true);
    });

    it('should throw NotFoundException when version A not found', async () => {
      mockPrisma.pageVersion.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'v2' });

      await expect(service.compare('non-existent', 'v2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when version B not found', async () => {
      mockPrisma.pageVersion.findUnique
        .mockResolvedValueOnce({ id: 'v1' })
        .mockResolvedValueOnce(null);

      await expect(service.compare('v1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
