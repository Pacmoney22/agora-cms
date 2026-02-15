import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

import { RedirectsService } from './redirects.service';

@ApiTags('redirects')
@ApiBearerAuth()
@Controller('api/v1/redirects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RedirectsController {
  constructor(private readonly redirectsService: RedirectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all redirects' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of redirects' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.redirectsService.findAll({ page, limit });
  }

  @Post()
  @Roles('editor', 'admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a redirect rule' })
  @ApiResponse({ status: 201, description: 'Redirect created' })
  async create(@Body() dto: { fromPath: string; toPath: string; statusCode?: number }) {
    return this.redirectsService.create(dto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a redirect rule' })
  @ApiParam({ name: 'id', type: String, description: 'Redirect UUID' })
  @ApiResponse({ status: 204, description: 'Redirect deleted' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.redirectsService.delete(id);
  }
}
