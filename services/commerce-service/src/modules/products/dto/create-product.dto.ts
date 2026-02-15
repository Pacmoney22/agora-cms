import type { ProductType } from '@agora-cms/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  ValidateIf,
  IsNotEmpty,
  Min,
  IsIn,
  IsUUID,
} from 'class-validator';

// --- Nested DTOs ---

export class PricingDto {
  @ApiProperty({ default: 'USD' })
  @IsString()
  currency!: string;

  @ApiProperty({ description: 'Price in cents' })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional({ description: 'Sale price in cents' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salePriceStart?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salePriceEnd?: string | null;

  @ApiProperty({ enum: ['one_time', 'recurring', 'tiered', 'per_unit'] })
  @IsIn(['one_time', 'recurring', 'tiered', 'per_unit'])
  pricingModel!: 'one_time' | 'recurring' | 'tiered' | 'per_unit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recurringInterval?: string | null;

  @ApiProperty({ enum: ['standard', 'digital_goods', 'services_exempt'] })
  @IsIn(['standard', 'digital_goods', 'services_exempt'])
  taxCategory!: 'standard' | 'digital_goods' | 'services_exempt';
}

export class WeightDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ default: 'g' })
  @IsString()
  unit!: string;
}

export class DimensionsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  length!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  width!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  height!: number;

  @ApiProperty({ default: 'cm' })
  @IsString()
  unit!: string;
}

export class ShippingDto {
  @ApiProperty()
  @IsBoolean()
  requiresShipping!: boolean;

  @ApiProperty()
  @ValidateNested()
  @Type(() => WeightDto)
  weight!: WeightDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions!: DimensionsDto;

  @ApiProperty()
  @IsString()
  shippingClass!: string;

  @ApiProperty()
  @IsString()
  originWarehouse!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  harmonizedCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryOfOrigin?: string | null;

  @ApiProperty({ default: false })
  @IsBoolean()
  freeShippingEligible!: boolean;
}

export class DownloadableFileDto {
  @ApiProperty()
  @IsString()
  fileId!: string;

  @ApiProperty()
  @IsString()
  filename!: string;

  @ApiProperty()
  @IsString()
  s3Key!: string;

  @ApiProperty({ default: -1 })
  @IsNumber()
  maxDownloads!: number;

  @ApiProperty({ default: 365 })
  @IsNumber()
  expiresAfterDays!: number;
}

export class DigitalDto {
  @ApiProperty({ enum: ['download', 'license_key', 'email_content', 'external_url'] })
  @IsIn(['download', 'license_key', 'email_content', 'external_url'])
  deliveryMethod!: 'download' | 'license_key' | 'email_content' | 'external_url';

  @ApiPropertyOptional({ type: [DownloadableFileDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DownloadableFileDto)
  downloadableFiles?: DownloadableFileDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseKeyPool?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessUrl?: string | null;
}

export class RecurringConfigDto {
  @ApiProperty()
  @IsString()
  interval!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  trialPeriodDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  billingCycles?: number | null;
}

export class ServiceDto {
  @ApiProperty({ enum: ['appointment', 'subscription', 'project'] })
  @IsIn(['appointment', 'subscription', 'project'])
  serviceType!: 'appointment' | 'subscription' | 'project';

  @ApiProperty()
  @IsNumber()
  @Min(1)
  durationMinutes!: number;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(1)
  capacityPerSlot!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  availabilitySchedule?: string | null;

  @ApiProperty({ default: 24 })
  @IsNumber()
  @Min(0)
  bookingLeadTimeHours!: number;

  @ApiProperty({ enum: ['flexible', 'moderate', 'strict'] })
  @IsIn(['flexible', 'moderate', 'strict'])
  cancellationPolicy!: 'flexible' | 'moderate' | 'strict';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringConfigDto)
  recurringConfig?: RecurringConfigDto | null;
}

export class ConfigurationOptionDto {
  @ApiProperty()
  @IsString()
  optionId!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ description: 'Price modifier in cents' })
  @IsNumber()
  priceModifier!: number;

  @ApiProperty()
  @IsString()
  sku_fragment!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight_modifier_g?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

