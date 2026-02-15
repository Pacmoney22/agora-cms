import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';

// Multiple choice option
export class MultipleChoiceOptionDto {
  @ApiProperty({ description: 'Option ID', example: 'option-1' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Option text', example: 'Paris' })
  @IsString()
  text!: string;

  @ApiProperty({ description: 'Whether this option is correct', example: true })
  @IsBoolean()
  isCorrect!: boolean;
}

// Multiple choice question data
export class MultipleChoiceDataDto {
  @ApiProperty({ type: [MultipleChoiceOptionDto], description: 'Available options' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultipleChoiceOptionDto)
  options!: MultipleChoiceOptionDto[];

  @ApiPropertyOptional({ description: 'Explanation shown after answer' })
  @IsOptional()
  @IsString()
  explanation?: string;
}

// True/false question data
export class TrueFalseDataDto {
  @ApiProperty({ description: 'Correct answer', example: true })
  @IsBoolean()
  correctAnswer!: boolean;

  @ApiPropertyOptional({ description: 'Explanation shown after answer' })
  @IsOptional()
  @IsString()
  explanation?: string;
}

// Fill in the blank question data
export class FillBlankDataDto {
  @ApiProperty({
    type: [String],
    description: 'Acceptable correct answers',
    example: ['Paris', 'paris'],
  })
  @IsArray()
  @IsString({ each: true })
  correctAnswers!: string[];

  @ApiProperty({ description: 'Whether answer matching is case sensitive', example: false })
  @IsBoolean()
  caseSensitive!: boolean;

  @ApiPropertyOptional({ description: 'Explanation shown after answer' })
  @IsOptional()
  @IsString()
  explanation?: string;
}

// Essay question data
export class EssayDataDto {
  @ApiPropertyOptional({ description: 'Suggested answer or grading rubric' })
  @IsOptional()
  @IsString()
  rubric?: string;

  @ApiPropertyOptional({ description: 'Minimum word count requirement' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minWords?: number;

  @ApiPropertyOptional({ description: 'Maximum word count limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxWords?: number;
}

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question type',
    enum: ['multiple_choice', 'true_false', 'fill_blank', 'essay'],
    example: 'multiple_choice',
  })
  @IsEnum(['multiple_choice', 'true_false', 'fill_blank', 'essay'])
  questionType!: QuestionType;

  @ApiProperty({ description: 'Question text', example: 'What is the capital of France?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  questionText!: string;

  @ApiProperty({ description: 'Question-specific data (structure depends on questionType)' })
  questionData!: MultipleChoiceDataDto | TrueFalseDataDto | FillBlankDataDto | EssayDataDto;

  @ApiPropertyOptional({ description: 'Points for this question', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ description: 'Display position/order', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}
