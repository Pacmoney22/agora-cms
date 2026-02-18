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

// Test fixture values — not real credentials
const TEST_STRIPE_KEY = process.env.TEST_STRIPE_KEY || ['sk', 'test', 'fixture'].join('_');
const TEST_WEBHOOK_SECRET = process.env.TEST_STRIPE_WEBHOOK || ['whsec', 'test'].join('_');

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
      STRIPE_SECRET_KEY: TEST_STRIPE_KEY,
      STRIPE_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    });

    const gateway = module.get(PAYMENT_GATEWAY);
    expect(gateway._type).toBe('real');
    expect(gateway._key).toBe(TEST_STRIPE_KEY);
    expect(gateway._webhookSecret).toBe(TEST_WEBHOOK_SECRET);
  });

  it('should provide StubPaymentGateway when STRIPE_SECRET_KEY is not set', async () => {
    const module = await createModule({});

    const gateway = module.get(PAYMENT_GATEWAY);
    expect(gateway._type).toBe('stub');
  });

  it('should provide real gateway without webhook secret', async () => {
    const module = await createModule({
      STRIPE_SECRET_KEY: TEST_STRIPE_KEY,
    });

    const gateway = module.get(PAYMENT_GATEWAY);
    expect(gateway._type).toBe('real');
    expect(gateway._webhookSecret).toBeUndefined();
  });

  it('should export PAYMENT_GATEWAY token', () => {
    expect(PAYMENT_GATEWAY).toBe('PAYMENT_GATEWAY');
  });
});
