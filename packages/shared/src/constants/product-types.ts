import type { ProductType } from '../types/product';

export const PRODUCT_TYPES: Record<Uppercase<ProductType>, ProductType> = {
  PHYSICAL: 'physical',
  VIRTUAL: 'virtual',
  SERVICE: 'service',
  CONFIGURABLE: 'configurable',
  COURSE: 'course',
  AFFILIATE: 'affiliate',
  PRINTFUL: 'printful',
} as const;

export const PRODUCT_TYPE_REQUIRES_SHIPPING: Record<ProductType, boolean> = {
  physical: true,
  virtual: false,
  service: false,
  configurable: false, // determined at resolution time
  course: false,
  affiliate: false, // External product, no shipping
  printful: true, // Print-on-demand requires shipping
};

export const PRODUCT_TYPE_HAS_INVENTORY: Record<ProductType, boolean> = {
  physical: true,
  virtual: true, // optional, for limited licenses
  service: false,
  configurable: false, // determined at resolution time
  course: false, // No inventory limits for courses
  affiliate: false, // External product, no local inventory
  printful: true, // Printful manages inventory
};
