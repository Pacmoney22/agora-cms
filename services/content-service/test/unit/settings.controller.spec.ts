import { Test, TestingModule } from '@nestjs/testing';

import { SettingsController } from '../../src/modules/settings/settings.controller';
import { SettingsService } from '../../src/modules/settings/settings.service';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';

describe('SettingsController', () => {
  let controller: SettingsController;

  const mockSettingsService = {
    getPublicSettings: jest.fn(),
    getThemeCss: jest.fn(),
    getAll: jest.fn(),
    get: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── getPublic ─────────────────────────────────────────────────

  describe('getPublic', () => {
    it('should call settingsService.getPublicSettings', async () => {
      const expected = { siteName: 'My CMS', theme: {} };
      mockSettingsService.getPublicSettings.mockResolvedValue(expected);

      const result = await controller.getPublic();

      expect(mockSettingsService.getPublicSettings).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  // ── getThemeCss ───────────────────────────────────────────────

  describe('getThemeCss', () => {
    it('should call settingsService.getThemeCss', async () => {
      const css = ':root { --primary: #333; }';
      mockSettingsService.getThemeCss.mockResolvedValue(css);

      const result = await controller.getThemeCss();

      expect(mockSettingsService.getThemeCss).toHaveBeenCalled();
      expect(result).toBe(css);
    });
  });

  // ── getAll ────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should call settingsService.getAll', async () => {
      const expected = { general: {}, theme: {} };
      mockSettingsService.getAll.mockResolvedValue(expected);

      const result = await controller.getAll();

      expect(mockSettingsService.getAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  // ── get ───────────────────────────────────────────────────────

  describe('get', () => {
    it('should call settingsService.get with the key', async () => {
      const expected = { siteName: 'My Site' };
      mockSettingsService.get.mockResolvedValue(expected);

      const result = await controller.get('general');

      expect(mockSettingsService.get).toHaveBeenCalledWith('general');
      expect(result).toEqual(expected);
    });

    it('should propagate errors', async () => {
      mockSettingsService.get.mockRejectedValue(new Error('not found'));

      await expect(controller.get('unknown')).rejects.toThrow('not found');
    });
  });

  // ── upsert ────────────────────────────────────────────────────

  describe('upsert', () => {
    it('should call settingsService.upsert with key and body', async () => {
      const body = { siteName: 'Updated Site', tagline: 'Best CMS' };
      const expected = { key: 'general', value: body };
      mockSettingsService.upsert.mockResolvedValue(expected);

      const result = await controller.upsert('general', body);

      expect(mockSettingsService.upsert).toHaveBeenCalledWith('general', body);
      expect(result).toEqual(expected);
    });

    it('should handle empty body', async () => {
      mockSettingsService.upsert.mockResolvedValue({ key: 'theme', value: {} });

      const result = await controller.upsert('theme', {});

      expect(mockSettingsService.upsert).toHaveBeenCalledWith('theme', {});
      expect(result).toEqual({ key: 'theme', value: {} });
    });
  });
});
