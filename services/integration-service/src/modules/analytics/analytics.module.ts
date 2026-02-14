import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StubAnalyticsProvider } from '../../common/stubs/stub-analytics-provider';

export const ANALYTICS_PROVIDER = 'ANALYTICS_PROVIDER';

/**
 * AnalyticsModule provides the IAnalyticsProvider implementation.
 *
 * When GA4_MEASUREMENT_ID and GA4_API_SECRET are set in the environment,
 * a real GA4 provider will be used (not yet implemented). Otherwise, the
 * StubAnalyticsProvider is injected for local development.
 */
@Module({
  providers: [
    {
      provide: ANALYTICS_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const measurementId = configService.get<string>('GA4_MEASUREMENT_ID');
        const apiSecret = configService.get<string>('GA4_API_SECRET');

        if (measurementId && apiSecret) {
          // TODO: Return real GA4 provider when implemented
          // return new GA4AnalyticsProvider(measurementId, apiSecret);
          return new StubAnalyticsProvider();
        }

        return new StubAnalyticsProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [ANALYTICS_PROVIDER],
})
export class AnalyticsModule {}
