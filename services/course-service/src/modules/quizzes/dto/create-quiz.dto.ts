import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateQuizDto {
  @ApiProperty({ description: 'Quiz title', example: 'Module 1 Assessment' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Quiz description/instructions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Questions as JSON array' })
  @IsArray()
  questions!: any[];

  @ApiPropertyOptional({ description: 'Passing score percentage', example: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Time limit in minutes', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Maximum number of attempts allowed', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttempts?: number;
}
