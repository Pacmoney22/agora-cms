import { GoogleAnalyticsProvider } from './google-analytics-provider';

// Mock the GA4 Data API client
const mockRunReport = jest.fn();

jest.mock('@google-analytics/data', () => ({
  BetaAnalyticsDataClient: jest.fn().mockImplementation(() => ({
    runReport: mockRunReport,
  })),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GoogleAnalyticsProvider', () => {
  let provider: GoogleAnalyticsProvider;

  const measurementId = 'G-TEST12345';
  const apiSecret = 'test_api_secret';
  const propertyId = '123456789';

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GoogleAnalyticsProvider(measurementId, apiSecret, propertyId);
  });

  describe('constructor', () => {
    it('should initialize with measurement ID, API secret, and property ID', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('trackEvent', () => {
    it('should be a no-op (server-side warning only)', async () => {
      const event = {
        name: 'page_view',
        params: { page_path: '/home' },
      };

      // Should not throw
      await expect(provider.trackEvent(event)).resolves.toBeUndefined();
    });
  });

  describe('trackServerEvent', () => {
    it('should send event to GA4 Measurement Protocol', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      });

      const event = {
        clientId: 'client_123',
        events: [
          { name: 'purchase', params: { value: 49.99, currency: 'USD' } },
        ],
      };

      await provider.trackServerEvent(event);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: 'client_123',
            events: [{ name: 'purchase', params: { value: 49.99, currency: 'USD' } }],
          }),
        },
      );
    });

    it('should send multiple events in one request', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 204 });

      const event = {
        clientId: 'client_456',
        events: [
          { name: 'page_view', params: { page_path: '/products' } },
          { name: 'add_to_cart', params: { item_id: 'SKU123' } },
        ],
      };

      await provider.trackServerEvent(event);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.events).toHaveLength(2);
      expect(callBody.events[0].name).toBe('page_view');
      expect(callBody.events[1].name).toBe('add_to_cart');
    });

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const event = {
        clientId: 'client_123',
        events: [{ name: 'test', params: {} }],
      };

      await expect(provider.trackServerEvent(event)).rejects.toThrow(
        'GA4 Measurement Protocol failed: 403 Forbidden',
      );
    });

    it('should throw on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const event = {
        clientId: 'client_123',
        events: [{ name: 'test', params: {} }],
      };

      await expect(provider.trackServerEvent(event)).rejects.toThrow('Network error');
    });
  });

  describe('getDashboardData', () => {
    const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };
    const propertyPath = `properties/${propertyId}`;

    it('should fetch and aggregate all dashboard data', async () => {
      // Active users report
      mockRunReport
        .mockResolvedValueOnce([{
          rows: [{ metricValues: [{ value: '1500' }] }],
        }])
        // Top pages report
        .mockResolvedValueOnce([{
          rows: [
            { dimensionValues: [{ value: '/home' }], metricValues: [{ value: '5000' }] },
            { dimensionValues: [{ value: '/products' }], metricValues: [{ value: '3000' }] },
          ],
        }])
        // Traffic sources report
        .mockResolvedValueOnce([{
          rows: [
            { dimensionValues: [{ value: 'google' }], metricValues: [{ value: '2000' }] },
            { dimensionValues: [{ value: 'direct' }], metricValues: [{ value: '1000' }] },
          ],
        }])
        // Ecommerce funnel report
        .mockResolvedValueOnce([{
          rows: [{
            metricValues: [
              { value: '8000' },
              { value: '2000' },
              { value: '800' },
              { value: '300' },
            ],
          }],
        }])
        // Total revenue report
        .mockResolvedValueOnce([{
          rows: [{ metricValues: [{ value: '45000.50' }] }],
        }])
        // Revenue by product report
        .mockResolvedValueOnce([{
          rows: [
            { dimensionValues: [{ value: 'prod_1' }], metricValues: [{ value: '20000.00' }] },
            { dimensionValues: [{ value: 'prod_2' }], metricValues: [{ value: '15000.50' }] },
          ],
        }]);

      const result = await provider.getDashboardData(dateRange);

      expect(result.activeUsers).toBe(1500);
      expect(result.topPages).toEqual([
        { path: '/home', views: 5000 },
        { path: '/products', views: 3000 },
      ]);
      expect(result.trafficSources).toEqual([
        { source: 'google', sessions: 2000 },
        { source: 'direct', sessions: 1000 },
      ]);
      expect(result.ecommerceFunnel).toEqual({
        views: 8000,
        addToCart: 2000,
        beginCheckout: 800,
        purchases: 300,
      });
      expect(result.revenue).toEqual({
        total: 45000.50,
        byProduct: [
          { productId: 'prod_1', revenue: 20000.00 },
          { productId: 'prod_2', revenue: 15000.50 },
        ],
      });

      // Verify runReport was called 6 times (5 parallel calls, revenue calls 2 internally)
      expect(mockRunReport).toHaveBeenCalledTimes(6);
    });

    it('should handle empty active users response', async () => {
      mockRunReport
        .mockResolvedValueOnce([{ rows: null }])  // active users - no rows
        .mockResolvedValueOnce([{ rows: [] }])      // top pages
        .mockResolvedValueOnce([{ rows: [] }])      // traffic sources
        .mockResolvedValueOnce([{ rows: null }])    // ecommerce funnel - no rows
        .mockResolvedValueOnce([{ rows: null }])    // total revenue - no rows
        .mockResolvedValueOnce([{ rows: null }]);   // revenue by product - no rows

      const result = await provider.getDashboardData(dateRange);

      expect(result.activeUsers).toBe(0);
      expect(result.topPages).toEqual([]);
      expect(result.trafficSources).toEqual([]);
      expect(result.ecommerceFunnel).toEqual({
        views: 0,
        addToCart: 0,
        beginCheckout: 0,
        purchases: 0,
      });
      expect(result.revenue).toEqual({
        total: 0,
        byProduct: [],
      });
    });

    it('should handle rows with missing values', async () => {
      mockRunReport
        .mockResolvedValueOnce([{
          rows: [{ metricValues: [{ value: undefined }] }],
        }])
        .mockResolvedValueOnce([{
          rows: [
            { dimensionValues: [{ value: undefined }], metricValues: [{ value: undefined }] },
          ],
        }])
        .mockResolvedValueOnce([{
          rows: [
            { dimensionValues: [{ value: undefined }], metricValues: [{ value: undefined }] },
          ],
        }])
        .mockResolvedValueOnce([{
          rows: [{
            metricValues: [
              { value: undefined },
              { value: undefined },
              { value: undefined },
              { value: undefined },
            ],
          }],
        }])
        .mockResolvedValueOnce([{
          rows: [{ metricValues: [{ value: undefined }] }],
        }])
        .mockResolvedValueOnce([{
          rows: [
            { dimensionValues: [{ value: undefined }], metricValues: [{ value: undefined }] },
          ],
        }]);

      const result = await provider.getDashboardData(dateRange);

      expect(result.activeUsers).toBe(0);
      expect(result.topPages).toEqual([{ path: '', views: 0 }]);
      expect(result.trafficSources).toEqual([{ source: '', sessions: 0 }]);
      expect(result.ecommerceFunnel).toEqual({
        views: 0,
        addToCart: 0,
        beginCheckout: 0,
        purchases: 0,
      });
      expect(result.revenue.total).toBe(0);
      expect(result.revenue.byProduct).toEqual([{ productId: '', revenue: 0 }]);
    });

    it('should throw when data API fails', async () => {
      mockRunReport.mockRejectedValue(new Error('API quota exceeded'));

      await expect(provider.getDashboardData(dateRange)).rejects.toThrow('API quota exceeded');
    });

    it('should verify correct report parameters for active users', async () => {
      mockRunReport
        .mockResolvedValueOnce([{ rows: [{ metricValues: [{ value: '100' }] }] }])
        .mockResolvedValueOnce([{ rows: [] }])
        .mockResolvedValueOnce([{ rows: [] }])
        .mockResolvedValueOnce([{ rows: [{ metricValues: [] }] }])
        .mockResolvedValueOnce([{ rows: [{ metricValues: [{ value: '0' }] }] }])
        .mockResolvedValueOnce([{ rows: [] }]);

      await provider.getDashboardData(dateRange);

      // Check the first call (active users)
      expect(mockRunReport).toHaveBeenCalledWith(
        expect.objectContaining({
          property: propertyPath,
          dateRanges: [{ startDate: '2024-01-01', endDate: '2024-01-31' }],
          metrics: [{ name: 'activeUsers' }],
        }),
      );
    });

    it('should handle ecommerce funnel with empty metricValues array', async () => {
      mockRunReport
        .mockResolvedValueOnce([{ rows: [{ metricValues: [{ value: '100' }] }] }])
        .mockResolvedValueOnce([{ rows: [] }])
        .mockResolvedValueOnce([{ rows: [] }])
        .mockResolvedValueOnce([{ rows: [{ metricValues: [] }] }])  // empty metrics array
        .mockResolvedValueOnce([{ rows: [{ metricValues: [{ value: '0' }] }] }])
        .mockResolvedValueOnce([{ rows: [] }]);

      const result = await provider.getDashboardData(dateRange);

      expect(result.ecommerceFunnel).toEqual({
        views: 0,
        addToCart: 0,
        beginCheckout: 0,
        purchases: 0,
      });
    });
  });
});
