import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CouponService, CreateCouponDto, CouponDto, ValidateContext } from './coupon.service';

@ApiTags('coupons')
@ApiBearerAuth()
@Controller('api/v1/coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  @ApiOperation({ summary: 'List all coupons' })
  @ApiResponse({ status: 200, description: 'Coupon list' })
  async list(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.couponService.findAll(page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  async create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon by ID' })
  @ApiResponse({ status: 200, description: 'Coupon found' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async findOne(@Param('id') id: string) {
    return this.couponService.findById(id);
  }

  @Post('validate/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validate(@Param('code') code: string, @Body() context: ValidateContext) {
    return this.couponService.validate(code, context);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.couponService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiResponse({ status: 204, description: 'Coupon deleted' })
  async remove(@Param('id') id: string) {
    return this.couponService.remove(id);
  }
}
