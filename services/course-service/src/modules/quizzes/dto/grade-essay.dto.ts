import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min, IsOptional } from 'class-validator';

export class GradeEssayDto {
  @ApiProperty({ description: 'Quiz attempt ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  attemptId!: string;

  @ApiProperty({ description: 'Total points awarded', example: 85 })
  @IsNumber()
  @Min(0)
  pointsAwarded!: number;

  @ApiPropertyOptional({ description: 'Instructor feedback/comments' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({ description: 'Grader user ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  gradedBy!: string;
}
