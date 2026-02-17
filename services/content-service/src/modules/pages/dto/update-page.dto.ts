import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsObject,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';

class PageSeoUpdateDto {
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
  noIndex?: boolean;
}

export class UpdatePageDto {
  @ApiPropertyOptional({ description: 'Page title', example: 'Updated About Us' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'URL slug',
    example: 'updated-about-us',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/, {
    message: 'Slug must start with / and contain only lowercase alphanumeric characters and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Component tree JSON structure' })
  @IsOptional()
  @IsObject()
  componentTree?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'SEO metadata', type: PageSeoUpdateDto })
  @IsOptional()
  @IsObject()
  @Type(() => PageSeoUpdateDto)
  seo?: PageSeoUpdateDto;

  @ApiPropertyOptional({ description: 'Parent page ID (set null to make top-level)' })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Position in navigation order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
