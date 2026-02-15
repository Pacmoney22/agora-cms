import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PageService } from '../../src/modules/pages/page.service';

// Mock the @agora-cms/shared module
jest.mock('@agora-cms/shared', () => ({
  generateSlug: jest.fn((text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, ''),
  ),
}));

describe('PageService', () => {
  let service: PageService;

  const mockPrisma = {
    page: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    pageVersion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    redirect: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PageService>(PageService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated pages with defaults', async () => {
      const pages = [
        { id: 'p1', title: 'Page 1', slug: '/page-1', status: 'draft' },
      ];
      mockPrisma.page.findMany.mockResolvedValue(pages);
      mockPrisma.page.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toEqual(pages);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.page.count.mockResolvedValue(0);

      await service.findAll({ status: 'published' });

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'published' },
        }),
      );
    });

    it('should filter by isTemplate', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.page.count.mockResolvedValue(0);

      await service.findAll({ isTemplate: true });

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isTemplate: true },
        }),
      );
    });

    it('should handle custom pagination', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.page.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(result.meta).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should handle custom sort', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.page.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'title', sortOrder: 'asc' });

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'asc' } }),
      );
    });

    it('should return empty data when no pages exist', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.page.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return page when found', async () => {
      const page = { id: 'p1', title: 'Test Page', slug: '/test' };
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.findById('p1');

      expect(result).toEqual(page);
      expect(mockPrisma.page.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // findBySlug
  // -----------------------------------------------------------------------
  describe('findBySlug', () => {
    it('should return page when found by slug', async () => {
      const page = { id: 'p1', title: 'Test Page', slug: '/test' };
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.findBySlug('/test');

      expect(result).toEqual(page);
      expect(mockPrisma.page.findUnique).toHaveBeenCalledWith({
        where: { slug: '/test' },
      });
    });

    it('should throw NotFoundException when slug not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('/nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('should create a page with provided slug', async () => {
      const dto = { title: 'New Page', slug: '/new-page' };
      const createdPage = {
        id: 'p1',
        title: 'New Page',
        slug: '/new-page',
        status: 'draft',
        version: 1,
      };

      mockPrisma.page.findUnique.mockResolvedValue(null); // no slug conflict
      mockPrisma.page.create.mockResolvedValue(createdPage);

      const result = await service.create(dto as any, 'user-1');

      expect(result).toEqual(createdPage);
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Page',
          slug: '/new-page',
          status: 'draft',
          version: 1,
          createdBy: 'user-1',
        }),
      });
    });

    it('should generate slug from title when slug not provided', async () => {
      const dto = { title: 'My Great Page' };

      mockPrisma.page.findUnique.mockResolvedValue(null);
      mockPrisma.page.create.mockResolvedValue({
        id: 'p1',
        title: 'My Great Page',
        slug: '/my-great-page',
      });

      await service.create(dto as any, 'user-1');

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: '/my-great-page',
        }),
      });
    });

    it('should throw ConflictException when slug already exists', async () => {
      const dto = { title: 'Test', slug: '/existing' };
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'existing-page' });

      await expect(service.create(dto as any, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should set default component tree when not provided', async () => {
      const dto = { title: 'Test Page' };
      mockPrisma.page.findUnique.mockResolvedValue(null);
      mockPrisma.page.create.mockResolvedValue({ id: 'p1' });

      await service.create(dto as any, 'user-1');

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          componentTree: {
            root: {
              instanceId: 'root',
              componentId: 'page-container',
              props: {},
              children: [],
            },
          },
        }),
      });
    });

    it('should use provided componentTree when given', async () => {
      const tree = { root: { componentId: 'custom' } };
      const dto = { title: 'Test Page', componentTree: tree };
      mockPrisma.page.findUnique.mockResolvedValue(null);
      mockPrisma.page.create.mockResolvedValue({ id: 'p1' });

      await service.create(dto as any, 'user-1');

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          componentTree: tree,
        }),
      });
    });

    it('should set isTemplate to false by default', async () => {
      const dto = { title: 'Test Page' };
      mockPrisma.page.findUnique.mockResolvedValue(null);
      mockPrisma.page.create.mockResolvedValue({ id: 'p1' });

      await service.create(dto as any, 'user-1');

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isTemplate: false,
        }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    const existingPage = {
      id: 'p1',
      title: 'Old Title',
      slug: '/old-slug',
      version: 3,
      componentTree: {},
      seo: {},
    };

    it('should update a page and create version snapshot', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(existingPage);
      mockPrisma.pageVersion.create.mockResolvedValue({});
      mockPrisma.page.update.mockResolvedValue({
        ...existingPage,
        title: 'New Title',
        version: 4,
      });

      const result = await service.update(
        'p1',
        { title: 'New Title' } as any,
        'user-1',
      );

      expect(result.title).toBe('New Title');
      expect(result.version).toBe(4);
      expect(mockPrisma.pageVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pageId: 'p1',
          version: 3,
          createdBy: 'user-1',
        }),
      });
    });

    it('should throw NotFoundException when updating non-existent page', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'Test' } as any, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should auto-create redirect when slug changes', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(existingPage);
      mockPrisma.page.findFirst.mockResolvedValue(null); // no conflict
      mockPrisma.pageVersion.create.mockResolvedValue({});
      mockPrisma.redirect.upsert.mockResolvedValue({});
      mockPrisma.page.update.mockResolvedValue({
        ...existingPage,
        slug: '/new-slug',
        version: 4,
      });

      await service.update('p1', { slug: '/new-slug' } as any, 'user-1');

      expect(mockPrisma.redirect.upsert).toHaveBeenCalledWith({
        where: { fromPath: '/old-slug' },
        update: { toPath: '/new-slug' },
        create: {
          fromPath: '/old-slug',
          toPath: '/new-slug',
          statusCode: 301,
        },
      });
    });

    it('should throw ConflictException when new slug conflicts', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(existingPage);
      mockPrisma.pageVersion.create.mockResolvedValue({});
      mockPrisma.page.findFirst.mockResolvedValue({ id: 'other-page' });

      await expect(
        service.update('p1', { slug: '/taken-slug' } as any, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should increment version number', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(existingPage);
      mockPrisma.pageVersion.create.mockResolvedValue({});
      mockPrisma.page.update.mockResolvedValue({ version: 4 });

      await service.update('p1', { title: 'Updated' } as any, 'user-1');

      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({ version: 4 }),
      });
    });
  });

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------
  describe('remove', () => {
    it('should delete page and its versions', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.pageVersion.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.page.delete.mockResolvedValue({});

      await service.remove('p1');

      expect(mockPrisma.pageVersion.deleteMany).toHaveBeenCalledWith({
        where: { pageId: 'p1' },
      });
      expect(mockPrisma.page.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent page', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // publish
  // -----------------------------------------------------------------------
  describe('publish', () => {
    it('should publish a draft page', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'draft',
      });
      mockPrisma.page.update.mockResolvedValue({
        id: 'p1',
        status: 'published',
        publishedAt: new Date(),
      });

      const result = await service.publish('p1');

      expect(result.status).toBe('published');
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: {
          status: 'published',
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when page is already published', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'published',
      });

      await expect(service.publish('p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when page does not exist', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.publish('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // unpublish
  // -----------------------------------------------------------------------
  describe('unpublish', () => {
    it('should unpublish a published page', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'published',
      });
      mockPrisma.page.update.mockResolvedValue({
        id: 'p1',
        status: 'draft',
        publishedAt: null,
      });

      const result = await service.unpublish('p1');

      expect(result.status).toBe('draft');
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'draft', publishedAt: null },
      });
    });

    it('should throw BadRequestException when page is not published', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'draft',
      });

      await expect(service.unpublish('p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when page does not exist', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.unpublish('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // getVersions
  // -----------------------------------------------------------------------
  describe('getVersions', () => {
    it('should return versions for a page', async () => {
      const versions = [
        { id: 'v2', version: 2, title: 'V2' },
        { id: 'v1', version: 1, title: 'V1' },
      ];
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.pageVersion.findMany.mockResolvedValue(versions);

      const result = await service.getVersions('p1');

      expect(result).toEqual(versions);
      expect(mockPrisma.pageVersion.findMany).toHaveBeenCalledWith({
        where: { pageId: 'p1' },
        orderBy: { version: 'desc' },
        select: expect.objectContaining({
          id: true,
          version: true,
          title: true,
        }),
      });
    });

    it('should throw NotFoundException when page does not exist', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.getVersions('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // rollback
  // -----------------------------------------------------------------------
  describe('rollback', () => {
    const existingPage = {
      id: 'p1',
      title: 'Current',
      slug: '/current',
      version: 5,
      componentTree: { current: true },
      seo: { current: true },
    };

    it('should rollback to a specific version', async () => {
      const targetVersion = {
        id: 'v3',
        pageId: 'p1',
        version: 3,
        title: 'Version 3',
        componentTree: { old: true },
        seo: { old: true },
      };

      mockPrisma.page.findUnique.mockResolvedValue(existingPage);
      mockPrisma.pageVersion.findFirst.mockResolvedValue(targetVersion);
      mockPrisma.pageVersion.create.mockResolvedValue({}); // snapshot
      mockPrisma.page.update.mockResolvedValue({
        ...existingPage,
        title: 'Version 3',
        version: 6,
      });

      const result = await service.rollback('p1', 3, 'user-1');

      expect(result.version).toBe(6);
      // Snapshot of current state should be created first
      expect(mockPrisma.pageVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pageId: 'p1',
          version: 5,
          createdBy: 'user-1',
        }),
      });
      // Then update page with old data
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({
          title: 'Version 3',
          componentTree: { old: true },
          seo: { old: true },
          version: 6,
        }),
      });
    });

    it('should throw NotFoundException when target version does not exist', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(existingPage);
      mockPrisma.pageVersion.findFirst.mockResolvedValue(null);
      mockPrisma.pageVersion.create.mockResolvedValue({}); // snapshot still created

      await expect(service.rollback('p1', 99, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when page does not exist', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(
        service.rollback('non-existent', 1, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
