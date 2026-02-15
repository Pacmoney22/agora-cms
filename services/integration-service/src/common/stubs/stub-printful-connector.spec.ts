import { StubPrintfulConnector } from './stub-printful-connector';

describe('StubPrintfulConnector', () => {
  let connector: StubPrintfulConnector;

  beforeEach(() => {
    connector = new StubPrintfulConnector();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('syncProduct', () => {
    it('should sync a product successfully', async () => {
      const promise = connector.syncProduct({
        syncVariants: [
          {
            externalId: 'ext_1',
            variantId: 4012,
            retailPrice: 2499,
            files: [{ url: 'https://example.com/design.png', type: 'default' }],
          },
          {
            externalId: 'ext_2',
            variantId: 4013,
            retailPrice: 2999,
            files: [],
          },
        ],
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.syncProductId).toBeDefined();
      expect(result.syncVariants).toHaveLength(2);
      expect(result.syncVariants[0].externalId).toBe('ext_1');
      expect(result.syncVariants[0].variantId).toBe(4012);
      expect(result.syncVariants[1].externalId).toBe('ext_2');
    });
  });

  describe('updateProductStock', () => {
    it('should update stock without throwing', async () => {
      const promise = connector.updateProductStock('123456', '1000001', 50);
      jest.runAllTimers();
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('getSyncProduct', () => {
    it('should return a mock sync product', async () => {
      const promise = connector.getSyncProduct('123456');
      jest.runAllTimers();
      const result = await promise;

      expect(result.id).toBe(123456);
      expect(result.externalId).toBe('product_123456');
      expect(result.name).toBe('Stub T-Shirt');
      expect(result.variants).toHaveLength(1);
      expect(result.variants[0].id).toBe(1000001);
      expect(result.variants[0].currency).toBe('USD');
      expect(result.variants[0].files).toHaveLength(1);
    });
  });

  describe('listSyncProducts', () => {
    it('should return a list of mock products', async () => {
      const promise = connector.listSyncProducts();
      jest.runAllTimers();
      const result = await promise;

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Stub T-Shirt 1');
      expect(result[1].name).toBe('Stub Hoodie');
      expect(result[0].variants).toEqual([]);
    });

    it('should accept optional params', async () => {
      const promise = connector.listSyncProducts({ limit: 10, offset: 0 });
      jest.runAllTimers();
      const result = await promise;

      expect(result).toHaveLength(2);
    });

    it('should handle undefined params', async () => {
      const promise = connector.listSyncProducts(undefined);
      jest.runAllTimers();
      const result = await promise;

      expect(result).toHaveLength(2);
    });
  });

  describe('createOrder', () => {
    const orderData = {
      externalId: 'order_test',
      recipient: {
        name: 'John Doe',
        address1: '123 Main St',
        city: 'Anytown',
        stateCode: 'CA',
        countryCode: 'US',
        zip: '90210',
      },
      items: [
        { syncVariantId: 1000001, quantity: 2, retailPrice: '24.99' },
      ],
      shipping: 'STANDARD',
    };

    it('should create an order with stub data', async () => {
      const promise = connector.createOrder(orderData);
      jest.runAllTimers();
      const result = await promise;

      expect(result.id).toBeDefined();
      expect(result.externalId).toBe('order_test');
      expect(result.status).toBe('draft');
      expect(result.costs).toBeDefined();
      expect(result.costs!.currency).toBe('USD');
      expect(result.costs!.total).toBe('29.99');
    });

    it('should use default shipping if not provided', async () => {
      const promise = connector.createOrder({
        ...orderData,
        shipping: undefined,
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result.shipping).toBe('STANDARD');
    });
  });

  describe('getOrder', () => {
    it('should return a mock order with shipment details', async () => {
      const promise = connector.getOrder('999001');
      jest.runAllTimers();
      const result = await promise;

      expect(result.id).toBe(999001);
      expect(result.externalId).toBe('order_999001');
      expect(result.status).toBe('fulfilled');
      expect(result.shipments).toBeDefined();
      expect(result.shipments!).toHaveLength(1);
      expect(result.shipments![0].carrier).toBe('USPS');
      expect(result.shipments![0].trackingNumber).toBeDefined();
      expect(result.costs).toBeDefined();
    });
  });

  describe('confirmOrder', () => {
    it('should confirm an order and return pending status', async () => {
      const promise = connector.confirmOrder('999001');
      jest.runAllTimers();
      const result = await promise;

      expect(result.id).toBe(999001);
      expect(result.externalId).toBe('order_999001');
      expect(result.status).toBe('pending');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order successfully', async () => {
      const promise = connector.cancelOrder('999001');
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual({
        success: true,
        orderId: 999001,
      });
    });
  });

  describe('calculateShippingRates', () => {
    const params = {
      recipient: {
        countryCode: 'US',
        stateCode: 'CA',
        city: 'Los Angeles',
        zip: '90001',
      },
      items: [{ variantId: 4012, quantity: 2 }],
    };

    it('should return three shipping rate options', async () => {
      const promise = connector.calculateShippingRates(params);
      jest.runAllTimers();
      const result = await promise;

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('STANDARD');
      expect(result[1].id).toBe('EXPRESS');
      expect(result[2].id).toBe('OVERNIGHT');
    });

    it('should use provided currency', async () => {
      const promise = connector.calculateShippingRates({
        ...params,
        currency: 'EUR',
      });
      jest.runAllTimers();
      const result = await promise;

      expect(result[0].currency).toBe('EUR');
    });

    it('should default to USD currency', async () => {
      const promise = connector.calculateShippingRates(params);
      jest.runAllTimers();
      const result = await promise;

      expect(result[0].currency).toBe('USD');
    });

    it('should include delivery day ranges', async () => {
      const promise = connector.calculateShippingRates(params);
      jest.runAllTimers();
      const result = await promise;

      expect(result[0].minDeliveryDays).toBeDefined();
      expect(result[0].maxDeliveryDays).toBeDefined();
      expect(result[0].minDeliveryDays).toBeLessThanOrEqual(result[0].maxDeliveryDays);
    });
  });

  describe('getShippingCarriers', () => {
    it('should return a list of carriers', async () => {
      const promise = connector.getShippingCarriers();
      jest.runAllTimers();
      const result = await promise;

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { code: 'USPS', name: 'United States Postal Service' },
        { code: 'FEDEX', name: 'FedEx' },
        { code: 'UPS', name: 'United Parcel Service' },
      ]);
    });
  });

  describe('handleWebhook', () => {
    it('should return a mock package_shipped event', async () => {
      const payload = Buffer.from('test_payload');
      const signature = 'test_signature_abcdef_long_enough';

      const promise = connector.handleWebhook(payload, signature);
      jest.runAllTimers();
      const result = await promise;

      expect(result.type).toBe('package_shipped');
      expect(result.data.order).toBeDefined();
      expect(result.data.order!.id).toBe(123456);
      expect(result.data.order!.externalId).toBe('order_123');
      expect(result.data.shipment).toBeDefined();
      expect(result.data.shipment!.carrier).toBe('USPS');
      expect(result.data.shipment!.trackingNumber).toBeDefined();
    });
  });
});
