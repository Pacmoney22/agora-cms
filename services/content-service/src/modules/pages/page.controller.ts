import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PageService } from './page.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.guard';

@ApiTags('pages')
@ApiBearerAuth()
@Controller('api/v1/pages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Get()
  @ApiOperation({ summary: 'List all pages with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (draft, review, published, archived)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (default: updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc)' })
  @ApiResponse({ status: 200, description: 'Paginated list of pages' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.pageService.findAll({ page, limit, status, sortBy, sortOrder });
  }

  @Post()
  @Roles('editor', 'admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new page' })
  @ApiResponse({ status: 201, description: 'Page created successfully' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async create(@Body() dto: CreatePageDto, @Request() req: any) {
    return this.pageService.create(dto, req.user?.sub || 'system');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a page by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page found' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.pageService.findById(id);
  }

  @Put(':id')
  @Roles('editor', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update a page (auto-creates version snapshot)' })
  @ApiParam({ name: 'id', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page updated successfully' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePageDto,
    @Request() req: any,
  ) {
    return this.pageService.update(id, dto, req.user?.sub || 'system');
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a page' })
  @ApiParam({ name: 'id', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 204, description: 'Page deleted successfully' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.pageService.remove(id);
  }

  @Post(':id/publish')
  @Roles('editor', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Publish a page' })
  @ApiParam({ name: 'id', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page published successfully' })
  @ApiResponse({ status: 400, description: 'Page is already published' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.pageService.publish(id);
  }

  @Post(':id/unpublish')
  @Roles('editor', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Unpublish a page (revert to draft)' })
  @ApiParam({ name: 'id', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'Page unpublished successfully' })
  @ApiResponse({ status: 400, description: 'Page is not currently published' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.pageService.unpublish(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List all versions of a page' })
  @ApiParam({ name: 'id', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'List of page versions' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.pageService.getVersions(id);
  }

  @Post(':id/rollback/:version')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Rollback a page to a specific version' })
  @ApiParam({ name: 'id', type: String, description: 'Page UUID' })
  @ApiParam({ name: 'version', type: Number, description: 'Version number to rollback to' })
  @ApiResponse({ status: 200, description: 'Page rolled back successfully' })
  @ApiResponse({ status: 404, description: 'Page or version not found' })
  async rollback(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: any,
  ) {
    return this.pageService.rollback(id, version, req.user?.sub || 'system');
  }
}
