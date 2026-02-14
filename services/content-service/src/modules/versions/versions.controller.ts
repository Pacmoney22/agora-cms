import { Controller, Get, Param, Query, ParseUUIDPipe, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VersionsService } from './versions.service';

@ApiTags('versions')
@ApiBearerAuth()
@Controller('api/v1/versions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get('page/:pageId')
  @ApiOperation({ summary: 'List all versions for a page' })
  @ApiParam({ name: 'pageId', type: String, description: 'Page UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of page versions' })
  async findByPageId(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.versionsService.findByPageId(pageId, { page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific version by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Version UUID' })
  @ApiResponse({ status: 200, description: 'Version found' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.versionsService.findById(id);
  }
}
