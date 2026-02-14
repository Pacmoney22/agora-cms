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
