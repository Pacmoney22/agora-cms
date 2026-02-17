import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

import { ArticlesService, CreateArticleDto, UpdateArticleDto } from './articles.service';

@ApiTags('articles')
@Controller('api/v1/articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // --- Public endpoints (no auth required) ---

  @Get()
  @ApiOperation({ summary: 'List articles (public — returns published by default)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of articles' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.articlesService.findAll({
      page,
      limit,
      status: status || 'published',
      category,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get an article by slug (public)' })
  @ApiParam({ name: 'slug', type: String, description: 'Article slug' })
  @ApiResponse({ status: 200, description: 'Article details' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug);
  }

  // --- Protected endpoints (auth required) ---

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a single article by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Article UUID' })
  @ApiResponse({ status: 200, description: 'Article details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('editor', 'admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an article' })
  @ApiResponse({ status: 201, description: 'Article created' })
  async create(@Body() dto: CreateArticleDto, @Request() req: any) {
    return this.articlesService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('editor', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update an article' })
  @ApiParam({ name: 'id', type: String, description: 'Article UUID' })
  @ApiResponse({ status: 200, description: 'Article updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an article' })
  @ApiParam({ name: 'id', type: String, description: 'Article UUID' })
  @ApiResponse({ status: 204, description: 'Article deleted' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.articlesService.delete(id);
  }
}
