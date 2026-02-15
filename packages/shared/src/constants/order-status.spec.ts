import { ORDER_STATUSES, VALID_ORDER_TRANSITIONS } from './order-status';

describe('order status constants', () => {
  describe('ORDER_STATUSES', () => {
    it('should have all 10 statuses', () => {
      expect(Object.keys(ORDER_STATUSES)).toHaveLength(10);
    });

    it('should map uppercase keys to lowercase values', () => {
      expect(ORDER_STATUSES.PENDING).toBe('pending');
      expect(ORDER_STATUSES.CONFIRMED).toBe('confirmed');
      expect(ORDER_STATUSES.PROCESSING).toBe('processing');
      expect(ORDER_STATUSES.SHIPPED).toBe('shipped');
      expect(ORDER_STATUSES.IN_TRANSIT).toBe('in_transit');
      expect(ORDER_STATUSES.DELIVERED).toBe('delivered');
      expect(ORDER_STATUSES.COMPLETED).toBe('completed');
      expect(ORDER_STATUSES.CANCELLED).toBe('cancelled');
      expect(ORDER_STATUSES.REFUNDED).toBe('refunded');
      expect(ORDER_STATUSES.RETURNED).toBe('returned');
    });
  });

  describe('VALID_ORDER_TRANSITIONS', () => {
    it('should allow pending to transition to confirmed or cancelled', () => {
      expect(VALID_ORDER_TRANSITIONS.pending).toEqual(['confirmed', 'cancelled']);
    });

    it('should allow confirmed to transition to processing or cancelled', () => {
      expect(VALID_ORDER_TRANSITIONS.confirmed).toEqual(['processing', 'cancelled']);
    });

    it('should allow processing to transition to shipped or cancelled', () => {
      expect(VALID_ORDER_TRANSITIONS.processing).toEqual(['shipped', 'cancelled']);
    });

    it('should allow shipped to transition to in_transit or cancelled', () => {
      expect(VALID_ORDER_TRANSITIONS.shipped).toEqual(['in_transit', 'cancelled']);
    });

    it('should allow in_transit to transition to delivered or returned', () => {
      expect(VALID_ORDER_TRANSITIONS.in_transit).toEqual(['delivered', 'returned']);
    });

    it('should allow delivered to transition to completed or returned', () => {
      expect(VALID_ORDER_TRANSITIONS.delivered).toEqual(['completed', 'returned']);
    });

    it('should allow completed to transition only to refunded', () => {
      expect(VALID_ORDER_TRANSITIONS.completed).toEqual(['refunded']);
    });

    it('should allow cancelled to transition only to refunded', () => {
      expect(VALID_ORDER_TRANSITIONS.cancelled).toEqual(['refunded']);
    });

    it('should not allow any transitions from refunded', () => {
      expect(VALID_ORDER_TRANSITIONS.refunded).toEqual([]);
    });

    it('should allow returned to transition only to refunded', () => {
      expect(VALID_ORDER_TRANSITIONS.returned).toEqual(['refunded']);
    });

    it('should not allow backward transitions', () => {
      expect(VALID_ORDER_TRANSITIONS.confirmed).not.toContain('pending');
      expect(VALID_ORDER_TRANSITIONS.shipped).not.toContain('processing');
      expect(VALID_ORDER_TRANSITIONS.delivered).not.toContain('shipped');
    });

    it('should cover all defined statuses', () => {
      const allStatuses = Object.values(ORDER_STATUSES);
      const transitionKeys = Object.keys(VALID_ORDER_TRANSITIONS);
      allStatuses.forEach(status => {
        expect(transitionKeys).toContain(status);
      });
    });
  });
});
