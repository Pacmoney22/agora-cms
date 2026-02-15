import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ANALYTICS_PROVIDER } from './analytics.module';
import { GoogleAnalyticsProvider } from './google-analytics-provider';
import { StubAnalyticsProvider } from '../../common/stubs/stub-analytics-provider';

// Mock GoogleAnalyticsProvider constructor
jest.mock('./google-analytics-provider', () => ({
  GoogleAnalyticsProvider: jest.fn().mockImplementation((measurementId, apiSecret, propertyId) => ({
    _type: 'real',
    _measurementId: measurementId,
    _apiSecret: apiSecret,
    _propertyId: propertyId,
  })),
}));

// Mock StubAnalyticsProvider constructor
jest.mock('../../common/stubs/stub-analytics-provider', () => ({
  StubAnalyticsProvider: jest.fn().mockImplementation(() => ({
    _type: 'stub',
  })),
}));

describe('AnalyticsModule', () => {
  const createModule = async (configValues: Record<string, string | undefined>) => {
    const mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ANALYTICS_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const measurementId = configService.get<string>('GA4_MEASUREMENT_ID');
            const apiSecret = configService.get<string>('GA4_API_SECRET');
            const propertyId = configService.get<string>('GA4_PROPERTY_ID');

            if (measurementId && apiSecret && propertyId) {
              return new GoogleAnalyticsProvider(measurementId, apiSecret, propertyId);
            }

            return new StubAnalyticsProvider();
          },
          inject: [ConfigService],
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide real GoogleAnalyticsProvider when all GA4 env vars are set', async () => {
    const module = await createModule({
      GA4_MEASUREMENT_ID: 'G-TEST12345',
      GA4_API_SECRET: 'secret_abc',
      GA4_PROPERTY_ID: '123456789',
    });

    const provider = module.get(ANALYTICS_PROVIDER);
    expect(provider._type).toBe('real');
    expect(provider._measurementId).toBe('G-TEST12345');
    expect(provider._apiSecret).toBe('secret_abc');
    expect(provider._propertyId).toBe('123456789');
  });

  it('should provide StubAnalyticsProvider when GA4 env vars are not set', async () => {
    const module = await createModule({});

    const provider = module.get(ANALYTICS_PROVIDER);
    expect(provider._type).toBe('stub');
  });

  it('should provide StubAnalyticsProvider when only some GA4 env vars are set', async () => {
    const module = await createModule({
      GA4_MEASUREMENT_ID: 'G-TEST12345',
      GA4_PROPERTY_ID: '123456789',
    });

    const provider = module.get(ANALYTICS_PROVIDER);
    expect(provider._type).toBe('stub');
  });

  it('should export ANALYTICS_PROVIDER token', () => {
    expect(ANALYTICS_PROVIDER).toBe('ANALYTICS_PROVIDER');
  });
});
