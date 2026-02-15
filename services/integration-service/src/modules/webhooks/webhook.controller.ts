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
import type { IPaymentGateway, IPrintfulConnector } from '@agora-cms/shared';
import { PAYMENT_GATEWAY } from '../stripe/stripe.module';
import { PRINTFUL_CONNECTOR } from '../printful/printful.module';

@ApiTags('webhooks')
@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(PRINTFUL_CONNECTOR)
    private readonly printfulConnector: IPrintfulConnector,
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

  @Post('printful')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Printful webhook events',
    description:
      'Receives and processes Printful webhook events such as package_shipped, order_failed, stock_updated, etc.',
  })
  @ApiHeader({
    name: 'x-pf-signature',
    description: 'Printful webhook signature for payload verification',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload or signature' })
  async handlePrintfulWebhook(
    @Req() req: Request,
    @Headers('x-pf-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-pf-signature header');
    }

    const payload = req.body as Buffer;

    try {
      const event = await this.printfulConnector.handleWebhook(payload, signature);

      this.logger.log(
        `Processed Printful webhook: ${event.type}`,
      );

      switch (event.type) {
        case 'package_shipped':
          this.logger.log(
            `Package shipped: Order ${event.data.order?.externalId}, Tracking: ${event.data.shipment?.trackingNumber}`,
          );
          // TODO: Update PrintfulFulfillment status to 'fulfilled'
          // TODO: Update Order shipment with tracking info
          // TODO: Emit ORDER_SHIPPED event via Kafka
          break;

        case 'package_returned':
          this.logger.warn(
            `Package returned: Order ${event.data.order?.externalId}, Reason: ${event.data.reason}`,
          );
          // TODO: Update PrintfulFulfillment status to 'returned'
          // TODO: Emit ORDER_RETURN event via Kafka
          break;

        case 'order_failed':
          this.logger.error(
            `Order failed: Order ${event.data.order?.externalId}, Reason: ${event.data.reason}`,
          );
          // TODO: Update PrintfulFulfillment status to 'failed'
          // TODO: Emit ORDER_FAILED event via Kafka
          break;

        case 'order_canceled':
          this.logger.log(
            `Order canceled: Order ${event.data.order?.externalId}`,
          );
          // TODO: Update PrintfulFulfillment status to 'cancelled'
          // TODO: Emit ORDER_CANCELLED event via Kafka
          break;

        case 'product_synced':
          this.logger.log('Product synced with Printful catalog');
          // TODO: Update PrintfulProduct lastSyncedAt timestamp
          break;

        case 'stock_updated':
          this.logger.log('Printful product stock updated');
          // TODO: Update product inventory from Printful
          break;

        default:
          this.logger.log(`Unhandled Printful event type: ${event.type}`);
      }

      return { received: true, eventType: event.type };
    } catch (error) {
      this.logger.error(
        `Failed to process Printful webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Webhook processing failed');
    }
  }
}
