import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RatesController } from './rates.controller';
import { RateAggregatorService, CARRIER_ADAPTERS, REDIS_CLIENT } from './rate-aggregator.service';
import { StubCarrierAdapter } from '../../adapters/stub/stub-carrier.adapter';
import Redis from 'ioredis';

@Module({
  controllers: [RatesController],
  providers: [
    RateAggregatorService,
    StubCarrierAdapter,
    {
      provide: CARRIER_ADAPTERS,
      useFactory: (stubCarrier: StubCarrierAdapter) => {
        // In production, additional carrier adapters (UPS, FedEx, USPS)
        // would be conditionally added here based on env config.
        return [stubCarrier];
      },
      inject: [StubCarrierAdapter],
    },
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          try {
            return new Redis(redisUrl, {
              maxRetriesPerRequest: 3,
              lazyConnect: true,
            });
          } catch {
            return null;
          }
        }
        return null;
      },
      inject: [ConfigService],
    },
  ],
  exports: [RateAggregatorService, CARRIER_ADAPTERS, REDIS_CLIENT],
})
export class RatesModule {}
