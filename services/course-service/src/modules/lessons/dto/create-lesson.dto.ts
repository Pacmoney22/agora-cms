import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export enum LessonType {
  VIDEO = 'video',
  TEXT = 'text',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  RESOURCE = 'resource',
}

export class LessonAttachmentDto {
  @ApiProperty({ description: 'Attachment type', example: 'file' })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Attachment display title', example: 'Course Syllabus.pdf' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ description: 'Media library item ID' })
  @IsOptional()
  @IsString()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'External URL for linked resources' })
  @IsOptional()
  @IsString()
  url?: string;
}

export class CreateLessonDto {
  @ApiProperty({ description: 'Lesson title', example: 'Introduction to Variables' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ description: 'Lesson type', enum: LessonType })
  @IsEnum(LessonType)
  type!: LessonType;

  @ApiPropertyOptional({ description: 'Lesson content (markdown, HTML, or JSON)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Video URL (for video lessons)' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Position/order within the section', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: 'Whether this lesson is free preview' })
  @IsOptional()
  isFreePreview?: boolean;

  @ApiPropertyOptional({ description: 'File attachments for resource lessons', type: [LessonAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonAttachmentDto)
  attachments?: LessonAttachmentDto[];
}
