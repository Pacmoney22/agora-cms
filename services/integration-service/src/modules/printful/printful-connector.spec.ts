import { PrintfulConnector } from './printful-connector';

// Mock axios
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockImplementation(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    })),
  },
}));

describe('PrintfulConnector', () => {
  let connector: PrintfulConnector;

  beforeEach(() => {
    jest.clearAllMocks();
    connector = new PrintfulConnector('test_api_key');
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(connector).toBeDefined();
    });
  });

  describe('syncProduct', () => {
    const productData = {
      syncVariants: [
        {
          externalId: 'ext_1',
          variantId: 4012,
          retailPrice: 2499, // cents
          files: [{ url: 'https://example.com/design.png', type: 'default' }],
        },
      ],
    };

    it('should sync a product successfully', async () => {
      mockPost.mockResolvedValue({
        data: {
          result: {
            id: 123456,
            sync_variants: [
              { id: 1000001, external_id: 'ext_1', variant_id: 4012 },
            ],
          },
        },
      });

      const result = await connector.syncProduct(productData);

      expect(mockPost).toHaveBeenCalledWith('/store/products', {
        sync_variants: [
          {
            external_id: 'ext_1',
            variant_id: 4012,
            retail_price: '24.99',
            files: [{ url: 'https://example.com/design.png', type: 'default' }],
          },
        ],
      });

      expect(result).toEqual({
        success: true,
        syncProductId: '123456',
        syncVariants: [
          { id: 1000001, externalId: 'ext_1', variantId: 4012 },
        ],
      });
    });

    it('should handle sync product API error', async () => {
      mockPost.mockRejectedValue(new Error('Product sync failed'));

      const result = await connector.syncProduct(productData);

      expect(result).toEqual({
        success: false,
        syncProductId: '',
        syncVariants: [],
        error: 'Product sync failed',
      });
    });

    it('should handle non-Error sync product failure', async () => {
      mockPost.mockRejectedValue('string error');

      const result = await connector.syncProduct(productData);

      expect(result).toEqual({
        success: false,
        syncProductId: '',
        syncVariants: [],
        error: 'Unknown error',
      });
    });
  });

  describe('updateProductStock', () => {
    it('should update product stock successfully', async () => {
      mockPut.mockResolvedValue({ data: { result: {} } });

      await connector.updateProductStock('123456', '1000001', 50);

      expect(mockPut).toHaveBeenCalledWith(
        '/store/products/123456/variants/1000001',
        { quantity: 50 },
      );
    });

    it('should throw on stock update error', async () => {
      mockPut.mockRejectedValue(new Error('Not found'));

      await expect(
        connector.updateProductStock('999', '111', 10),
      ).rejects.toThrow('Not found');
    });
  });

  describe('getSyncProduct', () => {
    it('should fetch a sync product successfully', async () => {
      mockGet.mockResolvedValue({
        data: {
          result: {
            id: 123456,
            external_id: 'product_123',
            name: 'Test T-Shirt',
            sync_variants: [
              {
                id: 1000001,
                external_id: 'variant_1',
                sync_product_id: 123456,
                variant_id: 4012,
                product: { product_id: 71 },
                retail_price: '24.99',
                currency: 'USD',
                files: [
                  { id: 500001, url: 'https://files.printful.com/mockup.png', type: 'mockup' },
                ],
              },
            ],
          },
        },
      });

      const result = await connector.getSyncProduct('123456');

      expect(mockGet).toHaveBeenCalledWith('/store/products/123456');
      expect(result).toEqual({
        id: 123456,
        externalId: 'product_123',
        name: 'Test T-Shirt',
        variants: [
          {
            id: 1000001,
            externalId: 'variant_1',
            syncProductId: 123456,
            variantId: 4012,
            productId: 71,
            retailPrice: '24.99',
            currency: 'USD',
            files: [
              { id: 500001, url: 'https://files.printful.com/mockup.png', type: 'mockup' },
            ],
          },
        ],
      });
    });

    it('should throw on fetch error', async () => {
      mockGet.mockRejectedValue(new Error('Product not found'));

      await expect(connector.getSyncProduct('999')).rejects.toThrow('Product not found');
    });
  });

  describe('listSyncProducts', () => {
    it('should list sync products without params', async () => {
      mockGet.mockResolvedValue({
        data: {
          result: [
            { id: 123456, external_id: 'product_123', name: 'T-Shirt' },
            { id: 123457, external_id: 'product_124', name: 'Hoodie' },
          ],
        },
      });

      const result = await connector.listSyncProducts();

      expect(mockGet).toHaveBeenCalledWith('/store/products', { params: {} });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 123456,
        externalId: 'product_123',
        name: 'T-Shirt',
        variants: [],
      });
    });

    it('should list sync products with params', async () => {
      mockGet.mockResolvedValue({
        data: {
          result: [
            { id: 123456, external_id: 'product_123', name: 'T-Shirt' },
          ],
        },
      });

      await connector.listSyncProducts({
        status: 'synced',
        limit: 10,
        offset: 5,
      });

      expect(mockGet).toHaveBeenCalledWith('/store/products', {
        params: { status: 'synced', limit: 10, offset: 5 },
      });
    });

    it('should handle partial params', async () => {
      mockGet.mockResolvedValue({ data: { result: [] } });

      await connector.listSyncProducts({ limit: 5 });

      expect(mockGet).toHaveBeenCalledWith('/store/products', {
        params: { limit: 5 },
      });
    });

    it('should throw on list error', async () => {
      mockGet.mockRejectedValue(new Error('API error'));

      await expect(connector.listSyncProducts()).rejects.toThrow('API error');
    });
  });

  describe('createOrder', () => {
    const orderData = {
      externalId: 'order_abc',
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

    it('should create an order successfully', async () => {
      mockPost.mockResolvedValue({
        data: {
          result: {
            id: 999001,
            external_id: 'order_abc',
            status: 'draft',
            shipping: 'STANDARD',
            created: 1700000000,
            updated: 1700000000,
            shipments: [],
            costs: {
              currency: 'USD',
              subtotal: '49.98',
              discount: '0.00',
              shipping: '4.99',
              digitization: '0.00',
              additional_fee: '0.00',
              fulfillment_fee: '5.00',
              retail_delivery_costs: '9.99',
              tax: '0.00',
              vat: '0.00',
              total: '59.97',
            },
          },
        },
      });

      const result = await connector.createOrder(orderData);

      expect(mockPost).toHaveBeenCalledWith('/orders', {
        external_id: 'order_abc',
        recipient: orderData.recipient,
        items: [
          { sync_variant_id: 1000001, quantity: 2, retail_price: '24.99' },
        ],
        shipping: 'STANDARD',
      });

      expect(result.id).toBe(999001);
      expect(result.externalId).toBe('order_abc');
      expect(result.status).toBe('draft');
      expect(result.costs?.total).toBe('59.97');
    });

    it('should throw on order creation error', async () => {
      mockPost.mockRejectedValue(new Error('Order creation failed'));

      await expect(connector.createOrder(orderData)).rejects.toThrow('Order creation failed');
    });
  });

  describe('getOrder', () => {
    it('should fetch an order successfully', async () => {
      mockGet.mockResolvedValue({
        data: {
          result: {
            id: 999001,
            external_id: 'order_abc',
            status: 'fulfilled',
            shipping: 'STANDARD',
            created: 1700000000,
            updated: 1700001000,
            shipments: [
              {
                id: 50001,
                carrier: 'USPS',
                service: 'First Class',
                tracking_number: 'TRACK123',
                tracking_url: 'https://tracking.usps.com/TRACK123',
                created: 1700000500,
                ship_date: '2024-01-15',
                estimated_delivery: '2024-01-20',
              },
            ],
            costs: {
              currency: 'USD',
              subtotal: '49.98',
              discount: '0.00',
              shipping: '4.99',
              digitization: '0.00',
              additional_fee: '0.00',
              fulfillment_fee: '5.00',
              retail_delivery_costs: '9.99',
              tax: '0.00',
              vat: '0.00',
              total: '59.97',
            },
          },
        },
      });

      const result = await connector.getOrder('999001');

      expect(mockGet).toHaveBeenCalledWith('/orders/999001');
      expect(result.id).toBe(999001);
      expect(result.shipments).toHaveLength(1);
      expect(result.shipments![0].trackingNumber).toBe('TRACK123');
      expect(result.costs?.additionalFee).toBe('0.00');
    });

    it('should handle order without shipments or costs', async () => {
      mockGet.mockResolvedValue({
        data: {
          result: {
            id: 999002,
            external_id: 'order_xyz',
            status: 'draft',
            shipping: 'STANDARD',
            created: 1700000000,
            updated: 1700000000,
            shipments: null,
            costs: null,
          },
        },
      });

      const result = await connector.getOrder('999002');

      expect(result.shipments).toBeUndefined();
      expect(result.costs).toBeUndefined();
    });

    it('should throw on get order error', async () => {
      mockGet.mockRejectedValue(new Error('Order not found'));

      await expect(connector.getOrder('999')).rejects.toThrow('Order not found');
    });
  });

  describe('confirmOrder', () => {
    it('should confirm an order successfully', async () => {
      mockPost.mockResolvedValue({
        data: {
          result: {
            id: 999001,
            external_id: 'order_abc',
            status: 'pending',
            shipping: 'STANDARD',
            created: 1700000000,
            updated: 1700001000,
            costs: {
              currency: 'USD',
              subtotal: '49.98',
              discount: '0.00',
              shipping: '4.99',
              digitization: '0.00',
              additional_fee: '0.00',
              fulfillment_fee: '5.00',
              retail_delivery_costs: '9.99',
              tax: '0.00',
              vat: '0.00',
              total: '59.97',
            },
          },
        },
      });

      const result = await connector.confirmOrder('999001');

      expect(mockPost).toHaveBeenCalledWith('/orders/999001/confirm');
      expect(result.status).toBe('pending');
    });

    it('should throw on confirm order error', async () => {
      mockPost.mockRejectedValue(new Error('Cannot confirm'));

      await expect(connector.confirmOrder('999')).rejects.toThrow('Cannot confirm');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order successfully', async () => {
      mockDelete.mockResolvedValue({ data: { result: {} } });

      const result = await connector.cancelOrder('999001');

      expect(mockDelete).toHaveBeenCalledWith('/orders/999001');
      expect(result).toEqual({
        success: true,
        orderId: 999001,
      });
    });

    it('should handle cancel order error gracefully', async () => {
      mockDelete.mockRejectedValue(new Error('Cannot cancel'));

      const result = await connector.cancelOrder('999');

      expect(result).toEqual({
        success: false,
        orderId: 999,
        error: 'Cannot cancel',
      });
    });

    it('should handle non-Error cancel order failure', async () => {
      mockDelete.mockRejectedValue('unknown');

      const result = await connector.cancelOrder('999');

      expect(result).toEqual({
        success: false,
        orderId: 999,
        error: 'Unknown error',
      });
    });
  });

  describe('calculateShippingRates', () => {
    const shippingParams = {
      recipient: {
        countryCode: 'US',
        stateCode: 'CA',
        city: 'Los Angeles',
        zip: '90001',
      },
      items: [
        { variantId: 4012, quantity: 2 },
      ],
    };

    it('should calculate shipping rates successfully', async () => {
      mockPost.mockResolvedValue({
        data: {
          result: [
            {
              id: 'STANDARD',
              name: 'Standard',
              rate: '4.99',
              currency: 'USD',
              minDeliveryDays: 5,
              maxDeliveryDays: 10,
            },
            {
              id: 'EXPRESS',
              name: 'Express',
              rate: '14.99',
              currency: 'USD',
              minDeliveryDays: 2,
              maxDeliveryDays: 4,
            },
          ],
        },
      });

      const result = await connector.calculateShippingRates(shippingParams);

      expect(mockPost).toHaveBeenCalledWith('/shipping/rates', {
        recipient: shippingParams.recipient,
        items: [{ variant_id: 4012, quantity: 2 }],
        currency: 'USD',
        locale: 'en_US',
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('STANDARD');
      expect(result[1].rate).toBe('14.99');
    });

    it('should use provided currency and locale', async () => {
      mockPost.mockResolvedValue({ data: { result: [] } });

      await connector.calculateShippingRates({
        ...shippingParams,
        currency: 'EUR',
        locale: 'de_DE',
      });

      expect(mockPost).toHaveBeenCalledWith('/shipping/rates', expect.objectContaining({
        currency: 'EUR',
        locale: 'de_DE',
      }));
    });

    it('should throw on shipping rate calculation error', async () => {
      mockPost.mockRejectedValue(new Error('Invalid address'));

      await expect(
        connector.calculateShippingRates(shippingParams),
      ).rejects.toThrow('Invalid address');
    });
  });

  describe('getShippingCarriers', () => {
    it('should fetch shipping carriers successfully', async () => {
      mockGet.mockResolvedValue({
        data: {
          result: [
            { code: 'USPS', name: 'United States Postal Service' },
            { code: 'FEDEX', name: 'FedEx' },
          ],
        },
      });

      const result = await connector.getShippingCarriers();

      expect(mockGet).toHaveBeenCalledWith('/shipping/carriers');
      expect(result).toEqual([
        { code: 'USPS', name: 'United States Postal Service' },
        { code: 'FEDEX', name: 'FedEx' },
      ]);
    });

    it('should throw on carriers fetch error', async () => {
      mockGet.mockRejectedValue(new Error('Service unavailable'));

      await expect(connector.getShippingCarriers()).rejects.toThrow('Service unavailable');
    });
  });

  describe('handleWebhook', () => {
    it('should parse a package_shipped webhook', async () => {
      const payload = Buffer.from(JSON.stringify({
        type: 'package_shipped',
        data: {
          order: {
            id: 999001,
            external_id: 'order_abc',
            status: 'fulfilled',
          },
          shipment: {
            id: 50001,
            carrier: 'USPS',
            service: 'First Class',
            tracking_number: 'TRACK123',
            tracking_url: 'https://tracking.usps.com/TRACK123',
          },
        },
      }));

      const result = await connector.handleWebhook(payload, 'sig_test');

      expect(result).toEqual({
        type: 'package_shipped',
        data: {
          order: {
            id: 999001,
            externalId: 'order_abc',
            status: 'fulfilled',
          },
          shipment: {
            id: 50001,
            carrier: 'USPS',
            service: 'First Class',
            trackingNumber: 'TRACK123',
            trackingUrl: 'https://tracking.usps.com/TRACK123',
          },
          reason: undefined,
        },
      });
    });

    it('should parse a webhook without order data', async () => {
      const payload = Buffer.from(JSON.stringify({
        type: 'stock_updated',
        data: {
          reason: 'Stock level changed',
        },
      }));

      const result = await connector.handleWebhook(payload, 'sig_test');

      expect(result.type).toBe('stock_updated');
      expect(result.data.order).toBeUndefined();
      expect(result.data.shipment).toBeUndefined();
      expect(result.data.reason).toBe('Stock level changed');
    });

    it('should parse an order_failed webhook with reason', async () => {
      const payload = Buffer.from(JSON.stringify({
        type: 'order_failed',
        data: {
          order: {
            id: 999002,
            external_id: 'order_xyz',
            status: 'failed',
          },
          reason: 'Out of stock',
        },
      }));

      const result = await connector.handleWebhook(payload, 'sig_test');

      expect(result.type).toBe('order_failed');
      expect(result.data.order?.status).toBe('failed');
      expect(result.data.reason).toBe('Out of stock');
    });

    it('should throw on invalid JSON payload', async () => {
      const payload = Buffer.from('not json');

      await expect(
        connector.handleWebhook(payload, 'sig_test'),
      ).rejects.toThrow();
    });
  });
});
