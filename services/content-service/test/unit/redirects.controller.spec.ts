import { Test, TestingModule } from '@nestjs/testing';

import { RedirectsController } from '../../src/modules/redirects/redirects.controller';
import { RedirectsService } from '../../src/modules/redirects/redirects.service';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';

describe('RedirectsController', () => {
  let controller: RedirectsController;

  const mockRedirectsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedirectsController],
      providers: [
        { provide: RedirectsService, useValue: mockRedirectsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RedirectsController>(RedirectsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── findAll ───────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call redirectsService.findAll with pagination params', async () => {
      const expected = { data: [], total: 0 };
      mockRedirectsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(1, 20);

      expect(mockRedirectsService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(expected);
    });

    it('should call redirectsService.findAll with undefined optional params', async () => {
      mockRedirectsService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll();

      expect(mockRedirectsService.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
      });
    });
  });

  // ── create ────────────────────────────────────────────────────

  describe('create', () => {
    it('should call redirectsService.create with the dto', async () => {
      const dto = { fromPath: '/old', toPath: '/new', statusCode: 301 };
      const expected = { id: 'redir-1', ...dto };
      mockRedirectsService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(mockRedirectsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should create redirect without statusCode (uses default)', async () => {
      const dto = { fromPath: '/old-page', toPath: '/new-page' };
      mockRedirectsService.create.mockResolvedValue({ id: 'redir-2', ...dto });

      const result = await controller.create(dto);

      expect(mockRedirectsService.create).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('id');
    });

    it('should propagate errors from redirectsService.create', async () => {
      mockRedirectsService.create.mockRejectedValue(new Error('conflict'));

      await expect(
        controller.create({ fromPath: '/a', toPath: '/b' }),
      ).rejects.toThrow('conflict');
    });
  });

  // ── delete ────────────────────────────────────────────────────

  describe('delete', () => {
    it('should call redirectsService.delete with the id', async () => {
      mockRedirectsService.delete.mockResolvedValue(undefined);

      await controller.delete('redir-1');

      expect(mockRedirectsService.delete).toHaveBeenCalledWith('redir-1');
    });

    it('should propagate errors', async () => {
      mockRedirectsService.delete.mockRejectedValue(new Error('not found'));

      await expect(controller.delete('bad-id')).rejects.toThrow('not found');
    });
  });
});
