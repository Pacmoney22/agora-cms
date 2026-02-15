import { Test, TestingModule } from '@nestjs/testing';

import { ServiceBookingController } from '../../src/modules/service-bookings/service-booking.controller';
import { ServiceBookingService } from '../../src/modules/service-bookings/service-booking.service';

describe('ServiceBookingController', () => {
  let controller: ServiceBookingController;
  const mockService = {
    findAll: jest.fn(),
    create: jest.fn(),
    getAvailability: jest.fn(),
    findById: jest.fn(),
    reschedule: jest.fn(),
    cancel: jest.fn(),
    complete: jest.fn(),
    markNoShow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceBookingController],
      providers: [{ provide: ServiceBookingService, useValue: mockService }],
    }).compile();

    controller = module.get<ServiceBookingController>(ServiceBookingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should call bookingService.findAll with all filter params', async () => {
      const expected = { data: [], meta: { total: 0 } };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.list('user-1', 'prod-1', 'confirmed', 1, 20);

      expect(mockService.findAll).toHaveBeenCalledWith({
        userId: 'user-1',
        productId: 'prod-1',
        status: 'confirmed',
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(expected);
    });

    it('should pass undefined for optional filter params', async () => {
      mockService.findAll.mockResolvedValue({ data: [] });

      await controller.list(undefined, undefined, undefined, undefined, undefined);

      expect(mockService.findAll).toHaveBeenCalledWith({
        userId: undefined,
        productId: undefined,
        status: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('create', () => {
    it('should call bookingService.create with dto', async () => {
      const dto = { productId: 'prod-1', userId: 'user-1', startTime: '2025-06-01T10:00:00Z' };
      const expected = { id: 'bk-1', ...dto, status: 'confirmed' };
      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(dto as any);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getAvailability', () => {
    it('should call bookingService.getAvailability with productId and date', async () => {
      const expected = [{ startTime: '10:00', endTime: '11:00' }];
      mockService.getAvailability.mockResolvedValue(expected);

      const result = await controller.getAvailability('prod-1', '2025-06-01');

      expect(mockService.getAvailability).toHaveBeenCalledWith('prod-1', '2025-06-01');
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call bookingService.findById with the id', async () => {
      const expected = { id: 'bk-1', status: 'confirmed' };
      mockService.findById.mockResolvedValue(expected);

      const result = await controller.findOne('bk-1');

      expect(mockService.findById).toHaveBeenCalledWith('bk-1');
      expect(result).toEqual(expected);
    });
  });

  describe('reschedule', () => {
    it('should call bookingService.reschedule with id and new start time', async () => {
      const dto = { newStartTime: '2025-06-02T14:00:00Z' };
      const expected = { id: 'bk-1', startTime: '2025-06-02T14:00:00Z' };
      mockService.reschedule.mockResolvedValue(expected);

      const result = await controller.reschedule('bk-1', dto);

      expect(mockService.reschedule).toHaveBeenCalledWith('bk-1', '2025-06-02T14:00:00Z');
      expect(result).toEqual(expected);
    });
  });

  describe('cancel', () => {
    it('should call bookingService.cancel with id and reason', async () => {
      const dto = { reason: 'Schedule conflict' };
      const expected = { id: 'bk-1', status: 'cancelled' };
      mockService.cancel.mockResolvedValue(expected);

      const result = await controller.cancel('bk-1', dto);

      expect(mockService.cancel).toHaveBeenCalledWith('bk-1', 'Schedule conflict');
      expect(result).toEqual(expected);
    });

    it('should pass undefined reason when not provided', async () => {
      mockService.cancel.mockResolvedValue({});

      await controller.cancel('bk-1', {});

      expect(mockService.cancel).toHaveBeenCalledWith('bk-1', undefined);
    });
  });

  describe('complete', () => {
    it('should call bookingService.complete with the id', async () => {
      const expected = { id: 'bk-1', status: 'completed' };
      mockService.complete.mockResolvedValue(expected);

      const result = await controller.complete('bk-1');

      expect(mockService.complete).toHaveBeenCalledWith('bk-1');
      expect(result).toEqual(expected);
    });
  });

  describe('noShow', () => {
    it('should call bookingService.markNoShow with the id', async () => {
      const expected = { id: 'bk-1', status: 'no_show' };
      mockService.markNoShow.mockResolvedValue(expected);

      const result = await controller.noShow('bk-1');

      expect(mockService.markNoShow).toHaveBeenCalledWith('bk-1');
      expect(result).toEqual(expected);
    });
  });
});
