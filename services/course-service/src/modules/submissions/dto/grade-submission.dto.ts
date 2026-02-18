import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum GradingAction {
  GRADED = 'graded',
  RETURNED = 'returned',
}

export class GradeSubmissionDto {
  @ApiProperty({ description: 'Score awarded' })
  @IsNumber()
  @Min(0)
  @Max(1000)
  score!: number;

  @ApiPropertyOptional({ description: 'Instructor feedback' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({ description: 'Instructor user ID' })
  @IsUUID()
  gradedBy!: string;

  @ApiPropertyOptional({
    description: 'Grading action',
    enum: GradingAction,
    default: GradingAction.GRADED,
  })
  @IsOptional()
  @IsEnum(GradingAction)
  status?: GradingAction;
}
