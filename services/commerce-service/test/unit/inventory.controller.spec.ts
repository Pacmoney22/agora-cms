import { Test, TestingModule } from '@nestjs/testing';

import { InventoryController } from '../../src/modules/inventory/inventory.controller';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { ReservationService } from '../../src/modules/inventory/reservation.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  const mockInventoryService = {
    getLowStockItems: jest.fn(),
    getInventory: jest.fn(),
    updateVariantInventory: jest.fn(),
  };
  const mockReservationService = {
    reserve: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    getAvailableQuantity: jest.fn(),
    getReservedQuantity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ReservationService, useValue: mockReservationService },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---- Inventory endpoints ----

  describe('getLowStock', () => {
    it('should call inventoryService.getLowStockItems with threshold', async () => {
      const expected = [{ productId: 'p1', quantity: 2 }];
      mockInventoryService.getLowStockItems.mockResolvedValue(expected);

      const result = await controller.getLowStock(5);

      expect(mockInventoryService.getLowStockItems).toHaveBeenCalledWith(5);
      expect(result).toEqual(expected);
    });

    it('should call with undefined when no threshold provided', async () => {
      mockInventoryService.getLowStockItems.mockResolvedValue([]);

      await controller.getLowStock(undefined);

      expect(mockInventoryService.getLowStockItems).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getInventory', () => {
    it('should call inventoryService.getInventory with productId', async () => {
      const expected = { productId: 'p1', quantity: 50, variants: [] };
      mockInventoryService.getInventory.mockResolvedValue(expected);

      const result = await controller.getInventory('p1');

      expect(mockInventoryService.getInventory).toHaveBeenCalledWith('p1');
      expect(result).toEqual(expected);
    });
  });

  describe('updateVariantInventory', () => {
    it('should call inventoryService.updateVariantInventory with productId, variantId, and dto', async () => {
      const dto = { quantity: 100, allowBackorder: false, lowStockThreshold: 10 };
      const expected = { productId: 'p1', variantId: 'v1', quantity: 100 };
      mockInventoryService.updateVariantInventory.mockResolvedValue(expected);

      const result = await controller.updateVariantInventory('p1', 'v1', dto);

      expect(mockInventoryService.updateVariantInventory).toHaveBeenCalledWith('p1', 'v1', dto);
      expect(result).toEqual(expected);
    });
  });

  // ---- Reservation endpoints ----

  describe('reserve', () => {
    it('should call reservationService.reserve with items from dto', async () => {
      const items = [{ productId: 'p1', quantity: 2 }];
      const expected = { reservationId: 'res-1', expiresAt: '2025-01-01' };
      mockReservationService.reserve.mockResolvedValue(expected);

      const result = await controller.reserve({ items } as any);

      expect(mockReservationService.reserve).toHaveBeenCalledWith(items);
      expect(result).toEqual(expected);
    });

    it('should pass variantId when provided in items', async () => {
      const items = [{ productId: 'p1', variantId: 'v1', quantity: 1 }];
      mockReservationService.reserve.mockResolvedValue({});

      await controller.reserve({ items } as any);

      expect(mockReservationService.reserve).toHaveBeenCalledWith(items);
    });
  });

  describe('confirmReservation', () => {
    it('should call reservationService.confirm and return success message', async () => {
      mockReservationService.confirm.mockResolvedValue(undefined);

      const result = await controller.confirmReservation('res-1');

      expect(mockReservationService.confirm).toHaveBeenCalledWith('res-1');
      expect(result).toEqual({ message: 'Reservation confirmed' });
    });
  });

  describe('cancelReservation', () => {
    it('should call reservationService.cancel and return success message', async () => {
      mockReservationService.cancel.mockResolvedValue(undefined);

      const result = await controller.cancelReservation('res-1');

      expect(mockReservationService.cancel).toHaveBeenCalledWith('res-1');
      expect(result).toEqual({ message: 'Reservation cancelled' });
    });
  });

  describe('getAvailability', () => {
    it('should call both getAvailableQuantity and getReservedQuantity and return combined result', async () => {
      mockReservationService.getAvailableQuantity.mockResolvedValue(45);
      mockReservationService.getReservedQuantity.mockResolvedValue(5);

      const result = await controller.getAvailability('p1', 'v1');

      expect(mockReservationService.getAvailableQuantity).toHaveBeenCalledWith('p1', 'v1');
      expect(mockReservationService.getReservedQuantity).toHaveBeenCalledWith('p1', 'v1');
      expect(result).toEqual({
        productId: 'p1',
        variantId: 'v1',
        available: 45,
        reserved: 5,
      });
    });

    it('should return null variantId when no variantId is provided', async () => {
      mockReservationService.getAvailableQuantity.mockResolvedValue(50);
      mockReservationService.getReservedQuantity.mockResolvedValue(0);

      const result = await controller.getAvailability('p1', undefined);

      expect(mockReservationService.getAvailableQuantity).toHaveBeenCalledWith('p1', undefined);
      expect(mockReservationService.getReservedQuantity).toHaveBeenCalledWith('p1', undefined);
      expect(result).toEqual({
        productId: 'p1',
        variantId: null,
        available: 50,
        reserved: 0,
      });
    });
  });
});
