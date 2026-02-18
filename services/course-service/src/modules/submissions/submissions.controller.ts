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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@ApiBearerAuth()
@Controller('api/v1')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('lessons/:lessonId/submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an assignment for a lesson' })
  @ApiParam({ name: 'lessonId', type: String, description: 'Lesson UUID' })
  @ApiResponse({ status: 201, description: 'Submission created' })
  @ApiResponse({ status: 400, description: 'Lesson is not an assignment type' })
  @ApiResponse({ status: 404, description: 'Lesson or enrollment not found' })
  async submit(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissionsService.submit(lessonId, dto);
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get a single submission by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Submission found' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getSubmission(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.getSubmission(id);
  }

  @Get('lessons/:lessonId/submissions/:enrollmentId')
  @ApiOperation({ summary: 'Get all submissions for a lesson by enrollment' })
  @ApiParam({ name: 'lessonId', type: String, description: 'Lesson UUID' })
  @ApiParam({ name: 'enrollmentId', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async getSubmissionsForLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.submissionsService.getSubmissionsForLesson(lessonId, enrollmentId);
  }

  @Post('submissions/:id/grade')
  @ApiOperation({ summary: 'Grade a submission' })
  @ApiParam({ name: 'id', type: String, description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Submission graded' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async gradeSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.submissionsService.gradeSubmission(id, dto);
  }

  @Get('grading/pending-submissions')
  @ApiOperation({ summary: 'List all pending assignment submissions' })
  @ApiQuery({ name: 'instructorId', required: false, description: 'Filter by instructor' })
  @ApiResponse({ status: 200, description: 'List of pending submissions' })
  async getPendingSubmissions(@Query('instructorId') instructorId?: string) {
    return this.submissionsService.getPendingSubmissions(instructorId);
  }
}
