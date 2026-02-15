import { Test, TestingModule } from '@nestjs/testing';

import { CartController } from '../../src/modules/cart/cart.controller';
import { CartService } from '../../src/modules/cart/cart.service';

describe('CartController', () => {
  let controller: CartController;
  const mockService = {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockService }],
    }).compile();

    controller = module.get<CartController>(CartController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCart', () => {
    it('should call cartService.getCart with the cart id from header', async () => {
      const expected = { id: 'cart-1', items: [], totals: {} };
      mockService.getCart.mockResolvedValue(expected);

      const result = await controller.getCart('cart-1');

      expect(mockService.getCart).toHaveBeenCalledWith('cart-1');
      expect(result).toEqual(expected);
    });
  });

  describe('addItem', () => {
    it('should call cartService.addItem with cart id and dto', async () => {
      const dto = { productId: 'prod-1', quantity: 2 };
      const expected = { id: 'cart-1', items: [{ productId: 'prod-1', quantity: 2 }] };
      mockService.addItem.mockResolvedValue(expected);

      const result = await controller.addItem('cart-1', dto as any);

      expect(mockService.addItem).toHaveBeenCalledWith('cart-1', dto);
      expect(result).toEqual(expected);
    });

    it('should pass variantId and configuration when provided', async () => {
      const dto = { productId: 'prod-1', variantId: 'v1', quantity: 1, configuration: {} };
      mockService.addItem.mockResolvedValue({});

      await controller.addItem('cart-1', dto as any);

      expect(mockService.addItem).toHaveBeenCalledWith('cart-1', dto);
    });
  });

  describe('updateItem', () => {
    it('should call cartService.updateItem with cart id, item id, and quantity', async () => {
      const dto = { quantity: 5 };
      const expected = { id: 'cart-1', items: [{ id: 'item-1', quantity: 5 }] };
      mockService.updateItem.mockResolvedValue(expected);

      const result = await controller.updateItem('cart-1', 'item-1', dto as any);

      expect(mockService.updateItem).toHaveBeenCalledWith('cart-1', 'item-1', 5);
      expect(result).toEqual(expected);
    });
  });

  describe('removeItem', () => {
    it('should call cartService.removeItem with cart id and item id', async () => {
      const expected = { id: 'cart-1', items: [] };
      mockService.removeItem.mockResolvedValue(expected);

      const result = await controller.removeItem('cart-1', 'item-1');

      expect(mockService.removeItem).toHaveBeenCalledWith('cart-1', 'item-1');
      expect(result).toEqual(expected);
    });
  });
});
