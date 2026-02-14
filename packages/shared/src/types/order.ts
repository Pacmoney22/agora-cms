import type { ProductType } from './product';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'returned';

export type LineItemStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'fulfilled'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'returned'
  | 'scheduled'
  | 'in_progress'
  | 'no_show'
  | 'rescheduled';

export interface OrderLineItem {
  lineItemId: string;
  productId: string;
  variantId: string | null;
  productType: ProductType;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number; // cents
  totalPrice: number; // cents
  status: LineItemStatus;
  configuration: Record<string, unknown> | null;
  fulfillment: {
    trackingNumber?: string;
    downloadUrl?: string;
    licenseKey?: string;
    bookingId?: string;
  } | null;
}

export interface Address {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  status: OrderStatus;
  lineItems: OrderLineItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  couponCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
