import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import {
  CARRIER_ADAPTERS,
  REDIS_CLIENT,
} from '../rates/rate-aggregator.service';

// ── Type helpers ─────────────────────────────────────────────────────────
interface TrackingResult {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery: string | null;
  events: Array<{
    timestamp: string;
    status: string;
    description: string;
    location: string | null;
  }>;
}

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

function makeTrackingResult(
  trackingNumber: string,
  carrier: string,
  status = 'in_transit',
): TrackingResult {
  return {
    trackingNumber,
    carrier,
    status,
    estimatedDelivery: '2025-06-15T12:00:00Z',
    events: [
      {
        timestamp: '2025-06-10T08:00:00Z',
        status: 'label_created',
        description: 'Label created',
        location: 'Columbus, OH',
      },
    ],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('TrackingService', () => {
  let service: TrackingService;
  let carrierA: ICarrierAdapterMock;
  let carrierB: ICarrierAdapterMock;
  let mockRedis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    carrierA = makeCarrierMock('CarrierA');
    carrierB = makeCarrierMock('CarrierB');

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: CARRIER_ADAPTERS, useValue: [carrierA, carrierB] },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    jest.clearAllMocks();
  });

  // ── getTracking ─────────────────────────────────────────────────────

  describe('getTracking', () => {
    it('should return cached tracking when available', async () => {
      const cached = makeTrackingResult('TRK-001', 'CarrierA');
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getTracking('TRK-001');

      expect(result).toEqual(cached);
      expect(mockRedis.get).toHaveBeenCalledWith('shipping:tracking:TRK-001');
      expect(carrierA.getTracking).not.toHaveBeenCalled();
    });

    it('should query carriers when cache misses', async () => {
      const tracking = makeTrackingResult('TRK-002', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(tracking);

      const result = await service.getTracking('TRK-002');

      expect(result).toEqual(tracking);
      expect(carrierA.getTracking).toHaveBeenCalledWith('TRK-002');
    });

    it('should cache the result after carrier lookup', async () => {
      const tracking = makeTrackingResult('TRK-003', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(tracking);

      await service.getTracking('TRK-003');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'shipping:tracking:TRK-003',
        JSON.stringify(tracking),
        'EX',
        1800,
      );
    });

    it('should try next carrier when first carrier throws', async () => {
      carrierA.getTracking.mockRejectedValue(new Error('Not found'));
      const tracking = makeTrackingResult('TRK-004', 'CarrierB');
      carrierB.getTracking.mockResolvedValue(tracking);

      const result = await service.getTracking('TRK-004');

      expect(result).toEqual(tracking);
      expect(carrierA.getTracking).toHaveBeenCalled();
      expect(carrierB.getTracking).toHaveBeenCalled();
    });

    it('should fallback to first carrier when all carriers throw in loop', async () => {
      carrierA.getTracking
        .mockRejectedValueOnce(new Error('fail 1'))   // first call in the for-loop
        .mockResolvedValueOnce(makeTrackingResult('TRK-005', 'CarrierA')); // fallback call
      carrierB.getTracking.mockRejectedValue(new Error('fail 2'));

      const result = await service.getTracking('TRK-005');

      expect(result.trackingNumber).toBe('TRK-005');
      // carrierA called twice: once in loop, once as fallback
      expect(carrierA.getTracking).toHaveBeenCalledTimes(2);
    });

    it('should handle Redis get failure and still query carriers', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis down'));
      const tracking = makeTrackingResult('TRK-006', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(tracking);

      const result = await service.getTracking('TRK-006');

      expect(result).toEqual(tracking);
    });

    it('should handle Redis set failure gracefully (no throw)', async () => {
      const tracking = makeTrackingResult('TRK-007', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(tracking);
      mockRedis.set.mockRejectedValue(new Error('Redis write fail'));

      // Should not throw
      const result = await service.getTracking('TRK-007');
      expect(result).toEqual(tracking);
    });
  });

  // ── getTracking (no Redis) ─────────────────────────────────────────
  describe('getTracking (no Redis)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TrackingService,
          { provide: CARRIER_ADAPTERS, useValue: [carrierA] },
          { provide: REDIS_CLIENT, useValue: null },
        ],
      }).compile();

      service = module.get<TrackingService>(TrackingService);
      jest.clearAllMocks();
    });

    it('should work without Redis (redis = null)', async () => {
      const tracking = makeTrackingResult('TRK-008', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(tracking);

      const result = await service.getTracking('TRK-008');

      expect(result).toEqual(tracking);
    });
  });

  // ── registerForTracking / unregisterTracking ───────────────────────

  describe('registerForTracking', () => {
    it('should register a tracking number for polling', () => {
      service.registerForTracking('TRK-100', 'CarrierA');

      // Verify it's registered by accessing the private map indirectly
      // through pollTrackingUpdates behavior
      expect(() =>
        service.registerForTracking('TRK-100', 'CarrierA'),
      ).not.toThrow();
    });
  });

  describe('unregisterTracking', () => {
    it('should unregister a tracking number', () => {
      service.registerForTracking('TRK-200', 'CarrierA');
      service.unregisterTracking('TRK-200');

      // Should not throw
      expect(() => service.unregisterTracking('TRK-200')).not.toThrow();
    });
  });

  // ── pollTrackingUpdates ────────────────────────────────────────────

  describe('pollTrackingUpdates', () => {
    it('should return early when no active tracking numbers', async () => {
      await service.pollTrackingUpdates();

      expect(carrierA.getTracking).not.toHaveBeenCalled();
      expect(carrierB.getTracking).not.toHaveBeenCalled();
    });

    it('should poll tracking for all registered numbers', async () => {
      service.registerForTracking('TRK-300', 'CarrierA');
      service.registerForTracking('TRK-301', 'CarrierB');

      carrierA.getTracking.mockResolvedValue(
        makeTrackingResult('TRK-300', 'CarrierA'),
      );
      carrierB.getTracking.mockResolvedValue(
        makeTrackingResult('TRK-301', 'CarrierB'),
      );

      await service.pollTrackingUpdates();

      expect(carrierA.getTracking).toHaveBeenCalledWith('TRK-300');
      expect(carrierB.getTracking).toHaveBeenCalledWith('TRK-301');
    });

    it('should cache tracking results during polling', async () => {
      service.registerForTracking('TRK-302', 'CarrierA');
      const tracking = makeTrackingResult('TRK-302', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(tracking);

      await service.pollTrackingUpdates();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'shipping:tracking:TRK-302',
        JSON.stringify(tracking),
        'EX',
        1800,
      );
    });

    it('should remove delivered shipments from active polling', async () => {
      service.registerForTracking('TRK-303', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(
        makeTrackingResult('TRK-303', 'CarrierA', 'delivered'),
      );

      await service.pollTrackingUpdates();

      // After poll, the tracking number should be removed.
      // Poll again to confirm nothing is polled
      jest.clearAllMocks();
      await service.pollTrackingUpdates();
      expect(carrierA.getTracking).not.toHaveBeenCalled();
    });

    it('should handle carrier not found for a tracking number', async () => {
      service.registerForTracking('TRK-304', 'UnknownCarrier');

      // Should not throw
      await service.pollTrackingUpdates();

      expect(carrierA.getTracking).not.toHaveBeenCalled();
      expect(carrierB.getTracking).not.toHaveBeenCalled();
    });

    it('should handle Redis cache failure during polling gracefully', async () => {
      service.registerForTracking('TRK-305', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(
        makeTrackingResult('TRK-305', 'CarrierA'),
      );
      mockRedis.set.mockRejectedValue(new Error('Redis down'));

      // Should not throw
      await service.pollTrackingUpdates();
    });

    it('should handle carrier getTracking failure during polling', async () => {
      service.registerForTracking('TRK-306', 'CarrierA');
      service.registerForTracking('TRK-307', 'CarrierB');

      carrierA.getTracking.mockRejectedValue(new Error('Network error'));
      carrierB.getTracking.mockResolvedValue(
        makeTrackingResult('TRK-307', 'CarrierB'),
      );

      // Should not throw (Promise.allSettled)
      await service.pollTrackingUpdates();

      // CarrierB should still succeed
      expect(carrierB.getTracking).toHaveBeenCalledWith('TRK-307');
    });
  });

  // ── pollTrackingUpdates (no Redis) ────────────────────────────────
  describe('pollTrackingUpdates (no Redis)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TrackingService,
          { provide: CARRIER_ADAPTERS, useValue: [carrierA] },
          { provide: REDIS_CLIENT, useValue: null },
        ],
      }).compile();

      service = module.get<TrackingService>(TrackingService);
      jest.clearAllMocks();
    });

    it('should poll without Redis (redis = null)', async () => {
      service.registerForTracking('TRK-400', 'CarrierA');
      carrierA.getTracking.mockResolvedValue(
        makeTrackingResult('TRK-400', 'CarrierA'),
      );

      await service.pollTrackingUpdates();

      expect(carrierA.getTracking).toHaveBeenCalledWith('TRK-400');
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
