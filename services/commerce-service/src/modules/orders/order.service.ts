import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Kafka, Producer } from 'kafkajs';
import {
  EVENTS,
  VALID_ORDER_TRANSITIONS,
  type OrderDto,
  type OrderStatus,
  type PaginatedResponse,
} from '@agora-cms/shared';
import { ProductService } from '../products/product.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private kafkaProducer: Producer | null = null;

  constructor(
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
        clientId: 'commerce-service-orders',
        brokers: brokers.split(','),
      });
      this.kafkaProducer = kafka.producer();
      await this.kafkaProducer.connect();
    }
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    userId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<OrderDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: rows.map((r: any) => this.toOrderDto(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<OrderDto> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return this.toOrderDto(row);
  }

  // -------------------------------------------------------------------------
  // Create (called from checkout)
  // -------------------------------------------------------------------------

  async createOrder(data: Omit<OrderDto, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<OrderDto> {
    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: data.userId ?? null,
        guestEmail: data.guestEmail ?? null,
        status: data.status ?? 'pending',
        lineItems: data.lineItems as any,
        subtotal: data.subtotal,
        tax: data.tax ?? 0,
        shippingCost: data.shippingCost ?? 0,
        discount: data.discount ?? 0,
        total: data.total,
        currency: data.currency ?? 'USD',
        shippingAddress: (data.shippingAddress ?? undefined) as any,
        billingAddress: (data.billingAddress ?? undefined) as any,
        couponCode: data.couponCode ?? null,
        notes: data.notes ?? null,
      },
    });

    const result = this.toOrderDto(order);

    // Store creation event
    await this.appendEvent(order.id, 'order.created', { order: result });

    // Fetch product details for each line item to include in Kafka event
    const lineItemsWithDetails = await Promise.all(
      (result.lineItems as any[]).map(async (li: any) => {
        try {
          const product = await this.productService.findById(li.productId);
          return {
            id: li.id,
            productId: li.productId,
            productType: li.productType,
            quantity: li.quantity,
            amount: li.totalPrice,
            productDetails: {
              name: product.name,
              sku: product.sku,
              shipping: product.shipping,
              digital: product.digital,
              service: product.service,
              course: product.course,
            },
          };
        } catch (err) {
          this.logger.warn(`Failed to fetch product details for ${li.productId}`, err);
          return {
            id: li.id,
            productId: li.productId,
            productType: li.productType,
            quantity: li.quantity,
            amount: li.totalPrice,
            productDetails: {},
          };
        }
      })
    );

    await this.publishEvent(EVENTS.ORDER_CREATED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      total: order.total,
      currency: order.currency,
      lineItems: lineItemsWithDetails,
    });

    this.logger.log(`Order created: ${orderNumber} (${order.id})`);
    return result;
  }

  // -------------------------------------------------------------------------
  // Order actions
  // -------------------------------------------------------------------------

  async refundOrder(id: string, reason?: string): Promise<OrderDto> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Order ${id} not found`);

    const orderDto = this.toOrderDto(row);
    this.assertTransition(orderDto.status as OrderStatus, 'refunded');

    const lineItems = (orderDto.lineItems as any[]).map((li: any) => ({
      ...li,
      status: 'refunded',
    }));

    const notes = [row.notes, reason ? `Refund reason: ${reason}` : null]
      .filter(Boolean)
      .join(' | ') || null;

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'refunded',
        lineItems: lineItems as any,
        notes,
      },
    });

    const result = this.toOrderDto(updated);

    await this.appendEvent(id, 'order.refunded', { reason, previousStatus: row.status });

    await this.publishEvent(EVENTS.ORDER_REFUNDED, {
      orderId: id,
      orderNumber: updated.orderNumber,
      userId: updated.userId,
      total: updated.total,
      currency: updated.currency,
      lineItems: (result.lineItems as any[]).map((li: any) => ({
        productId: li.productId,
        productType: li.productType,
        quantity: li.quantity,
        amount: li.totalPrice,
      })),
    });

    this.logger.log(`Order refunded: ${updated.orderNumber}`);
    return result;
  }

  async fulfillOrder(id: string, fulfillmentData?: {
    trackingNumber?: string;
    carrier?: string;
  }): Promise<OrderDto> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Order ${id} not found`);

    const orderDto = this.toOrderDto(row);
    let lineItems = orderDto.lineItems as any[];
    let newStatus = row.status;

    // Transition to appropriate status based on current state
    if (row.status === 'confirmed' || row.status === 'processing') {
      newStatus = 'processing';
    }

    // Apply fulfillment info to physical line items
    if (fulfillmentData?.trackingNumber) {
      lineItems = lineItems.map((li: any) => {
        if (li.productType === 'physical') {
          return {
            ...li,
            status: 'shipped',
            fulfillment: {
              ...li.fulfillment,
              trackingNumber: fulfillmentData.trackingNumber,
            },
          };
        }
        return li;
      });
      newStatus = 'shipped';
    }

    // Mark virtual items as fulfilled immediately
    lineItems = lineItems.map((li: any) => {
      if (li.productType === 'virtual' && li.status === 'pending') {
        return { ...li, status: 'fulfilled' };
      }
      return li;
    });

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: newStatus as any,
        lineItems: lineItems as any,
      },
    });

    const result = this.toOrderDto(updated);

    await this.appendEvent(id, 'order.fulfilled', { fulfillmentData });

    if (newStatus === 'shipped') {
      await this.publishEvent(EVENTS.ORDER_SHIPPED, {
        orderId: id,
        orderNumber: updated.orderNumber,
        userId: updated.userId,
        total: updated.total,
        currency: updated.currency,
        lineItems: (result.lineItems as any[]).map((li: any) => ({
          productId: li.productId,
          productType: li.productType,
          quantity: li.quantity,
          amount: li.totalPrice,
        })),
      });
    }

    this.logger.log(`Order fulfilled: ${updated.orderNumber} -> ${newStatus}`);
    return result;
  }

  // -------------------------------------------------------------------------
  // Event sourcing helpers
  // -------------------------------------------------------------------------

  async getOrderEvents(orderId: string): Promise<any[]> {
    const rows = await this.prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      eventId: r.id,
      orderId: r.orderId,
      eventType: r.eventType,
      payload: r.payload,
      timestamp: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));
  }

  private async appendEvent(orderId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.prisma.orderEvent.create({
        data: {
          orderId,
          eventType,
          payload: payload as any,
        },
      });
    } catch (err) {
      this.logger.warn(`Could not persist order event: ${(err as Error).message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private toOrderDto(row: any): OrderDto {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      userId: row.userId,
      guestEmail: row.guestEmail,
      status: row.status,
      lineItems: row.lineItems,
      subtotal: row.subtotal,
      tax: row.tax,
      shippingCost: row.shippingCost,
      discount: row.discount,
      total: row.total,
      currency: row.currency,
      shippingAddress: row.shippingAddress,
      billingAddress: row.billingAddress,
      couponCode: row.couponCode,
      notes: row.notes,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  private assertTransition(current: OrderStatus, target: OrderStatus): void {
    const allowed = VALID_ORDER_TRANSITIONS[current];
    if (!allowed?.includes(target)) {
      throw new BadRequestException(
        `Cannot transition order from "${current}" to "${target}". Allowed transitions: ${allowed?.join(', ') || 'none'}`,
      );
    }
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

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
