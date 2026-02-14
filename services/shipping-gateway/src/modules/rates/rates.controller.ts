import {
  Controller,
  Post,
  Body,
  Inject,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type {
  ShippingRateRequest,
  ShippingRateResponse,
  AddressValidationRequest,
  AddressValidationResult,
  ICarrierAdapter,
} from '@nextgen-cms/shared';
import { RateAggregatorService } from './rate-aggregator.service';
import { CARRIER_ADAPTERS } from './rate-aggregator.service';

@ApiTags('rates')
@Controller('api/v1/shipping')
export class RatesController {
  private readonly logger = new Logger(RatesController.name);

  constructor(
    private readonly rateAggregator: RateAggregatorService,
    @Inject(CARRIER_ADAPTERS)
    private readonly carriers: ICarrierAdapter[],
  ) {}

  @Post('rates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get shipping rates',
    description:
      'Returns shipping rate quotes from all enabled carrier adapters for the given origin, destination, and package details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Shipping rates returned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async getRates(
    @Body() request: ShippingRateRequest,
  ): Promise<ShippingRateResponse> {
    this.logger.log(
      `Rate request: ${request.shipFrom.postalCode} -> ${request.shipTo.postalCode} ` +
        `(${request.packages.length} package(s))`,
    );

    return this.rateAggregator.getRates(request);
  }

  @Post('validate-address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a shipping address',
    description:
      'Validates a shipping address using the first available carrier adapter. Returns validation status, corrections, and suggestions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Address validation result',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async validateAddress(
    @Body() address: AddressValidationRequest,
  ): Promise<AddressValidationResult> {
    this.logger.log(
      `Address validation: ${address.line1}, ${address.city}, ${address.state} ${address.postalCode}`,
    );

    // Use the first available carrier adapter for address validation
    if (this.carriers.length === 0) {
      return {
        valid: false,
        corrected: null,
        suggestions: [],
        isPOBox: false,
      };
    }

    return this.carriers[0]!.validateAddress(address);
  }
}
