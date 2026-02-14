import type { OrderStatus } from '../types/order';

export const ORDER_STATUSES: Record<Uppercase<OrderStatus>, OrderStatus> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  RETURNED: 'returned',
} as const;

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'returned'],
  delivered: ['completed', 'returned'],
  completed: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
  returned: ['refunded'],
};
