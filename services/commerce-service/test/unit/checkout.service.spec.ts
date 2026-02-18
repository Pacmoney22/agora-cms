import { BadRequestException } from '@nestjs/common';
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
  v4: jest.fn().mockReturnValue('test-uuid-checkout'),
}));

jest.mock('@agora-cms/shared', () => ({
  EVENTS: {
    CHECKOUT_STARTED: 'checkout.started',
  },
}));

import { CartService } from '../../src/modules/cart/cart.service';
import { CheckoutService } from '../../src/modules/checkout/checkout.service';
import { TaxCalculationService } from '../../src/modules/checkout/tax-calculation.service';
import { ReservationService } from '../../src/modules/inventory/reservation.service';
import { OrderService } from '../../src/modules/orders/order.service';

describe('CheckoutService', () => {
  let service: CheckoutService;

  const mockCartService = {
    getCart: jest.fn(),
  };

  const mockOrderService = {
    createOrder: jest.fn(),
  };

  const mockReservationService = {
    reserve: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
  };

  const mockTaxCalculation = {
    calculateTax: jest.fn(),
    getDefaultSettings: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => undefined),
  };

  const mockCart = {
    cartId: 'cart-1',
    items: [
      {
        cartItemId: 'ci-1',
        productId: 'prod-1',
        variantId: null,
        productType: 'physical',
        resolvedType: null,
        name: 'Test Product',
        sku: 'SKU-001',
        quantity: 2,
        unitPrice: 1999,
        totalPrice: 3998,
        image: null,
        configuration: null,
        weight: 500,
        requiresShipping: true,
      },
    ],
    subtotal: 3998,
    itemCount: 2,
    hasPhysicalItems: true,
    hasVirtualItems: false,
    hasServiceItems: false,
    estimatedShipping: null,
    couponCode: null,
    discount: 0,
  };

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'ORD-ABC-1234',
    total: 5317,
    currency: 'USD',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CartService, useValue: mockCartService },
        { provide: OrderService, useValue: mockOrderService },
        { provide: ReservationService, useValue: mockReservationService },
        { provide: TaxCalculationService, useValue: mockTaxCalculation },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    (service as any).kafkaProducer = null;
    jest.clearAllMocks();
  });

  describe('processCheckout', () => {
    beforeEach(() => {
      mockCartService.getCart.mockResolvedValue(mockCart);
      mockReservationService.reserve.mockResolvedValue({
        reservationId: 'res-1',
        expiresAt: new Date('2024-01-01T00:15:00Z'),
      });
      mockTaxCalculation.calculateTax.mockResolvedValue({
        taxAmount: 320,
        taxRate: 0.08,
        breakdown: [],
        provider: 'manual',
      });
      mockTaxCalculation.getDefaultSettings.mockReturnValue({
        enabled: true,
        calculationMethod: 'manual',
        defaultRate: '0',
        taxShipping: false,
        rates: [],
      });
      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      // Mock global fetch for loadTaxSettings
      global.fetch = jest.fn().mockRejectedValue(new Error('Not available'));
    });

    afterEach(() => {
      delete (global as any).fetch;
    });

    it('should process checkout successfully', async () => {
      const result = await service.processCheckout({
        cartId: 'cart-1',
        userId: 'user-1',
        shippingAddress: {
          line1: '123 Main St',
          city: 'Test',
          state: 'OH',
          postalCode: '43215',
          country: 'US',
        },
      });

      expect(result.order.id).toBe('order-1');
      expect(result.paymentRequired).toBe(true);
      expect(result.reservationId).toBe('res-1');
      expect(mockReservationService.reserve).toHaveBeenCalledTimes(1);
      expect(mockOrderService.createOrder).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for empty cart', async () => {
      mockCartService.getCart.mockResolvedValue({
        ...mockCart,
        items: [],
      });

      await expect(
        service.processCheckout({
          cartId: 'cart-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when neither userId nor guestEmail provided', async () => {
      await expect(
        service.processCheckout({
          cartId: 'cart-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for physical items without shipping address', async () => {
      await expect(
        service.processCheckout({
          cartId: 'cart-1',
          userId: 'user-1',
          // no shippingAddress
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel reservation if checkout fails after reservation', async () => {
      mockOrderService.createOrder.mockRejectedValue(new Error('DB error'));

      await expect(
        service.processCheckout({
          cartId: 'cart-1',
          userId: 'user-1',
          shippingAddress: {
            line1: '123 Main St',
            city: 'Test',
            state: 'OH',
            postalCode: '43215',
            country: 'US',
          },
        }),
      ).rejects.toThrow('DB error');

      expect(mockReservationService.cancel).toHaveBeenCalledWith('res-1');
    });

    it('should handle reservation cancellation failure gracefully', async () => {
      mockOrderService.createOrder.mockRejectedValue(new Error('DB error'));
      mockReservationService.cancel.mockRejectedValue(new Error('Cancel failed'));

      await expect(
        service.processCheckout({
          cartId: 'cart-1',
          userId: 'user-1',
          shippingAddress: {
            line1: '123 Main St',
            city: 'Test',
            state: 'OH',
            postalCode: '43215',
            country: 'US',
          },
        }),
      ).rejects.toThrow('DB error');
    });

    it('should accept guest checkout with email', async () => {
      const virtualCart = {
        ...mockCart,
        hasPhysicalItems: false,
        items: [{ ...mockCart.items[0], productType: 'virtual', requiresShipping: false }],
      };
      mockCartService.getCart.mockResolvedValue(virtualCart);

      const result = await service.processCheckout({
        cartId: 'cart-1',
        guestEmail: 'guest@example.com',
      });

      expect(result.order.id).toBe('order-1');
    });

    it('should not require shipping cost for virtual-only carts', async () => {
      const virtualCart = {
        ...mockCart,
        hasPhysicalItems: false,
        items: [{ ...mockCart.items[0], productType: 'virtual', requiresShipping: false }],
      };
      mockCartService.getCart.mockResolvedValue(virtualCart);

      await service.processCheckout({
        cartId: 'cart-1',
        userId: 'user-1',
      });

      // The order should be created with shippingCost: 0
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ shippingCost: 0 }),
      );
    });

    it('should set paymentRequired to false when total is 0', async () => {
      const freeCart = {
        ...mockCart,
        subtotal: 0,
        discount: 0,
        hasPhysicalItems: false,
        items: [{ ...mockCart.items[0], productType: 'virtual', totalPrice: 0, unitPrice: 0 }],
      };
      mockCartService.getCart.mockResolvedValue(freeCart);
      mockTaxCalculation.calculateTax.mockResolvedValue({
        taxAmount: 0,
        taxRate: 0,
        breakdown: [],
        provider: 'none',
      });
      mockOrderService.createOrder.mockResolvedValue({
        ...mockOrder,
        total: 0,
      });

      const result = await service.processCheckout({
        cartId: 'cart-1',
        userId: 'user-1',
      });

      expect(result.paymentRequired).toBe(false);
      expect(result.paymentClientSecret).toBeUndefined();
    });

    it('should load tax settings from content API when available', async () => {
      const mockSettings = {
        enabled: true,
        calculationMethod: 'manual',
        defaultRate: '8',
        taxShipping: true,
        rates: [],
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSettings),
      });

      await service.processCheckout({
        cartId: 'cart-1',
        userId: 'user-1',
        shippingAddress: {
          line1: '123 Main St',
          city: 'Test',
          state: 'OH',
          postalCode: '43215',
          country: 'US',
        },
      });

      expect(mockTaxCalculation.calculateTax).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        expect.any(Number),
        mockSettings,
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm reservation', async () => {
      mockReservationService.confirm.mockResolvedValue(undefined);

      await service.confirmPayment('res-1');

      expect(mockReservationService.confirm).toHaveBeenCalledWith('res-1');
    });
  });
});
