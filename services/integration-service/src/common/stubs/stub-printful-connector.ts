import { Injectable, Logger } from '@nestjs/common';
import type {
  IPrintfulConnector,
  PrintfulProductData,
  PrintfulSyncResult,
  PrintfulSyncProductResponse,
  PrintfulListParams,
  PrintfulOrderData,
  PrintfulOrderResponse,
  PrintfulCancelResult,
  PrintfulShippingParams,
  PrintfulShippingRate,
  PrintfulCarrier,
  PrintfulWebhookEvent,
} from '@agora-cms/shared';

/**
 * Stub implementation of IPrintfulConnector for local development.
 * Returns mock Printful data with realistic delays.
 */
@Injectable()
export class StubPrintfulConnector implements IPrintfulConnector {
  private readonly logger = new Logger(StubPrintfulConnector.name);

  private delay(): Promise<void> {
    const ms = Math.floor(Math.random() * 300) + 200; // 200-500ms
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async syncProduct(productData: PrintfulProductData): Promise<PrintfulSyncResult> {
    await this.delay();
    const syncProductId = `${Math.floor(Math.random() * 999999) + 100000}`;

    this.logger.log(
      `[STUB] Synced product with ${productData.syncVariants.length} variants → syncProductId: ${syncProductId}`,
    );

    return {
      success: true,
      syncProductId,
      syncVariants: productData.syncVariants.map((v, idx) => ({
        id: 1000000 + idx,
        externalId: v.externalId,
        variantId: v.variantId,
      })),
    };
  }

  async updateProductStock(
    syncProductId: string,
    variantId: string,
    quantity: number,
  ): Promise<void> {
    await this.delay();
    this.logger.log(
      `[STUB] Updated stock for sync product ${syncProductId}, variant ${variantId} → quantity: ${quantity}`,
    );
  }

  async getSyncProduct(syncProductId: string): Promise<PrintfulSyncProductResponse> {
    await this.delay();

    this.logger.log(`[STUB] Fetched sync product ${syncProductId}`);

    return {
      id: parseInt(syncProductId, 10),
      externalId: `product_${syncProductId}`,
      name: 'Stub T-Shirt',
      variants: [
        {
          id: 1000001,
          externalId: 'variant_1',
          syncProductId: parseInt(syncProductId, 10),
          variantId: 4012,
          productId: 71,
          retailPrice: '24.99',
          currency: 'USD',
          files: [
            {
              id: 500001,
              url: 'https://files.printful.com/files/stub/mockup.png',
              type: 'mockup',
            },
          ],
        },
      ],
    };
  }

  async listSyncProducts(params?: PrintfulListParams): Promise<PrintfulSyncProductResponse[]> {
    await this.delay();

    const limit = params?.limit || 20;
    this.logger.log(`[STUB] Listed sync products (limit: ${limit})`);

    return [
      {
        id: 123456,
        externalId: 'product_123',
        name: 'Stub T-Shirt 1',
        variants: [],
      },
      {
        id: 123457,
        externalId: 'product_124',
        name: 'Stub Hoodie',
        variants: [],
      },
    ];
  }

  async createOrder(orderData: PrintfulOrderData): Promise<PrintfulOrderResponse> {
    await this.delay();
    const orderId = Math.floor(Math.random() * 999999) + 100000;

    this.logger.log(
      `[STUB] Created Printful order ${orderId} for ${orderData.recipient.name} (${orderData.items.length} items)`,
    );

    return {
      id: orderId,
      externalId: orderData.externalId,
      status: 'draft',
      shipping: orderData.shipping || 'STANDARD',
      created: Math.floor(Date.now() / 1000),
      updated: Math.floor(Date.now() / 1000),
      costs: {
        currency: 'USD',
        subtotal: '20.00',
        discount: '0.00',
        shipping: '4.99',
        digitization: '0.00',
        additionalFee: '0.00',
        fulfillmentFee: '5.00',
        retailDeliveryCosts: '9.99',
        tax: '0.00',
        vat: '0.00',
        total: '29.99',
      },
    };
  }

  async getOrder(orderId: string): Promise<PrintfulOrderResponse> {
    await this.delay();

    this.logger.log(`[STUB] Fetched Printful order ${orderId}`);

    return {
      id: parseInt(orderId, 10),
      externalId: `order_${orderId}`,
      status: 'fulfilled',
      shipping: 'STANDARD',
      created: Math.floor(Date.now() / 1000) - 86400 * 5, // 5 days ago
      updated: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      shipments: [
        {
          id: 50001,
          carrier: 'USPS',
          service: 'USPS First Class',
          trackingNumber: '9400100000000000000001',
          trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000001',
          created: Math.floor(Date.now() / 1000) - 86400 * 3,
          shipDate: new Date(Date.now() - 86400 * 3 * 1000).toISOString().split('T')[0],
          estimatedDelivery: new Date(Date.now() + 86400 * 2 * 1000).toISOString().split('T')[0],
        },
      ],
      costs: {
        currency: 'USD',
        subtotal: '20.00',
        discount: '0.00',
        shipping: '4.99',
        digitization: '0.00',
        additionalFee: '0.00',
        fulfillmentFee: '5.00',
        retailDeliveryCosts: '9.99',
        tax: '0.00',
        vat: '0.00',
        total: '29.99',
      },
    };
  }

  async confirmOrder(orderId: string): Promise<PrintfulOrderResponse> {
    await this.delay();

    this.logger.log(`[STUB] Confirmed Printful order ${orderId} → status: pending`);

    return {
      id: parseInt(orderId, 10),
      externalId: `order_${orderId}`,
      status: 'pending',
      shipping: 'STANDARD',
      created: Math.floor(Date.now() / 1000),
      updated: Math.floor(Date.now() / 1000),
    };
  }

  async cancelOrder(orderId: string): Promise<PrintfulCancelResult> {
    await this.delay();

    this.logger.log(`[STUB] Cancelled Printful order ${orderId}`);

    return {
      success: true,
      orderId: parseInt(orderId, 10),
    };
  }

  async calculateShippingRates(params: PrintfulShippingParams): Promise<PrintfulShippingRate[]> {
    await this.delay();

    this.logger.log(
      `[STUB] Calculated shipping rates for ${params.recipient.countryCode} (${params.items.length} items)`,
    );

    return [
      {
        id: 'STANDARD',
        name: 'Standard Shipping',
        rate: '4.99',
        currency: params.currency || 'USD',
        minDeliveryDays: 5,
        maxDeliveryDays: 10,
      },
      {
        id: 'EXPRESS',
        name: 'Express Shipping',
        rate: '14.99',
        currency: params.currency || 'USD',
        minDeliveryDays: 2,
        maxDeliveryDays: 4,
      },
      {
        id: 'OVERNIGHT',
        name: 'Overnight Shipping',
        rate: '29.99',
        currency: params.currency || 'USD',
        minDeliveryDays: 1,
        maxDeliveryDays: 1,
      },
    ];
  }

  async getShippingCarriers(): Promise<PrintfulCarrier[]> {
    await this.delay();

    this.logger.log('[STUB] Fetched shipping carriers');

    return [
      { code: 'USPS', name: 'United States Postal Service' },
      { code: 'FEDEX', name: 'FedEx' },
      { code: 'UPS', name: 'United Parcel Service' },
    ];
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<PrintfulWebhookEvent> {
    await this.delay();

    this.logger.log(
      `[STUB] Received Printful webhook (signature: ${signature.slice(0, 20)}...)`,
    );

    return {
      type: 'package_shipped',
      data: {
        order: {
          id: 123456,
          externalId: 'order_123',
          status: 'fulfilled',
        },
        shipment: {
          id: 50001,
          carrier: 'USPS',
          service: 'USPS First Class',
          trackingNumber: '9400100000000000000001',
          trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000001',
        },
      },
    };
  }
}
