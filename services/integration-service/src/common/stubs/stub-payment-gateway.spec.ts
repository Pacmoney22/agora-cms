import { StubPaymentGateway } from './stub-payment-gateway';

describe('StubPaymentGateway', () => {
  let gateway: StubPaymentGateway;

  beforeEach(() => {
    gateway = new StubPaymentGateway();
    // Speed up tests by reducing delay
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createPaymentIntent', () => {
    it('should return a payment intent with stub IDs', async () => {
      const promise = gateway.createPaymentIntent({
        amount: 5000,
        currency: 'USD',
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.id).toMatch(/^pi_stub_/);
      expect(result.clientSecret).toContain('_secret_');
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('requires_confirmation');
    });

    it('should pass through customerId metadata', async () => {
      const promise = gateway.createPaymentIntent({
        amount: 1000,
        currency: 'EUR',
        customerId: 'cus_test',
        metadata: { key: 'value' },
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.amount).toBe(1000);
      expect(result.currency).toBe('EUR');
    });

    it('should generate unique IDs for each call', async () => {
      const promise1 = gateway.createPaymentIntent({ amount: 1000, currency: 'USD' });
      jest.runAllTimers();
      const result1 = await promise1;

      const promise2 = gateway.createPaymentIntent({ amount: 2000, currency: 'USD' });
      jest.runAllTimers();
      const result2 = await promise2;

      expect(result1.id).not.toBe(result2.id);
      expect(result1.clientSecret).not.toBe(result2.clientSecret);
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const promise = gateway.confirmPayment('pi_stub_12345');
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual({
        success: true,
        paymentIntentId: 'pi_stub_12345',
        status: 'succeeded',
      });
    });

    it('should use the provided paymentIntentId', async () => {
      const promise = gateway.confirmPayment('pi_custom');
      jest.runAllTimers();
      const result = await promise;

      expect(result.paymentIntentId).toBe('pi_custom');
    });
  });

  describe('createRefund', () => {
    it('should create a refund with stub ID', async () => {
      const promise = gateway.createRefund({
        paymentIntentId: 'pi_stub_12345',
        amount: 2500,
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.id).toMatch(/^re_stub_/);
      expect(result.amount).toBe(2500);
      expect(result.status).toBe('succeeded');
    });

    it('should handle full refund (no amount)', async () => {
      const promise = gateway.createRefund({
        paymentIntentId: 'pi_stub_12345',
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.amount).toBe(0);
      expect(result.status).toBe('succeeded');
    });

    it('should handle refund with reason', async () => {
      const promise = gateway.createRefund({
        paymentIntentId: 'pi_stub_12345',
        amount: 1000,
        reason: 'requested_by_customer',
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.status).toBe('succeeded');
    });
  });

  describe('createCustomer', () => {
    it('should create a customer with stub ID', async () => {
      const promise = gateway.createCustomer({
        email: 'test@example.com',
        name: 'John Doe',
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.id).toMatch(/^cus_stub_/);
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('John Doe');
    });

    it('should handle customer with metadata', async () => {
      const promise = gateway.createCustomer({
        email: 'test@test.com',
        name: 'Jane',
        metadata: { userId: 'usr_1' },
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.email).toBe('test@test.com');
      expect(result.name).toBe('Jane');
    });
  });

  describe('handleWebhook', () => {
    it('should return a stub webhook event', async () => {
      const payload = Buffer.from('test_payload');
      const signature = 'test_signature_abcdef';

      const promise = gateway.handleWebhook(payload, signature);
      jest.runAllTimers();
      const result = await promise;

      expect(result.id).toMatch(/^evt_stub_/);
      expect(result.type).toBe('payment_intent.succeeded');
      expect(result.data).toHaveProperty('object');
      expect((result.data as any).object.status).toBe('succeeded');
    });

    it('should always return payment_intent.succeeded type', async () => {
      const promise = gateway.handleWebhook(
        Buffer.from('anything'),
        'any_signature_xxxxxxxxx',
      );
      jest.runAllTimers();
      const result = await promise;

      expect(result.type).toBe('payment_intent.succeeded');
    });
  });
});
