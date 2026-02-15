import { Test, TestingModule } from '@nestjs/testing';

import { OrderController } from '../../src/modules/orders/order.controller';
import { OrderService } from '../../src/modules/orders/order.service';

describe('OrderController', () => {
  let controller: OrderController;
  const mockService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    refundOrder: jest.fn(),
    fulfillOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockService }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should call orderService.findAll with the query', async () => {
      const query = { page: 1, limit: 20, status: 'pending' };
      const expected = { data: [], meta: { total: 0 } };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.list(query as any);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });

    it('should pass sorting parameters', async () => {
      const query = { sortBy: 'createdAt', sortOrder: 'desc' };
      mockService.findAll.mockResolvedValue({ data: [] });

      await controller.list(query as any);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should call orderService.findById with the id', async () => {
      const expected = { id: 'ord-1', status: 'pending' };
      mockService.findById.mockResolvedValue(expected);

      const result = await controller.findOne('ord-1');

      expect(mockService.findById).toHaveBeenCalledWith('ord-1');
      expect(result).toEqual(expected);
    });
  });

  describe('refund', () => {
    it('should call orderService.refundOrder with id and reason', async () => {
      const dto = { reason: 'Customer request' };
      const expected = { id: 'ord-1', status: 'refunded' };
      mockService.refundOrder.mockResolvedValue(expected);

      const result = await controller.refund('ord-1', dto);

      expect(mockService.refundOrder).toHaveBeenCalledWith('ord-1', 'Customer request');
      expect(result).toEqual(expected);
    });

    it('should pass undefined reason when not provided', async () => {
      const dto = {};
      mockService.refundOrder.mockResolvedValue({});

      await controller.refund('ord-1', dto as any);

      expect(mockService.refundOrder).toHaveBeenCalledWith('ord-1', undefined);
    });
  });

  describe('fulfill', () => {
    it('should call orderService.fulfillOrder with id and dto', async () => {
      const dto = { trackingNumber: 'TRACK123', carrier: 'UPS' };
      const expected = { id: 'ord-1', status: 'shipped' };
      mockService.fulfillOrder.mockResolvedValue(expected);

      const result = await controller.fulfill('ord-1', dto);

      expect(mockService.fulfillOrder).toHaveBeenCalledWith('ord-1', dto);
      expect(result).toEqual(expected);
    });

    it('should pass dto without tracking info for virtual fulfillment', async () => {
      const dto = {};
      mockService.fulfillOrder.mockResolvedValue({});

      await controller.fulfill('ord-1', dto as any);

      expect(mockService.fulfillOrder).toHaveBeenCalledWith('ord-1', dto);
    });
  });
});
