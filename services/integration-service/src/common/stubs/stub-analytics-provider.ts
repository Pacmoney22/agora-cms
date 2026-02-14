import { Injectable, Logger } from '@nestjs/common';
import type {
  IAnalyticsProvider,
  AnalyticsEvent,
  ServerAnalyticsEvent,
  DateRange,
  AnalyticsDashboardData,
} from '@agora-cms/shared';

/**
 * Stub implementation of IAnalyticsProvider for local development.
 * Logs events to console and returns mock dashboard data with realistic numbers.
 */
@Injectable()
export class StubAnalyticsProvider implements IAnalyticsProvider {
  private readonly logger = new Logger(StubAnalyticsProvider.name);

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    this.logger.log(
      `[STUB] Track event: ${event.name} | params: ${JSON.stringify(event.params)}`,
    );
  }

  async trackServerEvent(event: ServerAnalyticsEvent): Promise<void> {
    this.logger.log(
      `[STUB] Track server event for client ${event.clientId}: ` +
        `${event.events.length} event(s) - [${event.events.map((e) => e.name).join(', ')}]`,
    );
  }

  async getDashboardData(_dateRange: DateRange): Promise<AnalyticsDashboardData> {
    this.logger.log(
      `[STUB] Fetching dashboard data for ${_dateRange.startDate} to ${_dateRange.endDate}`,
    );

    return {
      activeUsers: 1_247,
      topPages: [
        { path: '/', views: 15_832 },
        { path: '/products', views: 8_456 },
        { path: '/products/featured-widget', views: 3_291 },
        { path: '/about', views: 2_104 },
        { path: '/blog', views: 1_876 },
        { path: '/contact', views: 1_234 },
        { path: '/cart', views: 987 },
        { path: '/checkout', views: 654 },
      ],
      trafficSources: [
        { source: 'google', sessions: 6_543 },
        { source: 'direct', sessions: 4_321 },
        { source: 'facebook', sessions: 1_987 },
        { source: 'email', sessions: 1_234 },
        { source: 'twitter', sessions: 567 },
        { source: 'referral', sessions: 432 },
      ],
      ecommerceFunnel: {
        views: 8_456,
        addToCart: 2_134,
        beginCheckout: 876,
        purchases: 312,
      },
      revenue: {
        total: 47_856_00, // $47,856.00 in cents
        byProduct: [
          { productId: 'prod_001', revenue: 15_234_00 },
          { productId: 'prod_002', revenue: 12_567_00 },
          { productId: 'prod_003', revenue: 8_945_00 },
          { productId: 'prod_004', revenue: 6_210_00 },
          { productId: 'prod_005', revenue: 4_900_00 },
        ],
      },
    };
  }
}
