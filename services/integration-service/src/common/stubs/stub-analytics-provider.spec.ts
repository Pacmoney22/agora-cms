import { StubAnalyticsProvider } from './stub-analytics-provider';

describe('StubAnalyticsProvider', () => {
  let provider: StubAnalyticsProvider;

  beforeEach(() => {
    provider = new StubAnalyticsProvider();
  });

  describe('trackEvent', () => {
    it('should accept and log a client-side event', async () => {
      const event = {
        name: 'page_view',
        params: { page_path: '/home' },
      };

      await expect(provider.trackEvent(event)).resolves.toBeUndefined();
    });

    it('should accept event with no params', async () => {
      const event = {
        name: 'test_event',
        params: {},
      };

      await expect(provider.trackEvent(event)).resolves.toBeUndefined();
    });
  });

  describe('trackServerEvent', () => {
    it('should accept and log a server-side event', async () => {
      const event = {
        clientId: 'client_123',
        events: [
          { name: 'purchase', params: { value: 49.99 } },
        ],
      };

      await expect(provider.trackServerEvent(event)).resolves.toBeUndefined();
    });

    it('should handle multiple events', async () => {
      const event = {
        clientId: 'client_456',
        events: [
          { name: 'page_view', params: {} },
          { name: 'add_to_cart', params: { item_id: 'SKU123' } },
          { name: 'purchase', params: { value: 99.99 } },
        ],
      };

      await expect(provider.trackServerEvent(event)).resolves.toBeUndefined();
    });
  });

  describe('getDashboardData', () => {
    it('should return mock dashboard data', async () => {
      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const result = await provider.getDashboardData(dateRange);

      expect(result.activeUsers).toBe(1_247);
      expect(result.topPages).toBeInstanceOf(Array);
      expect(result.topPages.length).toBeGreaterThan(0);
      expect(result.topPages[0]).toHaveProperty('path');
      expect(result.topPages[0]).toHaveProperty('views');
    });

    it('should return traffic sources', async () => {
      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const result = await provider.getDashboardData(dateRange);

      expect(result.trafficSources).toBeInstanceOf(Array);
      expect(result.trafficSources.length).toBeGreaterThan(0);
      expect(result.trafficSources[0]).toHaveProperty('source');
      expect(result.trafficSources[0]).toHaveProperty('sessions');
    });

    it('should return ecommerce funnel data', async () => {
      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const result = await provider.getDashboardData(dateRange);

      expect(result.ecommerceFunnel).toHaveProperty('views');
      expect(result.ecommerceFunnel).toHaveProperty('addToCart');
      expect(result.ecommerceFunnel).toHaveProperty('beginCheckout');
      expect(result.ecommerceFunnel).toHaveProperty('purchases');
      // Funnel should narrow
      expect(result.ecommerceFunnel.views).toBeGreaterThan(result.ecommerceFunnel.addToCart);
      expect(result.ecommerceFunnel.addToCart).toBeGreaterThan(result.ecommerceFunnel.beginCheckout);
      expect(result.ecommerceFunnel.beginCheckout).toBeGreaterThan(result.ecommerceFunnel.purchases);
    });

    it('should return revenue data', async () => {
      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const result = await provider.getDashboardData(dateRange);

      expect(result.revenue).toHaveProperty('total');
      expect(result.revenue).toHaveProperty('byProduct');
      expect(result.revenue.total).toBeGreaterThan(0);
      expect(result.revenue.byProduct.length).toBeGreaterThan(0);
      expect(result.revenue.byProduct[0]).toHaveProperty('productId');
      expect(result.revenue.byProduct[0]).toHaveProperty('revenue');
    });

    it('should return same data regardless of date range', async () => {
      const result1 = await provider.getDashboardData({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      const result2 = await provider.getDashboardData({
        startDate: '2025-06-01',
        endDate: '2025-06-30',
      });

      expect(result1.activeUsers).toBe(result2.activeUsers);
      expect(result1.topPages).toEqual(result2.topPages);
    });
  });
});
