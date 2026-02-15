import { Test, TestingModule } from '@nestjs/testing';
import {
  RateAggregatorService,
  CARRIER_ADAPTERS,
  REDIS_CLIENT,
} from './rate-aggregator.service';

// ── Shared type stubs (avoid importing from workspace package in tests) ──
interface ShippingRate {
  carrier: string;
  service: string;
  serviceCode: string;
  totalCharge: number;
  currency: string;
  estimatedDelivery: string | null;
  estimatedBusinessDays: number | null;
  guaranteedDelivery: boolean;
  saturdayDelivery: boolean;
}

interface ICarrierAdapter {
  readonly carrierName: string;
  getRates: jest.Mock;
  createShipment: jest.Mock;
  getTracking: jest.Mock;
  validateAddress: jest.Mock;
}

// ── Helpers ──────────────────────────────────────────────────────────────
function makeCarrierMock(name: string): ICarrierAdapter {
  return {
    carrierName: name,
    getRates: jest.fn(),
    createShipment: jest.fn(),
    getTracking: jest.fn(),
    validateAddress: jest.fn(),
  };
}

function makeRateRequest(overrides: Record<string, unknown> = {}) {
  return {
    shipFrom: { postalCode: '43215', country: 'US', warehouseId: 'wh-1' },
    shipTo: { postalCode: '60601', state: 'IL', country: 'US' },
    packages: [
      {
        weight: { value: 5, unit: 'lb' },
        dimensions: { length: 12, width: 8, height: 6, unit: 'in' },
      },
    ],
    ...overrides,
  } as any;
}

