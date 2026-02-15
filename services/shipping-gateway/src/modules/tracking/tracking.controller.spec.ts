import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

// ── Type helpers ─────────────────────────────────────────────────────────
function makeTrackingResult(trackingNumber: string) {
  return {
    trackingNumber,
    carrier: 'StubCarrier',
    status: 'in_transit' as const,
    estimatedDelivery: '2025-06-15T12:00:00Z',
    events: [
      {
        timestamp: '2025-06-10T08:00:00Z',
        status: 'label_created' as const,
        description: 'Label created',
        location: 'Columbus, OH',
      },
    ],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('TrackingController', () => {
  let controller: TrackingController;
  let trackingService: { getTracking: jest.Mock };

  beforeEach(async () => {
    trackingService = {
      getTracking: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackingController],
      providers: [
        { provide: TrackingService, useValue: trackingService },
      ],
    }).compile();

    controller = module.get<TrackingController>(TrackingController);
    jest.clearAllMocks();
  });

  // ── getTracking ────────────────────────────────────────────────────

  describe('getTracking', () => {
    it('should return tracking result from the service', async () => {
      const tracking = makeTrackingResult('TRK-001');
      trackingService.getTracking.mockResolvedValue(tracking);

      const result = await controller.getTracking('TRK-001');

      expect(result).toEqual(tracking);
      expect(trackingService.getTracking).toHaveBeenCalledWith('TRK-001');
    });

    it('should throw NotFoundException when service throws', async () => {
      trackingService.getTracking.mockRejectedValue(
        new Error('Carrier lookup failed'),
      );

      await expect(controller.getTracking('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include tracking number in NotFoundException message', async () => {
      trackingService.getTracking.mockRejectedValue(
        new Error('Not found'),
      );

      try {
        await controller.getTracking('BAD-TRK');
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toContain('BAD-TRK');
      }
    });

    it('should handle various tracking number formats', async () => {
      const tracking = makeTrackingResult('STUB1707840000123');
      trackingService.getTracking.mockResolvedValue(tracking);

      const result = await controller.getTracking('STUB1707840000123');

      expect(result.trackingNumber).toBe('STUB1707840000123');
    });
  });
});
