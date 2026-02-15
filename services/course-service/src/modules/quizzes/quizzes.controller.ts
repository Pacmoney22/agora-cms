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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { GradeEssayDto } from './dto/grade-essay.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { QuizzesService } from './quizzes.service';

@ApiTags('quizzes')
@ApiBearerAuth()
@Controller('api/v1')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get('lessons/:lessonId/quizzes')
  @ApiOperation({ summary: 'Get all quizzes for a lesson' })
  @ApiParam({ name: 'lessonId', type: String, description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'List of quizzes' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async findByLessonId(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.quizzesService.findByLessonId(lessonId);
  }

  @Post('lessons/:lessonId/quizzes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quiz for a lesson' })
  @ApiParam({ name: 'lessonId', type: String, description: 'Lesson UUID' })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async create(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quizzesService.create(lessonId, dto);
  }

  @Get('quizzes/:id')
  @ApiOperation({ summary: 'Get a quiz by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Quiz UUID' })
  @ApiResponse({ status: 200, description: 'Quiz found' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.quizzesService.findById(id);
  }

  @Put('quizzes/:id')
  @ApiOperation({ summary: 'Update a quiz' })
  @ApiParam({ name: 'id', type: String, description: 'Quiz UUID' })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quizzesService.update(id, dto);
  }

  @Delete('quizzes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quiz' })
  @ApiParam({ name: 'id', type: String, description: 'Quiz UUID' })
  @ApiResponse({ status: 204, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.quizzesService.remove(id);
  }

  @Post('quizzes/:id/attempts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a quiz attempt' })
  @ApiParam({ name: 'id', type: String, description: 'Quiz UUID' })
  @ApiResponse({ status: 201, description: 'Quiz attempt submitted successfully' })
  @ApiResponse({ status: 400, description: 'Maximum attempts reached' })
  @ApiResponse({ status: 404, description: 'Quiz or enrollment not found' })
  async submitAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitQuizAttemptDto,
  ) {
    return this.quizzesService.submitAttempt(id, dto.enrollmentId, dto.answers);
  }

  @Get('quizzes/:quizId/attempts/:enrollmentId')
  @ApiOperation({ summary: 'Get all attempts for a quiz by an enrollment' })
  @ApiParam({ name: 'quizId', type: String, description: 'Quiz UUID' })
  @ApiParam({ name: 'enrollmentId', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'List of quiz attempts' })
  async getAttempts(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.quizzesService.getAttempts(quizId, enrollmentId);
  }

  @Get('attempts/:attemptId')
  @ApiOperation({ summary: 'Get a single quiz attempt by ID' })
  @ApiParam({ name: 'attemptId', type: String, description: 'Attempt UUID' })
  @ApiResponse({ status: 200, description: 'Quiz attempt details' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  async getAttemptById(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return this.quizzesService.getAttemptById(attemptId);
  }

  @Post('quizzes/:quizId/questions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a question to a quiz' })
  @ApiParam({ name: 'quizId', type: String, description: 'Quiz UUID' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async createQuestion(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.quizzesService.createQuestion(quizId, dto);
  }

  @Put('questions/:questionId')
  @ApiOperation({ summary: 'Update a question' })
  @ApiParam({ name: 'questionId', type: String, description: 'Question UUID' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: Partial<CreateQuestionDto>,
  ) {
    return this.quizzesService.updateQuestion(questionId, dto);
  }

  @Delete('questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiParam({ name: 'questionId', type: String, description: 'Question UUID' })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async deleteQuestion(@Param('questionId', ParseUUIDPipe) questionId: string) {
    await this.quizzesService.deleteQuestion(questionId);
  }

  @Post('attempts/:attemptId/grade')
  @ApiOperation({ summary: 'Manually grade essay questions in a quiz attempt' })
  @ApiParam({ name: 'attemptId', type: String, description: 'Attempt UUID' })
  @ApiResponse({ status: 200, description: 'Essay graded successfully' })
  @ApiResponse({ status: 400, description: 'Attempt already graded or invalid' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  async gradeEssay(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: GradeEssayDto,
  ) {
    return this.quizzesService.gradeEssay(
      attemptId,
      dto.pointsAwarded,
      dto.gradedBy,
      dto.feedback,
    );
  }

  @Get('grading/pending')
  @ApiOperation({ summary: 'Get all quiz attempts pending manual grading' })
  @ApiQuery({ name: 'instructorId', required: false, description: 'Filter by instructor/course creator' })
  @ApiResponse({ status: 200, description: 'List of attempts pending grading' })
  async getPendingGrading(@Query('instructorId') instructorId?: string) {
    return this.quizzesService.getPendingGrading(instructorId);
  }
}
