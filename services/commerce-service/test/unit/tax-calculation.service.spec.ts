import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    tax: {
      calculations: {
        create: jest.fn(),
      },
    },
  }));
});

import { TaxCalculationService } from '../../src/modules/checkout/tax-calculation.service';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;

  const mockConfigService = {
    get: jest.fn(() => undefined),
  };

  const mockAddress = {
    line1: '123 Main St',
    line2: '',
    city: 'Columbus',
    state: 'OH',
    postalCode: '43215',
    country: 'US',
  };

  const lineItems = [
    { amount: 5000, name: 'Product A', productTaxCode: undefined },
    { amount: 3000, name: 'Product B', productTaxCode: undefined },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxCalculationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TaxCalculationService>(TaxCalculationService);
    jest.clearAllMocks();
  });

  describe('calculateTax', () => {
    it('should return zero tax when tax is not enabled', async () => {
      const settings = {
        enabled: false,
        calculationMethod: 'manual' as const,
        defaultRate: '8',
        taxShipping: false,
        rates: [],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 999, settings);

      expect(result.taxAmount).toBe(0);
      expect(result.provider).toBe('none');
    });

    it('should return zero tax when no shipping address', async () => {
      const settings = {
        enabled: true,
        calculationMethod: 'manual' as const,
        defaultRate: '8',
        taxShipping: false,
        rates: [],
      };

      const result = await service.calculateTax(lineItems, null, 999, settings);

      expect(result.taxAmount).toBe(0);
      expect(result.provider).toBe('none');
    });

    it('should calculate manual tax with default rate', async () => {
      const settings = {
        enabled: true,
        calculationMethod: 'manual' as const,
        defaultRate: '8',
        taxShipping: false,
        rates: [],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 999, settings);

      // 8000 * 8% = 640
      expect(result.taxAmount).toBe(640);
      expect(result.taxRate).toBe(0.08);
      expect(result.provider).toBe('manual');
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].jurisdiction).toBe('Default');
    });

    it('should calculate manual tax with shipping tax', async () => {
      const settings = {
        enabled: true,
        calculationMethod: 'manual' as const,
        defaultRate: '10',
        taxShipping: true,
        rates: [],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 1000, settings);

      // Items: 8000 * 10% = 800, Shipping: 1000 * 10% = 100
      expect(result.taxAmount).toBe(900);
    });

    it('should match state-specific rate', async () => {
      const settings = {
        enabled: true,
        calculationMethod: 'manual' as const,
        defaultRate: '5',
        taxShipping: false,
        rates: [
          {
            rate: '7.25',
            country: 'US',
            state: 'OH',
            postalCodes: '',
            priority: 0,
            compound: false,
            shipping: false,
          },
        ],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 0, settings);

      // 8000 * 7.25% = 580
      expect(result.taxAmount).toBe(580);
      expect(result.taxRate).toBe(0.0725);
      expect(result.breakdown[0].jurisdiction).toBe('OH');
    });

    it('should match postal code rate with highest specificity', async () => {
      const settings = {
        enabled: true,
        calculationMethod: 'manual' as const,
        defaultRate: '5',
        taxShipping: false,
        rates: [
          {
            rate: '7',
            country: 'US',
            state: 'OH',
            postalCodes: '',
            priority: 0,
            compound: false,
            shipping: false,
          },
          {
            rate: '8.5',
            country: 'US',
            state: 'OH',
            postalCodes: '43215, 43216',
            priority: 0,
            compound: false,
            shipping: true,
          },
        ],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 500, settings);

      // Uses postal code rate: 8000 * 8.5% = 680 + shipping 500 * 8.5% = 43
      expect(result.taxAmount).toBe(723);
    });

    it('should skip rate when country does not match', async () => {
      const settings = {
        enabled: true,
        calculationMethod: 'manual' as const,
        defaultRate: '5',
        taxShipping: false,
        rates: [
          {
            rate: '20',
            country: 'UK',
            state: '',
            postalCodes: '',
            priority: 0,
            compound: false,
            shipping: false,
          },
        ],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 0, settings);

      // Falls back to default rate: 8000 * 5% = 400
      expect(result.taxAmount).toBe(400);
    });

    it('should skip rate when state does not match', async () => {
      const settings = {
        enabled: true,
        calculationMethod: 'manual' as const,
        defaultRate: '5',
        taxShipping: false,
        rates: [
          {
            rate: '10',
            country: 'US',
            state: 'CA',
            postalCodes: '',
            priority: 0,
            compound: false,
            shipping: false,
          },
        ],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 0, settings);

      // Falls back to default rate: 8000 * 5% = 400
      expect(result.taxAmount).toBe(400);
    });

    it('should return zero tax with zero default rate and no matching rates', async () => {
      const settings = {
        enabled: true,
        calculationMethod: 'manual' as const,
        defaultRate: '0',
        taxShipping: false,
        rates: [],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 0, settings);

      expect(result.taxAmount).toBe(0);
      expect(result.breakdown).toEqual([]);
    });

    it('should fall back to manual when stripe calculation fails', async () => {
      const mockStripe = {
        tax: {
          calculations: {
            create: jest.fn().mockRejectedValue(new Error('Stripe error')),
          },
        },
      };
      (service as any).stripe = mockStripe;

      const settings = {
        enabled: true,
        calculationMethod: 'stripe' as const,
        defaultRate: '8',
        taxShipping: false,
        rates: [],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 0, settings);

      // Should fall back to manual: 8000 * 8% = 640
      expect(result.taxAmount).toBe(640);
      expect(result.provider).toBe('manual');
    });

    it('should use Stripe Tax when configured', async () => {
      const mockStripe = {
        tax: {
          calculations: {
            create: jest.fn().mockResolvedValue({
              id: 'taxcalc_123',
              tax_amount_exclusive: 640,
              tax_breakdown: [
                {
                  amount: 640,
                  jurisdiction: { display_name: 'Ohio' },
                  tax_rate_details: { percentage_decimal: '8.0' },
                },
              ],
            }),
          },
        },
      };
      (service as any).stripe = mockStripe;

      const settings = {
        enabled: true,
        calculationMethod: 'stripe' as const,
        defaultRate: '8',
        taxShipping: false,
        rates: [],
      };

      const result = await service.calculateTax(lineItems, mockAddress, 0, settings);

      expect(result.taxAmount).toBe(640);
      expect(result.provider).toBe('stripe');
      expect(result.stripeCalculationId).toBe('taxcalc_123');
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].jurisdiction).toBe('Ohio');
    });

    it('should include shipping in Stripe Tax when taxShipping is enabled', async () => {
      const mockStripe = {
        tax: {
          calculations: {
            create: jest.fn().mockResolvedValue({
              id: 'taxcalc_456',
              tax_amount_exclusive: 720,
              tax_breakdown: [],
            }),
          },
        },
      };
      (service as any).stripe = mockStripe;

      const settings = {
        enabled: true,
        calculationMethod: 'stripe' as const,
        defaultRate: '8',
        taxShipping: true,
        rates: [],
      };

      await service.calculateTax(lineItems, mockAddress, 1000, settings);

      expect(mockStripe.tax.calculations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shipping_cost: { amount: 1000 },
        }),
      );
    });

    it('should throw error when Stripe is not initialized but stripe method selected', async () => {
      (service as any).stripe = null;

      const settings = {
        enabled: true,
        calculationMethod: 'stripe' as const,
        defaultRate: '8',
        taxShipping: false,
        rates: [],
      };

      // Should fall back to manual since stripe throws
      const result = await service.calculateTax(lineItems, mockAddress, 0, settings);
      expect(result.provider).toBe('manual');
    });
  });

  describe('getDefaultSettings', () => {
    it('should return default tax settings', () => {
      const settings = service.getDefaultSettings();

      expect(settings.enabled).toBe(true);
      expect(settings.calculationMethod).toBe('manual');
      expect(settings.defaultRate).toBe('0');
      expect(settings.taxShipping).toBe(false);
      expect(settings.rates).toEqual([]);
    });
  });
});
