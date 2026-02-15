import { EVENTS } from './event-types';

describe('event types', () => {
  describe('EVENTS', () => {
    it('should define page events', () => {
      expect(EVENTS.PAGE_CREATED).toBe('page.created');
      expect(EVENTS.PAGE_UPDATED).toBe('page.updated');
      expect(EVENTS.PAGE_PUBLISHED).toBe('page.published');
      expect(EVENTS.PAGE_UNPUBLISHED).toBe('page.unpublished');
      expect(EVENTS.PAGE_DELETED).toBe('page.deleted');
    });

    it('should define commerce events', () => {
      expect(EVENTS.PRODUCT_CREATED).toBe('product.created');
      expect(EVENTS.PRODUCT_UPDATED).toBe('product.updated');
      expect(EVENTS.PRODUCT_DELETED).toBe('product.deleted');
      expect(EVENTS.CART_UPDATED).toBe('cart.updated');
      expect(EVENTS.CART_ABANDONED).toBe('cart.abandoned');
      expect(EVENTS.CHECKOUT_STARTED).toBe('checkout.started');
    });

    it('should define order events', () => {
      expect(EVENTS.ORDER_CREATED).toBe('order.created');
      expect(EVENTS.ORDER_CONFIRMED).toBe('order.confirmed');
      expect(EVENTS.ORDER_SHIPPED).toBe('order.shipped');
      expect(EVENTS.ORDER_DELIVERED).toBe('order.delivered');
      expect(EVENTS.ORDER_CANCELLED).toBe('order.cancelled');
      expect(EVENTS.ORDER_REFUNDED).toBe('order.refunded');
    });

    it('should define inventory events', () => {
      expect(EVENTS.INVENTORY_UPDATED).toBe('inventory.updated');
      expect(EVENTS.INVENTORY_LOW).toBe('inventory.low');
      expect(EVENTS.INVENTORY_RESERVED).toBe('inventory.reserved');
    });

    it('should define integration events', () => {
      expect(EVENTS.PAYMENT_SUCCEEDED).toBe('payment.succeeded');
      expect(EVENTS.PAYMENT_FAILED).toBe('payment.failed');
      expect(EVENTS.CONTACT_SYNCED).toBe('contact.synced');
      expect(EVENTS.LEAD_CREATED).toBe('lead.created');
    });

    it('should define user events', () => {
      expect(EVENTS.USER_REGISTERED).toBe('user.registered');
      expect(EVENTS.USER_LOGGED_IN).toBe('user.logged_in');
      expect(EVENTS.FORM_SUBMITTED).toBe('form.submitted');
    });

    it('should use dot notation for all event names', () => {
      Object.values(EVENTS).forEach(event => {
        expect(event).toMatch(/^[a-z_]+\.[a-z_]+$/);
      });
    });
  });
});
