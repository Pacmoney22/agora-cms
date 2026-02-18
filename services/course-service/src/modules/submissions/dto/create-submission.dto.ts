import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
  Max,
  MinLength,
} from 'class-validator';

class SubmissionLink {
  @ApiProperty({ description: 'URL of the linked resource' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ description: 'Display label for the link' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateSubmissionDto {
  @ApiProperty({ description: 'Enrollment ID' })
  @IsUUID()
  enrollmentId!: string;

  @ApiProperty({ description: 'Student submission content' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: 'Optional links', type: [SubmissionLink] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionLink)
  links?: SubmissionLink[];

  @ApiPropertyOptional({ description: 'Total possible points', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  totalPoints?: number;
}
