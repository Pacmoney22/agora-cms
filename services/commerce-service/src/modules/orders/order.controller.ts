import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { OrderStatus } from '@nextgen-cms/shared';
import { OrderService } from './order.service';

class ListOrdersQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'completed', 'cancelled', 'refunded', 'returned'] })
  @IsOptional()
  @IsString()
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

class RefundOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

class FulfillOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrier?: string;
}

@ApiTags('orders')
@ApiBearerAuth()
@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  async list(@Query() query: ListOrdersQueryDto) {
    return this.orderService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund an order' })
  @ApiResponse({ status: 200, description: 'Order refunded' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async refund(@Param('id') id: string, @Body() dto: RefundOrderDto) {
    return this.orderService.refundOrder(id, dto.reason);
  }

  @Post(':id/fulfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fulfill an order (ship physical, deliver virtual)' })
  @ApiResponse({ status: 200, description: 'Order fulfillment processed' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async fulfill(@Param('id') id: string, @Body() dto: FulfillOrderDto) {
    return this.orderService.fulfillOrder(id, dto);
  }
}
