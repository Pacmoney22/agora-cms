import { Injectable, Logger } from '@nestjs/common';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type {
  IAnalyticsProvider,
  AnalyticsEvent,
  ServerAnalyticsEvent,
  DateRange,
  AnalyticsDashboardData,
} from '@agora-cms/shared';

/**
 * Real Google Analytics 4 implementation using Measurement Protocol and Data API.
 *
 * Requires:
 * - GA4_MEASUREMENT_ID (e.g., G-XXXXXXXXXX)
 * - GA4_API_SECRET (from GA4 admin > Data Streams > Measurement Protocol API secrets)
 * - GA4_PROPERTY_ID (numeric property ID from GA4)
 * - GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account JSON
 */
@Injectable()
export class GoogleAnalyticsProvider implements IAnalyticsProvider {
  private readonly logger = new Logger(GoogleAnalyticsProvider.name);
  private readonly measurementId: string;
  private readonly apiSecret: string;
  private readonly propertyId: string;
  private readonly dataClient: BetaAnalyticsDataClient;

  constructor(
    measurementId: string,
    apiSecret: string,
    propertyId: string,
  ) {
    this.measurementId = measurementId;
    this.apiSecret = apiSecret;
    this.propertyId = propertyId;

    // Initialize Data API client (requires GOOGLE_APPLICATION_CREDENTIALS env var)
    this.dataClient = new BetaAnalyticsDataClient();

    this.logger.log(
      `Google Analytics 4 provider initialized (Property: ${propertyId})`,
    );
  }

  /**
   * Track client-side event using Measurement Protocol
   * (Not typically used server-side - included for completeness)
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    this.logger.warn(
      'trackEvent() called server-side. Use trackServerEvent() for server-to-server tracking.',
    );
    // For client-side events, the browser should send directly to GA4
    // This is a no-op on the server
  }

  /**
   * Track server-side event using Measurement Protocol v2 (GA4)
   * https://developers.google.com/analytics/devguides/collection/protocol/ga4
   */
  async trackServerEvent(event: ServerAnalyticsEvent): Promise<void> {
    try {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;

      const payload = {
        client_id: event.clientId,
        events: event.events.map((e) => ({
          name: e.name,
          params: e.params,
        })),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`GA4 Measurement Protocol failed: ${response.status} ${response.statusText}`);
      }

      this.logger.log(
        `Tracked ${event.events.length} server event(s) for client ${event.clientId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track server event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get dashboard analytics data using GA4 Data API
   */
  async getDashboardData(dateRange: DateRange): Promise<AnalyticsDashboardData> {
    try {
      const propertyPath = `properties/${this.propertyId}`;

      // Run multiple reports in parallel
      const [
        activeUsersReport,
        topPagesReport,
        trafficSourcesReport,
        ecommerceReport,
        revenueReport,
      ] = await Promise.all([
        this.getActiveUsers(propertyPath, dateRange),
        this.getTopPages(propertyPath, dateRange),
        this.getTrafficSources(propertyPath, dateRange),
        this.getEcommerceFunnel(propertyPath, dateRange),
        this.getRevenue(propertyPath, dateRange),
      ]);

      this.logger.log(
        `Fetched dashboard data for ${dateRange.startDate} to ${dateRange.endDate}`,
      );

      return {
        activeUsers: activeUsersReport,
        topPages: topPagesReport,
        trafficSources: trafficSourcesReport,
        ecommerceFunnel: ecommerceReport,
        revenue: revenueReport,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Private helper methods for specific reports

  private async getActiveUsers(
    propertyPath: string,
    dateRange: DateRange,
  ): Promise<number> {
    const [response] = await this.dataClient.runReport({
      property: propertyPath,
      dateRanges: [
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      ],
      metrics: [{ name: 'activeUsers' }],
    });

    return parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
  }

  private async getTopPages(
    propertyPath: string,
    dateRange: DateRange,
  ): Promise<Array<{ path: string; views: number }>> {
    const [response] = await this.dataClient.runReport({
      property: propertyPath,
      dateRanges: [
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      ],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    });

    return (
      response.rows?.map((row) => ({
        path: row.dimensionValues?.[0]?.value || '',
        views: parseInt(row.metricValues?.[0]?.value || '0', 10),
      })) || []
    );
  }

  private async getTrafficSources(
    propertyPath: string,
    dateRange: DateRange,
  ): Promise<Array<{ source: string; sessions: number }>> {
    const [response] = await this.dataClient.runReport({
      property: propertyPath,
      dateRanges: [
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      ],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    return (
      response.rows?.map((row) => ({
        source: row.dimensionValues?.[0]?.value || '',
        sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
      })) || []
    );
  }

  private async getEcommerceFunnel(
    propertyPath: string,
    dateRange: DateRange,
  ): Promise<{
    views: number;
    addToCart: number;
    beginCheckout: number;
    purchases: number;
  }> {
    const [response] = await this.dataClient.runReport({
      property: propertyPath,
      dateRanges: [
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      ],
      metrics: [
        { name: 'itemViews' },
        { name: 'addToCarts' },
        { name: 'checkouts' },
        { name: 'transactions' },
      ],
    });

    const metricValues = response.rows?.[0]?.metricValues || [];

    return {
      views: parseInt(metricValues[0]?.value || '0', 10),
      addToCart: parseInt(metricValues[1]?.value || '0', 10),
      beginCheckout: parseInt(metricValues[2]?.value || '0', 10),
      purchases: parseInt(metricValues[3]?.value || '0', 10),
    };
  }

  private async getRevenue(
    propertyPath: string,
    dateRange: DateRange,
  ): Promise<{
    total: number;
    byProduct: Array<{ productId: string; revenue: number }>;
  }> {
    // Total revenue
    const [totalResponse] = await this.dataClient.runReport({
      property: propertyPath,
      dateRanges: [
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      ],
      metrics: [{ name: 'totalRevenue' }],
    });

    const totalRevenue = parseFloat(
      totalResponse.rows?.[0]?.metricValues?.[0]?.value || '0',
    );

    // Revenue by product
    const [productResponse] = await this.dataClient.runReport({
      property: propertyPath,
      dateRanges: [
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      ],
      dimensions: [{ name: 'itemId' }],
      metrics: [{ name: 'itemRevenue' }],
      orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }],
      limit: 20,
    });

    const byProduct =
      productResponse.rows?.map((row) => ({
        productId: row.dimensionValues?.[0]?.value || '',
        revenue: parseFloat(row.metricValues?.[0]?.value || '0'),
      })) || [];

    return {
      total: totalRevenue,
      byProduct,
    };
  }
}
