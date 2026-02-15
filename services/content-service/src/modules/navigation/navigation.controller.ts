import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

import { NavigationService } from './navigation.service';

@ApiTags('navigation')
@ApiBearerAuth()
@Controller('api/v1/navigation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @ApiOperation({ summary: 'List all navigation menus' })
  @ApiResponse({ status: 200, description: 'All navigation menus' })
  async findAll() {
    return this.navigationService.findAll();
  }

  @Get(':location')
  @ApiOperation({ summary: 'Get navigation menu by location (header, footer, sidebar, mobile)' })
  @ApiParam({ name: 'location', type: String })
  @ApiResponse({ status: 200, description: 'Navigation menu' })
  @ApiResponse({ status: 404, description: 'Navigation not found' })
  async findByLocation(@Param('location') location: string) {
    return this.navigationService.findByLocation(location);
  }

  @Put(':location')
  @Roles('editor', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Create or update navigation menu for a location' })
  @ApiParam({ name: 'location', type: String })
  @ApiResponse({ status: 200, description: 'Navigation updated' })
  async upsert(
    @Param('location') location: string,
    @Body() body: { items: unknown[] },
  ) {
    return this.navigationService.upsert(location, body.items);
  }

  @Delete(':location')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete navigation menu for a location' })
  @ApiParam({ name: 'location', type: String })
  @ApiResponse({ status: 204, description: 'Navigation deleted' })
  async delete(@Param('location') location: string) {
    await this.navigationService.delete(location);
  }
}
