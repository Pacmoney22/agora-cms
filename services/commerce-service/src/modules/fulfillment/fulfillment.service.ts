import type { OrderDto, PaginatedResponse } from '@agora-cms/shared';
import { Injectable, Logger } from '@nestjs/common';

import { OrderService } from '../orders/order.service';

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(private readonly orderService: OrderService) {}

  async listPendingFulfillment(
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<OrderDto>> {
    // Get orders in confirmed/processing status that need fulfillment
    return this.orderService.findAll({ page, limit, status: 'confirmed' });
  }

  async shipOrder(
    orderId: string,
    trackingNumber: string,
    carrier: string,
  ): Promise<OrderDto> {
    return this.orderService.fulfillOrder(orderId, { trackingNumber, carrier });
  }

  async deliverDigitalItems(orderId: string): Promise<OrderDto> {
    const order = await this.orderService.findById(orderId);

    // Mark virtual line items as fulfilled
    order.lineItems
      .filter((li) => li.productType === 'virtual')
      .forEach((li) => {
        li.status = 'fulfilled';
        // In production, this would trigger download link / license key generation
        li.fulfillment = {
          ...li.fulfillment,
          downloadUrl: `https://downloads.example.com/${li.productId}/${li.sku}`,
        };
      });

    order.updatedAt = new Date().toISOString();
    this.logger.log(`Digital items delivered for order ${orderId}`);
    return order;
  }
}
