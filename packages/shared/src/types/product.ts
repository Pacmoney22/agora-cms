export type ProductType = 'physical' | 'virtual' | 'service' | 'configurable' | 'course';

export interface ProductPricing {
  currency: string;
  basePrice: number; // cents
  salePrice: number | null;
  salePriceStart: string | null;
  salePriceEnd: string | null;
  pricingModel: 'one_time' | 'recurring' | 'tiered' | 'per_unit';
  recurringInterval: string | null;
  taxCategory: 'standard' | 'digital_goods' | 'services_exempt';
}

export interface ProductShipping {
  requiresShipping: boolean;
  weight: { value: number; unit: string };
  dimensions: { length: number; width: number; height: number; unit: string };
  shippingClass: string;
  originWarehouse: string;
  harmonizedCode: string | null;
  countryOfOrigin: string | null;
  freeShippingEligible: boolean;
}

export interface ProductDigital {
  deliveryMethod: 'download' | 'license_key' | 'email_content' | 'external_url';
  downloadableFiles: Array<{
    fileId: string;
    filename: string;
    s3Key: string;
    maxDownloads: number;
    expiresAfterDays: number;
  }>;
  licenseKeyPool: string | null;
  accessUrl: string | null;
}

export interface ProductService {
  serviceType: 'appointment' | 'subscription' | 'project';
  durationMinutes: number;
  capacityPerSlot: number;
  availabilitySchedule: string | null;
  bookingLeadTimeHours: number;
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  deliverables: string[];
  recurringConfig: {
    interval: string;
    trialPeriodDays: number | null;
    billingCycles: number | null;
  } | null;
}

export interface ConfigurationStep {
  stepId: string;
  label: string;
  type: 'single_select' | 'multi_select';
  required: boolean;
  dependsOn?: { stepId: string; optionIds: string[] };
  options: ConfigurationOption[];
}

export interface ConfigurationOption {
  optionId: string;
  label: string;
  priceModifier: number; // cents
  sku_fragment: string;
  weight_modifier_g?: number;
  productRef?: string;
  type?: string;
}

export interface ProductConfiguration {
  steps: ConfigurationStep[];
  skuPattern: string;
  pricingStrategy: 'additive' | 'override' | 'tiered';
  resolvedProductType: ProductType;
}

export interface ProductCourse {
  courseId: string;  // Links to Course.id
  accessDuration: number;  // Days of access (0 = lifetime)
  autoEnroll: boolean;  // Auto-enroll on purchase (default: true)
}

export interface VariantAttribute {
  name: string;
  slug: string;
  values: string[];
  displayType: 'dropdown' | 'swatch' | 'button';
}

export interface ProductVariant {
  variantId: string;
  sku: string;
  attributes: Record<string, string>;
  priceOverride: number | null;
  salePrice: number | null;
  inventory: {
    tracked: boolean;
    quantity: number;
    lowStockThreshold: number;
    allowBackorder: boolean;
  };
  weight: { value: number; unit: string } | null;
  dimensions: { length: number; width: number; height: number; unit: string } | null;
  images: string[];
  status: 'active' | 'inactive';
  barcode: string | null;
}

export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  type: ProductType;
  status: 'draft' | 'active' | 'archived';
  pricing: ProductPricing;
  shipping: ProductShipping | null;
  digital: ProductDigital | null;
  service: ProductService | null;
  configuration: ProductConfiguration | null;
  course: ProductCourse | null;
  variantAttrs: VariantAttribute[] | null;
  variants: ProductVariant[] | null;
  images: ProductImage[] | null;
  seo: Record<string, unknown> | null;
  categories: string[];
  tags: string[];
  relatedProducts: string[];
  crossSells: string[];
  upSells: string[];
  createdAt: string;
  updatedAt: string;
}
