import { Test, TestingModule } from '@nestjs/testing';
import { StubCarrierAdapter } from './stub-carrier.adapter';

// ── Helpers ──────────────────────────────────────────────────────────────
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

function makeShipmentParams(overrides: Record<string, unknown> = {}) {
  return {
    shipFrom: {
      postalCode: '43215',
      country: 'US',
      warehouseId: 'wh-1',
      name: 'Warehouse One',
      line1: '123 Ship St',
      city: 'Columbus',
      state: 'OH',
    },
    shipTo: {
      name: 'John Doe',
      line1: '456 Delivery Ave',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'US',
    },
    packages: [
      {
        weight: { value: 5, unit: 'lb' },
        dimensions: { length: 12, width: 8, height: 6, unit: 'in' },
      },
    ],
    serviceCode: 'STUB_GROUND',
    labelFormat: 'PDF' as const,
    ...overrides,
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
describe('StubCarrierAdapter', () => {
  let adapter: StubCarrierAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StubCarrierAdapter],
    }).compile();

    adapter = module.get<StubCarrierAdapter>(StubCarrierAdapter);
  });

  // ── carrierName ────────────────────────────────────────────────────

  describe('carrierName', () => {
    it('should have carrierName "StubCarrier"', () => {
      expect(adapter.carrierName).toBe('StubCarrier');
    });
  });

  // ── getRates ───────────────────────────────────────────────────────

  describe('getRates', () => {
    it('should return exactly 3 rates', async () => {
      const rates = await adapter.getRates(makeRateRequest());

      expect(rates).toHaveLength(3);
    });

    it('should return Ground, Express, and Overnight services', async () => {
      const rates = await adapter.getRates(makeRateRequest());

      const serviceCodes = rates.map((r) => r.serviceCode);
      expect(serviceCodes).toContain('STUB_GROUND');
      expect(serviceCodes).toContain('STUB_EXPRESS');
      expect(serviceCodes).toContain('STUB_OVERNIGHT');
    });

    it('should set carrier name on all rates', async () => {
      const rates = await adapter.getRates(makeRateRequest());

      for (const rate of rates) {
        expect(rate.carrier).toBe('StubCarrier');
      }
    });

    it('should scale prices by weight (heavier = more expensive)', async () => {
      const lightRates = await adapter.getRates(
        makeRateRequest({
          packages: [
            {
              weight: { value: 2, unit: 'lb' },
              dimensions: { length: 8, width: 6, height: 4, unit: 'in' },
            },
          ],
        }),
      );

      const heavyRates = await adapter.getRates(
        makeRateRequest({
          packages: [
            {
              weight: { value: 20, unit: 'lb' },
              dimensions: { length: 8, width: 6, height: 4, unit: 'in' },
            },
          ],
        }),
      );

      const lightGround = lightRates.find(
        (r) => r.serviceCode === 'STUB_GROUND',
      )!;
      const heavyGround = heavyRates.find(
        (r) => r.serviceCode === 'STUB_GROUND',
      )!;

      expect(heavyGround.totalCharge).toBeGreaterThan(lightGround.totalCharge);
    });

    it('should return proper rate fields', async () => {
      const rates = await adapter.getRates(makeRateRequest());
      const ground = rates.find((r) => r.serviceCode === 'STUB_GROUND')!;

      expect(ground.currency).toBe('USD');
      expect(ground.estimatedBusinessDays).toBe(5);
      expect(ground.guaranteedDelivery).toBe(false);
      expect(ground.saturdayDelivery).toBe(false);
      expect(ground.estimatedDelivery).toBeDefined();
    });

    it('should have guaranteed delivery for Express and Overnight', async () => {
      const rates = await adapter.getRates(makeRateRequest());

      const express = rates.find((r) => r.serviceCode === 'STUB_EXPRESS')!;
      const overnight = rates.find((r) => r.serviceCode === 'STUB_OVERNIGHT')!;

      expect(express.guaranteedDelivery).toBe(true);
      expect(overnight.guaranteedDelivery).toBe(true);
    });

    it('should have saturday delivery only for Overnight', async () => {
      const rates = await adapter.getRates(makeRateRequest());

      const ground = rates.find((r) => r.serviceCode === 'STUB_GROUND')!;
      const express = rates.find((r) => r.serviceCode === 'STUB_EXPRESS')!;
      const overnight = rates.find((r) => r.serviceCode === 'STUB_OVERNIGHT')!;

      expect(ground.saturdayDelivery).toBe(false);
      expect(express.saturdayDelivery).toBe(false);
      expect(overnight.saturdayDelivery).toBe(true);
    });

    it('should set future estimated delivery dates', async () => {
      const rates = await adapter.getRates(makeRateRequest());
      const now = Date.now();

      for (const rate of rates) {
        const deliveryDate = new Date(rate.estimatedDelivery!).getTime();
        expect(deliveryDate).toBeGreaterThan(now);
      }
    });

    it('should handle multiple packages (sums weight)', async () => {
      const rates = await adapter.getRates(
        makeRateRequest({
          packages: [
            {
              weight: { value: 5, unit: 'lb' },
              dimensions: { length: 8, width: 6, height: 4, unit: 'in' },
            },
            {
              weight: { value: 10, unit: 'lb' },
              dimensions: { length: 12, width: 10, height: 8, unit: 'in' },
            },
          ],
        }),
      );

      expect(rates).toHaveLength(3);
      // Combined weight 15 lbs => multiplier = 15/5 = 3
      const ground = rates.find((r) => r.serviceCode === 'STUB_GROUND')!;
      expect(ground.totalCharge).toBe(Math.round(1199 * 3));
    });
  });

  // ── createShipment ─────────────────────────────────────────────────

  describe('createShipment', () => {
    it('should return a shipment with tracking number starting with STUB', async () => {
      const result = await adapter.createShipment(makeShipmentParams());

      expect(result.trackingNumber).toMatch(/^STUB/);
    });

    it('should return a label URL containing the tracking number', async () => {
      const result = await adapter.createShipment(makeShipmentParams());

      expect(result.labelUrl).toContain(result.trackingNumber);
    });

    it('should return the requested label format', async () => {
      const pdfResult = await adapter.createShipment(
        makeShipmentParams({ labelFormat: 'PDF' }),
      );
      expect(pdfResult.labelFormat).toBe('PDF');

      const zplResult = await adapter.createShipment(
        makeShipmentParams({ labelFormat: 'ZPL' }),
      );
      expect(zplResult.labelFormat).toBe('ZPL');
    });

    it('should use label format in label URL (lowercased)', async () => {
      const result = await adapter.createShipment(
        makeShipmentParams({ labelFormat: 'PDF' }),
      );
      expect(result.labelUrl).toContain('.pdf');
    });

    it('should return estimated delivery based on service code', async () => {
      const now = Date.now();

      const overnight = await adapter.createShipment(
        makeShipmentParams({ serviceCode: 'STUB_OVERNIGHT' }),
      );
      const overnightDelivery = new Date(overnight.estimatedDelivery!).getTime();
      // ~1 day from now (within 2 days to account for execution time)
      expect(overnightDelivery - now).toBeLessThan(2 * 24 * 60 * 60 * 1000);

      const ground = await adapter.createShipment(
        makeShipmentParams({ serviceCode: 'STUB_GROUND' }),
      );
      const groundDelivery = new Date(ground.estimatedDelivery!).getTime();
      // ~5 days from now
      expect(groundDelivery - now).toBeGreaterThan(3 * 24 * 60 * 60 * 1000);
    });

    it('should generate unique tracking numbers', async () => {
      const results = await Promise.all([
        adapter.createShipment(makeShipmentParams()),
        adapter.createShipment(makeShipmentParams()),
        adapter.createShipment(makeShipmentParams()),
      ]);

      const trackingNumbers = results.map((r) => r.trackingNumber);
      const unique = new Set(trackingNumbers);
      expect(unique.size).toBe(3);
    });
  });

  // ── getTracking ────────────────────────────────────────────────────

  describe('getTracking', () => {
    it('should return tracking result with the given tracking number', async () => {
      const result = await adapter.getTracking('STUB1234567890');

      expect(result.trackingNumber).toBe('STUB1234567890');
    });

    it('should return carrier name', async () => {
      const result = await adapter.getTracking('STUB1234567890');

      expect(result.carrier).toBe('StubCarrier');
    });

    it('should return "out_for_delivery" status', async () => {
      const result = await adapter.getTracking('STUB1234567890');

      expect(result.status).toBe('out_for_delivery');
    });

    it('should return multiple tracking events', async () => {
      const result = await adapter.getTracking('STUB1234567890');

      expect(result.events.length).toBeGreaterThanOrEqual(4);
    });

    it('should have events in chronological order', async () => {
      const result = await adapter.getTracking('STUB1234567890');

      for (let i = 1; i < result.events.length; i++) {
        const prev = new Date(result.events[i - 1]!.timestamp).getTime();
        const curr = new Date(result.events[i]!.timestamp).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('should include an estimated delivery date in the future', async () => {
      const result = await adapter.getTracking('STUB1234567890');

      const delivery = new Date(result.estimatedDelivery!).getTime();
      expect(delivery).toBeGreaterThan(Date.now() - 60_000); // allow 1 min tolerance
    });

    it('should include standard event statuses', async () => {
      const result = await adapter.getTracking('STUB1234567890');

      const statuses = result.events.map((e) => e.status);
      expect(statuses).toContain('label_created');
      expect(statuses).toContain('picked_up');
      expect(statuses).toContain('in_transit');
      expect(statuses).toContain('out_for_delivery');
    });
  });

  // ── validateAddress ────────────────────────────────────────────────

  describe('validateAddress', () => {
    it('should return valid=true for a normal address', async () => {
      const result = await adapter.validateAddress(makeAddressRequest());

      expect(result.valid).toBe(true);
    });

    it('should return corrected=null (stub does not correct)', async () => {
      const result = await adapter.validateAddress(makeAddressRequest());

      expect(result.corrected).toBeNull();
    });

    it('should return empty suggestions array', async () => {
      const result = await adapter.validateAddress(makeAddressRequest());

      expect(result.suggestions).toEqual([]);
    });

    it('should detect PO Box addresses', async () => {
      const result = await adapter.validateAddress(
        makeAddressRequest({ line1: 'PO Box 123' }),
      );

      expect(result.isPOBox).toBe(true);
    });

    it('should detect PO Box case-insensitively', async () => {
      const result = await adapter.validateAddress(
        makeAddressRequest({ line1: 'po box 456' }),
      );

      expect(result.isPOBox).toBe(true);
    });

    it('should return isPOBox=false for normal addresses', async () => {
      const result = await adapter.validateAddress(
        makeAddressRequest({ line1: '789 Main Street' }),
      );

      expect(result.isPOBox).toBe(false);
    });
  });
});
