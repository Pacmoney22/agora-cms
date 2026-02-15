import { PRODUCT_TYPES, PRODUCT_TYPE_REQUIRES_SHIPPING, PRODUCT_TYPE_HAS_INVENTORY } from './product-types';

describe('product type constants', () => {
  describe('PRODUCT_TYPES', () => {
    it('should have all 7 product types', () => {
      expect(Object.keys(PRODUCT_TYPES)).toHaveLength(7);
    });

    it('should map uppercase keys to lowercase values', () => {
      expect(PRODUCT_TYPES.PHYSICAL).toBe('physical');
      expect(PRODUCT_TYPES.VIRTUAL).toBe('virtual');
      expect(PRODUCT_TYPES.SERVICE).toBe('service');
      expect(PRODUCT_TYPES.CONFIGURABLE).toBe('configurable');
      expect(PRODUCT_TYPES.COURSE).toBe('course');
      expect(PRODUCT_TYPES.AFFILIATE).toBe('affiliate');
      expect(PRODUCT_TYPES.PRINTFUL).toBe('printful');
    });
  });

  describe('PRODUCT_TYPE_REQUIRES_SHIPPING', () => {
    it('should require shipping for physical products', () => {
      expect(PRODUCT_TYPE_REQUIRES_SHIPPING.physical).toBe(true);
    });

    it('should require shipping for printful products', () => {
      expect(PRODUCT_TYPE_REQUIRES_SHIPPING.printful).toBe(true);
    });

    it('should not require shipping for virtual products', () => {
      expect(PRODUCT_TYPE_REQUIRES_SHIPPING.virtual).toBe(false);
    });

    it('should not require shipping for services', () => {
      expect(PRODUCT_TYPE_REQUIRES_SHIPPING.service).toBe(false);
    });

    it('should not require shipping for courses', () => {
      expect(PRODUCT_TYPE_REQUIRES_SHIPPING.course).toBe(false);
    });

    it('should not require shipping for affiliate products', () => {
      expect(PRODUCT_TYPE_REQUIRES_SHIPPING.affiliate).toBe(false);
    });

    it('should not require shipping for configurable products (resolved at runtime)', () => {
      expect(PRODUCT_TYPE_REQUIRES_SHIPPING.configurable).toBe(false);
    });

    it('should cover all product types', () => {
      const allTypes = Object.values(PRODUCT_TYPES);
      allTypes.forEach(type => {
        expect(PRODUCT_TYPE_REQUIRES_SHIPPING).toHaveProperty(type);
      });
    });
  });

  describe('PRODUCT_TYPE_HAS_INVENTORY', () => {
    it('should track inventory for physical products', () => {
      expect(PRODUCT_TYPE_HAS_INVENTORY.physical).toBe(true);
    });

    it('should track inventory for virtual products (limited licenses)', () => {
      expect(PRODUCT_TYPE_HAS_INVENTORY.virtual).toBe(true);
    });

    it('should track inventory for printful products', () => {
      expect(PRODUCT_TYPE_HAS_INVENTORY.printful).toBe(true);
    });

    it('should not track inventory for services', () => {
      expect(PRODUCT_TYPE_HAS_INVENTORY.service).toBe(false);
    });

    it('should not track inventory for courses', () => {
      expect(PRODUCT_TYPE_HAS_INVENTORY.course).toBe(false);
    });

    it('should not track inventory for affiliate products', () => {
      expect(PRODUCT_TYPE_HAS_INVENTORY.affiliate).toBe(false);
    });

    it('should cover all product types', () => {
      const allTypes = Object.values(PRODUCT_TYPES);
      allTypes.forEach(type => {
        expect(PRODUCT_TYPE_HAS_INVENTORY).toHaveProperty(type);
      });
    });
  });
});
