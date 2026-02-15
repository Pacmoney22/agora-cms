import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { StripeModule } from '../stripe/stripe.module';
import { PrintfulModule } from '../printful/printful.module';

@Module({
  imports: [StripeModule, PrintfulModule],
  controllers: [WebhookController],
})
export class WebhooksModule {}
