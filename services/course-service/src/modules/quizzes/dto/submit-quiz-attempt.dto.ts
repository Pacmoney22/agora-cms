import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, IsUUID, ValidateNested } from 'class-validator';

export class QuizAnswerDto {
  @ApiProperty({ description: 'Question ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  questionId!: string;

  @ApiProperty({
    description: 'Student answer (format depends on question type)',
    example: 'option-id-123',
  })
  answer!: any;
}

export class SubmitQuizAttemptDto {
  @ApiProperty({ description: 'Enrollment ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  enrollmentId!: string;

  @ApiProperty({ type: [QuizAnswerDto], description: 'Array of answers for each question' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}
