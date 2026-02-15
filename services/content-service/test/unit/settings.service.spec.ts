import { Test, TestingModule } from '@nestjs/testing';

import { SettingsService } from '../../src/modules/settings/settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockPrisma = {
    siteSettings: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // getAll
  // -----------------------------------------------------------------------
  describe('getAll', () => {
    it('should return all settings with defaults when no stored values', async () => {
      mockPrisma.siteSettings.findMany.mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toHaveProperty('general');
      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('seo');
      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('payments');
      expect(result).toHaveProperty('system');
      expect((result.general as any).siteName).toBe('Agora CMS');
    });

    it('should overlay stored values onto defaults', async () => {
      mockPrisma.siteSettings.findMany.mockResolvedValue([
        { key: 'general', value: { siteName: 'Custom Site' } },
      ]);

      const result = await service.getAll();

      expect((result.general as any).siteName).toBe('Custom Site');
      // Other general defaults should still be present
      expect((result.general as any).language).toBe('en');
    });

    it('should mask sensitive payment fields', async () => {
      mockPrisma.siteSettings.findMany.mockResolvedValue([
        {
          key: 'payments',
          value: {
            testSecretKey: 'sk_test_abc123456789xyz',
            liveSecretKey: 'sk_live_abc123456789xyz',
            testWebhookSecret: 'whsec_test_secretvalue',
            liveWebhookSecret: 'whsec_live_secretvalue',
          },
        },
      ]);

      const result = await service.getAll();
      const payments = result.payments as any;

      expect(payments.testSecretKey).toContain('••••');
      expect(payments.testSecretKey).not.toBe('sk_test_abc123456789xyz');
      expect(payments.liveSecretKey).toContain('••••');
    });
  });

  // -----------------------------------------------------------------------
  // get
  // -----------------------------------------------------------------------
  describe('get', () => {
    it('should return default value when setting not stored', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue(null);

      const result = await service.get('general');

      expect(result).toBeDefined();
      expect((result as any).siteName).toBe('Agora CMS');
    });

    it('should merge stored value with defaults', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue({
        key: 'general',
        value: { siteName: 'My Site', customField: 'extra' },
      });

      const result = await service.get('general');

      expect((result as any).siteName).toBe('My Site');
      expect((result as any).language).toBe('en'); // default preserved
      expect((result as any).customField).toBe('extra');
    });

    it('should return empty object for unknown key', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue(null);

      const result = await service.get('unknown_key');

      expect(result).toEqual({});
    });

    it('should mask sensitive fields for payments', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue({
        key: 'payments',
        value: {
          testSecretKey: 'sk_test_abc123456789xyz',
        },
      });

      const result = (await service.get('payments')) as any;

      expect(result.testSecretKey).toContain('••••');
    });
  });

  // -----------------------------------------------------------------------
  // getRaw
  // -----------------------------------------------------------------------
  describe('getRaw', () => {
    it('should return raw (unmasked) value', async () => {
      const secretKey = 'sk_test_abc123456789xyz';
      mockPrisma.siteSettings.findUnique.mockResolvedValue({
        key: 'payments',
        value: { testSecretKey: secretKey },
      });

      const result = (await service.getRaw('payments')) as any;

      // Should NOT be masked
      expect(result.testSecretKey).toBe(secretKey);
    });

    it('should return default when no stored value', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue(null);

      const result = await service.getRaw('theme');

      expect(result).toBeDefined();
      expect((result as any).colors).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // upsert
  // -----------------------------------------------------------------------
  describe('upsert', () => {
    it('should upsert a setting', async () => {
      const value = { siteName: 'Updated Site' };
      mockPrisma.siteSettings.upsert.mockResolvedValue({
        key: 'general',
        value,
      });

      const result = await service.upsert('general', value);

      expect(mockPrisma.siteSettings.upsert).toHaveBeenCalledWith({
        where: { key: 'general' },
        create: { key: 'general', value },
        update: { value },
      });
      expect(result).toBeDefined();
    });

    it('should preserve masked sensitive fields from existing data', async () => {
      // Existing stored data
      mockPrisma.siteSettings.findUnique.mockResolvedValue({
        key: 'payments',
        value: { testSecretKey: 'sk_test_real_secret' },
      });

      mockPrisma.siteSettings.upsert.mockResolvedValue({
        key: 'payments',
        value: { testSecretKey: 'sk_test_real_secret', currency: 'EUR' },
      });

      // Incoming value has masked field
      const value = {
        testSecretKey: 'sk_test••••cret',
        currency: 'EUR',
      };

      await service.upsert('payments', value);

      // The actual call should have the real secret, not the masked one
      expect(mockPrisma.siteSettings.upsert).toHaveBeenCalledWith({
        where: { key: 'payments' },
        create: expect.anything(),
        update: expect.objectContaining({
          value: expect.objectContaining({
            testSecretKey: 'sk_test_real_secret',
            currency: 'EUR',
          }),
        }),
      });
    });

    it('should allow updating sensitive fields with new values', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue({
        key: 'payments',
        value: { testSecretKey: 'sk_test_old_key' },
      });

      mockPrisma.siteSettings.upsert.mockResolvedValue({
        key: 'payments',
        value: { testSecretKey: 'sk_test_new_key' },
      });

      const value = { testSecretKey: 'sk_test_new_key' };
      await service.upsert('payments', value);

      expect(mockPrisma.siteSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { value: { testSecretKey: 'sk_test_new_key' } },
        }),
      );
    });

    it('should handle non-sensitive settings without checking existing', async () => {
      mockPrisma.siteSettings.upsert.mockResolvedValue({
        key: 'general',
        value: { siteName: 'New' },
      });

      await service.upsert('general', { siteName: 'New' });

      // findUnique should NOT be called for non-sensitive keys
      expect(mockPrisma.siteSettings.findUnique).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // getThemeCss
  // -----------------------------------------------------------------------
  describe('getThemeCss', () => {
    it('should generate CSS custom properties from theme', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue(null);

      const css = await service.getThemeCss();

      expect(css).toContain(':root {');
      expect(css).toContain('}');
      expect(css).toContain('--color-primary');
      expect(css).toContain('--font-heading');
      expect(css).toContain('--font-body');
      expect(css).toContain('--layout-max-width');
      expect(css).toContain('--btn-border-radius');
    });

    it('should include text-transform: none when uppercase is false', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue(null);

      const css = await service.getThemeCss();

      expect(css).toContain('--btn-text-transform: none');
    });

    it('should handle custom theme with uppercase buttons', async () => {
      mockPrisma.siteSettings.findUnique.mockImplementation(
        async ({ where }: any) => {
          if (where.key === 'theme') {
            return {
              key: 'theme',
              value: {
                colors: { primary: '#ff0000' },
                typography: {
                  headingFont: 'Arial',
                  bodyFont: 'Helvetica',
                  baseSize: 18,
                  scaleRatio: 1.3,
                },
                layout: { maxWidth: '1400px', borderRadius: '1rem' },
                buttons: {
                  borderRadius: '0.5rem',
                  uppercase: true,
                  fontWeight: '700',
                },
              },
            };
          }
          return null;
        },
      );

      const css = await service.getThemeCss();

      expect(css).toContain('--btn-text-transform: uppercase');
      expect(css).toContain("--font-heading: 'Arial', sans-serif");
    });
  });

  // -----------------------------------------------------------------------
  // getPublicSettings
  // -----------------------------------------------------------------------
  describe('getPublicSettings', () => {
    it('should return only public-safe settings', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue(null);

      const result = await service.getPublicSettings();

      expect(result).toHaveProperty('general');
      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('seo');
      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('payments');

      // Payments should NOT include secrets
      const payments = result.payments as any;
      expect(payments).not.toHaveProperty('testSecretKey');
      expect(payments).not.toHaveProperty('liveSecretKey');
      expect(payments).toHaveProperty('enabled');
      expect(payments).toHaveProperty('provider');
      expect(payments).toHaveProperty('currency');
    });

    it('should include publishable key based on mode', async () => {
      mockPrisma.siteSettings.findUnique.mockImplementation(
        async ({ where }: any) => {
          if (where.key === 'payments') {
            return {
              key: 'payments',
              value: {
                mode: 'live',
                livePublishableKey: 'pk_live_abc123',
                testPublishableKey: 'pk_test_xyz789',
              },
            };
          }
          return null;
        },
      );

      const result = await service.getPublicSettings();
      const payments = result.payments as any;

      expect(payments.publishableKey).toBe('pk_live_abc123');
    });

    it('should exclude timezone from general public settings', async () => {
      mockPrisma.siteSettings.findUnique.mockResolvedValue(null);

      const result = await service.getPublicSettings();
      const general = result.general as any;

      expect(general).not.toHaveProperty('timezone');
      expect(general).toHaveProperty('siteName');
    });
  });
});
