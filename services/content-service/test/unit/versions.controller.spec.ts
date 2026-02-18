import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { VersionsController } from '../../src/modules/versions/versions.controller';
import { VersionsService } from '../../src/modules/versions/versions.service';

describe('VersionsController', () => {
  let controller: VersionsController;

  const mockVersionsService = {
    findByPageId: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionsController],
      providers: [
        { provide: VersionsService, useValue: mockVersionsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VersionsController>(VersionsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── findByPageId ──────────────────────────────────────────────

  describe('findByPageId', () => {
    it('should call versionsService.findByPageId with pageId and pagination', async () => {
      const expected = { data: [{ version: 1 }, { version: 2 }], total: 2 };
      mockVersionsService.findByPageId.mockResolvedValue(expected);

      const result = await controller.findByPageId('page-1', 1, 20);

      expect(mockVersionsService.findByPageId).toHaveBeenCalledWith('page-1', {
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(expected);
    });

    it('should call versionsService.findByPageId with undefined pagination', async () => {
      mockVersionsService.findByPageId.mockResolvedValue({ data: [], total: 0 });

      await controller.findByPageId('page-1');

      expect(mockVersionsService.findByPageId).toHaveBeenCalledWith('page-1', {
        page: undefined,
        limit: undefined,
      });
    });

    it('should propagate errors', async () => {
      mockVersionsService.findByPageId.mockRejectedValue(new Error('not found'));

      await expect(controller.findByPageId('bad-id')).rejects.toThrow('not found');
    });
  });

  // ── findById ──────────────────────────────────────────────────

  describe('findById', () => {
    it('should call versionsService.findById with the id', async () => {
      const expected = { id: 'ver-1', version: 1, content: {} };
      mockVersionsService.findById.mockResolvedValue(expected);

      const result = await controller.findById('ver-1');

      expect(mockVersionsService.findById).toHaveBeenCalledWith('ver-1');
      expect(result).toEqual(expected);
    });

    it('should propagate not-found errors', async () => {
      mockVersionsService.findById.mockRejectedValue(new Error('not found'));

      await expect(controller.findById('bad-id')).rejects.toThrow('not found');
    });
  });
});
