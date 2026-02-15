import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { VariantService } from './variant.service';

@ApiTags('variants')
@ApiBearerAuth()
@Controller('api/v1/variants')
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a variant by ID (across all products)' })
  @ApiResponse({ status: 200, description: 'Variant found' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async findOne(@Param('id') id: string) {
    return this.variantService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a variant by ID' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.variantService.updateById(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a variant by ID' })
  @ApiResponse({ status: 204, description: 'Variant deleted' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async remove(@Param('id') id: string) {
    return this.variantService.removeById(id);
  }
}
