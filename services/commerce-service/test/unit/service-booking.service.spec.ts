import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { ServiceBookingService } from '../../src/modules/service-bookings/service-booking.service';
import { ProductService } from '../../src/modules/products/product.service';

describe('ServiceBookingService', () => {
  let service: ServiceBookingService;

  const mockProductService = {
    findById: jest.fn(),
  };

  const mockServiceProduct = {
    id: 'prod-svc',
    type: 'service',
    service: {
      durationMinutes: 60,
      bookingLeadTimeHours: 24,
      capacityPerSlot: 2,
    },
  };

  const mockBooking = {
    id: 'booking-1',
    orderId: 'order-1',
    productId: 'prod-svc',
    userId: 'user-1',
    scheduledAt: new Date('2025-06-15T10:00:00Z'),
    durationMinutes: 60,
    status: 'confirmed',
    calendarEventId: null,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    serviceBooking: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceBookingService,
        { provide: 'PRISMA', useValue: mockPrisma },
        { provide: ProductService, useValue: mockProductService },
      ],
    }).compile();

    service = module.get<ServiceBookingService>(ServiceBookingService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a booking for a service product', async () => {
      mockProductService.findById.mockResolvedValue(mockServiceProduct);
      mockPrisma.serviceBooking.create.mockResolvedValue(mockBooking);

      // Set scheduled time far enough in the future
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const result = await service.create({
        orderId: 'order-1',
        productId: 'prod-svc',
        userId: 'user-1',
        scheduledAt: futureDate,
      });

      expect(result.id).toBe('booking-1');
      expect(result.status).toBe('confirmed');
      expect(mockPrisma.serviceBooking.create).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for non-service product', async () => {
      mockProductService.findById.mockResolvedValue({
        id: 'prod-1',
        type: 'physical',
        service: null,
      });

      await expect(
        service.create({
          orderId: 'order-1',
          productId: 'prod-1',
          userId: 'user-1',
          scheduledAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when lead time not met', async () => {
      mockProductService.findById.mockResolvedValue(mockServiceProduct);

      // Set scheduled time too soon (within 24 hours)
      const tooSoon = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

      await expect(
        service.create({
          orderId: 'order-1',
          productId: 'prod-svc',
          userId: 'user-1',
          scheduledAt: tooSoon,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([mockBooking]);
      mockPrisma.serviceBooking.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by userId', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.count.mockResolvedValue(0);

      await service.findAll({ userId: 'user-1' });

      expect(mockPrisma.serviceBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('should filter by productId', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.count.mockResolvedValue(0);

      await service.findAll({ productId: 'prod-svc' });

      expect(mockPrisma.serviceBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productId: 'prod-svc' }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.count.mockResolvedValue(0);

      await service.findAll({ status: 'confirmed' });

      expect(mockPrisma.serviceBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'confirmed' }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return booking when found', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(mockBooking);

      const result = await service.findById('booking-1');

      expect(result.id).toBe('booking-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailability', () => {
    it('should return available time slots for a service product', async () => {
      mockProductService.findById.mockResolvedValue(mockServiceProduct);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);

      const slots = await service.getAvailability('prod-svc', '2025-06-15');

      // 9:00 to 17:00 with 60-min slots = 8 slots
      expect(slots).toHaveLength(8);
      expect(slots[0].available).toBe(true);
      expect(slots[0].remainingCapacity).toBe(2);
    });

    it('should reduce capacity for booked slots', async () => {
      mockProductService.findById.mockResolvedValue(mockServiceProduct);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([
        {
          scheduledAt: new Date('2025-06-15T10:00:00Z'),
          durationMinutes: 60,
          status: 'confirmed',
        },
      ]);

      const slots = await service.getAvailability('prod-svc', '2025-06-15');

      // The 10:00-11:00 slot should have 1 remaining capacity
      const tenAmSlot = slots.find(
        (s) => s.startTime === '2025-06-15T10:00:00.000Z',
      );
      expect(tenAmSlot).toBeDefined();
      expect(tenAmSlot!.remainingCapacity).toBe(1);
      expect(tenAmSlot!.available).toBe(true);
    });

    it('should mark slot unavailable when fully booked', async () => {
      mockProductService.findById.mockResolvedValue(mockServiceProduct);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([
        {
          scheduledAt: new Date('2025-06-15T10:00:00Z'),
          durationMinutes: 60,
        },
        {
          scheduledAt: new Date('2025-06-15T10:00:00Z'),
          durationMinutes: 60,
        },
      ]);

      const slots = await service.getAvailability('prod-svc', '2025-06-15');

      const tenAmSlot = slots.find(
        (s) => s.startTime === '2025-06-15T10:00:00.000Z',
      );
      expect(tenAmSlot!.available).toBe(false);
      expect(tenAmSlot!.remainingCapacity).toBe(0);
    });

    it('should throw BadRequestException for non-service product', async () => {
      mockProductService.findById.mockResolvedValue({
        type: 'physical',
        service: null,
      });

      await expect(
        service.getAvailability('prod-1', '2025-06-15'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reschedule', () => {
    it('should reschedule a confirmed booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        scheduledAt: new Date('2025-06-20T14:00:00Z'),
        status: 'rescheduled',
      });

      const result = await service.reschedule(
        'booking-1',
        '2025-06-20T14:00:00Z',
      );

      expect(result.status).toBe('rescheduled');
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(
        service.reschedule('nonexistent', '2025-06-20T14:00:00Z'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for cancelled booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
      });

      await expect(
        service.reschedule('booking-1', '2025-06-20T14:00:00Z'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for completed booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'completed',
      });

      await expect(
        service.reschedule('booking-1', '2025-06-20T14:00:00Z'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a confirmed booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
      });

      const result = await service.cancel('booking-1', 'Changed my mind');

      expect(result.status).toBe('cancelled');
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already cancelled booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
      });

      await expect(service.cancel('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for completed booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'completed',
      });

      await expect(service.cancel('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('should append cancellation reason to notes', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        notes: 'Existing note',
      });
      mockPrisma.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
        notes: 'Existing note | Cancellation reason: Schedule conflict',
      });

      await service.cancel('booking-1', 'Schedule conflict');

      expect(mockPrisma.serviceBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Existing note | Cancellation reason: Schedule conflict',
          }),
        }),
      );
    });
  });

  describe('complete', () => {
    it('should complete a confirmed booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        status: 'completed',
      });

      const result = await service.complete('booking-1');

      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(service.complete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for cancelled booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
      });

      await expect(service.complete('booking-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markNoShow', () => {
    it('should mark a confirmed booking as no-show', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        status: 'no_show',
      });

      const result = await service.markNoShow('booking-1');

      expect(result.status).toBe('no_show');
    });

    it('should mark a rescheduled booking as no-show', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'rescheduled',
      });
      mockPrisma.serviceBooking.update.mockResolvedValue({
        ...mockBooking,
        status: 'no_show',
      });

      const result = await service.markNoShow('booking-1');

      expect(result.status).toBe('no_show');
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);

      await expect(service.markNoShow('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for cancelled booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
      });

      await expect(service.markNoShow('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for completed booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'completed',
      });

      await expect(service.markNoShow('booking-1')).rejects.toThrow(BadRequestException);
    });
  });
});
