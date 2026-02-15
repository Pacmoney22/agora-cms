import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LabelsController } from './labels.controller';
import { CARRIER_ADAPTERS } from '../rates/rate-aggregator.service';

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

function makeShipmentResult(trackingNumber = 'STUB1234567890') {
  return {
    trackingNumber,
    labelUrl: `https://labels.stub-carrier.local/${trackingNumber}.pdf`,
    labelFormat: 'PDF',
    estimatedDelivery: '2025-06-20T12:00:00Z',
  };
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('LabelsController', () => {
  let controller: LabelsController;
  let stubCarrier: ICarrierAdapterMock;

  beforeEach(async () => {
    stubCarrier = makeCarrierMock('StubCarrier');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabelsController],
      providers: [
        { provide: CARRIER_ADAPTERS, useValue: [stubCarrier] },
      ],
    }).compile();

    controller = module.get<LabelsController>(LabelsController);
    jest.clearAllMocks();
  });

  // ── createLabel ────────────────────────────────────────────────────

  describe('createLabel', () => {
    it('should create a label via the matching carrier', async () => {
      const params = makeShipmentParams();
      const expected = makeShipmentResult();
      stubCarrier.createShipment.mockResolvedValue(expected);

      const result = await controller.createLabel(params);

      expect(stubCarrier.createShipment).toHaveBeenCalledWith(params);
      expect(result).toEqual(expected);
    });

    it('should match carrier by service code prefix', async () => {
      const params = makeShipmentParams({ serviceCode: 'STUB_EXPRESS' });
      const expected = makeShipmentResult('STUB-EXPRESS-001');
      stubCarrier.createShipment.mockResolvedValue(expected);

      const result = await controller.createLabel(params);

      expect(result).toEqual(expected);
    });

    it('should fall back to first carrier when prefix does not match', async () => {
      const params = makeShipmentParams({ serviceCode: 'UNKNOWN_SERVICE' });
      const expected = makeShipmentResult('FALLBACK-001');
      stubCarrier.createShipment.mockResolvedValue(expected);

      const result = await controller.createLabel(params);

      expect(stubCarrier.createShipment).toHaveBeenCalledWith(params);
      expect(result).toEqual(expected);
    });

    it('should throw BadRequestException when no carriers available', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [LabelsController],
        providers: [{ provide: CARRIER_ADAPTERS, useValue: [] }],
      }).compile();

      const ctrl = module.get<LabelsController>(LabelsController);
      const params = makeShipmentParams();

      await expect(ctrl.createLabel(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate carrier errors', async () => {
      stubCarrier.createShipment.mockRejectedValue(
        new Error('Carrier down'),
      );

      await expect(
        controller.createLabel(makeShipmentParams()),
      ).rejects.toThrow('Carrier down');
    });
  });

  // ── createBatchLabels ──────────────────────────────────────────────

  describe('createBatchLabels', () => {
    it('should create labels for all shipments in batch', async () => {
      stubCarrier.createShipment
        .mockResolvedValueOnce(makeShipmentResult('TRK-001'))
        .mockResolvedValueOnce(makeShipmentResult('TRK-002'));

      const result = await controller.createBatchLabels({
        shipments: [makeShipmentParams(), makeShipmentParams()],
      } as any);

      expect(result.totalSucceeded).toBe(2);
      expect(result.totalFailed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should throw BadRequestException for empty shipments', async () => {
      await expect(
        controller.createBatchLabels({ shipments: [] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when shipments is undefined (accesses .length before guard)', async () => {
      await expect(
        controller.createBatchLabels({ shipments: undefined as any } as any),
      ).rejects.toThrow();
    });

    it('should handle partial failures in batch', async () => {
      stubCarrier.createShipment
        .mockResolvedValueOnce(makeShipmentResult('TRK-001'))
        .mockRejectedValueOnce(new Error('Carrier error'))
        .mockResolvedValueOnce(makeShipmentResult('TRK-003'));

      const result = await controller.createBatchLabels({
        shipments: [
          makeShipmentParams(),
          makeShipmentParams(),
          makeShipmentParams(),
        ],
      } as any);

      expect(result.totalSucceeded).toBe(2);
      expect(result.totalFailed).toBe(1);
      expect(result.results[1]!.success).toBe(false);
      expect(result.results[1]!.error).toBe('Carrier error');
    });

    it('should include index in each batch result', async () => {
      stubCarrier.createShipment
        .mockResolvedValueOnce(makeShipmentResult('TRK-A'))
        .mockResolvedValueOnce(makeShipmentResult('TRK-B'));

      const result = await controller.createBatchLabels({
        shipments: [makeShipmentParams(), makeShipmentParams()],
      } as any);

      expect(result.results[0]!.index).toBe(0);
      expect(result.results[1]!.index).toBe(1);
    });

    it('should include shipment in successful results', async () => {
      const expected = makeShipmentResult('TRK-SUCCESS');
      stubCarrier.createShipment.mockResolvedValue(expected);

      const result = await controller.createBatchLabels({
        shipments: [makeShipmentParams()],
      } as any);

      expect(result.results[0]!.success).toBe(true);
      expect(result.results[0]!.shipment).toEqual(expected);
    });

    it('should handle unknown service code in batch (falls back to first carrier)', async () => {
      const expected = makeShipmentResult('TRK-FALLBACK');
      stubCarrier.createShipment.mockResolvedValue(expected);

      const result = await controller.createBatchLabels({
        shipments: [makeShipmentParams({ serviceCode: 'UNKNOWN_SVC' })],
      } as any);

      expect(result.totalSucceeded).toBe(1);
    });

    it('should report error when no carrier matches and no fallback (empty carriers)', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [LabelsController],
        providers: [{ provide: CARRIER_ADAPTERS, useValue: [] }],
      }).compile();

      const ctrl = module.get<LabelsController>(LabelsController);
      const result = await ctrl.createBatchLabels({
        shipments: [makeShipmentParams()],
      } as any);

      expect(result.totalFailed).toBe(1);
      expect(result.results[0]!.success).toBe(false);
      expect(result.results[0]!.error).toContain('No carrier found');
    });

    it('should handle all shipments failing in batch', async () => {
      stubCarrier.createShipment.mockRejectedValue(
        new Error('All fail'),
      );

      const result = await controller.createBatchLabels({
        shipments: [makeShipmentParams(), makeShipmentParams()],
      } as any);

      expect(result.totalSucceeded).toBe(0);
      expect(result.totalFailed).toBe(2);
    });
  });
});
