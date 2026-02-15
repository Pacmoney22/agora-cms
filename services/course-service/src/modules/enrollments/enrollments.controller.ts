import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@ApiBearerAuth()
@Controller('api/v1/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all enrollments with filtering' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'courseId', required: false, type: String, description: 'Filter by course ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (active, completed, cancelled)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of enrollments' })
  async findAll(
    @Query('userId') userId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.enrollmentsService.findAll({ userId, courseId, status, page, limit });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll a user in a course' })
  @ApiResponse({ status: 201, description: 'Enrollment created successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'User already enrolled' })
  async create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enrollment by ID with course details and progress' })
  @ApiParam({ name: 'id', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'Enrollment found' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentsService.findById(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an enrollment' })
  @ApiParam({ name: 'id', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'Enrollment cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentsService.cancel(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark enrollment as completed' })
  @ApiParam({ name: 'id', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'Enrollment completed successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentsService.complete(id);
  }
}
