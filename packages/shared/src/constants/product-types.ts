import type { ProductType } from '../types/product';

export const PRODUCT_TYPES: Record<Uppercase<ProductType>, ProductType> = {
  PHYSICAL: 'physical',
  VIRTUAL: 'virtual',
  SERVICE: 'service',
  CONFIGURABLE: 'configurable',
  COURSE: 'course',
} as const;

export const PRODUCT_TYPE_REQUIRES_SHIPPING: Record<ProductType, boolean> = {
  physical: true,
  virtual: false,
  service: false,
  configurable: false, // determined at resolution time
  course: false,
};

export const PRODUCT_TYPE_HAS_INVENTORY: Record<ProductType, boolean> = {
  physical: true,
  virtual: true, // optional, for limited licenses
  service: false,
  configurable: false, // determined at resolution time
  course: false, // No inventory limits for courses
};
