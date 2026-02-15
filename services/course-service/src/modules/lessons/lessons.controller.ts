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

import { CreateLessonDto } from './dto/create-lesson.dto';
import { LessonsService } from './lessons.service';

@ApiTags('lessons')
@ApiBearerAuth()
@Controller('api/v1')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get('sections/:sectionId/lessons')
  @ApiOperation({ summary: 'Get all lessons for a section' })
  @ApiParam({ name: 'sectionId', type: String, description: 'Section UUID' })
  @ApiResponse({ status: 200, description: 'List of lessons' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async findBySectionId(@Param('sectionId', ParseUUIDPipe) sectionId: string) {
    return this.lessonsService.findBySectionId(sectionId);
  }

  @Post('sections/:sectionId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new lesson in a section' })
  @ApiParam({ name: 'sectionId', type: String, description: 'Section UUID' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async create(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.create(sectionId, dto);
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Get a lesson by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Lesson found' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.findById(id);
  }

  @Put('lessons/:id')
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiParam({ name: 'id', type: String, description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.update(id, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson' })
  @ApiParam({ name: 'id', type: String, description: 'Lesson UUID' })
  @ApiResponse({ status: 204, description: 'Lesson deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.lessonsService.remove(id);
  }
}
