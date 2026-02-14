import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Kafka, Producer } from 'kafkajs';
import {
  EVENTS,
  type OrderDto,
  type OrderLineItem,
  type Address,
} from '@agora-cms/shared';
import { CartService } from '../cart/cart.service';
import { OrderService } from '../orders/order.service';
import { ReservationService } from '../inventory/reservation.service';
import { TaxCalculationService } from './tax-calculation.service';

export interface CheckoutRequest {
  cartId: string;
  userId?: string;
  guestEmail?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingMethodCode?: string;
  paymentMethodId?: string;
  couponCode?: string;
  notes?: string;
}

export interface CheckoutResult {
  order: OrderDto;
  paymentRequired: boolean;
  paymentClientSecret?: string;
  reservationId: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private kafkaProducer: Producer | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
    private readonly reservationService: ReservationService,
    private readonly taxCalculation: TaxCalculationService,
  ) {
    this.initKafka();
  }

  private async initKafka(): Promise<void> {
    const brokers = this.config.get<string>('KAFKA_BROKERS');
    if (brokers) {
      const kafka = new Kafka({
        clientId: 'commerce-service-checkout',
        brokers: brokers.split(','),
      });
      this.kafkaProducer = kafka.producer();
      await this.kafkaProducer.connect();
    }
  }

  // -------------------------------------------------------------------------
  // Checkout orchestration
  // -------------------------------------------------------------------------

  async processCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    this.logger.log(`Processing checkout for cart ${request.cartId}`);

    // 1. Load and validate cart
    const cart = await this.cartService.getCart(request.cartId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot checkout with an empty cart');
    }

    // 2. Validate identity
    if (!request.userId && !request.guestEmail) {
      throw new BadRequestException('Either userId or guestEmail is required');
    }

    // 3. Validate shipping address for physical items
    if (cart.hasPhysicalItems && !request.shippingAddress) {
      throw new BadRequestException('Shipping address is required for physical items');
    }

    // 4. Reserve inventory before proceeding
    const reservationItems = cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      quantity: item.quantity,
    }));

    const reservation = await this.reservationService.reserve(reservationItems);
    this.logger.log(
      `Inventory reserved: ${reservation.reservationId}, expires at ${reservation.expiresAt.toISOString()}`,
    );

    try {
      // 5. Calculate totals
      const subtotal = cart.subtotal;
      const discount = cart.discount ?? 0;
      const shippingCost = cart.hasPhysicalItems
        ? await this.calculateShipping(request)
        : 0;

      // Build line items for tax calculation
      const taxLineItems = cart.items.map((item: any) => ({
        amount: item.totalPrice,
        name: item.name,
        productTaxCode: item.productTaxCode,
      }));

      // Load tax settings and calculate via Stripe Tax or manual rates
      const taxSettings = await this.loadTaxSettings();
      const taxResult = await this.taxCalculation.calculateTax(
        taxLineItems,
        request.shippingAddress ?? null,
        shippingCost,
        taxSettings,
      );

      const tax = taxResult.taxAmount;
      const total = subtotal - discount + shippingCost + tax;

      // 6. Convert cart items to order line items
      const lineItems: OrderLineItem[] = cart.items.map((item) => ({
        lineItemId: uuidv4(),
        productId: item.productId,
        variantId: item.variantId,
        productType: item.productType,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        status: 'pending',
        configuration: item.configuration
          ? { selections: item.configuration.selections }
          : null,
        fulfillment: null,
      }));

      // 7. Create the order
      const order = await this.orderService.createOrder({
        userId: request.userId ?? null,
        guestEmail: request.guestEmail ?? null,
        status: 'pending',
        lineItems,
        subtotal,
        tax,
        shippingCost,
        discount,
        total,
        currency: 'USD',
        shippingAddress: request.shippingAddress ?? null,
        billingAddress: request.billingAddress ?? request.shippingAddress ?? null,
        couponCode: request.couponCode ?? null,
        notes: request.notes ?? null,
      });

      // 8. Publish checkout event
      await this.publishEvent(EVENTS.CHECKOUT_STARTED, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        cartId: request.cartId,
        total: order.total,
        currency: order.currency,
        reservationId: reservation.reservationId,
      });

      // 9. Determine if payment is needed
      const paymentRequired = total > 0;

      this.logger.log(
        `Checkout complete: order ${order.orderNumber}, total: ${total}, payment required: ${paymentRequired}`,
      );

      return {
        order,
        paymentRequired,
        // In a real implementation, this would come from Stripe/payment provider
        paymentClientSecret: paymentRequired ? `pi_${uuidv4()}_secret` : undefined,
        reservationId: reservation.reservationId,
      };
    } catch (err) {
      // If anything fails after reservation, cancel it to release stock
      this.logger.warn(
        `Checkout failed after reservation, cancelling reservation ${reservation.reservationId}`,
      );
      await this.reservationService.cancel(reservation.reservationId).catch((cancelErr) => {
        this.logger.error('Failed to cancel reservation after checkout error', cancelErr);
      });
      throw err;
    }
  }

  /**
   * Called after payment succeeds to confirm the reservation and decrement real inventory.
   */
  async confirmPayment(reservationId: string): Promise<void> {
    await this.reservationService.confirm(reservationId);
    this.logger.log(`Payment confirmed, reservation ${reservationId} committed`);
  }

  // -------------------------------------------------------------------------
  // Calculation helpers
  // -------------------------------------------------------------------------

  private async calculateShipping(request: CheckoutRequest): Promise<number> {
    // TODO: integrate with shipping-gateway service for real rates
    // For now, return a flat rate placeholder
    return 999; // $9.99 in cents
  }

  /**
   * Load tax settings from the content-service settings API.
   * Falls back to defaults if the settings endpoint is unreachable.
   */
  private async loadTaxSettings(): Promise<any> {
    try {
      const contentApiUrl = this.config.get<string>('CONTENT_API_URL') || 'http://localhost:3001';
      const res = await fetch(`${contentApiUrl}/api/v1/settings/tax`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      this.logger.warn(`Could not load tax settings, using defaults: ${(err as Error).message}`);
    }
    return this.taxCalculation.getDefaultSettings();
  }

  // -------------------------------------------------------------------------
  // Kafka helper
  // -------------------------------------------------------------------------

  private async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.kafkaProducer) return;
    try {
      await this.kafkaProducer.send({
        topic: 'commerce.events',
        messages: [
          {
            key: (payload.orderId as string) ?? uuidv4(),
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
