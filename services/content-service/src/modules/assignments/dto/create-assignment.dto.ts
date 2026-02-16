import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEventStaffAssignmentDto {
  @ApiProperty({ description: 'User ID to assign as event staff' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Event ID to assign to' })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;
}

export class CreateExhibitorAssignmentDto {
  @ApiProperty({ description: 'User ID to assign as exhibitor' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Event ID to assign to' })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ description: 'Booth number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  boothNumber?: string;
}

export class CreateKioskAssignmentDto {
  @ApiProperty({ description: 'User ID to assign as kiosk' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Event ID to assign to' })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ description: 'Kiosk identifier (e.g. KIOSK-ENTRANCE-A)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  kioskIdentifier!: string;
}
