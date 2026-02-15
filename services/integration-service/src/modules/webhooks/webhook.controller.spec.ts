import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { PAYMENT_GATEWAY } from '../stripe/stripe.module';
import { PRINTFUL_CONNECTOR } from '../printful/printful.module';

describe('WebhookController', () => {
  let controller: WebhookController;

  const mockPaymentGateway = {
    handleWebhook: jest.fn(),
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    createRefund: jest.fn(),
    createCustomer: jest.fn(),
  };

  const mockPrintfulConnector = {
    handleWebhook: jest.fn(),
    syncProduct: jest.fn(),
    updateProductStock: jest.fn(),
    getSyncProduct: jest.fn(),
    listSyncProducts: jest.fn(),
    createOrder: jest.fn(),
    getOrder: jest.fn(),
    confirmOrder: jest.fn(),
    cancelOrder: jest.fn(),
    calculateShippingRates: jest.fn(),
    getShippingCarriers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: PAYMENT_GATEWAY, useValue: mockPaymentGateway },
        { provide: PRINTFUL_CONNECTOR, useValue: mockPrintfulConnector },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    jest.clearAllMocks();
  });

  describe('handleStripeWebhook', () => {
    const mockReq = {
      body: Buffer.from('test_payload'),
    } as any;

    it('should process payment_intent.succeeded webhook', async () => {
      mockPaymentGateway.handleWebhook.mockResolvedValue({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { id: 'pi_123', amount: 5000 },
      });

      const result = await controller.handleStripeWebhook(mockReq, 'sig_test');

      expect(mockPaymentGateway.handleWebhook).toHaveBeenCalledWith(
        Buffer.from('test_payload'),
        'sig_test',
      );
      expect(result).toEqual({
        received: true,
        eventId: 'evt_123',
      });
    });

    it('should process payment_intent.payment_failed webhook', async () => {
      mockPaymentGateway.handleWebhook.mockResolvedValue({
        id: 'evt_456',
        type: 'payment_intent.payment_failed',
        data: { id: 'pi_456', error: 'Card declined' },
      });

      const result = await controller.handleStripeWebhook(mockReq, 'sig_test');

      expect(result).toEqual({
        received: true,
        eventId: 'evt_456',
      });
    });

    it('should process charge.refunded webhook', async () => {
      mockPaymentGateway.handleWebhook.mockResolvedValue({
        id: 'evt_789',
        type: 'charge.refunded',
        data: { id: 'ch_789', amount_refunded: 5000 },
      });

      const result = await controller.handleStripeWebhook(mockReq, 'sig_test');

      expect(result).toEqual({
        received: true,
        eventId: 'evt_789',
      });
    });

    it('should handle unrecognized event type', async () => {
      mockPaymentGateway.handleWebhook.mockResolvedValue({
        id: 'evt_999',
        type: 'customer.created',
        data: { id: 'cus_999' },
      });

      const result = await controller.handleStripeWebhook(mockReq, 'sig_test');

      expect(result).toEqual({
        received: true,
        eventId: 'evt_999',
      });
    });

    it('should throw BadRequestException when signature is missing', async () => {
      await expect(
        controller.handleStripeWebhook(mockReq, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when signature is undefined', async () => {
      await expect(
        controller.handleStripeWebhook(mockReq, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on webhook processing failure', async () => {
      mockPaymentGateway.handleWebhook.mockRejectedValue(
        new Error('Signature verification failed'),
      );

      await expect(
        controller.handleStripeWebhook(mockReq, 'bad_sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with proper message on processing failure', async () => {
      mockPaymentGateway.handleWebhook.mockRejectedValue(
        new Error('Something went wrong'),
      );

      try {
        await controller.handleStripeWebhook(mockReq, 'sig_test');
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toBe('Webhook processing failed');
      }
    });
  });

  describe('handlePrintfulWebhook', () => {
    const mockReq = {
      body: Buffer.from('test_payload'),
    } as any;

    it('should process package_shipped webhook', async () => {
      mockPrintfulConnector.handleWebhook.mockResolvedValue({
        type: 'package_shipped',
        data: {
          order: { id: 123, externalId: 'order_abc', status: 'fulfilled' },
          shipment: {
            id: 50001,
            carrier: 'USPS',
            service: 'First Class',
            trackingNumber: 'TRACK123',
            trackingUrl: 'https://tracking.usps.com',
          },
        },
      });

      const result = await controller.handlePrintfulWebhook(mockReq, 'pf_sig_test');

      expect(mockPrintfulConnector.handleWebhook).toHaveBeenCalledWith(
        Buffer.from('test_payload'),
        'pf_sig_test',
      );
      expect(result).toEqual({
        received: true,
        eventType: 'package_shipped',
      });
    });

    it('should process package_returned webhook', async () => {
      mockPrintfulConnector.handleWebhook.mockResolvedValue({
        type: 'package_returned',
        data: {
          order: { id: 123, externalId: 'order_abc', status: 'returned' },
          reason: 'Address incorrect',
        },
      });

      const result = await controller.handlePrintfulWebhook(mockReq, 'pf_sig_test');

      expect(result).toEqual({
        received: true,
        eventType: 'package_returned',
      });
    });

    it('should process order_failed webhook', async () => {
      mockPrintfulConnector.handleWebhook.mockResolvedValue({
        type: 'order_failed',
        data: {
          order: { id: 123, externalId: 'order_abc', status: 'failed' },
          reason: 'Out of stock',
        },
      });

      const result = await controller.handlePrintfulWebhook(mockReq, 'pf_sig_test');

      expect(result).toEqual({
        received: true,
        eventType: 'order_failed',
      });
    });

    it('should process order_canceled webhook', async () => {
      mockPrintfulConnector.handleWebhook.mockResolvedValue({
        type: 'order_canceled',
        data: {
          order: { id: 123, externalId: 'order_abc', status: 'canceled' },
        },
      });

      const result = await controller.handlePrintfulWebhook(mockReq, 'pf_sig_test');

      expect(result).toEqual({
        received: true,
        eventType: 'order_canceled',
      });
    });

    it('should process product_synced webhook', async () => {
      mockPrintfulConnector.handleWebhook.mockResolvedValue({
        type: 'product_synced',
        data: {},
      });

      const result = await controller.handlePrintfulWebhook(mockReq, 'pf_sig_test');

      expect(result).toEqual({
        received: true,
        eventType: 'product_synced',
      });
    });

    it('should process stock_updated webhook', async () => {
      mockPrintfulConnector.handleWebhook.mockResolvedValue({
        type: 'stock_updated',
        data: {},
      });

      const result = await controller.handlePrintfulWebhook(mockReq, 'pf_sig_test');

      expect(result).toEqual({
        received: true,
        eventType: 'stock_updated',
      });
    });

    it('should handle unrecognized Printful event type', async () => {
      mockPrintfulConnector.handleWebhook.mockResolvedValue({
        type: 'unknown_event',
        data: {},
      });

      const result = await controller.handlePrintfulWebhook(mockReq, 'pf_sig_test');

      expect(result).toEqual({
        received: true,
        eventType: 'unknown_event',
      });
    });

    it('should throw BadRequestException when Printful signature is missing', async () => {
      await expect(
        controller.handlePrintfulWebhook(mockReq, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Printful signature is undefined', async () => {
      await expect(
        controller.handlePrintfulWebhook(mockReq, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on Printful webhook processing failure', async () => {
      mockPrintfulConnector.handleWebhook.mockRejectedValue(
        new Error('Invalid signature'),
      );

      await expect(
        controller.handlePrintfulWebhook(mockReq, 'bad_sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with proper message on Printful processing failure', async () => {
      mockPrintfulConnector.handleWebhook.mockRejectedValue(
        new Error('Something went wrong'),
      );

      try {
        await controller.handlePrintfulWebhook(mockReq, 'pf_sig_test');
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toBe('Webhook processing failed');
      }
    });
  });
});
