import { EVENTS, type ProductVariant } from '@agora-cms/shared';
import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

import { ProductService } from '../products/product.service';

export interface ReservationItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface Reservation {
  reservationId: string;
  items: ReservationItem[];
  createdAt: string;
  expiresAt: string;
}

export interface ReserveResult {
  reservationId: string;
  expiresAt: Date;
}

const RESERVATION_TTL_SECONDS = 15 * 60; // 15 minutes
const RESERVATION_PREFIX = 'reservation:';
const RESERVED_PREFIX = 'reserved:';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private kafkaProducer: Producer | null = null;

  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
    private readonly productService: ProductService,
  ) {
    this.initKafka();
  }

  private async initKafka(): Promise<void> {
    const brokers = this.config.get<string>('KAFKA_BROKERS');
    if (brokers) {
      const kafka = new Kafka({
        clientId: 'commerce-service-reservation',
        brokers: brokers.split(','),
      });
      this.kafkaProducer = kafka.producer();
      await this.kafkaProducer.connect();
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Reserve inventory for cart checkout.
   * Checks available stock (total - existing reservations), throws if insufficient.
   * Stores reservation in Redis with a 15-minute TTL.
   */
  async reserve(items: ReservationItem[]): Promise<ReserveResult> {
    if (!items.length) {
      throw new BadRequestException('At least one item is required to create a reservation');
    }

    const reservationId = uuidv4();

    // Validate availability for each item
    for (const item of items) {
      const available = await this.getAvailableQuantity(item.productId, item.variantId);
      if (available < item.quantity) {
        const sku = item.variantId
          ? `${item.productId}/${item.variantId}`
          : item.productId;
        throw new BadRequestException(
          `Insufficient stock for ${sku}: requested ${item.quantity}, available ${available}`,
        );
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_TTL_SECONDS * 1000);

    const reservation: Reservation = {
      reservationId,
      items,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store the reservation with TTL
    await this.redis.set(
      `${RESERVATION_PREFIX}${reservationId}`,
      JSON.stringify(reservation),
      'EX',
      RESERVATION_TTL_SECONDS,
    );

    // Increment per-SKU reserved counts
    for (const item of items) {
      const key = this.reservedKey(item.productId, item.variantId);
      await this.redis.incrby(key, item.quantity);
    }

    this.logger.log(
      `Reservation created: ${reservationId} with ${items.length} item(s), expires at ${expiresAt.toISOString()}`,
    );

    return { reservationId, expiresAt };
  }

  /**
   * Confirm a reservation (after payment success).
   * Decrements actual inventory in the product variants and publishes INVENTORY_RESERVED event.
   */
  async confirm(reservationId: string): Promise<void> {
    const reservation = await this.loadReservation(reservationId);

    // Decrement actual inventory for each item
    for (const item of reservation.items) {
      await this.decrementInventory(item.productId, item.variantId, item.quantity);
    }

    // Clean up reserved counts and reservation key
    for (const item of reservation.items) {
      const key = this.reservedKey(item.productId, item.variantId);
      await this.redis.decrby(key, item.quantity);
      // Ensure we don't go negative
      const val = await this.redis.get(key);
      if (val !== null && parseInt(val, 10) <= 0) {
        await this.redis.del(key);
      }
    }

    await this.redis.del(`${RESERVATION_PREFIX}${reservationId}`);

    // Publish Kafka event
    await this.publishEvent(EVENTS.INVENTORY_RESERVED, {
      reservationId,
      items: reservation.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        quantity: i.quantity,
      })),
    });

    this.logger.log(`Reservation confirmed: ${reservationId}`);
  }

  /**
   * Cancel a reservation manually.
   * Decrements per-SKU reserved counts and deletes the reservation key.
   */
  async cancel(reservationId: string): Promise<void> {
    const reservation = await this.loadReservation(reservationId);

    // Decrement per-SKU reserved counts
    for (const item of reservation.items) {
      const key = this.reservedKey(item.productId, item.variantId);
      await this.redis.decrby(key, item.quantity);
      const val = await this.redis.get(key);
      if (val !== null && parseInt(val, 10) <= 0) {
        await this.redis.del(key);
      }
    }

    await this.redis.del(`${RESERVATION_PREFIX}${reservationId}`);

    this.logger.log(`Reservation cancelled: ${reservationId}`);
  }

  /**
   * Get total reserved quantity for a product/variant from Redis.
   */
  async getReservedQuantity(productId: string, variantId?: string): Promise<number> {
    const key = this.reservedKey(productId, variantId);
    const val = await this.redis.get(key);
    return val ? Math.max(0, parseInt(val, 10)) : 0;
  }

  /**
   * Get available quantity = stock - reserved.
   */
  async getAvailableQuantity(productId: string, variantId?: string): Promise<number> {
    const stockQuantity = await this.getStockQuantity(productId, variantId);
    const reserved = await this.getReservedQuantity(productId, variantId);
    return Math.max(0, stockQuantity - reserved);
  }

  // -------------------------------------------------------------------------
  // Cron: clean up stale reserved counts from expired reservations
  // -------------------------------------------------------------------------

  /**
   * Every 5 minutes, scan for reservation keys that have expired but left
   * stale reserved counts. This is a safety net — normally TTL handles expiry,
   * but the per-SKU counters don't auto-expire with the reservation.
   */
  @Cron('*/5 * * * *')
  async cleanupStaleReservations(): Promise<void> {
    this.logger.debug('Running stale reservation cleanup...');

    let cursor = '0';
    const staleKeys: string[] = [];

    // Scan for all reserved:* keys
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${RESERVED_PREFIX}*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      for (const key of keys) {
        const val = await this.redis.get(key);
        if (val !== null && parseInt(val, 10) <= 0) {
          staleKeys.push(key);
        }
      }
    } while (cursor !== '0');

    if (staleKeys.length > 0) {
      await this.redis.del(...staleKeys);
      this.logger.log(`Cleaned up ${staleKeys.length} stale reserved count key(s)`);
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async loadReservation(reservationId: string): Promise<Reservation> {
    const data = await this.redis.get(`${RESERVATION_PREFIX}${reservationId}`);
    if (!data) {
      throw new NotFoundException(
        `Reservation ${reservationId} not found (it may have expired)`,
      );
    }
    return JSON.parse(data) as Reservation;
  }

  private reservedKey(productId: string, variantId?: string): string {
    return variantId
      ? `${RESERVED_PREFIX}${productId}:${variantId}`
      : `${RESERVED_PREFIX}${productId}:default`;
  }

  private async getStockQuantity(productId: string, variantId?: string): Promise<number> {
    const product = await this.productService.findById(productId);
    const variants = (product.variants ?? []) as ProductVariant[];

    if (variantId) {
      const variant = variants.find((v) => v.variantId === variantId);
      if (!variant) {
        throw new NotFoundException(
          `Variant ${variantId} not found on product ${productId}`,
        );
      }
      return variant.inventory.quantity;
    }

    // If no variantId specified, sum all variant quantities (or return 0 if no variants)
    if (variants.length === 0) {
      return 0;
    }
    return variants.reduce((sum, v) => sum + v.inventory.quantity, 0);
  }

  private async decrementInventory(
    productId: string,
    variantId: string | undefined,
    quantity: number,
  ): Promise<void> {
    const product = await this.productService.findById(productId);
    const variants = [...((product.variants ?? []) as ProductVariant[])];

    if (variantId) {
      const idx = variants.findIndex((v) => v.variantId === variantId);
      if (idx === -1) {
        throw new NotFoundException(
          `Variant ${variantId} not found on product ${productId}`,
        );
      }
      variants[idx] = {
        ...variants[idx]!,
        inventory: {
          ...variants[idx]!.inventory,
          quantity: Math.max(0, variants[idx]!.inventory.quantity - quantity),
        },
      };
    } else if (variants.length > 0) {
      // Decrement from first variant with sufficient stock
      let remaining = quantity;
      for (let i = 0; i < variants.length && remaining > 0; i++) {
        const deduct = Math.min(variants[i]!.inventory.quantity, remaining);
        variants[i] = {
          ...variants[i]!,
          inventory: {
            ...variants[i]!.inventory,
            quantity: variants[i]!.inventory.quantity - deduct,
          },
        };
        remaining -= deduct;
      }
    }

    // Persist the updated variants directly via Prisma (same pattern as ProductService)
    await this.prisma.product.update({
      where: { id: productId },
      data: { variants: variants as any },
    });

    this.logger.debug(
      `Decremented inventory for ${productId}${variantId ? `/${variantId}` : ''} by ${quantity}`,
    );
  }

  private async publishEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.kafkaProducer) return;
    try {
      await this.kafkaProducer.send({
        topic: 'commerce.events',
        messages: [
          {
            key: (payload.reservationId as string) ?? uuidv4(),
            value: JSON.stringify({
              eventId: uuidv4(),
              eventType,
              timestamp: new Date().toISOString(),
              source: 'commerce-service',
              payload,
            }),
          },
        ],
      });
    } catch (err) {
      this.logger.error(`Failed to publish event ${eventType}`, err);
    }
  }
}
