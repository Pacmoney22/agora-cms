import type { CartItemConfiguration } from '@agora-cms/shared';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

import { CartService } from './cart.service';

// DTO classes declared inline for co-location
class AddItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  configuration?: CartItemConfiguration;
}

class UpdateItemDto {
  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

@ApiTags('cart')
@ApiBearerAuth()
@Controller('api/v1/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current shopping cart' })
  @ApiHeader({ name: 'x-cart-id', required: true, description: 'Cart identifier' })
  @ApiResponse({ status: 200, description: 'Current cart' })
  async getCart(@Headers('x-cart-id') cartId: string) {
    return this.cartService.getCart(cartId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add an item to the cart' })
  @ApiHeader({ name: 'x-cart-id', required: true, description: 'Cart identifier' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addItem(
    @Headers('x-cart-id') cartId: string,
    @Body() dto: AddItemDto,
  ) {
    return this.cartService.addItem(cartId, dto);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update item quantity in cart' })
  @ApiHeader({ name: 'x-cart-id', required: true, description: 'Cart identifier' })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateItem(
    @Headers('x-cart-id') cartId: string,
    @Param('id') cartItemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(cartId, cartItemId, dto.quantity);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an item from the cart' })
  @ApiHeader({ name: 'x-cart-id', required: true, description: 'Cart identifier' })
  @ApiResponse({ status: 200, description: 'Item removed, updated cart returned' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeItem(
    @Headers('x-cart-id') cartId: string,
    @Param('id') cartItemId: string,
  ) {
    return this.cartService.removeItem(cartId, cartItemId);
  }
}
