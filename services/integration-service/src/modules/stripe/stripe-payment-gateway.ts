import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import type {
  IPaymentGateway,
  CreatePaymentIntentParams,
  PaymentIntent,
  PaymentResult,
  CreateRefundParams,
  RefundResult,
  CreateCustomerParams,
  PaymentCustomer,
  WebhookEvent,
} from '@agora-cms/shared';

/**
 * Real Stripe implementation of IPaymentGateway.
 * Connects to Stripe API for payment processing.
 */
@Injectable()
export class StripePaymentGateway implements IPaymentGateway {
  private readonly logger = new Logger(StripePaymentGateway.name);
  private readonly stripe: Stripe;

  constructor(secretKey: string, private readonly webhookSecret?: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });

    this.logger.log('Stripe Payment Gateway initialized');
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        customer: params.customerId,
        metadata: params.metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(
        `Created PaymentIntent ${paymentIntent.id} for ${params.amount} ${params.currency}`,
      );

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        status: this.mapStripeStatus(paymentIntent.status),
      };
    } catch (error) {
      this.logger.error(
        `Failed to create PaymentIntent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);

      this.logger.log(`Confirmed payment ${paymentIntentId}, status: ${paymentIntent.status}`);

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        error: paymentIntent.last_payment_error?.message,
      };
    } catch (error) {
      this.logger.error(
        `Failed to confirm payment ${paymentIntentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        paymentIntentId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount,
        reason: params.reason as Stripe.RefundCreateParams.Reason,
      });

      this.logger.log(
        `Created refund ${refund.id} for payment ${params.paymentIntentId}` +
          (params.amount ? ` (partial: ${params.amount} cents)` : ' (full)'),
      );

      return {
        id: refund.id,
        amount: refund.amount,
        status: refund.status === 'succeeded' ? 'succeeded' : refund.status === 'pending' ? 'pending' : 'failed',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create refund for ${params.paymentIntentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async createCustomer(params: CreateCustomerParams): Promise<PaymentCustomer> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });

      this.logger.log(`Created customer ${customer.id} for ${params.email}`);

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name!,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create customer for ${params.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<WebhookEvent> {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );

      this.logger.log(`Received webhook: ${event.type} (${event.id})`);

      return {
        id: event.id,
        type: event.type,
        data: event.data.object as unknown as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Helper method to map Stripe payment intent status to our interface
  private mapStripeStatus(
    status: Stripe.PaymentIntent.Status,
  ): 'requires_confirmation' | 'requires_action' | 'succeeded' | 'failed' {
    switch (status) {
      case 'requires_confirmation':
        return 'requires_confirmation';
      case 'requires_action':
      case 'requires_payment_method':
      case 'processing':
        return 'requires_action';
      case 'succeeded':
        return 'succeeded';
      case 'canceled':
      case 'requires_capture':
      default:
        return 'failed';
    }
  }
}
