import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateInstructorAssignmentDto {
  @ApiProperty({ description: 'User ID to assign as instructor' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Course section ID to assign to' })
  @IsUUID()
  @IsNotEmpty()
  courseSectionId!: string;
}
