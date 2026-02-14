import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';
import type { UserRole } from '@agora-cms/shared';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ required: false, enum: ['customer', 'viewer', 'editor', 'store_manager', 'admin'], default: 'customer' })
  @IsOptional()
  @IsIn(['customer', 'viewer', 'editor', 'store_manager', 'admin'])
  role?: UserRole;
}
