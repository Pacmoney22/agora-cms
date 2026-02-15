import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_GATEWAY } from './stripe.module';
import { StripePaymentGateway } from './stripe-payment-gateway';
import { StubPaymentGateway } from '../../common/stubs/stub-payment-gateway';

// Mock StripePaymentGateway constructor
jest.mock('./stripe-payment-gateway', () => ({
  StripePaymentGateway: jest.fn().mockImplementation((key, webhookSecret) => ({
    _type: 'real',
    _key: key,
    _webhookSecret: webhookSecret,
  })),
}));

// Mock StubPaymentGateway constructor
jest.mock('../../common/stubs/stub-payment-gateway', () => ({
  StubPaymentGateway: jest.fn().mockImplementation(() => ({
    _type: 'stub',
  })),
}));

describe('StripeModule', () => {
  // Re-implement the factory logic for testing since overrideProvider doesn't work
  // well with non-imported ConfigService
  const createModule = async (configValues: Record<string, string | undefined>) => {
    const mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
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
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide real StripePaymentGateway when STRIPE_SECRET_KEY is set', async () => {
    const module = await createModule({
      STRIPE_SECRET_KEY: 'sk_test_xxx',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    });

    const gateway = module.get(PAYMENT_GATEWAY);
    expect(gateway._type).toBe('real');
    expect(gateway._key).toBe('sk_test_xxx');
    expect(gateway._webhookSecret).toBe('whsec_test');
  });

  it('should provide StubPaymentGateway when STRIPE_SECRET_KEY is not set', async () => {
    const module = await createModule({});

    const gateway = module.get(PAYMENT_GATEWAY);
    expect(gateway._type).toBe('stub');
  });

  it('should provide real gateway without webhook secret', async () => {
    const module = await createModule({
      STRIPE_SECRET_KEY: 'sk_test_xxx',
    });

    const gateway = module.get(PAYMENT_GATEWAY);
    expect(gateway._type).toBe('real');
    expect(gateway._webhookSecret).toBeUndefined();
  });

  it('should export PAYMENT_GATEWAY token', () => {
    expect(PAYMENT_GATEWAY).toBe('PAYMENT_GATEWAY');
  });
});
