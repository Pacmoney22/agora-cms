import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeModule } from './modules/stripe/stripe.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SalesforceModule } from './modules/salesforce/salesforce.module';
import { PrintfulModule } from './modules/printful/printful.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    StripeModule,
    AnalyticsModule,
    SalesforceModule,
    PrintfulModule,
    WebhooksModule,
  ],
})
export class AppModule {}
