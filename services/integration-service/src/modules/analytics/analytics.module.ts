import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StubAnalyticsProvider } from '../../common/stubs/stub-analytics-provider';
import { GoogleAnalyticsProvider } from './google-analytics-provider';

export const ANALYTICS_PROVIDER = 'ANALYTICS_PROVIDER';

/**
 * AnalyticsModule provides the IAnalyticsProvider implementation.
 *
 * When GA4_MEASUREMENT_ID, GA4_API_SECRET, and GA4_PROPERTY_ID are set,
 * the real Google Analytics 4 provider is used. Otherwise, the
 * StubAnalyticsProvider is injected for local development.
 *
 * Also requires GOOGLE_APPLICATION_CREDENTIALS environment variable
 * pointing to service account JSON file for Data API access.
 */
@Module({
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
  ],
  exports: [ANALYTICS_PROVIDER],
})
export class AnalyticsModule {}
