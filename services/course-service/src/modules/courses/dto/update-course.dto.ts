import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { CourseLevel } from './create-course.dto';

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'Course title', example: 'Introduction to TypeScript' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Course description', example: 'Learn the fundamentals of TypeScript' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiPropertyOptional({ description: 'Course thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ description: 'Course level', enum: CourseLevel })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({ description: 'Estimated duration in hours', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Category', example: 'Programming' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags', example: ['typescript', 'javascript', 'programming'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Learning objectives as JSON array' })
  @IsOptional()
  objectives?: any;

  @ApiPropertyOptional({ description: 'Prerequisites as JSON array' })
  @IsOptional()
  prerequisites?: any;
}
