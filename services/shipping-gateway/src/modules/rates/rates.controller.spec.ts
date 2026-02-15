import { Test, TestingModule } from '@nestjs/testing';
import { RatesController } from './rates.controller';
import { RateAggregatorService, CARRIER_ADAPTERS } from './rate-aggregator.service';

// ── Type helpers ─────────────────────────────────────────────────────────
interface ICarrierAdapterMock {
  readonly carrierName: string;
  getRates: jest.Mock;
  createShipment: jest.Mock;
  getTracking: jest.Mock;
  validateAddress: jest.Mock;
}

function makeCarrierMock(name: string): ICarrierAdapterMock {
  return {
    carrierName: name,
    getRates: jest.fn(),
    createShipment: jest.fn(),
    getTracking: jest.fn(),
    validateAddress: jest.fn(),
  };
}

function makeRateRequest() {
  return {
    shipFrom: { postalCode: '43215', country: 'US', warehouseId: 'wh-1' },
    shipTo: { postalCode: '60601', state: 'IL', country: 'US' },
    packages: [
      {
        weight: { value: 5, unit: 'lb' },
        dimensions: { length: 12, width: 8, height: 6, unit: 'in' },
      },
    ],
  } as any;
}

function makeAddressRequest(overrides: Record<string, unknown> = {}) {
  return {
    line1: '456 Main St',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60601',
    country: 'US',
    ...overrides,
  } as any;
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('RatesController', () => {
  let controller: RatesController;
  let rateAggregator: { getRates: jest.Mock };
  let carrier: ICarrierAdapterMock;

  beforeEach(async () => {
    rateAggregator = {
      getRates: jest.fn(),
    };
    carrier = makeCarrierMock('StubCarrier');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatesController],
      providers: [
        { provide: RateAggregatorService, useValue: rateAggregator },
        { provide: CARRIER_ADAPTERS, useValue: [carrier] },
      ],
    }).compile();

    controller = module.get<RatesController>(RatesController);
    jest.clearAllMocks();
  });

  // ── getRates ───────────────────────────────────────────────────────

  describe('getRates', () => {
    it('should delegate to RateAggregatorService', async () => {
      const request = makeRateRequest();
      const expectedResponse = {
        shipFrom: request.shipFrom,
        shipTo: request.shipTo,
        packages: request.packages,
        rates: [],
        cached: false,
      };
      rateAggregator.getRates.mockResolvedValue(expectedResponse);

      const result = await controller.getRates(request);

      expect(rateAggregator.getRates).toHaveBeenCalledWith(request);
      expect(result).toEqual(expectedResponse);
    });

    it('should return rates from the aggregator', async () => {
      const request = makeRateRequest();
      const rates = [
        {
          carrier: 'StubCarrier',
          service: 'Ground',
          serviceCode: 'STUB_GROUND',
          totalCharge: 1200,
          currency: 'USD',
          estimatedDelivery: null,
          estimatedBusinessDays: 5,
          guaranteedDelivery: false,
          saturdayDelivery: false,
        },
      ];
      rateAggregator.getRates.mockResolvedValue({
        shipFrom: request.shipFrom,
        shipTo: request.shipTo,
        packages: request.packages,
        rates,
        cached: false,
      });

      const result = await controller.getRates(request);

      expect(result.rates).toEqual(rates);
    });

    it('should propagate errors from the aggregator', async () => {
      rateAggregator.getRates.mockRejectedValue(
        new Error('Aggregator failure'),
      );

      await expect(controller.getRates(makeRateRequest())).rejects.toThrow(
        'Aggregator failure',
      );
    });
  });

  // ── validateAddress ────────────────────────────────────────────────

  describe('validateAddress', () => {
    it('should delegate to the first carrier adapter', async () => {
      const address = makeAddressRequest();
      const expected = {
        valid: true,
        corrected: null,
        suggestions: [],
        isPOBox: false,
      };
      carrier.validateAddress.mockResolvedValue(expected);

      const result = await controller.validateAddress(address);

      expect(carrier.validateAddress).toHaveBeenCalledWith(address);
      expect(result).toEqual(expected);
    });

    it('should return invalid when no carriers are available', async () => {
      // Re-create module with no carriers
      const module: TestingModule = await Test.createTestingModule({
        controllers: [RatesController],
        providers: [
          { provide: RateAggregatorService, useValue: rateAggregator },
          { provide: CARRIER_ADAPTERS, useValue: [] },
        ],
      }).compile();

      const ctrl = module.get<RatesController>(RatesController);
      const result = await ctrl.validateAddress(makeAddressRequest());

      expect(result).toEqual({
        valid: false,
        corrected: null,
        suggestions: [],
        isPOBox: false,
      });
    });

    it('should propagate errors from the carrier adapter', async () => {
      carrier.validateAddress.mockRejectedValue(
        new Error('Carrier error'),
      );

      await expect(
        controller.validateAddress(makeAddressRequest()),
      ).rejects.toThrow('Carrier error');
    });
  });
});
