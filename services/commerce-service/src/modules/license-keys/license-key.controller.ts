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

import { LicenseKeyService, LicenseKeyDto, CreateLicenseKeyPoolDto } from './license-key.service';

@ApiTags('license-keys')
@ApiBearerAuth()
@Controller('api/v1/license-keys')
export class LicenseKeyController {
  constructor(private readonly licenseKeyService: LicenseKeyService) {}

  @Get('pools')
  @ApiOperation({ summary: 'List license key pools' })
  @ApiResponse({ status: 200, description: 'License key pools' })
  async listPools(@Query('productId') productId?: string) {
    return this.licenseKeyService.listPools(productId);
  }

  @Post('pools')
  @ApiOperation({ summary: 'Create a license key pool for a product' })
  @ApiResponse({ status: 201, description: 'Pool created' })
  async createPool(@Body() dto: CreateLicenseKeyPoolDto) {
    return this.licenseKeyService.createPool(dto);
  }

  @Post('pools/:poolId/keys')
  @ApiOperation({ summary: 'Add license keys to a pool' })
  @ApiResponse({ status: 201, description: 'Keys added' })
  async addKeys(
    @Param('poolId') poolId: string,
    @Body() dto: { keys: string[] },
  ) {
    return this.licenseKeyService.addKeysToPool(poolId, dto.keys);
  }

  @Post('pools/:poolId/claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim a license key from a pool (used during order fulfillment)' })
  @ApiResponse({ status: 200, description: 'License key claimed' })
  async claim(
    @Param('poolId') poolId: string,
    @Body() dto: { orderId: string; lineItemId: string },
  ) {
    return this.licenseKeyService.claimKey(poolId, dto.orderId, dto.lineItemId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a license key by ID' })
  @ApiResponse({ status: 200, description: 'License key' })
  async findOne(@Param('id') id: string) {
    return this.licenseKeyService.findKeyById(id);
  }

  @Put(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a license key' })
  @ApiResponse({ status: 200, description: 'Key revoked' })
  async revoke(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.licenseKeyService.revokeKey(id, dto.reason);
  }
}
