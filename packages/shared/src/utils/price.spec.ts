import { formatPrice, centsToDecimal, decimalToCents } from './price';

describe('price utilities', () => {
  describe('formatPrice', () => {
    it('should format cents as USD by default', () => {
      expect(formatPrice(1999)).toBe('$19.99');
    });

    it('should format zero cents', () => {
      expect(formatPrice(0)).toBe('$0.00');
    });

    it('should format large amounts', () => {
      expect(formatPrice(999999)).toBe('$9,999.99');
    });

    it('should format single cent', () => {
      expect(formatPrice(1)).toBe('$0.01');
    });

    it('should handle negative amounts', () => {
      expect(formatPrice(-500)).toBe('-$5.00');
    });

    it('should format with different currency', () => {
      expect(formatPrice(1500, 'EUR')).toBe('€15.00');
    });

    it('should format GBP currency', () => {
      expect(formatPrice(2500, 'GBP')).toBe('£25.00');
    });

    it('should format JPY currency (no decimals)', () => {
      const result = formatPrice(15000, 'JPY');
      expect(result).toContain('150');
    });
  });

  describe('centsToDecimal', () => {
    it('should convert cents to decimal', () => {
      expect(centsToDecimal(1999)).toBe(19.99);
    });

    it('should convert zero', () => {
      expect(centsToDecimal(0)).toBe(0);
    });

    it('should convert single cent', () => {
      expect(centsToDecimal(1)).toBe(0.01);
    });

    it('should handle negative cents', () => {
      expect(centsToDecimal(-500)).toBe(-5);
    });

    it('should handle large amounts', () => {
      expect(centsToDecimal(1000000)).toBe(10000);
    });
  });

  describe('decimalToCents', () => {
    it('should convert decimal to cents', () => {
      expect(decimalToCents(19.99)).toBe(1999);
    });

    it('should convert zero', () => {
      expect(decimalToCents(0)).toBe(0);
    });

    it('should round to nearest cent', () => {
      expect(decimalToCents(19.995)).toBe(2000);
    });

    it('should round down correctly', () => {
      expect(decimalToCents(19.994)).toBe(1999);
    });

    it('should handle negative decimals', () => {
      expect(decimalToCents(-5.00)).toBe(-500);
    });

    it('should handle large decimals', () => {
      expect(decimalToCents(10000.00)).toBe(1000000);
    });

    it('should handle floating point precision', () => {
      expect(decimalToCents(0.1 + 0.2)).toBe(30);
    });
  });
});
