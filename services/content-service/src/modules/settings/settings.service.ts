import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const SETTING_DEFAULTS: Record<string, unknown> = {
  general: {
    siteName: 'Agora CMS',
    siteUrl: 'http://localhost:3200',
    siteLogo: '',
    favicon: '',
    language: 'en',
    timezone: 'America/New_York',
  },
  theme: {
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
      error: '#ef4444',
      success: '#22c55e',
      warning: '#f59e0b',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseSize: 16,
      scaleRatio: 1.25,
    },
    layout: {
      maxWidth: '1280px',
      borderRadius: '0.5rem',
      headerStyle: 'sticky',
      footerColumns: 4,
    },
    buttons: {
      borderRadius: '0.375rem',
      uppercase: false,
      fontWeight: '600',
    },
  },
  seo: {
    titleTemplate: '%s | My Site',
    defaultTitle: 'My Site',
    defaultDescription: '',
    defaultOgImage: '',
    robotsTxt: 'User-agent: *\nAllow: /\n',
    sitemapEnabled: true,
    sitemapChangeFreq: 'weekly',
    sitemapPriority: 0.8,
    googleSiteVerification: '',
    bingSiteVerification: '',
    structuredData: {
      organizationName: '',
      organizationLogo: '',
      socialProfiles: [],
    },
    socialMedia: {
      twitterHandle: '',
      facebookPage: '',
      linkedinPage: '',
      instagramHandle: '',
    },
  },
  analytics: {
    provider: 'ga4',
    measurementId: '',
    enabled: false,
    trackingConfig: {
      anonymizeIp: true,
      trackPageViews: true,
      trackEcommerce: true,
      trackCourseProgress: true,
      cookieConsent: true,
    },
  },
  payments: {
    provider: 'stripe',
    enabled: false,
    mode: 'test',
    testPublishableKey: '',
    testSecretKey: '',
    testWebhookSecret: '',
    livePublishableKey: '',
    liveSecretKey: '',
    liveWebhookSecret: '',
    currency: 'USD',
    statementDescriptor: '',
    paymentMethods: ['card'],
    captureMethod: 'automatic',
  },
  system: {
    deploymentMode: 'standalone',
    features: {
      mediaStorage: 's3',
      search: 'database',
      queue: 'database',
      cache: 'memory',
    },
  },
};

// Fields that should be masked when returned to the client
const SENSITIVE_FIELDS: Record<string, string[]> = {
  payments: [
    'testSecretKey',
    'testWebhookSecret',
    'liveSecretKey',
    'liveWebhookSecret',
  ],
  analytics: [],
};

function maskValue(value: string): string {
  if (!value || value.length < 8) return value ? '••••••••' : '';
  return value.substring(0, 7) + '••••' + value.substring(value.length - 4);
}

