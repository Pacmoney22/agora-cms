import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RedirectsService } from '../../src/modules/redirects/redirects.service';

describe('RedirectsService', () => {
  let service: RedirectsService;

  const mockPrisma = {
    redirect: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedirectsService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RedirectsService>(RedirectsService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // findAll
  // -----------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated redirects with defaults', async () => {
      const redirects = [
        { id: 'r1', fromPath: '/old', toPath: '/new', statusCode: 301 },
      ];
      mockPrisma.redirect.findMany.mockResolvedValue(redirects);
      mockPrisma.redirect.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toEqual(redirects);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should handle custom pagination', async () => {
      mockPrisma.redirect.findMany.mockResolvedValue([]);
      mockPrisma.redirect.count.mockResolvedValue(45);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      });
      expect(mockPrisma.redirect.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should return empty data when no redirects exist', async () => {
      mockPrisma.redirect.findMany.mockResolvedValue([]);
      mockPrisma.redirect.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // resolve
  // -----------------------------------------------------------------------
  describe('resolve', () => {
    it('should return redirect target when path matches', async () => {
      mockPrisma.redirect.findUnique.mockResolvedValue({
        id: 'r1',
        fromPath: '/old-page',
        toPath: '/new-page',
        statusCode: 301,
      });

      const result = await service.resolve('/old-page');

      expect(result).toEqual({ toPath: '/new-page', statusCode: 301 });
    });

    it('should return null when path has no redirect', async () => {
      mockPrisma.redirect.findUnique.mockResolvedValue(null);

      const result = await service.resolve('/no-redirect');

      expect(result).toBeNull();
    });

    it('should handle 302 temporary redirects', async () => {
      mockPrisma.redirect.findUnique.mockResolvedValue({
        id: 'r2',
        fromPath: '/temp',
        toPath: '/temporary-destination',
        statusCode: 302,
      });

      const result = await service.resolve('/temp');

      expect(result).toEqual({
        toPath: '/temporary-destination',
        statusCode: 302,
      });
    });
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('should create a redirect with default status code 301', async () => {
      const redirect = {
        id: 'r1',
        fromPath: '/old',
        toPath: '/new',
        statusCode: 301,
      };
      mockPrisma.redirect.create.mockResolvedValue(redirect);

      const result = await service.create({
        fromPath: '/old',
        toPath: '/new',
      });

      expect(result).toEqual(redirect);
      expect(mockPrisma.redirect.create).toHaveBeenCalledWith({
        data: {
          fromPath: '/old',
          toPath: '/new',
          statusCode: 301,
        },
      });
    });

    it('should create a redirect with custom status code', async () => {
      const redirect = {
        id: 'r2',
        fromPath: '/temp',
        toPath: '/destination',
        statusCode: 302,
      };
      mockPrisma.redirect.create.mockResolvedValue(redirect);

      const result = await service.create({
        fromPath: '/temp',
        toPath: '/destination',
        statusCode: 302,
      });

      expect(result.statusCode).toBe(302);
      expect(mockPrisma.redirect.create).toHaveBeenCalledWith({
        data: {
          fromPath: '/temp',
          toPath: '/destination',
          statusCode: 302,
        },
      });
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------
  describe('delete', () => {
    it('should delete a redirect', async () => {
      mockPrisma.redirect.findUnique.mockResolvedValue({
        id: 'r1',
        fromPath: '/old',
      });
      mockPrisma.redirect.delete.mockResolvedValue({});

      await service.delete('r1');

      expect(mockPrisma.redirect.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
    });

    it('should throw NotFoundException when redirect not found', async () => {
      mockPrisma.redirect.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
