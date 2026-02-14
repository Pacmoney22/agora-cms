import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { PaginatedResponse } from '@nextgen-cms/shared';
import { ProductService } from '../products/product.service';

export interface BookingDto {
  id: string;
  orderId: string;
  productId: string;
  userId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show';
  calendarEventId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  orderId: string;
  productId: string;
  userId: string;
  scheduledAt: string;
  notes?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingCapacity: number;
}

@Injectable()
export class ServiceBookingService {
  private readonly logger = new Logger(ServiceBookingService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly productService: ProductService,
  ) {}

  async create(dto: CreateBookingDto): Promise<BookingDto> {
    const product = await this.productService.findById(dto.productId);
    if (product.type !== 'service' || !product.service) {
      throw new BadRequestException('Product is not a service product');
    }

    const serviceConfig = product.service as any;
    const scheduledAt = new Date(dto.scheduledAt);

    // Validate booking lead time
    const leadTimeMs = (serviceConfig.bookingLeadTimeHours ?? 0) * 60 * 60 * 1000;
    if (scheduledAt.getTime() - Date.now() < leadTimeMs) {
      throw new BadRequestException(
        `Booking must be made at least ${serviceConfig.bookingLeadTimeHours} hours in advance`,
      );
    }

    const booking = await this.prisma.serviceBooking.create({
      data: {
        orderId: dto.orderId,
        productId: dto.productId,
        userId: dto.userId,
        scheduledAt,
        durationMinutes: serviceConfig.durationMinutes,
        status: 'confirmed',
        notes: dto.notes ?? null,
      },
    });

    const result = this.toBookingDto(booking);
    this.logger.log(`Booking created: ${booking.id} for product ${dto.productId}`);
    return result;
  }

  async findAll(query: {
    userId?: string;
    productId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<BookingDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {};
    if (query.userId) where.userId = query.userId;
    if (query.productId) where.productId = query.productId;
    if (query.status) where.status = query.status;

    const [rows, total] = await Promise.all([
      this.prisma.serviceBooking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.serviceBooking.count({ where }),
    ]);

    return {
      data: rows.map((r: any) => this.toBookingDto(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<BookingDto> {
    const row = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Booking ${id} not found`);
    return this.toBookingDto(row);
  }

  async getAvailability(productId: string, date: string): Promise<TimeSlot[]> {
    const product = await this.productService.findById(productId);
    if (product.type !== 'service' || !product.service) {
      throw new BadRequestException('Product is not a service product');
    }

    const serviceConfig = product.service as any;
    const durationMs = serviceConfig.durationMinutes * 60 * 1000;
    const capacity = serviceConfig.capacityPerSlot ?? 1;
    const dayStart = new Date(`${date}T09:00:00.000Z`);
    const dayEnd = new Date(`${date}T17:00:00.000Z`);

    // Get existing bookings for the day
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingBookings = await this.prisma.serviceBooking.findMany({
      where: {
        productId,
        scheduledAt: {
          gte: dayStart,
          lt: nextDay,
        },
        status: {
          notIn: ['cancelled', 'no_show'],
        },
      },
    });

    // Generate time slots
    const slots: TimeSlot[] = [];
    let slotStart = dayStart.getTime();

    while (slotStart + durationMs <= dayEnd.getTime()) {
      const slotEnd = slotStart + durationMs;
      const overlapping = existingBookings.filter((b: any) => {
        const bStart = b.scheduledAt.getTime();
        const bEnd = bStart + b.durationMinutes * 60 * 1000;
        return bStart < slotEnd && bEnd > slotStart;
      });

      const remainingCapacity = capacity - overlapping.length;

      slots.push({
        startTime: new Date(slotStart).toISOString(),
        endTime: new Date(slotEnd).toISOString(),
        available: remainingCapacity > 0,
        remainingCapacity: Math.max(0, remainingCapacity),
      });

      slotStart += durationMs;
    }

    return slots;
  }

  async reschedule(id: string, newScheduledAt: string): Promise<BookingDto> {
    const existing = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Booking ${id} not found`);

    if (existing.status === 'cancelled' || existing.status === 'completed') {
      throw new BadRequestException(`Cannot reschedule a ${existing.status} booking`);
    }

    const updated = await this.prisma.serviceBooking.update({
      where: { id },
      data: {
        scheduledAt: new Date(newScheduledAt),
        status: 'rescheduled',
      },
    });

    const result = this.toBookingDto(updated);
    this.logger.log(`Booking rescheduled: ${id}`);
    return result;
  }

  async cancel(id: string, reason?: string): Promise<BookingDto> {
    const existing = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Booking ${id} not found`);

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new BadRequestException(`Cannot cancel a ${existing.status} booking`);
    }

    const updated = await this.prisma.serviceBooking.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: reason
          ? [existing.notes, `Cancellation reason: ${reason}`].filter(Boolean).join(' | ')
          : existing.notes,
      },
    });

    const result = this.toBookingDto(updated);
    this.logger.log(`Booking cancelled: ${id}`);
    return result;
  }

  async complete(id: string): Promise<BookingDto> {
    const existing = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Booking ${id} not found`);

    if (existing.status === 'cancelled') {
      throw new BadRequestException('Cannot complete a cancelled booking');
    }

    const updated = await this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'completed' },
    });

    const result = this.toBookingDto(updated);
    this.logger.log(`Booking completed: ${id}`);
    return result;
  }

  async markNoShow(id: string): Promise<BookingDto> {
    const existing = await this.prisma.serviceBooking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Booking ${id} not found`);

    if (existing.status !== 'confirmed' && existing.status !== 'rescheduled') {
      throw new BadRequestException(`Cannot mark a ${existing.status} booking as no-show`);
    }

    const updated = await this.prisma.serviceBooking.update({
      where: { id },
      data: { status: 'no_show' },
    });

    const result = this.toBookingDto(updated);
    this.logger.log(`Booking no-show: ${id}`);
    return result;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private toBookingDto(row: any): BookingDto {
    return {
      id: row.id,
      orderId: row.orderId,
      productId: row.productId,
      userId: row.userId,
      scheduledAt: row.scheduledAt instanceof Date ? row.scheduledAt.toISOString() : row.scheduledAt,
      durationMinutes: row.durationMinutes,
      status: row.status,
      calendarEventId: row.calendarEventId,
      notes: row.notes,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }
}
