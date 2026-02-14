import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  ICarrierAdapter,
  ShippingRateRequest,
  ShippingRateResponse,
  ShippingRate,
} from '@nextgen-cms/shared';
import Redis from 'ioredis';

export const CARRIER_ADAPTERS = 'CARRIER_ADAPTERS';
export const REDIS_CLIENT = 'REDIS_CLIENT';

/** Timeout per carrier rate request (5 seconds) */
const CARRIER_TIMEOUT_MS = 5_000;

/** Cache TTL for rate responses (10 minutes) */
const RATE_CACHE_TTL_SECONDS = 600;

@Injectable()
export class RateAggregatorService {
  private readonly logger = new Logger(RateAggregatorService.name);

  constructor(
    @Inject(CARRIER_ADAPTERS)
    private readonly carriers: ICarrierAdapter[],
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
  ) {}

  /**
   * Fires parallel rate requests to all enabled carrier adapters using
   * Promise.allSettled with a 5-second timeout per carrier.
   * Checks Redis cache first. Returns a normalized ShippingRateResponse.
   */
  async getRates(request: ShippingRateRequest): Promise<ShippingRateResponse> {
    const cacheKey = this.buildCacheKey(request);

    // Check Redis cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.logger.log('Returning cached rates');
          const rates: ShippingRate[] = JSON.parse(cached);
          return this.buildResponse(request, rates, true);
        }
      } catch (error) {
        this.logger.warn(
          `Redis cache read failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Fire parallel rate requests with per-carrier timeout
    const ratePromises = this.carriers.map((carrier) =>
      this.withTimeout(
        carrier.getRates(request),
        CARRIER_TIMEOUT_MS,
        carrier.carrierName,
      ),
    );

    const results = await Promise.allSettled(ratePromises);

    const allRates: ShippingRate[] = [];
    results.forEach((result, index) => {
      const carrierName = this.carriers[index]!.carrierName;
      if (result.status === 'fulfilled') {
        this.logger.log(
          `${carrierName}: returned ${result.value.length} rate(s)`,
        );
        allRates.push(...result.value);
      } else {
        this.logger.warn(
          `${carrierName}: rate request failed - ${result.reason}`,
        );
      }
    });

    // Sort rates by price ascending
    allRates.sort((a, b) => a.totalCharge - b.totalCharge);

    // Cache the result
    if (this.redis && allRates.length > 0) {
      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(allRates),
          'EX',
          RATE_CACHE_TTL_SECONDS,
        );
      } catch (error) {
        this.logger.warn(
          `Redis cache write failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return this.buildResponse(request, allRates, false);
  }

  private buildResponse(
    request: ShippingRateRequest,
    rates: ShippingRate[],
    cached: boolean,
  ): ShippingRateResponse {
    return {
      shipFrom: request.shipFrom,
      shipTo: request.shipTo,
      packages: request.packages,
      rates,
      cached,
    };
  }

  private buildCacheKey(request: ShippingRateRequest): string {
    const packageHash = request.packages
      .map(
        (p) =>
          `${p.weight.value}${p.weight.unit}-${p.dimensions.length}x${p.dimensions.width}x${p.dimensions.height}${p.dimensions.unit}`,
      )
      .join('|');

    return `shipping:rates:${request.shipFrom.postalCode}:${request.shipTo.postalCode}:${request.shipTo.country}:${packageHash}`;
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
