// Kafka topic/event type definitions

export const EVENTS = {
  // Content events
  PAGE_CREATED: 'page.created',
  PAGE_UPDATED: 'page.updated',
  PAGE_PUBLISHED: 'page.published',
  PAGE_UNPUBLISHED: 'page.unpublished',
  PAGE_DELETED: 'page.deleted',

  // Commerce events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  CART_UPDATED: 'cart.updated',
  CART_ABANDONED: 'cart.abandoned',
  CHECKOUT_STARTED: 'checkout.started',
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',
  INVENTORY_UPDATED: 'inventory.updated',
  INVENTORY_LOW: 'inventory.low',
  INVENTORY_RESERVED: 'inventory.reserved',

  // Integration events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  CONTACT_SYNCED: 'contact.synced',
  LEAD_CREATED: 'lead.created',

  // User events
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  FORM_SUBMITTED: 'form.submitted',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export interface BaseEvent {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  source: string;
}

export interface PageEvent extends BaseEvent {
  payload: {
    pageId: string;
    slug: string;
    title: string;
    status: string;
  };
}

export interface OrderEvent extends BaseEvent {
  payload: {
    orderId: string;
    orderNumber: string;
    userId: string | null;
    total: number;
    currency: string;
    lineItems: Array<{
      productId: string;
      productType: string;
      quantity: number;
      amount: number;
    }>;
  };
}

export interface UserEvent extends BaseEvent {
  payload: {
    userId: string;
    email: string;
    name: string;
  };
}