function maskSensitiveFields(
  key: string,
  value: Record<string, unknown>,
): Record<string, unknown> {
  const fields = SENSITIVE_FIELDS[key];
  if (!fields || fields.length === 0) return value;

  const masked = { ...value };
  for (const field of fields) {
    if (typeof masked[field] === 'string' && masked[field]) {
      masked[field] = maskValue(masked[field] as string);
    }
  }
  return masked;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.prisma.siteSettings.findMany();
    const result: Record<string, unknown> = {};

    // Start with defaults
    for (const [key, defaultValue] of Object.entries(SETTING_DEFAULTS)) {
      result[key] = defaultValue;
    }

    // Overlay stored values and mask sensitive fields
    for (const row of rows) {
      const merged = {
        ...(SETTING_DEFAULTS[row.key] as Record<string, unknown> | undefined),
        ...(row.value as Record<string, unknown>),
      };
      result[row.key] = maskSensitiveFields(row.key, merged);
    }

    return result;
  }

  async get(key: string): Promise<unknown> {
    const row = await this.prisma.siteSettings.findUnique({
      where: { key },
    });

    const defaultValue = SETTING_DEFAULTS[key] ?? {};
    if (!row) return defaultValue;

    const merged = {
      ...(defaultValue as Record<string, unknown>),
      ...(row.value as Record<string, unknown>),
    };
    return maskSensitiveFields(key, merged);
  }

  /** Returns raw value without masking — for internal service use only */
  async getRaw(key: string): Promise<unknown> {
    const row = await this.prisma.siteSettings.findUnique({
      where: { key },
    });

    const defaultValue = SETTING_DEFAULTS[key] ?? {};
    if (!row) return defaultValue;

    return {
      ...(defaultValue as Record<string, unknown>),
      ...(row.value as Record<string, unknown>),
    };
  }

  async upsert(key: string, value: Record<string, unknown>): Promise<unknown> {
    // For sensitive fields, if the value looks masked, preserve existing value
    const sensitiveFields = SENSITIVE_FIELDS[key];
    if (sensitiveFields && sensitiveFields.length > 0) {
      const existing = await this.prisma.siteSettings.findUnique({
        where: { key },
      });
      if (existing) {
        const existingValue = existing.value as Record<string, unknown>;
        for (const field of sensitiveFields) {
          const incoming = value[field] as string;
          if (incoming && incoming.includes('••••')) {
            value[field] = existingValue[field];
          }
        }
      }
    }

    const row = await this.prisma.siteSettings.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    });

    this.logger.log(`Settings updated: ${key}`);

    const merged = {
      ...(SETTING_DEFAULTS[key] as Record<string, unknown> | undefined),
      ...(row.value as Record<string, unknown>),
    };
    return maskSensitiveFields(key, merged);
  }

  /** Generate CSS custom properties from theme settings */
  async getThemeCss(): Promise<string> {
    const theme = (await this.getRaw('theme')) as any;
    const general = (await this.getRaw('general')) as any;

    const lines: string[] = [':root {'];

    // Colors
    if (theme?.colors) {
      for (const [name, value] of Object.entries(theme.colors)) {
        lines.push(`  --color-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`);
      }
    }

    // Typography
    if (theme?.typography) {
      lines.push(`  --font-heading: '${theme.typography.headingFont}', sans-serif;`);
      lines.push(`  --font-body: '${theme.typography.bodyFont}', sans-serif;`);
      lines.push(`  --font-base-size: ${theme.typography.baseSize}px;`);
      lines.push(`  --font-scale-ratio: ${theme.typography.scaleRatio};`);
    }

    // Layout
    if (theme?.layout) {
      lines.push(`  --layout-max-width: ${theme.layout.maxWidth};`);
      lines.push(`  --layout-border-radius: ${theme.layout.borderRadius};`);
    }

    // Buttons
    if (theme?.buttons) {
      lines.push(`  --btn-border-radius: ${theme.buttons.borderRadius};`);
      lines.push(`  --btn-font-weight: ${theme.buttons.fontWeight};`);
      if (theme.buttons.uppercase) {
        lines.push(`  --btn-text-transform: uppercase;`);
      } else {
        lines.push(`  --btn-text-transform: none;`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /** Return only browser-safe public settings (no secrets) */
  async getPublicSettings(): Promise<Record<string, unknown>> {
    const general = (await this.getRaw('general')) as any;
    const theme = (await this.getRaw('theme')) as any;
    const seo = (await this.getRaw('seo')) as any;
    const analytics = (await this.getRaw('analytics')) as any;
    const payments = (await this.getRaw('payments')) as any;

    return {
      general: {
        siteName: general?.siteName,
        siteUrl: general?.siteUrl,
        siteLogo: general?.siteLogo,
        favicon: general?.favicon,
        language: general?.language,
      },
      theme,
      seo,
      analytics: {
        enabled: analytics?.enabled,
        provider: analytics?.provider,
        measurementId: analytics?.measurementId,
        trackingConfig: analytics?.trackingConfig,
      },
      payments: {
        enabled: payments?.enabled,
        provider: payments?.provider,
        mode: payments?.mode,
        currency: payments?.currency,
        publishableKey:
          payments?.mode === 'live'
            ? payments?.livePublishableKey
            : payments?.testPublishableKey,
      },
    };
  }
}
