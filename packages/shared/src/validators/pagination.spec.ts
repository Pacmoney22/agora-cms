import { paginationSchema } from './pagination';

describe('pagination validator', () => {
  describe('paginationSchema', () => {
    it('should parse valid pagination params', () => {
      const result = paginationSchema.parse({
        page: 1,
        limit: 20,
        sortOrder: 'asc',
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('asc');
    });

    it('should apply defaults when no params provided', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('desc');
      expect(result.sortBy).toBeUndefined();
    });

    it('should coerce string page to number', () => {
      const result = paginationSchema.parse({ page: '3' });
      expect(result.page).toBe(3);
    });

    it('should coerce string limit to number', () => {
      const result = paginationSchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    it('should reject page less than 1', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    });

    it('should reject limit less than 1', () => {
      expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
      expect(() => paginationSchema.parse({ limit: -5 })).toThrow();
    });

    it('should reject limit greater than 100', () => {
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
      expect(() => paginationSchema.parse({ limit: 500 })).toThrow();
    });

    it('should accept limit of exactly 100', () => {
      const result = paginationSchema.parse({ limit: 100 });
      expect(result.limit).toBe(100);
    });

    it('should accept limit of exactly 1', () => {
      const result = paginationSchema.parse({ limit: 1 });
      expect(result.limit).toBe(1);
    });

    it('should reject non-integer page', () => {
      expect(() => paginationSchema.parse({ page: 1.5 })).toThrow();
    });

    it('should reject non-integer limit', () => {
      expect(() => paginationSchema.parse({ limit: 20.5 })).toThrow();
    });

    it('should accept sortBy string', () => {
      const result = paginationSchema.parse({ sortBy: 'createdAt' });
      expect(result.sortBy).toBe('createdAt');
    });

    it('should accept asc sort order', () => {
      const result = paginationSchema.parse({ sortOrder: 'asc' });
      expect(result.sortOrder).toBe('asc');
    });

    it('should accept desc sort order', () => {
      const result = paginationSchema.parse({ sortOrder: 'desc' });
      expect(result.sortOrder).toBe('desc');
    });

    it('should reject invalid sort order', () => {
      expect(() => paginationSchema.parse({ sortOrder: 'random' })).toThrow();
    });

    it('should handle all params together', () => {
      const result = paginationSchema.parse({
        page: '2',
        limit: '10',
        sortBy: 'name',
        sortOrder: 'asc',
      });
      expect(result).toEqual({
        page: 2,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });
  });
});
