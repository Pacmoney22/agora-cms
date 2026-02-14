import {
  Controller,
  Get,
  Param,
  Logger,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { TrackingResult } from '@agora-cms/shared';
import { TrackingService } from './tracking.service';

@ApiTags('tracking')
@Controller('api/v1/shipping/tracking')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(private readonly trackingService: TrackingService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get tracking information',
    description:
      'Returns the current tracking status and event history for a shipment by tracking number.',
  })
  @ApiParam({
    name: 'id',
    description: 'The tracking number to look up',
    example: 'STUB1707840000123',
  })
  @ApiResponse({
    status: 200,
    description: 'Tracking information returned successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tracking number not found',
  })
  async getTracking(@Param('id') trackingNumber: string): Promise<TrackingResult> {
    this.logger.log(`Tracking lookup: ${trackingNumber}`);

    try {
      return await this.trackingService.getTracking(trackingNumber);
    } catch (error) {
      this.logger.error(
        `Tracking lookup failed for ${trackingNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new NotFoundException(
        `Tracking information not found for: ${trackingNumber}`,
      );
    }
  }
}
