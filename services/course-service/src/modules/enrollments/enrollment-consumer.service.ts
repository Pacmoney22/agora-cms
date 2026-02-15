import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

import { EnrollmentsService } from './enrollments.service';

interface OrderCreatedEvent {
  type: 'ORDER_CREATED';
  data: {
    orderId: string;
    userId: string;
    lineItems: Array<{
      id: string;
      productId: string;
      productType: string;
      productDetails: {
        course?: {
          courseId: string;
          accessDuration: number;
          autoEnroll: boolean;
        };
      };
    }>;
  };
}

@Injectable()
export class EnrollmentConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EnrollmentConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(private readonly enrollmentsService: EnrollmentsService) {
    this.kafka = new Kafka({
      clientId: 'course-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });

    this.consumer = this.kafka.consumer({
      groupId: 'course-enrollment-group',
      retry: {
        retries: 5,
        initialRetryTime: 300,
        multiplier: 2,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');

      await this.consumer.subscribe({
        topic: 'commerce.events',
        fromBeginning: false
      });
      this.logger.log('Subscribed to commerce.events topic');

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });
    } catch (error) {
      this.logger.warn(
        'Kafka consumer unavailable — auto-enrollment disabled. Start Kafka to enable: docker compose -f docker/docker-compose.yml up -d kafka',
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      this.logger.log('Kafka consumer disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka consumer', error);
    }
  }

  private async handleMessage({ topic, partition, message }: EachMessagePayload) {
    try {
      const event = JSON.parse(message.value?.toString() || '{}') as OrderCreatedEvent;

      if (event.type === 'ORDER_CREATED') {
        this.logger.log(`Processing ORDER_CREATED event for order ${event.data.orderId}`);
        await this.handleOrderCreated(event.data);
      }
    } catch (error) {
      this.logger.error('Error processing message', error);
      // TODO: Send to DLQ (Dead Letter Queue) for manual review
    }
  }

  private async handleOrderCreated(orderData: OrderCreatedEvent['data']) {
    // Filter line items for course products with auto-enroll enabled
    const courseItems = orderData.lineItems.filter(
      (item) =>
        item.productType === 'course' &&
        item.productDetails.course?.autoEnroll === true
    );

    if (courseItems.length === 0) {
      this.logger.debug(`No course products with auto-enroll in order ${orderData.orderId}`);
      return;
    }

    for (const item of courseItems) {
      try {
        const courseConfig = item.productDetails.course!;

        // Calculate expiration date
        let expiresAt: Date | null = null;
        if (courseConfig.accessDuration > 0) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + courseConfig.accessDuration);
        }

        // Create enrollment
        await this.enrollmentsService.create({
          courseId: courseConfig.courseId,
          userId: orderData.userId,
          orderId: orderData.orderId,
          orderLineItemId: item.id,
          expiresAt,
        });

        this.logger.log(
          `Auto-enrolled user ${orderData.userId} in course ${courseConfig.courseId} from order ${orderData.orderId}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to auto-enroll user ${orderData.userId} for order ${orderData.orderId}, item ${item.id}`,
          error
        );
        // Continue processing other items even if one fails
      }
    }
  }
}
