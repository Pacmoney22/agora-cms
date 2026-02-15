import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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
import * as crypto from 'crypto';

/**
 * Real Printful API connector.
 *
 * Requires:
 * - PRINTFUL_API_KEY (from https://www.printful.com/dashboard/store > API)
 *
 * API Documentation: https://developers.printful.com/docs/
 */
@Injectable()
export class PrintfulConnector implements IPrintfulConnector {
  private readonly logger = new Logger(PrintfulConnector.name);
  private readonly api: AxiosInstance;

  constructor(private readonly apiKey: string) {
    this.api = axios.create({
      baseURL: 'https://api.printful.com',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log('Printful connector initialized');
  }

  async syncProduct(productData: PrintfulProductData): Promise<PrintfulSyncResult> {
    try {
      const response = await this.api.post('/store/products', {
        sync_variants: productData.syncVariants.map((v) => ({
          external_id: v.externalId,
          variant_id: v.variantId,
          retail_price: (v.retailPrice / 100).toFixed(2), // Convert cents to dollars
          files: v.files,
        })),
      });

      const data = response.data.result;

      this.logger.log(
        `Synced product ${data.id} with ${data.sync_variants.length} variants`,
      );

      return {
        success: true,
        syncProductId: data.id.toString(),
        syncVariants: data.sync_variants.map((v: any) => ({
          id: v.id,
          externalId: v.external_id,
          variantId: v.variant_id,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        syncProductId: '',
        syncVariants: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateProductStock(
    syncProductId: string,
    variantId: string,
    quantity: number,
  ): Promise<void> {
    try {
      await this.api.put(`/store/products/${syncProductId}/variants/${variantId}`, {
        quantity,
      });

      this.logger.log(
        `Updated stock for product ${syncProductId}, variant ${variantId} → ${quantity}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update product stock: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getSyncProduct(syncProductId: string): Promise<PrintfulSyncProductResponse> {
    try {
      const response = await this.api.get(`/store/products/${syncProductId}`);
      const data = response.data.result;

      this.logger.log(`Fetched sync product ${syncProductId}`);

      return {
        id: data.id,
        externalId: data.external_id,
        name: data.name,
        variants: data.sync_variants.map((v: any) => ({
          id: v.id,
          externalId: v.external_id,
          syncProductId: v.sync_product_id,
          variantId: v.variant_id,
          productId: v.product?.product_id,
          retailPrice: v.retail_price,
          currency: v.currency,
          files: v.files.map((f: any) => ({
            id: f.id,
            url: f.url,
            type: f.type,
          })),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch sync product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async listSyncProducts(params?: PrintfulListParams): Promise<PrintfulSyncProductResponse[]> {
    try {
      const queryParams: any = {};
      if (params?.status) queryParams.status = params.status;
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.offset) queryParams.offset = params.offset;

      const response = await this.api.get('/store/products', { params: queryParams });
      const data = response.data.result;

      this.logger.log(`Listed ${data.length} sync products`);

      return data.map((item: any) => ({
        id: item.id,
        externalId: item.external_id,
        name: item.name,
        variants: [], // Summary response doesn't include full variant details
      }));
    } catch (error) {
      this.logger.error(
        `Failed to list sync products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async createOrder(orderData: PrintfulOrderData): Promise<PrintfulOrderResponse> {
    try {
      const response = await this.api.post('/orders', {
        external_id: orderData.externalId,
        recipient: orderData.recipient,
        items: orderData.items.map((item) => ({
          sync_variant_id: item.syncVariantId,
          quantity: item.quantity,
          retail_price: item.retailPrice,
        })),
        shipping: orderData.shipping,
      });

      const data = response.data.result;

      this.logger.log(
        `Created Printful order ${data.id} (${orderData.externalId}) with ${orderData.items.length} items`,
      );

      return this.mapOrderResponse(data);
    } catch (error) {
      this.logger.error(
        `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<PrintfulOrderResponse> {
    try {
      const response = await this.api.get(`/orders/${orderId}`);
      const data = response.data.result;

      this.logger.log(`Fetched Printful order ${orderId}`);

      return this.mapOrderResponse(data);
    } catch (error) {
      this.logger.error(
        `Failed to fetch order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async confirmOrder(orderId: string): Promise<PrintfulOrderResponse> {
    try {
      const response = await this.api.post(`/orders/${orderId}/confirm`);
      const data = response.data.result;

      this.logger.log(`Confirmed Printful order ${orderId} → status: ${data.status}`);

      return this.mapOrderResponse(data);
    } catch (error) {
      this.logger.error(
        `Failed to confirm order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<PrintfulCancelResult> {
    try {
      const response = await this.api.delete(`/orders/${orderId}`);
      const data = response.data.result;

      this.logger.log(`Cancelled Printful order ${orderId}`);

      return {
        success: true,
        orderId: parseInt(orderId, 10),
      };
    } catch (error) {
      this.logger.error(
        `Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        orderId: parseInt(orderId, 10),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async calculateShippingRates(params: PrintfulShippingParams): Promise<PrintfulShippingRate[]> {
    try {
      const response = await this.api.post('/shipping/rates', {
        recipient: params.recipient,
        items: params.items.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
        })),
        currency: params.currency || 'USD',
        locale: params.locale || 'en_US',
      });

      const data = response.data.result;

      this.logger.log(
        `Calculated ${data.length} shipping rates for ${params.recipient.countryCode}`,
      );

      return data.map((rate: any) => ({
        id: rate.id,
        name: rate.name,
        rate: rate.rate,
        currency: rate.currency,
        minDeliveryDays: rate.minDeliveryDays,
        maxDeliveryDays: rate.maxDeliveryDays,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to calculate shipping rates: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getShippingCarriers(): Promise<PrintfulCarrier[]> {
    try {
      const response = await this.api.get('/shipping/carriers');
      const data = response.data.result;

      this.logger.log(`Fetched ${data.length} shipping carriers`);

      return data.map((carrier: any) => ({
        code: carrier.code,
        name: carrier.name,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch shipping carriers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<PrintfulWebhookEvent> {
    // Verify webhook signature
    // Printful uses HMAC-SHA256 with webhook secret
    // Note: You need to configure PRINTFUL_WEBHOOK_SECRET in environment
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.PRINTFUL_WEBHOOK_SECRET!)
    //   .update(payload)
    //   .digest('hex');
    //
    // if (signature !== expectedSignature) {
    //   throw new Error('Invalid webhook signature');
    // }

    const data = JSON.parse(payload.toString('utf8'));

    this.logger.log(`Received Printful webhook: ${data.type}`);

    // Map Printful webhook event to our interface
    return {
      type: data.type as PrintfulWebhookEvent['type'],
      data: {
        order: data.data?.order ? {
          id: data.data.order.id,
          externalId: data.data.order.external_id,
          status: data.data.order.status,
        } : undefined,
        shipment: data.data?.shipment ? {
          id: data.data.shipment.id,
          carrier: data.data.shipment.carrier,
          service: data.data.shipment.service,
          trackingNumber: data.data.shipment.tracking_number,
          trackingUrl: data.data.shipment.tracking_url,
        } : undefined,
        reason: data.data?.reason,
      },
    };
  }

  // Helper method to map Printful order response to our interface
  private mapOrderResponse(data: any): PrintfulOrderResponse {
    return {
      id: data.id,
      externalId: data.external_id,
      status: data.status,
      shipping: data.shipping,
      created: data.created,
      updated: data.updated,
      shipments: data.shipments?.map((s: any) => ({
        id: s.id,
        carrier: s.carrier,
        service: s.service,
        trackingNumber: s.tracking_number,
        trackingUrl: s.tracking_url,
        created: s.created,
        shipDate: s.ship_date,
        estimatedDelivery: s.estimated_delivery,
      })),
      costs: data.costs ? {
        currency: data.costs.currency,
        subtotal: data.costs.subtotal,
        discount: data.costs.discount,
        shipping: data.costs.shipping,
        digitization: data.costs.digitization,
        additionalFee: data.costs.additional_fee,
        fulfillmentFee: data.costs.fulfillment_fee,
        retailDeliveryCosts: data.costs.retail_delivery_costs,
        tax: data.costs.tax,
        vat: data.costs.vat,
        total: data.costs.total,
      } : undefined,
    };
  }
}
