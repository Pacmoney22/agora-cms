import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

class PageSeoDto {
  @ApiPropertyOptional({ description: 'Meta title for SEO' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description for SEO' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Open Graph image URL' })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional({ description: 'Canonical URL' })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional({ description: 'Whether to set noindex on the page' })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;
}

export class CreatePageDto {
  @ApiProperty({ description: 'Page title', example: 'About Us' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'URL slug (auto-generated from title if not provided)',
    example: 'about-us',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Component tree JSON structure' })
  @IsOptional()
  @IsObject()
  componentTree?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'SEO metadata', type: PageSeoDto })
  @IsOptional()
  @IsObject()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;

  @ApiPropertyOptional({ description: 'Whether this page is a template' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Template name (if isTemplate is true)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  templateName?: string;

  @ApiPropertyOptional({ description: 'Parent page ID for nested pages' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
