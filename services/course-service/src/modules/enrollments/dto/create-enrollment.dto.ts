import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsUUID, IsOptional, IsDate } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Course ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsString()
  @IsUUID()
  courseId!: string;

  @ApiPropertyOptional({ description: 'Order ID (for auto-enrollment)', example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsOptional()
  @IsString()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Order line item ID', example: '123e4567-e89b-12d3-a456-426614174003' })
  @IsOptional()
  @IsString()
  @IsUUID()
  orderLineItemId?: string;

  @ApiPropertyOptional({ description: 'Expiration date (null for lifetime access)', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date | null;
}
