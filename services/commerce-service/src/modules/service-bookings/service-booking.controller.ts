import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ServiceBookingService, CreateBookingDto, BookingDto } from './service-booking.service';

@ApiTags('service-bookings')
@ApiBearerAuth()
@Controller('api/v1/service-bookings')
export class ServiceBookingController {
  constructor(private readonly bookingService: ServiceBookingService) {}

  @Get()
  @ApiOperation({ summary: 'List service bookings' })
  @ApiResponse({ status: 200, description: 'Booking list' })
  async list(
    @Query('userId') userId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bookingService.findAll({ userId, productId, status, page, limit });
  }

  @Post()
  @ApiOperation({ summary: 'Create a service booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  async create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @Get('availability/:productId')
  @ApiOperation({ summary: 'Get available time slots for a service product' })
  @ApiResponse({ status: 200, description: 'Available slots' })
  async getAvailability(
    @Param('productId') productId: string,
    @Query('date') date: string,
  ) {
    return this.bookingService.getAvailability(productId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @Put(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule a booking' })
  @ApiResponse({ status: 200, description: 'Booking rescheduled' })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: { newStartTime: string },
  ) {
    return this.bookingService.reschedule(id, dto.newStartTime);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  async cancel(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.bookingService.cancel(id, dto.reason);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a booking as completed' })
  @ApiResponse({ status: 200, description: 'Booking completed' })
  async complete(@Param('id') id: string) {
    return this.bookingService.complete(id);
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a booking as no-show' })
  @ApiResponse({ status: 200, description: 'Booking marked as no-show' })
  async noShow(@Param('id') id: string) {
    return this.bookingService.markNoShow(id);
  }
}
