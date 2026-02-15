import {
  PRODUCT_TYPE_REQUIRES_SHIPPING,
  EVENTS,
  type CartDto,
  type CartItem,
  type AddToCartDto,
  type ProductDto,
} from '@agora-cms/shared';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

import { ProductService } from '../products/product.service';

const CART_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const CART_PREFIX = 'cart:';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private redis: Redis | null = null;
  private kafkaProducer: Producer | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly productService: ProductService,
  ) {
    this.initRedis();
    this.initKafka();
  }

  private initRedis(): void {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.logger.log('Redis client connected for cart storage');
    } else {
      this.logger.warn('REDIS_URL not set -- using in-memory fallback (dev only)');
    }
  }

  private async initKafka(): Promise<void> {
    const brokers = this.config.get<string>('KAFKA_BROKERS');
    if (brokers) {
      const kafka = new Kafka({
        clientId: 'commerce-service-cart',
        brokers: brokers.split(','),
      });
      this.kafkaProducer = kafka.producer();
      await this.kafkaProducer.connect();
    }
  }

  // In-memory fallback for development
  private memoryStore = new Map<string, CartDto>();

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async getCart(cartId: string): Promise<CartDto> {
    const cart = await this.loadCart(cartId);
    if (!cart) {
      // Return empty cart
      return this.emptyCart(cartId);
    }
    return cart;
  }

  async addItem(cartId: string, dto: AddToCartDto): Promise<CartDto> {
    const product = await this.productService.findById(dto.productId);
    const cart = (await this.loadCart(cartId)) ?? this.emptyCart(cartId);

    // Check if item already exists (same product + variant)
    const existingIdx = cart.items.findIndex(
      (item) => item.productId === dto.productId && item.variantId === (dto.variantId ?? null),
    );

    if (existingIdx >= 0) {
      cart.items[existingIdx]!.quantity += dto.quantity;
      cart.items[existingIdx]!.totalPrice =
        cart.items[existingIdx]!.unitPrice * cart.items[existingIdx]!.quantity;
    } else {
      const unitPrice = this.resolvePrice(product, dto.variantId ?? null);
      const requiresShipping = PRODUCT_TYPE_REQUIRES_SHIPPING[product.type] ?? false;

      const cartItem: CartItem = {
        cartItemId: uuidv4(),
        productId: dto.productId,
        variantId: dto.variantId ?? null,
        productType: product.type,
        resolvedType: null,
        name: product.name,
        sku: product.sku,
        quantity: dto.quantity,
        unitPrice,
        totalPrice: unitPrice * dto.quantity,
        image: product.images?.[0]?.url ?? null,
        configuration: dto.configuration ?? null,
        weight: product.shipping?.weight ?? null,
        requiresShipping,
      };

      cart.items.push(cartItem);
    }

    this.recalculateCart(cart);
    await this.saveCart(cart);
    await this.publishCartEvent(EVENTS.CART_UPDATED, cart);

    return cart;
  }

  async updateItem(
    cartId: string,
    cartItemId: string,
    quantity: number,
  ): Promise<CartDto> {
    const cart = await this.loadCart(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    const itemIdx = cart.items.findIndex((i) => i.cartItemId === cartItemId);
    if (itemIdx === -1) {
      throw new NotFoundException(`Cart item ${cartItemId} not found`);
    }

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0. Use DELETE to remove items.');
    }

    cart.items[itemIdx]!.quantity = quantity;
    cart.items[itemIdx]!.totalPrice = cart.items[itemIdx]!.unitPrice * quantity;

    this.recalculateCart(cart);
    await this.saveCart(cart);
    await this.publishCartEvent(EVENTS.CART_UPDATED, cart);

    return cart;
  }

  async removeItem(cartId: string, cartItemId: string): Promise<CartDto> {
    const cart = await this.loadCart(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    const itemIdx = cart.items.findIndex((i) => i.cartItemId === cartItemId);
    if (itemIdx === -1) {
      throw new NotFoundException(`Cart item ${cartItemId} not found`);
    }

    cart.items.splice(itemIdx, 1);

    this.recalculateCart(cart);
    await this.saveCart(cart);
    await this.publishCartEvent(EVENTS.CART_UPDATED, cart);

    return cart;
  }

  // -------------------------------------------------------------------------
  // Persistence helpers
  // -------------------------------------------------------------------------

  private async loadCart(cartId: string): Promise<CartDto | null> {
    if (this.redis) {
      const data = await this.redis.get(`${CART_PREFIX}${cartId}`);
      return data ? JSON.parse(data) : null;
    }
    return this.memoryStore.get(cartId) ?? null;
  }

  private async saveCart(cart: CartDto): Promise<void> {
    if (this.redis) {
      await this.redis.set(
        `${CART_PREFIX}${cart.cartId}`,
        JSON.stringify(cart),
        'EX',
        CART_TTL_SECONDS,
      );
    } else {
      this.memoryStore.set(cart.cartId, cart);
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private emptyCart(cartId: string): CartDto {
    return {
      cartId,
      items: [],
      subtotal: 0,
      itemCount: 0,
      hasPhysicalItems: false,
      hasVirtualItems: false,
      hasServiceItems: false,
      estimatedShipping: null,
      couponCode: null,
      discount: 0,
    };
  }

  private recalculateCart(cart: CartDto): void {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.hasPhysicalItems = cart.items.some((i) => i.productType === 'physical');
    cart.hasVirtualItems = cart.items.some((i) => i.productType === 'virtual');
    cart.hasServiceItems = cart.items.some((i) => i.productType === 'service');
  }

  private resolvePrice(product: ProductDto, variantId: string | null): number {
    if (variantId && product.variants) {
      const variant = product.variants.find((v) => v.variantId === variantId);
      if (variant?.priceOverride != null) return variant.priceOverride;
      if (variant?.salePrice != null) return variant.salePrice;
    }
    return product.pricing.salePrice ?? product.pricing.basePrice;
  }

  private async publishCartEvent(eventType: string, cart: CartDto): Promise<void> {
    if (!this.kafkaProducer) return;
    try {
      await this.kafkaProducer.send({
        topic: 'commerce.events',
        messages: [
          {
            key: cart.cartId,
            value: JSON.stringify({
              eventId: uuidv4(),
              eventType,
              timestamp: new Date().toISOString(),
              source: 'commerce-service',
              payload: {
                cartId: cart.cartId,
                itemCount: cart.itemCount,
                subtotal: cart.subtotal,
              },
            }),
          },
        ],
      });
    } catch (err) {
      this.logger.error(`Failed to publish cart event ${eventType}`, err);
    }
  }
}
