import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StubPaymentGateway } from '../../common/stubs/stub-payment-gateway';
import { StripePaymentGateway } from './stripe-payment-gateway';

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

/**
 * StripeModule provides the IPaymentGateway implementation.
 *
 * When STRIPE_SECRET_KEY is set in the environment, the real Stripe gateway
 * is used. Otherwise, the StubPaymentGateway is injected for local development.
 */
@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (configService: ConfigService) => {
        const stripeKey = configService.get<string>('STRIPE_SECRET_KEY');
        const webhookSecret = configService.get<string>('STRIPE_WEBHOOK_SECRET');

        if (stripeKey) {
          return new StripePaymentGateway(stripeKey, webhookSecret);
        }

        return new StubPaymentGateway();
      },
      inject: [ConfigService],
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class StripeModule {}
