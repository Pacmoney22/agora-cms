import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    }),
  })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-order'),
}));

jest.mock('@agora-cms/shared', () => ({
  EVENTS: {
    ORDER_CREATED: 'order.created',
    ORDER_CONFIRMED: 'order.confirmed',
    ORDER_SHIPPED: 'order.shipped',
    ORDER_REFUNDED: 'order.refunded',
  },
  VALID_ORDER_TRANSITIONS: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['in_transit', 'cancelled'],
    in_transit: ['delivered', 'returned'],
    delivered: ['completed', 'returned'],
    completed: ['refunded'],
    cancelled: ['refunded'],
    refunded: [],
    returned: ['refunded'],
  },
}));

import { OrderService } from '../../src/modules/orders/order.service';
import { ProductService } from '../../src/modules/products/product.service';

describe('OrderService', () => {
  let service: OrderService;

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'ORD-ABC-1234',
    userId: 'user-1',
    guestEmail: null,
    status: 'pending',
    lineItems: [
      {
        lineItemId: 'li-1',
        productId: 'prod-1',
        variantId: null,
        productType: 'physical',
        name: 'Test Product',
        sku: 'SKU-001',
        quantity: 2,
        unitPrice: 1999,
        totalPrice: 3998,
        status: 'pending',
        configuration: null,
        fulfillment: null,
      },
    ],
    subtotal: 3998,
    tax: 320,
    shippingCost: 999,
    discount: 0,
    total: 5317,
    currency: 'USD',
    shippingAddress: { line1: '123 Main St', city: 'Test', state: 'OH', postalCode: '43215', country: 'US' },
    billingAddress: { line1: '123 Main St', city: 'Test', state: 'OH', postalCode: '43215', country: 'US' },
    couponCode: null,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    orderEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(() => undefined),
  };

  const mockProductService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: 'PRISMA', useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    (service as any).kafkaProducer = null;
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated orders with defaults', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await service.findAll({ status: 'pending' as any });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await service.findAll({ userId: 'user-1' });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('should handle custom pagination and sorting', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(100);

      const result = await service.findAll({
        page: 3,
        limit: 10,
        sortBy: 'total',
        sortOrder: 'asc',
      });

      expect(result.meta.page).toBe(3);
      expect(result.meta.totalPages).toBe(10);
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1');

      expect(result.id).toBe('order-1');
      expect(result.orderNumber).toBe('ORD-ABC-1234');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrder', () => {
    it('should create an order with generated order number', async () => {
      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.orderEvent.create.mockResolvedValue({});
      mockProductService.findById.mockResolvedValue({
        name: 'Test Product',
        sku: 'SKU-001',
        shipping: {},
        digital: null,
        service: null,
        course: null,
      });

      const result = await service.createOrder({
        userId: 'user-1',
        guestEmail: null,
        status: 'pending',
        lineItems: mockOrder.lineItems as any,
        subtotal: 3998,
        tax: 320,
        shippingCost: 999,
        discount: 0,
        total: 5317,
        currency: 'USD',
        shippingAddress: mockOrder.shippingAddress as any,
        billingAddress: mockOrder.billingAddress as any,
        couponCode: null,
        notes: null,
      });

      expect(result.id).toBe('order-1');
      expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.orderEvent.create).toHaveBeenCalledTimes(1);
    });

    it('should handle product fetch failure gracefully in event payload', async () => {
      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.orderEvent.create.mockResolvedValue({});
      mockProductService.findById.mockRejectedValue(new Error('Not found'));

      const result = await service.createOrder({
        userId: 'user-1',
        guestEmail: null,
        status: 'pending',
        lineItems: mockOrder.lineItems as any,
        subtotal: 3998,
        tax: 320,
        shippingCost: 999,
        discount: 0,
        total: 5317,
        currency: 'USD',
        shippingAddress: mockOrder.shippingAddress as any,
        billingAddress: mockOrder.billingAddress as any,
        couponCode: null,
        notes: null,
      });

      expect(result.id).toBe('order-1');
    });
  });

  describe('refundOrder', () => {
    it('should refund a completed order', async () => {
      const completedOrder = { ...mockOrder, status: 'completed' };
      mockPrisma.order.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...completedOrder,
        status: 'refunded',
      });
      mockPrisma.orderEvent.create.mockResolvedValue({});

      const result = await service.refundOrder('order-1', 'Customer request');

      expect(result.status).toBe('refunded');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'refunded' }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.refundOrder('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' };
      mockPrisma.order.findUnique.mockResolvedValue(pendingOrder);

      await expect(service.refundOrder('order-1')).rejects.toThrow(BadRequestException);
    });

    it('should append refund reason to notes', async () => {
      const completedOrder = { ...mockOrder, status: 'completed', notes: 'Original note' };
      mockPrisma.order.findUnique.mockResolvedValue(completedOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...completedOrder,
        status: 'refunded',
        notes: 'Original note | Refund reason: Damaged',
      });
      mockPrisma.orderEvent.create.mockResolvedValue({});

      await service.refundOrder('order-1', 'Damaged');

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Original note | Refund reason: Damaged',
          }),
        }),
      );
    });
  });

  describe('fulfillOrder', () => {
    it('should fulfill order with tracking info', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' };
      mockPrisma.order.findUnique.mockResolvedValue(confirmedOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...confirmedOrder,
        status: 'shipped',
      });
      mockPrisma.orderEvent.create.mockResolvedValue({});

      const result = await service.fulfillOrder('order-1', {
        trackingNumber: 'TRK-123',
        carrier: 'UPS',
      });

      expect(result.status).toBe('shipped');
    });

    it('should throw NotFoundException for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.fulfillOrder('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should set status to processing when no tracking number', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' };
      mockPrisma.order.findUnique.mockResolvedValue(confirmedOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...confirmedOrder,
        status: 'processing',
      });
      mockPrisma.orderEvent.create.mockResolvedValue({});

      const result = await service.fulfillOrder('order-1');

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'processing' }),
        }),
      );
    });

    it('should mark virtual items as fulfilled', async () => {
      const orderWithVirtual = {
        ...mockOrder,
        status: 'confirmed',
        lineItems: [
          {
            lineItemId: 'li-2',
            productId: 'prod-2',
            productType: 'virtual',
            status: 'pending',
            fulfillment: null,
          },
        ],
      };
      mockPrisma.order.findUnique.mockResolvedValue(orderWithVirtual);
      mockPrisma.order.update.mockResolvedValue({
        ...orderWithVirtual,
        status: 'processing',
      });
      mockPrisma.orderEvent.create.mockResolvedValue({});

      await service.fulfillOrder('order-1');

      const updateCall = mockPrisma.order.update.mock.calls[0][0];
      const lineItems = updateCall.data.lineItems;
      expect(lineItems[0].status).toBe('fulfilled');
    });
  });

  describe('getOrderEvents', () => {
    it('should return order events', async () => {
      mockPrisma.orderEvent.findMany.mockResolvedValue([
        {
          id: 'ev-1',
          orderId: 'order-1',
          eventType: 'order.created',
          payload: {},
          createdAt: new Date('2024-01-01'),
        },
      ]);

      const events = await service.getOrderEvents('order-1');

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('order.created');
    });
  });
});
