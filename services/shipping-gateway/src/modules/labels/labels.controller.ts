import {
  Controller,
  Post,
  Body,
  Inject,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type {
  ICarrierAdapter,
  CreateShipmentParams,
  ShipmentResult,
} from '@agora-cms/shared';
import { CARRIER_ADAPTERS } from '../rates/rate-aggregator.service';

interface BatchLabelRequest {
  shipments: CreateShipmentParams[];
}

interface BatchLabelResponse {
  results: Array<{
    index: number;
    success: boolean;
    shipment?: ShipmentResult;
    error?: string;
  }>;
  totalSucceeded: number;
  totalFailed: number;
}

@ApiTags('labels')
@Controller('api/v1/shipping/labels')
export class LabelsController {
  private readonly logger = new Logger(LabelsController.name);

  constructor(
    @Inject(CARRIER_ADAPTERS)
    private readonly carriers: ICarrierAdapter[],
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a shipping label',
    description:
      'Creates a single shipping label for the specified shipment parameters. Returns a tracking number and label URL.',
  })
  @ApiResponse({
    status: 201,
    description: 'Shipping label created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid shipment parameters',
  })
  async createLabel(
    @Body() params: CreateShipmentParams,
  ): Promise<ShipmentResult> {
    this.logger.log(
      `Creating label: ${params.serviceCode} from ${params.shipFrom.postalCode} ` +
        `to ${params.shipTo.postalCode} (${params.labelFormat})`,
    );

    const carrier = this.findCarrierByServiceCode(params.serviceCode);
    if (!carrier) {
      throw new BadRequestException(
        `No carrier found for service code: ${params.serviceCode}`,
      );
    }

    return carrier.createShipment(params);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create shipping labels in batch',
    description:
      'Creates multiple shipping labels in a single request. Returns results for each shipment including successes and failures.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch label creation results',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid batch request',
  })
  async createBatchLabels(
    @Body() request: BatchLabelRequest,
  ): Promise<BatchLabelResponse> {
    this.logger.log(
      `Batch label request: ${request.shipments.length} shipment(s)`,
    );

    if (!request.shipments || request.shipments.length === 0) {
      throw new BadRequestException('At least one shipment is required');
    }

    const promises = request.shipments.map(async (params, index) => {
      try {
        const carrier = this.findCarrierByServiceCode(params.serviceCode);
        if (!carrier) {
          return {
            index,
            success: false as const,
            error: `No carrier found for service code: ${params.serviceCode}`,
          };
        }

        const shipment = await carrier.createShipment(params);
        return {
          index,
          success: true as const,
          shipment,
        };
      } catch (error) {
        return {
          index,
          success: false as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const results = await Promise.all(promises);
    const totalSucceeded = results.filter((r) => r.success).length;
    const totalFailed = results.length - totalSucceeded;

    this.logger.log(
      `Batch complete: ${totalSucceeded} succeeded, ${totalFailed} failed`,
    );

    return {
      results,
      totalSucceeded,
      totalFailed,
    };
  }

  /**
   * Find the carrier that handles a given service code.
   * Service codes are expected to be prefixed with the carrier identifier
   * (e.g., STUB_GROUND, UPS_NEXT_DAY_AIR).
   */
  private findCarrierByServiceCode(
    serviceCode: string,
  ): ICarrierAdapter | null {
    // For now, use the first carrier. In production, parse the prefix
    // to route to the correct carrier adapter.
    const prefix = serviceCode.split('_')[0]!.toUpperCase();

    const carrier = this.carriers.find((c) =>
      c.carrierName.toUpperCase().includes(prefix),
    );

    return carrier || this.carriers[0] || null;
  }
}
