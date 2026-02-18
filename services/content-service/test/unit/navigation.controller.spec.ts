import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { NavigationController } from '../../src/modules/navigation/navigation.controller';
import { NavigationService } from '../../src/modules/navigation/navigation.service';

describe('NavigationController', () => {
  let controller: NavigationController;

  const mockNavigationService = {
    findAll: jest.fn(),
    findByLocation: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NavigationController],
      providers: [
        { provide: NavigationService, useValue: mockNavigationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NavigationController>(NavigationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── findAll ───────────────────────────────────────────────────

  describe('findAll', () => {
    it('should call navigationService.findAll and return result', async () => {
      const expected = [{ location: 'header', items: [] }];
      mockNavigationService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(mockNavigationService.findAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  // ── findByLocation ────────────────────────────────────────────

  describe('findByLocation', () => {
    it('should call navigationService.findByLocation with the location', async () => {
      const expected = { location: 'header', items: [{ label: 'Home' }] };
      mockNavigationService.findByLocation.mockResolvedValue(expected);

      const result = await controller.findByLocation('header');

      expect(mockNavigationService.findByLocation).toHaveBeenCalledWith('header');
      expect(result).toEqual(expected);
    });

    it('should propagate not-found errors', async () => {
      mockNavigationService.findByLocation.mockRejectedValue(new Error('not found'));

      await expect(controller.findByLocation('nonexistent')).rejects.toThrow(
        'not found',
      );
    });
  });

  // ── upsert ────────────────────────────────────────────────────

  describe('upsert', () => {
    it('should call navigationService.upsert with location and items', async () => {
      const items = [{ label: 'Home', url: '/' }, { label: 'About', url: '/about' }];
      const expected = { location: 'header', items };
      mockNavigationService.upsert.mockResolvedValue(expected);

      const result = await controller.upsert('header', { items });

      expect(mockNavigationService.upsert).toHaveBeenCalledWith('header', items);
      expect(result).toEqual(expected);
    });

    it('should handle empty items array', async () => {
      mockNavigationService.upsert.mockResolvedValue({ location: 'footer', items: [] });

      const result = await controller.upsert('footer', { items: [] });

      expect(mockNavigationService.upsert).toHaveBeenCalledWith('footer', []);
      expect(result.items).toEqual([]);
    });
  });

  // ── delete ────────────────────────────────────────────────────

  describe('delete', () => {
    it('should call navigationService.delete with the location', async () => {
      mockNavigationService.delete.mockResolvedValue(undefined);

      await controller.delete('sidebar');

      expect(mockNavigationService.delete).toHaveBeenCalledWith('sidebar');
    });

    it('should propagate errors', async () => {
      mockNavigationService.delete.mockRejectedValue(new Error('fail'));

      await expect(controller.delete('bad')).rejects.toThrow('fail');
    });
  });
});
