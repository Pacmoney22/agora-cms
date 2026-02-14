import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { TemplatesService } from './templates.service';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('api/v1/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all page templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findById(id);
  }

  @Post('from-page/:pageId')
  @Roles('editor', 'admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a template from an existing page' })
  @ApiParam({ name: 'pageId', type: String })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createFromPage(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() body: { templateName: string },
    @Request() req: any,
  ) {
    return this.templatesService.createFromPage(pageId, body.templateName, req.user?.sub || 'system');
  }

  @Post(':id/instantiate')
  @Roles('editor', 'admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new page from a template' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, description: 'Page created from template' })
  async instantiate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { slug: string; title: string },
    @Request() req: any,
  ) {
    return this.templatesService.instantiate(id, body.slug, body.title, req.user?.sub || 'system');
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.templatesService.delete(id);
  }
}
