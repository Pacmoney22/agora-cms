import { Test, TestingModule } from '@nestjs/testing';

import { FulfillmentController } from '../../src/modules/fulfillment/fulfillment.controller';
import { FulfillmentService } from '../../src/modules/fulfillment/fulfillment.service';

describe('FulfillmentController', () => {
  let controller: FulfillmentController;
  const mockService = {
    listPendingFulfillment: jest.fn(),
    shipOrder: jest.fn(),
    deliverDigitalItems: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FulfillmentController],
      providers: [{ provide: FulfillmentService, useValue: mockService }],
    }).compile();

    controller = module.get<FulfillmentController>(FulfillmentController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listPending', () => {
    it('should call fulfillmentService.listPendingFulfillment with page and limit', async () => {
      const expected = { data: [], meta: { total: 0 } };
      mockService.listPendingFulfillment.mockResolvedValue(expected);

      const result = await controller.listPending(1, 20);

      expect(mockService.listPendingFulfillment).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(expected);
    });

    it('should call with undefined when no pagination params', async () => {
      mockService.listPendingFulfillment.mockResolvedValue({ data: [] });

      await controller.listPending(undefined, undefined);

      expect(mockService.listPendingFulfillment).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('ship', () => {
    it('should call fulfillmentService.shipOrder with orderId, trackingNumber, and carrier', async () => {
      const dto = { trackingNumber: 'TRACK-123', carrier: 'FedEx' };
      const expected = { orderId: 'ord-1', status: 'shipped' };
      mockService.shipOrder.mockResolvedValue(expected);

      const result = await controller.ship('ord-1', dto);

      expect(mockService.shipOrder).toHaveBeenCalledWith('ord-1', 'TRACK-123', 'FedEx');
      expect(result).toEqual(expected);
    });
  });

  describe('deliverDigital', () => {
    it('should call fulfillmentService.deliverDigitalItems with orderId', async () => {
      const expected = { orderId: 'ord-1', status: 'delivered' };
      mockService.deliverDigitalItems.mockResolvedValue(expected);

      const result = await controller.deliverDigital('ord-1');

      expect(mockService.deliverDigitalItems).toHaveBeenCalledWith('ord-1');
      expect(result).toEqual(expected);
    });
  });
});
