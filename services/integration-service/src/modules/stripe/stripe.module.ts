import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StubPaymentGateway } from '../../common/stubs/stub-payment-gateway';

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

/**
 * StripeModule provides the IPaymentGateway implementation.
 *
 * When STRIPE_SECRET_KEY is set in the environment, a real Stripe gateway
 * will be used (not yet implemented). Otherwise, the StubPaymentGateway
 * is injected for local development.
 */
@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (configService: ConfigService) => {
        const stripeKey = configService.get<string>('STRIPE_SECRET_KEY');

        if (stripeKey) {
          // TODO: Return real Stripe gateway when implemented
          // return new StripePaymentGateway(stripeKey);
          return new StubPaymentGateway();
        }

        return new StubPaymentGateway();
      },
      inject: [ConfigService],
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class StripeModule {}
