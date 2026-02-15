import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }));
});

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
  v4: jest.fn().mockReturnValue('test-uuid-cart'),
}));

jest.mock('@agora-cms/shared', () => ({
  PRODUCT_TYPE_REQUIRES_SHIPPING: {
    physical: true,
    virtual: false,
    service: false,
    configurable: false,
    course: false,
    affiliate: false,
    printful: true,
  },
  EVENTS: {
    CART_UPDATED: 'cart.updated',
  },
}));

import { CartService } from '../../src/modules/cart/cart.service';
import { ProductService } from '../../src/modules/products/product.service';

describe('CartService', () => {
  let service: CartService;

  const mockProductService = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => undefined),
  };

  const mockProduct = {
    id: 'prod-1',
    name: 'Test Product',
    sku: 'SKU-001',
    type: 'physical',
    pricing: { basePrice: 1999, salePrice: null },
    shipping: { weight: 500 },
    images: [{ url: 'https://example.com/img.jpg' }],
    variants: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    // Ensure redis is null so we use memory store
    (service as any).redis = null;
    (service as any).kafkaProducer = null;
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return empty cart when cart does not exist', async () => {
      const cart = await service.getCart('cart-1');

      expect(cart.cartId).toBe('cart-1');
      expect(cart.items).toEqual([]);
      expect(cart.subtotal).toBe(0);
      expect(cart.itemCount).toBe(0);
    });

    it('should return existing cart from memory store', async () => {
      const existingCart = {
        cartId: 'cart-1',
        items: [],
        subtotal: 0,
        itemCount: 0,
        hasPhysicalItems: false,
        hasVirtualItems: false,
        hasServiceItems: false,
        estimatedShipping: null,
        couponCode: null,
        discount: 0,
      };
      (service as any).memoryStore.set('cart-1', existingCart);

      const cart = await service.getCart('cart-1');

      expect(cart.cartId).toBe('cart-1');
    });

    it('should return cart from Redis when Redis is available', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify({
          cartId: 'cart-redis',
          items: [],
          subtotal: 0,
          itemCount: 0,
          hasPhysicalItems: false,
          hasVirtualItems: false,
          hasServiceItems: false,
          estimatedShipping: null,
          couponCode: null,
          discount: 0,
        })),
        set: jest.fn(),
      };
      (service as any).redis = mockRedis;

      const cart = await service.getCart('cart-redis');

      expect(cart.cartId).toBe('cart-redis');
      expect(mockRedis.get).toHaveBeenCalledWith('cart:cart-redis');
    });
  });

  describe('addItem', () => {
    it('should add a new item to the cart', async () => {
      mockProductService.findById.mockResolvedValue(mockProduct);

      const cart = await service.addItem('cart-1', {
        productId: 'prod-1',
        quantity: 2,
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe('prod-1');
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.items[0].unitPrice).toBe(1999);
      expect(cart.items[0].totalPrice).toBe(3998);
      expect(cart.subtotal).toBe(3998);
      expect(cart.itemCount).toBe(2);
      expect(cart.hasPhysicalItems).toBe(true);
    });

    it('should increment quantity for existing item', async () => {
      mockProductService.findById.mockResolvedValue(mockProduct);

      // Add item first
      await service.addItem('cart-2', { productId: 'prod-1', quantity: 1 });

      // Add same item again
      const cart = await service.addItem('cart-2', { productId: 'prod-1', quantity: 3 });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(4);
      expect(cart.items[0].totalPrice).toBe(1999 * 4);
    });

    it('should resolve variant price when variantId is provided', async () => {
      const productWithVariants = {
        ...mockProduct,
        variants: [
          {
            variantId: 'v-1',
            sku: 'SKU-001-RED',
            priceOverride: 2499,
            salePrice: null,
          },
        ],
      };
      mockProductService.findById.mockResolvedValue(productWithVariants);

      const cart = await service.addItem('cart-3', {
        productId: 'prod-1',
        variantId: 'v-1',
        quantity: 1,
      });

      expect(cart.items[0].unitPrice).toBe(2499);
    });

    it('should use salePrice when available for variant', async () => {
      const productWithVariants = {
        ...mockProduct,
        variants: [
          {
            variantId: 'v-2',
            sku: 'SKU-001-BLUE',
            priceOverride: null,
            salePrice: 1499,
          },
        ],
      };
      mockProductService.findById.mockResolvedValue(productWithVariants);

      const cart = await service.addItem('cart-4', {
        productId: 'prod-1',
        variantId: 'v-2',
        quantity: 1,
      });

      expect(cart.items[0].unitPrice).toBe(1499);
    });

    it('should use product salePrice when available and no variant', async () => {
      const saleProduct = {
        ...mockProduct,
        pricing: { basePrice: 1999, salePrice: 1499 },
      };
      mockProductService.findById.mockResolvedValue(saleProduct);

      const cart = await service.addItem('cart-5', {
        productId: 'prod-1',
        quantity: 1,
      });

      expect(cart.items[0].unitPrice).toBe(1499);
    });

    it('should save cart to Redis when available', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
      };
      (service as any).redis = mockRedis;
      mockProductService.findById.mockResolvedValue(mockProduct);

      await service.addItem('cart-redis', { productId: 'prod-1', quantity: 1 });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'cart:cart-redis',
        expect.any(String),
        'EX',
        60 * 60 * 24 * 30,
      );
    });

    it('should detect virtual items in cart', async () => {
      const virtualProduct = {
        ...mockProduct,
        type: 'virtual',
      };
      mockProductService.findById.mockResolvedValue(virtualProduct);

      const cart = await service.addItem('cart-6', { productId: 'prod-1', quantity: 1 });

      expect(cart.hasVirtualItems).toBe(true);
      expect(cart.hasPhysicalItems).toBe(false);
    });

    it('should detect service items in cart', async () => {
      const serviceProduct = {
        ...mockProduct,
        type: 'service',
      };
      mockProductService.findById.mockResolvedValue(serviceProduct);

      const cart = await service.addItem('cart-7', { productId: 'prod-1', quantity: 1 });

      expect(cart.hasServiceItems).toBe(true);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity', async () => {
      mockProductService.findById.mockResolvedValue(mockProduct);
      await service.addItem('cart-upd', { productId: 'prod-1', quantity: 1 });

      const cart = (service as any).memoryStore.get('cart-upd');
      const cartItemId = cart.items[0].cartItemId;

      const updated = await service.updateItem('cart-upd', cartItemId, 5);

      expect(updated.items[0].quantity).toBe(5);
      expect(updated.items[0].totalPrice).toBe(1999 * 5);
      expect(updated.subtotal).toBe(1999 * 5);
    });

    it('should throw NotFoundException for non-existent cart', async () => {
      await expect(
        service.updateItem('nonexistent', 'item-1', 2),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent cart item', async () => {
      mockProductService.findById.mockResolvedValue(mockProduct);
      await service.addItem('cart-upd2', { productId: 'prod-1', quantity: 1 });

      await expect(
        service.updateItem('cart-upd2', 'nonexistent', 2),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for quantity <= 0', async () => {
      mockProductService.findById.mockResolvedValue(mockProduct);
      await service.addItem('cart-upd3', { productId: 'prod-1', quantity: 1 });

      const cart = (service as any).memoryStore.get('cart-upd3');
      const cartItemId = cart.items[0].cartItemId;

      await expect(
        service.updateItem('cart-upd3', cartItemId, 0),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateItem('cart-upd3', cartItemId, -1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the cart', async () => {
      mockProductService.findById.mockResolvedValue(mockProduct);
      await service.addItem('cart-rm', { productId: 'prod-1', quantity: 1 });

      const cart = (service as any).memoryStore.get('cart-rm');
      const cartItemId = cart.items[0].cartItemId;

      const updated = await service.removeItem('cart-rm', cartItemId);

      expect(updated.items).toHaveLength(0);
      expect(updated.subtotal).toBe(0);
      expect(updated.itemCount).toBe(0);
    });

    it('should throw NotFoundException for non-existent cart', async () => {
      await expect(
        service.removeItem('nonexistent', 'item-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent cart item', async () => {
      mockProductService.findById.mockResolvedValue(mockProduct);
      await service.addItem('cart-rm2', { productId: 'prod-1', quantity: 1 });

      await expect(
        service.removeItem('cart-rm2', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
