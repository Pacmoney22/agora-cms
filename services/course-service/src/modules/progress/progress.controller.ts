import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { IsBoolean, IsOptional, IsNumber, Min } from 'class-validator';

class UpdateLessonProgressDto {
  @ApiProperty({ description: 'Whether the lesson is completed', example: true })
  @IsBoolean()
  completed!: boolean;

  @ApiProperty({ description: 'Time spent on lesson in minutes', example: 15, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;
}

@ApiTags('progress')
@ApiBearerAuth()
@Controller('api/v1/enrollments')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Put(':enrollmentId/lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Update progress for a specific lesson' })
  @ApiParam({ name: 'enrollmentId', type: String, description: 'Enrollment UUID' })
  @ApiParam({ name: 'lessonId', type: String, description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment or lesson not found' })
  async updateLessonProgress(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
  ) {
    return this.progressService.updateLessonProgress(
      enrollmentId,
      lessonId,
      dto.completed,
      dto.timeSpent,
    );
  }

  @Get(':enrollmentId/lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Get progress for a specific lesson' })
  @ApiParam({ name: 'enrollmentId', type: String, description: 'Enrollment UUID' })
  @ApiParam({ name: 'lessonId', type: String, description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Lesson progress found' })
  @ApiResponse({ status: 404, description: 'Progress not found' })
  async getLessonProgress(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.progressService.getLessonProgress(enrollmentId, lessonId);
  }

  @Get(':enrollmentId/progress')
  @ApiOperation({ summary: 'Get overall progress for an enrollment' })
  @ApiParam({ name: 'enrollmentId', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'Enrollment progress details' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async getEnrollmentProgress(@Param('enrollmentId', ParseUUIDPipe) enrollmentId: string) {
    return this.progressService.getEnrollmentProgress(enrollmentId);
  }
}
