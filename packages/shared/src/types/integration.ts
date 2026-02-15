// ============================================================
// Payment Gateway Interface (Stripe)
// ============================================================

export interface IPaymentGateway {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string): Promise<PaymentResult>;
  createRefund(params: CreateRefundParams): Promise<RefundResult>;
  createCustomer(params: CreateCustomerParams): Promise<PaymentCustomer>;
  handleWebhook(payload: Buffer, signature: string): Promise<WebhookEvent>;
}

export interface CreatePaymentIntentParams {
  amount: number; // cents
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_confirmation' | 'requires_action' | 'succeeded' | 'failed';
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId: string;
  status: string;
  error?: string;
}

export interface CreateRefundParams {
  paymentIntentId: string;
  amount?: number; // partial refund in cents
  reason?: string;
}

export interface RefundResult {
  id: string;
  amount: number;
  status: 'succeeded' | 'pending' | 'failed';
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface PaymentCustomer {
  id: string;
  email: string;
  name: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

// ============================================================
// Analytics Provider Interface (GA4)
// ============================================================

export interface IAnalyticsProvider {
  trackEvent(event: AnalyticsEvent): Promise<void>;
  trackServerEvent(event: ServerAnalyticsEvent): Promise<void>;
  getDashboardData(dateRange: DateRange): Promise<AnalyticsDashboardData>;
}

export interface AnalyticsEvent {
  name: string;
  params: Record<string, unknown>;
}

export interface ServerAnalyticsEvent {
  clientId: string;
  events: AnalyticsEvent[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsDashboardData {
  activeUsers: number;
  topPages: Array<{ path: string; views: number }>;
  trafficSources: Array<{ source: string; sessions: number }>;
  ecommerceFunnel: {
    views: number;
    addToCart: number;
    beginCheckout: number;
    purchases: number;
  };
  revenue: {
    total: number;
    byProduct: Array<{ productId: string; revenue: number }>;
  };
}

// ============================================================
// CRM Connector Interface (Salesforce)
// ============================================================

export interface ICRMConnector {
  syncContact(data: CRMContactData): Promise<CRMSyncResult>;
  syncLead(data: CRMLeadData): Promise<CRMSyncResult>;
  syncOpportunity(data: CRMOpportunityData): Promise<CRMSyncResult>;
  getFieldMappings(): Promise<CRMFieldMapping[]>;
  updateFieldMappings(mappings: CRMFieldMapping[]): Promise<void>;
}

export interface CRMContactData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  cmsUserId: string;
}

export interface CRMLeadData {
  email: string;
  firstName: string;
  lastName: string;
  source: string;
  cmsFormId?: string;
}

export interface CRMOpportunityData {
  contactId: string;
  orderId: string;
  amount: number;
  status: 'open' | 'closed_won' | 'closed_lost';
  products: Array<{ name: string; quantity: number; amount: number }>;
}

export interface CRMSyncResult {
  success: boolean;
  externalId: string | null;
  error?: string;
}

export interface CRMFieldMapping {
  cmsField: string;
  crmField: string;
  crmObject: string;
  transformation?: string;
}

// ============================================================
// Printful Connector Interface (Print-on-Demand)
// ============================================================

export interface IPrintfulConnector {
  // Product Sync
  syncProduct(productData: PrintfulProductData): Promise<PrintfulSyncResult>;
  updateProductStock(syncProductId: string, variantId: string, quantity: number): Promise<void>;
  getSyncProduct(syncProductId: string): Promise<PrintfulSyncProductResponse>;
  listSyncProducts(params?: PrintfulListParams): Promise<PrintfulSyncProductResponse[]>;

  // Order Management
  createOrder(orderData: PrintfulOrderData): Promise<PrintfulOrderResponse>;
  getOrder(orderId: string): Promise<PrintfulOrderResponse>;
  confirmOrder(orderId: string): Promise<PrintfulOrderResponse>;
  cancelOrder(orderId: string): Promise<PrintfulCancelResult>;

  // Shipping & Tracking
  calculateShippingRates(params: PrintfulShippingParams): Promise<PrintfulShippingRate[]>;
  getShippingCarriers(): Promise<PrintfulCarrier[]>;

  // Webhooks
  handleWebhook(payload: Buffer, signature: string): Promise<PrintfulWebhookEvent>;
}

export interface PrintfulProductData {
  syncVariants: Array<{
    externalId: string; // Our product variant ID
    variantId: number; // Printful catalog variant ID
    retailPrice: number; // cents
    files: Array<{
      url: string;
      position?: string; // 'front', 'back', 'left', etc.
    }>;
  }>;
}

export interface PrintfulSyncResult {
  success: boolean;
  syncProductId: string;
  syncVariants: Array<{
    id: number;
    externalId: string;
    variantId: number;
  }>;
  error?: string;
}

export interface PrintfulSyncProductResponse {
  id: number;
  externalId: string;
  name: string;
  variants: Array<{
    id: number;
    externalId: string;
    syncProductId: number;
    variantId: number;
    productId: number;
    retailPrice: string;
    currency: string;
    files: Array<{
      id: number;
      url: string;
      type: string;
    }>;
  }>;
}

export interface PrintfulListParams {
  status?: 'all' | 'synced' | 'unsynced' | 'ignored';
  limit?: number;
  offset?: number;
}

export interface PrintfulOrderData {
  externalId: string; // Our order ID
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    stateCode?: string;
    stateName?: string;
    countryCode: string;
    zip: string;
    phone?: string;
    email: string;
  };
  items: Array<{
    syncVariantId: number;
    quantity: number;
    retailPrice?: string; // Optional override
  }>;
  shipping?: string; // Shipping method code
}

export interface PrintfulOrderResponse {
  id: number;
  externalId: string;
  status: string; // draft, pending, onhold, inprocess, partial, fulfilled, cancelled
  shipping: string;
  created: number;
  updated: number;
  shipments?: Array<{
    id: number;
    carrier: string;
    service: string;
    trackingNumber: string;
    trackingUrl: string;
    created: number;
    shipDate?: string;
    estimatedDelivery?: string;
  }>;
  costs?: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    digitization: string;
    additionalFee: string;
    fulfillmentFee: string;
    retailDeliveryCosts: string;
    tax: string;
    vat: string;
    total: string;
  };
}

export interface PrintfulCancelResult {
  success: boolean;
  orderId: number;
  error?: string;
}

export interface PrintfulShippingParams {
  recipient: {
    countryCode: string;
    stateCode?: string;
    city?: string;
    zip?: string;
  };
  items: Array<{
    variantId: number;
    quantity: number;
  }>;
  currency?: string;
  locale?: string;
}

export interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string; // Price as string
  currency: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
}

export interface PrintfulCarrier {
  code: string;
  name: string;
}

export interface PrintfulWebhookEvent {
  type: 'package_shipped' | 'package_returned' | 'order_failed' | 'order_canceled' | 'product_synced' | 'stock_updated';
  data: {
    order?: {
      id: number;
      externalId: string;
      status: string;
    };
    shipment?: {
      id: number;
      carrier: string;
      service: string;
      trackingNumber: string;
      trackingUrl: string;
    };
    reason?: string;
  };
}