function makeRate(
  carrier: string,
  charge: number,
  overrides: Partial<ShippingRate> = {},
): ShippingRate {
  return {
    carrier,
    service: 'Ground',
    serviceCode: 'GND',
    totalCharge: charge,
    currency: 'USD',
    estimatedDelivery: null,
    estimatedBusinessDays: 5,
    guaranteedDelivery: false,
    saturdayDelivery: false,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('RateAggregatorService', () => {
  let service: RateAggregatorService;
  let carrierA: ICarrierAdapter;
  let carrierB: ICarrierAdapter;
  let mockRedis: { get: jest.Mock; set: jest.Mock; del: jest.Mock; expire: jest.Mock };

  beforeEach(async () => {
    carrierA = makeCarrierMock('CarrierA');
    carrierB = makeCarrierMock('CarrierB');

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateAggregatorService,
        { provide: CARRIER_ADAPTERS, useValue: [carrierA, carrierB] },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<RateAggregatorService>(RateAggregatorService);
    jest.clearAllMocks();
  });

  // ── getRates ───────────────────────────────────────────────────────

  describe('getRates', () => {
    it('should query all carriers in parallel and return sorted rates', async () => {
      const rateA = makeRate('CarrierA', 2000);
      const rateB = makeRate('CarrierB', 1000);

      carrierA.getRates.mockResolvedValue([rateA]);
      carrierB.getRates.mockResolvedValue([rateB]);

      const request = makeRateRequest();
      const result = await service.getRates(request);

      expect(carrierA.getRates).toHaveBeenCalledWith(request);
      expect(carrierB.getRates).toHaveBeenCalledWith(request);
      expect(result.rates).toHaveLength(2);
      // Sorted by price ascending
      expect(result.rates[0]!.totalCharge).toBe(1000);
      expect(result.rates[1]!.totalCharge).toBe(2000);
      expect(result.cached).toBe(false);
    });

    it('should include shipFrom, shipTo, and packages from the request', async () => {
      carrierA.getRates.mockResolvedValue([]);
      carrierB.getRates.mockResolvedValue([]);

      const request = makeRateRequest();
      const result = await service.getRates(request);

      expect(result.shipFrom).toEqual(request.shipFrom);
      expect(result.shipTo).toEqual(request.shipTo);
      expect(result.packages).toEqual(request.packages);
    });

    it('should return cached result when Redis has cached rates', async () => {
      const cachedRates = [makeRate('CarrierA', 1500)];
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedRates));

      const request = makeRateRequest();
      const result = await service.getRates(request);

      expect(result.cached).toBe(true);
      expect(result.rates).toEqual(cachedRates);
      expect(carrierA.getRates).not.toHaveBeenCalled();
      expect(carrierB.getRates).not.toHaveBeenCalled();
    });

    it('should cache rates in Redis after successful fetch', async () => {
      const rateA = makeRate('CarrierA', 1200);
      carrierA.getRates.mockResolvedValue([rateA]);
      carrierB.getRates.mockResolvedValue([]);

      const request = makeRateRequest();
      await service.getRates(request);

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('shipping:rates:'),
        JSON.stringify([rateA]),
        'EX',
        600,
      );
    });

    it('should NOT cache empty rate results', async () => {
      carrierA.getRates.mockResolvedValue([]);
      carrierB.getRates.mockResolvedValue([]);

      await service.getRates(makeRateRequest());

      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should handle carrier failure gracefully via Promise.allSettled', async () => {
      const rateA = makeRate('CarrierA', 1500);
      carrierA.getRates.mockResolvedValue([rateA]);
      carrierB.getRates.mockRejectedValue(new Error('Carrier B down'));

      const result = await service.getRates(makeRateRequest());

      expect(result.rates).toHaveLength(1);
      expect(result.rates[0]!.carrier).toBe('CarrierA');
    });

    it('should handle ALL carriers failing', async () => {
      carrierA.getRates.mockRejectedValue(new Error('A down'));
      carrierB.getRates.mockRejectedValue(new Error('B down'));

      const result = await service.getRates(makeRateRequest());

      expect(result.rates).toHaveLength(0);
      expect(result.cached).toBe(false);
    });

    it('should handle carrier timeout (slow carrier)', async () => {
      carrierA.getRates.mockResolvedValue([makeRate('CarrierA', 1000)]);
      // CarrierB takes too long (> 5 000ms)
      carrierB.getRates.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 10_000)),
      );

      const result = await service.getRates(makeRateRequest());

      // CarrierA should succeed, CarrierB should time out
      expect(result.rates).toHaveLength(1);
      expect(result.rates[0]!.carrier).toBe('CarrierA');
    }, 12_000);

    it('should handle Redis get failure gracefully and still fetch from carriers', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection lost'));
      carrierA.getRates.mockResolvedValue([makeRate('CarrierA', 999)]);
      carrierB.getRates.mockResolvedValue([]);

      const result = await service.getRates(makeRateRequest());

      expect(result.rates).toHaveLength(1);
      expect(result.cached).toBe(false);
    });

    it('should handle Redis set failure gracefully', async () => {
      carrierA.getRates.mockResolvedValue([makeRate('CarrierA', 999)]);
      carrierB.getRates.mockResolvedValue([]);
      mockRedis.set.mockRejectedValue(new Error('Redis write failed'));

      // Should not throw
      const result = await service.getRates(makeRateRequest());
      expect(result.rates).toHaveLength(1);
    });

    it('should sort rates from multiple carriers by totalCharge ascending', async () => {
      carrierA.getRates.mockResolvedValue([
        makeRate('CarrierA', 3000, { service: 'Express' }),
        makeRate('CarrierA', 1000, { service: 'Ground' }),
      ]);
      carrierB.getRates.mockResolvedValue([
        makeRate('CarrierB', 2000, { service: 'Standard' }),
      ]);

      const result = await service.getRates(makeRateRequest());

      expect(result.rates.map((r) => r.totalCharge)).toEqual([1000, 2000, 3000]);
    });

    it('should build a deterministic cache key from the request', async () => {
      carrierA.getRates.mockResolvedValue([makeRate('CarrierA', 100)]);
      carrierB.getRates.mockResolvedValue([]);

      await service.getRates(makeRateRequest());

      const expectedKey =
        'shipping:rates:43215:60601:US:5lb-12x8x6in';
      expect(mockRedis.get).toHaveBeenCalledWith(expectedKey);
    });

    it('should build correct cache key for multiple packages', async () => {
      carrierA.getRates.mockResolvedValue([makeRate('CarrierA', 100)]);
      carrierB.getRates.mockResolvedValue([]);

      const request = makeRateRequest({
        packages: [
          { weight: { value: 5, unit: 'lb' }, dimensions: { length: 12, width: 8, height: 6, unit: 'in' } },
          { weight: { value: 10, unit: 'lb' }, dimensions: { length: 20, width: 15, height: 10, unit: 'in' } },
        ],
      });

      await service.getRates(request);

      const expectedKey =
        'shipping:rates:43215:60601:US:5lb-12x8x6in|10lb-20x15x10in';
      expect(mockRedis.get).toHaveBeenCalledWith(expectedKey);
    });
  });

  // ── Without Redis ──────────────────────────────────────────────────
  describe('getRates (no Redis)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateAggregatorService,
          { provide: CARRIER_ADAPTERS, useValue: [carrierA] },
          { provide: REDIS_CLIENT, useValue: null },
        ],
      }).compile();

      service = module.get<RateAggregatorService>(RateAggregatorService);
      jest.clearAllMocks();
    });

    it('should work without Redis (redis = null)', async () => {
      carrierA.getRates.mockResolvedValue([makeRate('CarrierA', 500)]);

      const result = await service.getRates(makeRateRequest());

      expect(result.rates).toHaveLength(1);
      expect(result.cached).toBe(false);
    });
  });
});
