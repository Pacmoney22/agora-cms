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

import { FulfillmentService } from './fulfillment.service';

@ApiTags('fulfillment')
@ApiBearerAuth()
@Controller('api/v1/fulfillment')
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List orders pending fulfillment' })
  @ApiResponse({ status: 200, description: 'Orders awaiting fulfillment' })
  async listPending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.fulfillmentService.listPendingFulfillment(page, limit);
  }

  @Post(':orderId/ship')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark order as shipped with tracking info' })
  @ApiResponse({ status: 200, description: 'Shipment recorded' })
  async ship(
    @Param('orderId') orderId: string,
    @Body() dto: { trackingNumber: string; carrier: string },
  ) {
    return this.fulfillmentService.shipOrder(orderId, dto.trackingNumber, dto.carrier);
  }

  @Post(':orderId/deliver-digital')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deliver digital / virtual items for an order' })
  @ApiResponse({ status: 200, description: 'Digital items delivered' })
  async deliverDigital(@Param('orderId') orderId: string) {
    return this.fulfillmentService.deliverDigitalItems(orderId);
  }
}
