import { Test, TestingModule } from '@nestjs/testing';

import { EnrollmentConsumerService } from './enrollment-consumer.service';
import { EnrollmentsService } from './enrollments.service';

// Mock kafkajs
const mockConsumerConnect = jest.fn();
const mockConsumerSubscribe = jest.fn();
const mockConsumerRun = jest.fn();
const mockConsumerDisconnect = jest.fn();

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: mockConsumerConnect,
      subscribe: mockConsumerSubscribe,
      run: mockConsumerRun,
      disconnect: mockConsumerDisconnect,
    }),
  })),
}));

describe('EnrollmentConsumerService', () => {
  let service: EnrollmentConsumerService;

  const mockEnrollmentsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentConsumerService,
        { provide: EnrollmentsService, useValue: mockEnrollmentsService },
      ],
    }).compile();

    service = module.get<EnrollmentConsumerService>(EnrollmentConsumerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── onModuleInit ──────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should connect consumer, subscribe, and run', async () => {
      mockConsumerConnect.mockResolvedValue(undefined);
      mockConsumerSubscribe.mockResolvedValue(undefined);
      mockConsumerRun.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockConsumerConnect).toHaveBeenCalled();
      expect(mockConsumerSubscribe).toHaveBeenCalledWith({
        topic: 'commerce.events',
        fromBeginning: false,
      });
      expect(mockConsumerRun).toHaveBeenCalledWith({
        eachMessage: expect.any(Function),
      });
    });

    it('should log a warning and not throw if Kafka is unavailable', async () => {
      mockConsumerConnect.mockRejectedValue(new Error('Connection refused'));

      // Should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  // ─── onModuleDestroy ───────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('should disconnect the consumer', async () => {
      mockConsumerDisconnect.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockConsumerDisconnect).toHaveBeenCalled();
    });

    it('should not throw if disconnect fails', async () => {
      mockConsumerDisconnect.mockRejectedValue(new Error('Already disconnected'));

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  // ─── handleMessage (via eachMessage callback) ─────────────────────

  describe('message handling', () => {
    let eachMessageHandler: Function;

    beforeEach(async () => {
      mockConsumerConnect.mockResolvedValue(undefined);
      mockConsumerSubscribe.mockResolvedValue(undefined);
      mockConsumerRun.mockImplementation(async ({ eachMessage }: any) => {
        eachMessageHandler = eachMessage;
      });
      await service.onModuleInit();
    });

    it('should process ORDER_CREATED event and create enrollments for course items', async () => {
      const orderEvent = {
        type: 'ORDER_CREATED',
        data: {
          orderId: 'order-1',
          userId: 'user-1',
          lineItems: [
            {
              id: 'li-1',
              productId: 'prod-1',
              productType: 'course',
              productDetails: {
                course: {
                  courseId: 'c1',
                  accessDuration: 365,
                  autoEnroll: true,
                },
              },
            },
            {
              id: 'li-2',
              productId: 'prod-2',
              productType: 'course',
              productDetails: {
                course: {
                  courseId: 'c2',
                  accessDuration: 0, // lifetime
                  autoEnroll: true,
                },
              },
            },
          ],
        },
      };

      mockEnrollmentsService.create.mockResolvedValue({ id: 'e1' });

      await eachMessageHandler({
        topic: 'commerce.events',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(orderEvent)),
        },
      });

      expect(mockEnrollmentsService.create).toHaveBeenCalledTimes(2);
      // First call: with access duration
      expect(mockEnrollmentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'c1',
          userId: 'user-1',
          orderId: 'order-1',
          orderLineItemId: 'li-1',
          expiresAt: expect.any(Date),
        }),
      );
      // Second call: lifetime access (null expiration)
      expect(mockEnrollmentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'c2',
          userId: 'user-1',
          expiresAt: null,
        }),
      );
    });

    it('should skip non-course line items', async () => {
      const orderEvent = {
        type: 'ORDER_CREATED',
        data: {
          orderId: 'order-1',
          userId: 'user-1',
          lineItems: [
            {
              id: 'li-1',
              productId: 'prod-1',
              productType: 'physical',
              productDetails: {},
            },
          ],
        },
      };

      await eachMessageHandler({
        topic: 'commerce.events',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify(orderEvent)) },
      });

      expect(mockEnrollmentsService.create).not.toHaveBeenCalled();
    });

    it('should skip course items with autoEnroll set to false', async () => {
      const orderEvent = {
        type: 'ORDER_CREATED',
        data: {
          orderId: 'order-1',
          userId: 'user-1',
          lineItems: [
            {
              id: 'li-1',
              productId: 'prod-1',
              productType: 'course',
              productDetails: {
                course: {
                  courseId: 'c1',
                  accessDuration: 30,
                  autoEnroll: false,
                },
              },
            },
          ],
        },
      };

      await eachMessageHandler({
        topic: 'commerce.events',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify(orderEvent)) },
      });

      expect(mockEnrollmentsService.create).not.toHaveBeenCalled();
    });

    it('should ignore non-ORDER_CREATED events', async () => {
      const otherEvent = {
        type: 'ORDER_UPDATED',
        data: { orderId: 'order-1' },
      };

      await eachMessageHandler({
        topic: 'commerce.events',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify(otherEvent)) },
      });

      expect(mockEnrollmentsService.create).not.toHaveBeenCalled();
    });

    it('should handle malformed messages without throwing', async () => {
      await expect(
        eachMessageHandler({
          topic: 'commerce.events',
          partition: 0,
          message: { value: Buffer.from('not-json') },
        }),
      ).resolves.not.toThrow();
    });

    it('should handle null message value', async () => {
      await expect(
        eachMessageHandler({
          topic: 'commerce.events',
          partition: 0,
          message: { value: null },
        }),
      ).resolves.not.toThrow();
    });

    it('should continue processing other items if one enrollment fails', async () => {
      const orderEvent = {
        type: 'ORDER_CREATED',
        data: {
          orderId: 'order-1',
          userId: 'user-1',
          lineItems: [
            {
              id: 'li-1',
              productId: 'prod-1',
              productType: 'course',
              productDetails: {
                course: { courseId: 'c1', accessDuration: 0, autoEnroll: true },
              },
            },
            {
              id: 'li-2',
              productId: 'prod-2',
              productType: 'course',
              productDetails: {
                course: { courseId: 'c2', accessDuration: 0, autoEnroll: true },
              },
            },
          ],
        },
      };

      mockEnrollmentsService.create
        .mockRejectedValueOnce(new Error('Course not found'))
        .mockResolvedValueOnce({ id: 'e2' });

      await eachMessageHandler({
        topic: 'commerce.events',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify(orderEvent)) },
      });

      expect(mockEnrollmentsService.create).toHaveBeenCalledTimes(2);
    });
  });
});
