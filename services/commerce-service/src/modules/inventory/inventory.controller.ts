import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

import { InventoryService } from './inventory.service';
import { ReservationService } from './reservation.service';

// -------------------------------------------------------------------------
// DTOs
// -------------------------------------------------------------------------

class ReservationItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

class ReserveInventoryDto {
  @ApiProperty({ type: [ReservationItemDto] })
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ReservationItemDto)
  items!: ReservationItemDto[];
}

// -------------------------------------------------------------------------
// Controller
// -------------------------------------------------------------------------

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly reservationService: ReservationService,
  ) {}

  // ----- Existing inventory endpoints -----

  @Get('low-stock')
  @ApiOperation({ summary: 'List products/variants with low stock' })
  @ApiResponse({ status: 200, description: 'Low stock items' })
  async getLowStock(@Query('threshold') threshold?: number) {
    return this.inventoryService.getLowStockItems(threshold);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get inventory levels for a product and its variants' })
  @ApiResponse({ status: 200, description: 'Inventory levels' })
  async getInventory(@Param('productId') productId: string) {
    return this.inventoryService.getInventory(productId);
  }

  @Put(':productId/variant/:variantId')
  @ApiOperation({ summary: 'Update inventory for a specific variant' })
  @ApiResponse({ status: 200, description: 'Inventory updated' })
  async updateVariantInventory(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: { quantity: number; allowBackorder?: boolean; lowStockThreshold?: number },
  ) {
    return this.inventoryService.updateVariantInventory(productId, variantId, dto);
  }

  // ----- Reservation endpoints -----

  @Post('reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserve inventory for cart checkout' })
  @ApiResponse({ status: 201, description: 'Inventory reserved' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  async reserve(@Body() dto: ReserveInventoryDto) {
    return this.reservationService.reserve(dto.items);
  }

  @Post('reserve/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a reservation after payment success' })
  @ApiResponse({ status: 200, description: 'Reservation confirmed, inventory decremented' })
  @ApiResponse({ status: 404, description: 'Reservation not found or expired' })
  async confirmReservation(@Param('id') reservationId: string) {
    await this.reservationService.confirm(reservationId);
    return { message: 'Reservation confirmed' };
  }

  @Delete('reserve/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  @ApiResponse({ status: 404, description: 'Reservation not found or expired' })
  async cancelReservation(@Param('id') reservationId: string) {
    await this.reservationService.cancel(reservationId);
    return { message: 'Reservation cancelled' };
  }

  @Get(':productId/availability')
  @ApiOperation({ summary: 'Get available quantity for a product (stock minus reservations)' })
  @ApiResponse({ status: 200, description: 'Available quantity' })
  async getAvailability(
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
  ) {
    const [available, reserved] = await Promise.all([
      this.reservationService.getAvailableQuantity(productId, variantId),
      this.reservationService.getReservedQuantity(productId, variantId),
    ]);

    return { productId, variantId: variantId ?? null, available, reserved };
  }
}
