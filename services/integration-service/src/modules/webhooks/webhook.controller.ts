import {
  Controller,
  Post,
  Req,
  Headers,
  Inject,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import type { IPaymentGateway } from '@agora-cms/shared';
import { PAYMENT_GATEWAY } from '../stripe/stripe.module';

@ApiTags('webhooks')
@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Stripe webhook events',
    description:
      'Receives and processes Stripe webhook events such as payment_intent.succeeded, charge.refunded, etc.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature for payload verification',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload or signature' })
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const payload = req.body as Buffer;

    try {
      const event = await this.paymentGateway.handleWebhook(payload, signature);

      this.logger.log(
        `Processed Stripe webhook: ${event.type} (${event.id})`,
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          this.logger.log(`Payment succeeded: ${JSON.stringify(event.data)}`);
          // TODO: Emit ORDER_CONFIRMED event via Kafka
          break;

        case 'payment_intent.payment_failed':
          this.logger.warn(`Payment failed: ${JSON.stringify(event.data)}`);
          // TODO: Emit PAYMENT_FAILED event via Kafka
          break;

        case 'charge.refunded':
          this.logger.log(`Charge refunded: ${JSON.stringify(event.data)}`);
          // TODO: Emit ORDER_REFUNDED event via Kafka
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true, eventId: event.id };
    } catch (error) {
      this.logger.error(
        `Failed to process Stripe webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Webhook processing failed');
    }
  }
}
