import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';

@ApiTags('sections')
@ApiBearerAuth()
@Controller('api/v1/courses')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get(':courseId/sections')
  @ApiOperation({ summary: 'Get all sections for a course' })
  @ApiParam({ name: 'courseId', type: String, description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'List of sections with lessons' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findByCourseId(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.sectionsService.findByCourseId(courseId);
  }

  @Post(':courseId/sections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new section in a course' })
  @ApiParam({ name: 'courseId', type: String, description: 'Course UUID' })
  @ApiResponse({ status: 201, description: 'Section created successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.sectionsService.create(courseId, dto);
  }

  @Put('sections/:id')
  @ApiOperation({ summary: 'Update a section' })
  @ApiParam({ name: 'id', type: String, description: 'Section UUID' })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.sectionsService.update(id, dto);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section' })
  @ApiParam({ name: 'id', type: String, description: 'Section UUID' })
  @ApiResponse({ status: 204, description: 'Section deleted successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.sectionsService.remove(id);
  }
}