export class ConfigurationStepDto {
  @ApiProperty()
  @IsString()
  stepId!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ enum: ['single_select', 'multi_select'] })
  @IsIn(['single_select', 'multi_select'])
  type!: 'single_select' | 'multi_select';

  @ApiProperty()
  @IsBoolean()
  required!: boolean;

  @ApiPropertyOptional({ type: [ConfigurationOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigurationOptionDto)
  options!: ConfigurationOptionDto[];
}

export class ConfigurationDto {
  @ApiProperty({ type: [ConfigurationStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigurationStepDto)
  steps!: ConfigurationStepDto[];

  @ApiProperty()
  @IsString()
  skuPattern!: string;

  @ApiProperty({ enum: ['additive', 'override', 'tiered'] })
  @IsIn(['additive', 'override', 'tiered'])
  pricingStrategy!: 'additive' | 'override' | 'tiered';

  @ApiProperty({ enum: ['physical', 'virtual', 'service', 'configurable'] })
  @IsIn(['physical', 'virtual', 'service', 'configurable'])
  resolvedProductType!: ProductType;
}

export class CourseDto {
  @ApiProperty({ description: 'ID of the course in the course-service' })
  @IsUUID()
  courseId!: string;

  @ApiProperty({ description: 'Number of days of access (0 = lifetime)' })
  @IsNumber()
  @Min(0)
  accessDuration!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoEnroll?: boolean;
}

export class VariantAttributeDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  values!: string[];

  @ApiProperty({ enum: ['dropdown', 'swatch', 'button'] })
  @IsIn(['dropdown', 'swatch', 'button'])
  displayType!: 'dropdown' | 'swatch' | 'button';
}

export class ProductImageDto {
  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsString()
  alt!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isPrimary!: boolean;
}

// --- Main DTOs ---

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string | null;

  @ApiProperty({ enum: ['physical', 'virtual', 'service', 'configurable', 'course'] })
  @IsEnum({ physical: 'physical', virtual: 'virtual', service: 'service', configurable: 'configurable', course: 'course' })
  type!: ProductType;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'archived'], default: 'draft' })
  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';

  @ApiProperty({ type: PricingDto })
  @ValidateNested()
  @Type(() => PricingDto)
  pricing!: PricingDto;

  // Physical products require shipping info
  @ApiPropertyOptional({ type: ShippingDto })
  @ValidateIf((o) => o.type === 'physical')
  @ValidateNested()
  @Type(() => ShippingDto)
  shipping?: ShippingDto | null;

  // Virtual products require digital delivery info
  @ApiPropertyOptional({ type: DigitalDto })
  @ValidateIf((o) => o.type === 'virtual')
  @ValidateNested()
  @Type(() => DigitalDto)
  digital?: DigitalDto | null;

  // Service products require service config
  @ApiPropertyOptional({ type: ServiceDto })
  @ValidateIf((o) => o.type === 'service')
  @ValidateNested()
  @Type(() => ServiceDto)
  service?: ServiceDto | null;

  // Configurable products require configuration steps
  @ApiPropertyOptional({ type: ConfigurationDto })
  @ValidateIf((o) => o.type === 'configurable')
  @ValidateNested()
  @Type(() => ConfigurationDto)
  configuration?: ConfigurationDto | null;

  // Course products require course linkage
  @ApiPropertyOptional({ type: CourseDto })
  @ValidateIf((o) => o.type === 'course')
  @ValidateNested()
  @Type(() => CourseDto)
  course?: CourseDto | null;

  @ApiPropertyOptional({ type: [VariantAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  variantAttrs?: VariantAttributeDto[] | null;

  @ApiPropertyOptional({ type: [ProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  seo?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProducts?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  crossSells?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  upSells?: string[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string | null;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'archived'] })
  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';

  @ApiPropertyOptional({ type: PricingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing?: PricingDto;

  @ApiPropertyOptional({ type: ShippingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDto)
  shipping?: ShippingDto | null;

  @ApiPropertyOptional({ type: DigitalDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DigitalDto)
  digital?: DigitalDto | null;

  @ApiPropertyOptional({ type: ServiceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceDto)
  service?: ServiceDto | null;

  @ApiPropertyOptional({ type: ConfigurationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigurationDto)
  configuration?: ConfigurationDto | null;

  @ApiPropertyOptional({ type: CourseDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseDto)
  course?: CourseDto | null;

  @ApiPropertyOptional({ type: [VariantAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  variantAttrs?: VariantAttributeDto[] | null;

  @ApiPropertyOptional({ type: [ProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  seo?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProducts?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  crossSells?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  upSells?: string[];
}

export class ListProductsQueryDto {
  @ApiPropertyOptional({ enum: ['physical', 'virtual', 'service', 'configurable', 'course'] })
  @IsOptional()
  @IsIn(['physical', 'virtual', 'service', 'configurable', 'course'])
  type?: ProductType;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'archived'] })
  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CreateVariantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty()
  attributes!: Record<string, string>;

  @ApiPropertyOptional({ description: 'Price override in cents' })
  @IsOptional()
  @IsNumber()
  priceOverride?: number | null;

  @ApiPropertyOptional({ description: 'Sale price in cents' })
  @IsOptional()
  @IsNumber()
  salePrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WeightDto)
  weight?: WeightDto | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string | null;
}

export class GenerateVariantsDto {
  @ApiPropertyOptional({ description: 'SKU pattern with attribute placeholders, e.g. "{base}-{color}-{size}"' })
  @IsOptional()
  @IsString()
  skuPattern?: string;
}

export class ConfigureProductDto {
  @ApiProperty({
    description: 'Selections for each configuration step',
    example: [{ stepId: 'color', optionId: 'red' }, { stepId: 'storage', optionId: '256gb' }],
  })
  @IsArray()
  selections!: Array<{
    stepId: string;
    optionId: string | string[];
  }>;
}
