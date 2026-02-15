import { Test, TestingModule } from '@nestjs/testing';

import { FulfillmentService } from '../../src/modules/fulfillment/fulfillment.service';
import { OrderService } from '../../src/modules/orders/order.service';

describe('FulfillmentService', () => {
  let service: FulfillmentService;

  const mockOrderService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    fulfillOrder: jest.fn(),
  };

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'ORD-ABC-1234',
    status: 'confirmed',
    lineItems: [
      {
        lineItemId: 'li-1',
        productId: 'prod-1',
        productType: 'physical',
        name: 'Physical Product',
        sku: 'SKU-001',
        quantity: 1,
        unitPrice: 1999,
        totalPrice: 1999,
        status: 'pending',
        fulfillment: null,
      },
      {
        lineItemId: 'li-2',
        productId: 'prod-2',
        productType: 'virtual',
        name: 'Virtual Product',
        sku: 'SKU-002',
        quantity: 1,
        unitPrice: 999,
        totalPrice: 999,
        status: 'pending',
        fulfillment: null,
      },
    ],
    updatedAt: new Date('2024-01-01').toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FulfillmentService,
        { provide: OrderService, useValue: mockOrderService },
      ],
    }).compile();

    service = module.get<FulfillmentService>(FulfillmentService);
    jest.clearAllMocks();
  });

  describe('listPendingFulfillment', () => {
    it('should return orders with confirmed status', async () => {
      mockOrderService.findAll.mockResolvedValue({
        data: [mockOrder],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const result = await service.listPendingFulfillment();

      expect(mockOrderService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'confirmed',
      });
      expect(result.data).toHaveLength(1);
    });

    it('should handle custom pagination', async () => {
      mockOrderService.findAll.mockResolvedValue({
        data: [],
        meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
      });

      await service.listPendingFulfillment(2, 10);

      expect(mockOrderService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'confirmed',
      });
    });
  });

  describe('shipOrder', () => {
    it('should delegate to orderService.fulfillOrder with tracking info', async () => {
      mockOrderService.fulfillOrder.mockResolvedValue({
        ...mockOrder,
        status: 'shipped',
      });

      const result = await service.shipOrder('order-1', 'TRK-123', 'UPS');

      expect(mockOrderService.fulfillOrder).toHaveBeenCalledWith('order-1', {
        trackingNumber: 'TRK-123',
        carrier: 'UPS',
      });
      expect(result.status).toBe('shipped');
    });
  });

  describe('deliverDigitalItems', () => {
    it('should mark virtual line items as fulfilled with download URL', async () => {
      mockOrderService.findById.mockResolvedValue({ ...mockOrder });

      const result = await service.deliverDigitalItems('order-1');

      const virtualItem = result.lineItems.find(
        (li: any) => li.productType === 'virtual',
      );
      expect(virtualItem.status).toBe('fulfilled');
      expect(virtualItem.fulfillment.downloadUrl).toContain('downloads.example.com');
    });

    it('should not modify physical line items', async () => {
      mockOrderService.findById.mockResolvedValue({ ...mockOrder });

      const result = await service.deliverDigitalItems('order-1');

      const physicalItem = result.lineItems.find(
        (li: any) => li.productType === 'physical',
      );
      expect(physicalItem.status).toBe('pending');
    });

    it('should update the updatedAt timestamp', async () => {
      mockOrderService.findById.mockResolvedValue({ ...mockOrder });

      const result = await service.deliverDigitalItems('order-1');

      expect(result.updatedAt).not.toBe(mockOrder.updatedAt);
    });
  });
});
