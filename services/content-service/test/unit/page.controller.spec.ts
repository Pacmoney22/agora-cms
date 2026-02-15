import { Test, TestingModule } from '@nestjs/testing';

import { PageController } from '../../src/modules/pages/page.controller';
import { PageService } from '../../src/modules/pages/page.service';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';

describe('PageController', () => {
  let controller: PageController;

  const mockPageService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    getVersions: jest.fn(),
    rollback: jest.fn(),
  };

  const mockReq = { user: { sub: 'user-1', role: 'admin' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageController],
      providers: [{ provide: PageService, useValue: mockPageService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PageController>(PageController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── findAll ───────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call pageService.findAll with query parameters', async () => {
      const expected = { data: [], total: 0 };
      mockPageService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(1, 20, 'draft', 'updatedAt', 'desc');

      expect(mockPageService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'draft',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      expect(result).toEqual(expected);
    });

    it('should call pageService.findAll with undefined optional params', async () => {
      mockPageService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll();

      expect(mockPageService.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        status: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
    });
  });

  // ── create ────────────────────────────────────────────────────

  describe('create', () => {
    it('should call pageService.create with dto and user sub', async () => {
      const dto = { title: 'Test', slug: 'test', content: {} } as any;
      const expected = { id: 'page-1', ...dto };
      mockPageService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, mockReq);

      expect(mockPageService.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(expected);
    });

    it('should default to "system" when user is not present', async () => {
      const dto = { title: 'Test', slug: 'test' } as any;
      mockPageService.create.mockResolvedValue({});

      await controller.create(dto, { user: {} });

      expect(mockPageService.create).toHaveBeenCalledWith(dto, 'system');
    });
  });

  // ── findById ──────────────────────────────────────────────────

  describe('findById', () => {
    it('should call pageService.findById with the id', async () => {
      const expected = { id: 'page-1', title: 'Test' };
      mockPageService.findById.mockResolvedValue(expected);

      const result = await controller.findById('page-1');

      expect(mockPageService.findById).toHaveBeenCalledWith('page-1');
      expect(result).toEqual(expected);
    });

    it('should propagate not-found errors', async () => {
      mockPageService.findById.mockRejectedValue(new Error('not found'));

      await expect(controller.findById('bad-id')).rejects.toThrow('not found');
    });
  });

  // ── update ────────────────────────────────────────────────────

  describe('update', () => {
    it('should call pageService.update with id, dto and user sub', async () => {
      const dto = { title: 'Updated' } as any;
      const expected = { id: 'page-1', title: 'Updated' };
      mockPageService.update.mockResolvedValue(expected);

      const result = await controller.update('page-1', dto, mockReq);

      expect(mockPageService.update).toHaveBeenCalledWith('page-1', dto, 'user-1');
      expect(result).toEqual(expected);
    });

    it('should default to "system" when user is not present', async () => {
      const dto = { title: 'Updated' } as any;
      mockPageService.update.mockResolvedValue({});

      await controller.update('page-1', dto, { user: {} });

      expect(mockPageService.update).toHaveBeenCalledWith('page-1', dto, 'system');
    });
  });

  // ── remove ────────────────────────────────────────────────────

  describe('remove', () => {
    it('should call pageService.remove with the id', async () => {
      mockPageService.remove.mockResolvedValue(undefined);

      await controller.remove('page-1');

      expect(mockPageService.remove).toHaveBeenCalledWith('page-1');
    });

    it('should propagate errors', async () => {
      mockPageService.remove.mockRejectedValue(new Error('not found'));

      await expect(controller.remove('bad-id')).rejects.toThrow('not found');
    });
  });

  // ── publish ───────────────────────────────────────────────────

  describe('publish', () => {
    it('should call pageService.publish with the id', async () => {
      const expected = { id: 'page-1', status: 'published' };
      mockPageService.publish.mockResolvedValue(expected);

      const result = await controller.publish('page-1');

      expect(mockPageService.publish).toHaveBeenCalledWith('page-1');
      expect(result).toEqual(expected);
    });

    it('should propagate errors', async () => {
      mockPageService.publish.mockRejectedValue(new Error('already published'));

      await expect(controller.publish('page-1')).rejects.toThrow('already published');
    });
  });

  // ── unpublish ─────────────────────────────────────────────────

  describe('unpublish', () => {
    it('should call pageService.unpublish with the id', async () => {
      const expected = { id: 'page-1', status: 'draft' };
      mockPageService.unpublish.mockResolvedValue(expected);

      const result = await controller.unpublish('page-1');

      expect(mockPageService.unpublish).toHaveBeenCalledWith('page-1');
      expect(result).toEqual(expected);
    });
  });

  // ── getVersions ───────────────────────────────────────────────

  describe('getVersions', () => {
    it('should call pageService.getVersions with the id', async () => {
      const expected = [{ version: 1 }, { version: 2 }];
      mockPageService.getVersions.mockResolvedValue(expected);

      const result = await controller.getVersions('page-1');

      expect(mockPageService.getVersions).toHaveBeenCalledWith('page-1');
      expect(result).toEqual(expected);
    });
  });

  // ── rollback ──────────────────────────────────────────────────

  describe('rollback', () => {
    it('should call pageService.rollback with id, version and user sub', async () => {
      const expected = { id: 'page-1', version: 1 };
      mockPageService.rollback.mockResolvedValue(expected);

      const result = await controller.rollback('page-1', 1, mockReq);

      expect(mockPageService.rollback).toHaveBeenCalledWith('page-1', 1, 'user-1');
      expect(result).toEqual(expected);
    });

    it('should default to "system" when user is not present', async () => {
      mockPageService.rollback.mockResolvedValue({});

      await controller.rollback('page-1', 2, { user: {} });

      expect(mockPageService.rollback).toHaveBeenCalledWith('page-1', 2, 'system');
    });
  });
});
