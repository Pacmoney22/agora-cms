import type { ProductType } from './product';

export interface CartItem {
  cartItemId: string;
  productId: string;
  variantId: string | null;
  productType: ProductType;
  resolvedType: ProductType | null; // For configurable products
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number; // cents
  totalPrice: number; // cents
  image: string | null;
  configuration: CartItemConfiguration | null;
  weight: { value: number; unit: string } | null;
  requiresShipping: boolean;
}

export interface CartItemConfiguration {
  selections: Array<{
    stepId: string;
    optionId: string | string[];
    label: string;
    priceModifier: number;
  }>;
  resolvedSku: string;
  resolvedPrice: number;
  resolvedWeight: { value: number; unit: string } | null;
  resolvedDimensions: { length: number; width: number; height: number; unit: string } | null;
}

export interface CartDto {
  cartId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  hasPhysicalItems: boolean;
  hasVirtualItems: boolean;
  hasServiceItems: boolean;
  estimatedShipping: number | null;
  couponCode: string | null;
  discount: number;
}

export interface AddToCartDto {
  productId: string;
  variantId?: string;
  quantity: number;
  configuration?: CartItemConfiguration;
}
