import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ICarrierAdapter, TrackingResult } from '@nextgen-cms/shared';
import { CARRIER_ADAPTERS, REDIS_CLIENT } from '../rates/rate-aggregator.service';
import Redis from 'ioredis';

/** Cache TTL for tracking data (30 minutes) */
const TRACKING_CACHE_TTL_SECONDS = 1_800;

/**
 * TrackingService polls carrier tracking APIs on a schedule
 * and provides on-demand tracking lookups.
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  /**
   * In-memory store of active tracking numbers to poll.
   * In production, this would be backed by the database.
   */
  private activeTrackingNumbers: Map<string, string> = new Map(); // trackingNumber -> carrierName

  constructor(
    @Inject(CARRIER_ADAPTERS)
    private readonly carriers: ICarrierAdapter[],
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
  ) {}

  /**
   * Poll all active shipment tracking numbers every 2 hours.
   * Updates cached tracking data for each active shipment.
   */
  @Cron(CronExpression.EVERY_2_HOURS)
  async pollTrackingUpdates(): Promise<void> {
    if (this.activeTrackingNumbers.size === 0) {
      this.logger.debug('No active tracking numbers to poll');
      return;
    }

    this.logger.log(
      `Polling tracking updates for ${this.activeTrackingNumbers.size} shipment(s)`,
    );

    const entries = Array.from(this.activeTrackingNumbers.entries());

    const results = await Promise.allSettled(
      entries.map(async ([trackingNumber, carrierName]) => {
        const carrier = this.carriers.find(
          (c) => c.carrierName === carrierName,
        );

        if (!carrier) {
          this.logger.warn(
            `Carrier ${carrierName} not found for tracking ${trackingNumber}`,
          );
          return null;
        }

        const result = await carrier.getTracking(trackingNumber);

        // Cache the result
        if (this.redis) {
          try {
            await this.redis.set(
              `shipping:tracking:${trackingNumber}`,
              JSON.stringify(result),
              'EX',
              TRACKING_CACHE_TTL_SECONDS,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to cache tracking for ${trackingNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }

        // Remove delivered shipments from active polling
        if (result.status === 'delivered') {
          this.activeTrackingNumbers.delete(trackingNumber);
          this.logger.log(
            `Shipment ${trackingNumber} delivered, removed from active polling`,
          );
        }

        return result;
      }),
    );

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value !== null,
    ).length;
    const failed = results.filter(
      (r) => r.status === 'rejected',
    ).length;

    this.logger.log(
      `Tracking poll complete: ${succeeded} updated, ${failed} failed`,
    );
  }

  /**
   * Get tracking information for a specific tracking number.
   * Checks Redis cache first, then queries the carrier adapter directly.
   */
  async getTracking(trackingNumber: string): Promise<TrackingResult> {
    // Check cache first
    if (this.redis) {
      try {
        const cached = await this.redis.get(
          `shipping:tracking:${trackingNumber}`,
        );
        if (cached) {
          this.logger.log(`Returning cached tracking for ${trackingNumber}`);
          return JSON.parse(cached) as TrackingResult;
        }
      } catch (error) {
        this.logger.warn(
          `Redis cache read failed for tracking ${trackingNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Query carrier adapter directly
    // Try each carrier until we get a result
    for (const carrier of this.carriers) {
      try {
        const result = await carrier.getTracking(trackingNumber);

        // Cache the result
        if (this.redis) {
          try {
            await this.redis.set(
              `shipping:tracking:${trackingNumber}`,
              JSON.stringify(result),
              'EX',
              TRACKING_CACHE_TTL_SECONDS,
            );
          } catch {
            // Ignore cache write failures
          }
        }

        return result;
      } catch {
        // Try next carrier
        continue;
      }
    }

    // If no carrier returned results, use the first carrier as default
    return this.carriers[0]!.getTracking(trackingNumber);
  }

  /**
   * Register a tracking number for periodic polling.
   */
  registerForTracking(trackingNumber: string, carrierName: string): void {
    this.activeTrackingNumbers.set(trackingNumber, carrierName);
    this.logger.log(
      `Registered ${trackingNumber} (${carrierName}) for tracking polling`,
    );
  }

  /**
   * Unregister a tracking number from periodic polling.
   */
  unregisterTracking(trackingNumber: string): void {
    this.activeTrackingNumbers.delete(trackingNumber);
    this.logger.log(`Unregistered ${trackingNumber} from tracking polling`);
  }
}
