import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
 * Stub implementation of IPaymentGateway for local development.
 * Returns mock PaymentIntents with realistic delays.
 */
@Injectable()
export class StubPaymentGateway implements IPaymentGateway {
  private readonly logger = new Logger(StubPaymentGateway.name);

  private delay(): Promise<void> {
    const ms = Math.floor(Math.random() * 200) + 100; // 100-300ms
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<PaymentIntent> {
    await this.delay();
    const id = `pi_stub_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const clientSecret = `${id}_secret_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    this.logger.log(
      `[STUB] Created PaymentIntent ${id} for ${params.amount} ${params.currency}`,
    );

    return {
      id,
      clientSecret,
      amount: params.amount,
      currency: params.currency,
      status: 'requires_confirmation',
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    await this.delay();

    this.logger.log(`[STUB] Confirmed payment ${paymentIntentId}`);

    return {
      success: true,
      paymentIntentId,
      status: 'succeeded',
    };
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    await this.delay();
    const id = `re_stub_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

    this.logger.log(
      `[STUB] Created refund ${id} for payment ${params.paymentIntentId}` +
        (params.amount ? ` (partial: ${params.amount} cents)` : ' (full)'),
    );

    return {
      id,
      amount: params.amount ?? 0,
      status: 'succeeded',
    };
  }

  async createCustomer(params: CreateCustomerParams): Promise<PaymentCustomer> {
    await this.delay();
    const id = `cus_stub_${randomUUID().replace(/-/g, '').slice(0, 14)}`;

    this.logger.log(`[STUB] Created customer ${id} for ${params.email}`);

    return {
      id,
      email: params.email,
      name: params.name,
    };
  }

  async handleWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<WebhookEvent> {
    await this.delay();

    this.logger.log(
      `[STUB] Received webhook (signature: ${signature.slice(0, 20)}...)`,
    );

    return {
      id: `evt_stub_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_stub_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
          amount: 5000,
          currency: 'usd',
          status: 'succeeded',
        },
      },
    };
  }
}
