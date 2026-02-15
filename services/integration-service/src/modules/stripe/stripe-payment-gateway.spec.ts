import { StripePaymentGateway } from './stripe-payment-gateway';

// Mock the Stripe SDK
const mockPaymentIntentsCreate = jest.fn();
const mockPaymentIntentsConfirm = jest.fn();
const mockRefundsCreate = jest.fn();
const mockCustomersCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      confirm: mockPaymentIntentsConfirm,
    },
    refunds: {
      create: mockRefundsCreate,
    },
    customers: {
      create: mockCustomersCreate,
    },
    webhooks: {
      constructEvent: mockWebhooksConstructEvent,
    },
  }));
});

describe('StripePaymentGateway', () => {
  let gateway: StripePaymentGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new StripePaymentGateway('sk_test_xxx', 'whsec_test_xxx');
  });

  describe('constructor', () => {
    it('should initialize with secret key and webhook secret', () => {
      expect(gateway).toBeDefined();
    });

    it('should initialize without webhook secret', () => {
      const gw = new StripePaymentGateway('sk_test_xxx');
      expect(gw).toBeDefined();
    });
  });

  describe('createPaymentIntent', () => {
    const params = {
      amount: 5000,
      currency: 'USD',
      customerId: 'cus_123',
      metadata: { orderId: 'order_abc' },
    };

    it('should create a payment intent successfully', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        amount: 5000,
        currency: 'usd',
        status: 'requires_confirmation',
      });

      const result = await gateway.createPaymentIntent(params);

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        customer: 'cus_123',
        metadata: { orderId: 'order_abc' },
        automatic_payment_methods: { enabled: true },
      });

      expect(result).toEqual({
        id: 'pi_123',
        clientSecret: 'pi_123_secret_abc',
        amount: 5000,
        currency: 'USD',
        status: 'requires_confirmation',
      });
    });

    it('should map requires_action status', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        amount: 5000,
        currency: 'usd',
        status: 'requires_action',
      });

      const result = await gateway.createPaymentIntent(params);
      expect(result.status).toBe('requires_action');
    });

    it('should map requires_payment_method to requires_action', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method',
      });

      const result = await gateway.createPaymentIntent(params);
      expect(result.status).toBe('requires_action');
    });

    it('should map processing to requires_action', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        amount: 5000,
        currency: 'usd',
        status: 'processing',
      });

      const result = await gateway.createPaymentIntent(params);
      expect(result.status).toBe('requires_action');
    });

    it('should map succeeded status', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
      });

      const result = await gateway.createPaymentIntent(params);
      expect(result.status).toBe('succeeded');
    });

    it('should map canceled to failed', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        amount: 5000,
        currency: 'usd',
        status: 'canceled',
      });

      const result = await gateway.createPaymentIntent(params);
      expect(result.status).toBe('failed');
    });

    it('should map requires_capture to failed', async () => {
      mockPaymentIntentsCreate.mockResolvedValue({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        amount: 5000,
        currency: 'usd',
        status: 'requires_capture',
      });

      const result = await gateway.createPaymentIntent(params);
      expect(result.status).toBe('failed');
    });

    it('should throw on Stripe API error', async () => {
      mockPaymentIntentsCreate.mockRejectedValue(new Error('Stripe API error'));

      await expect(gateway.createPaymentIntent(params)).rejects.toThrow('Stripe API error');
    });

    it('should throw on non-Error rejection', async () => {
      mockPaymentIntentsCreate.mockRejectedValue('string error');

      await expect(gateway.createPaymentIntent(params)).rejects.toBe('string error');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully when succeeded', async () => {
      mockPaymentIntentsConfirm.mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
        last_payment_error: null,
      });

      const result = await gateway.confirmPayment('pi_123');

      expect(mockPaymentIntentsConfirm).toHaveBeenCalledWith('pi_123');
      expect(result).toEqual({
        success: true,
        paymentIntentId: 'pi_123',
        status: 'succeeded',
        error: undefined,
      });
    });

    it('should return failure when payment not succeeded', async () => {
      mockPaymentIntentsConfirm.mockResolvedValue({
        id: 'pi_123',
        status: 'requires_payment_method',
        last_payment_error: { message: 'Your card was declined' },
      });

      const result = await gateway.confirmPayment('pi_123');

      expect(result).toEqual({
        success: false,
        paymentIntentId: 'pi_123',
        status: 'requires_payment_method',
        error: 'Your card was declined',
      });
    });

    it('should handle confirm payment API error gracefully', async () => {
      mockPaymentIntentsConfirm.mockRejectedValue(new Error('Card declined'));

      const result = await gateway.confirmPayment('pi_123');

      expect(result).toEqual({
        success: false,
        paymentIntentId: 'pi_123',
        status: 'failed',
        error: 'Card declined',
      });
    });

    it('should handle non-Error rejection in confirmPayment', async () => {
      mockPaymentIntentsConfirm.mockRejectedValue('unknown');

      const result = await gateway.confirmPayment('pi_123');

      expect(result).toEqual({
        success: false,
        paymentIntentId: 'pi_123',
        status: 'failed',
        error: 'Unknown error',
      });
    });
  });

  describe('createRefund', () => {
    it('should create a full refund successfully', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_123',
        amount: 5000,
        status: 'succeeded',
      });

      const result = await gateway.createRefund({
        paymentIntentId: 'pi_123',
        reason: 'requested_by_customer',
      });

      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: undefined,
        reason: 'requested_by_customer',
      });

      expect(result).toEqual({
        id: 're_123',
        amount: 5000,
        status: 'succeeded',
      });
    });

    it('should create a partial refund successfully', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_456',
        amount: 2500,
        status: 'succeeded',
      });

      const result = await gateway.createRefund({
        paymentIntentId: 'pi_123',
        amount: 2500,
        reason: 'requested_by_customer',
      });

      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 2500,
        reason: 'requested_by_customer',
      });

      expect(result).toEqual({
        id: 're_456',
        amount: 2500,
        status: 'succeeded',
      });
    });

    it('should map pending refund status', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_789',
        amount: 5000,
        status: 'pending',
      });

      const result = await gateway.createRefund({
        paymentIntentId: 'pi_123',
      });

      expect(result.status).toBe('pending');
    });

    it('should map failed refund status', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_789',
        amount: 5000,
        status: 'failed',
      });

      const result = await gateway.createRefund({
        paymentIntentId: 'pi_123',
      });

      expect(result.status).toBe('failed');
    });

    it('should map unknown refund status to failed', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 're_789',
        amount: 5000,
        status: 'canceled',
      });

      const result = await gateway.createRefund({
        paymentIntentId: 'pi_123',
      });

      expect(result.status).toBe('failed');
    });

    it('should throw on refund API error', async () => {
      mockRefundsCreate.mockRejectedValue(new Error('Refund failed'));

      await expect(
        gateway.createRefund({ paymentIntentId: 'pi_123' }),
      ).rejects.toThrow('Refund failed');
    });
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      mockCustomersCreate.mockResolvedValue({
        id: 'cus_123',
        email: 'test@example.com',
        name: 'John Doe',
      });

      const result = await gateway.createCustomer({
        email: 'test@example.com',
        name: 'John Doe',
        metadata: { userId: 'user_1' },
      });

      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe',
        metadata: { userId: 'user_1' },
      });

      expect(result).toEqual({
        id: 'cus_123',
        email: 'test@example.com',
        name: 'John Doe',
      });
    });

    it('should throw on customer creation error', async () => {
      mockCustomersCreate.mockRejectedValue(new Error('Invalid email'));

      await expect(
        gateway.createCustomer({ email: 'bad', name: 'Test' }),
      ).rejects.toThrow('Invalid email');
    });

    it('should handle non-Error rejection in createCustomer', async () => {
      mockCustomersCreate.mockRejectedValue('unknown error');

      await expect(
        gateway.createCustomer({ email: 'test@test.com', name: 'Test' }),
      ).rejects.toBe('unknown error');
    });
  });

  describe('handleWebhook', () => {
    it('should verify and return webhook event', async () => {
      const payload = Buffer.from('test_payload');
      const signature = 'test_signature';

      mockWebhooksConstructEvent.mockReturnValue({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_123', amount: 5000 },
        },
      });

      const result = await gateway.handleWebhook(payload, signature);

      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_xxx',
      );

      expect(result).toEqual({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
        data: { id: 'pi_123', amount: 5000 },
      });
    });

    it('should throw when webhook secret is not configured', async () => {
      const gwNoSecret = new StripePaymentGateway('sk_test_xxx');
      const payload = Buffer.from('test_payload');

      await expect(
        gwNoSecret.handleWebhook(payload, 'sig'),
      ).rejects.toThrow('Webhook secret not configured');
    });

    it('should throw on signature verification failure', async () => {
      const payload = Buffer.from('test_payload');
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      await expect(
        gateway.handleWebhook(payload, 'bad_sig'),
      ).rejects.toThrow('Signature verification failed');
    });

    it('should handle non-Error thrown in webhook', async () => {
      const payload = Buffer.from('test_payload');
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw 'string error';
      });

      await expect(
        gateway.handleWebhook(payload, 'bad_sig'),
      ).rejects.toBe('string error');
    });
  });
});
