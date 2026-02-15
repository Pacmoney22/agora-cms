import { Test, TestingModule } from '@nestjs/testing';

import { CheckoutController } from '../../src/modules/checkout/checkout.controller';
import { CheckoutService } from '../../src/modules/checkout/checkout.service';

describe('CheckoutController', () => {
  let controller: CheckoutController;
  const mockService = {
    processCheckout: jest.fn(),
    confirmPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: CheckoutService, useValue: mockService }],
    }).compile();

    controller = module.get<CheckoutController>(CheckoutController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkout', () => {
    it('should call checkoutService.processCheckout with the dto', async () => {
      const dto = {
        cartId: 'cart-1',
        userId: 'user-1',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          line1: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
        },
      };
      const expected = { orderId: 'ord-1', status: 'pending' };
      mockService.processCheckout.mockResolvedValue(expected);

      const result = await controller.checkout(dto as any);

      expect(mockService.processCheckout).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should pass guest checkout dto without userId', async () => {
      const dto = {
        cartId: 'cart-1',
        guestEmail: 'guest@example.com',
      };
      mockService.processCheckout.mockResolvedValue({ orderId: 'ord-2' });

      await controller.checkout(dto as any);

      expect(mockService.processCheckout).toHaveBeenCalledWith(dto);
    });
  });

  describe('confirmPayment', () => {
    it('should call checkoutService.confirmPayment and return success message', async () => {
      mockService.confirmPayment.mockResolvedValue(undefined);

      const result = await controller.confirmPayment('res-1');

      expect(mockService.confirmPayment).toHaveBeenCalledWith('res-1');
      expect(result).toEqual({ message: 'Payment confirmed, inventory committed' });
    });
  });
});
