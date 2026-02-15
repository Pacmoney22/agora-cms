import { generateSlug, ensureLeadingSlash } from './slug';

describe('slug utilities', () => {
  describe('generateSlug', () => {
    it('should convert text to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('my blog post')).toBe('my-blog-post');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello! World@2024')).toBe('hello-world2024');
    });

    it('should replace underscores with hyphens', () => {
      expect(generateSlug('hello_world_test')).toBe('hello-world-test');
    });

    it('should collapse multiple hyphens', () => {
      expect(generateSlug('hello---world')).toBe('hello-world');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(generateSlug('-hello world-')).toBe('hello-world');
    });

    it('should trim whitespace', () => {
      expect(generateSlug('  hello world  ')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('hello   world')).toBe('hello-world');
    });

    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(generateSlug('!@#$%^&*()')).toBe('');
    });

    it('should handle mixed case', () => {
      expect(generateSlug('MyAwesomePage')).toBe('myawesomepage');
    });

    it('should handle numbers', () => {
      expect(generateSlug('Product 123 Sale')).toBe('product-123-sale');
    });

    it('should handle already-slugified text', () => {
      expect(generateSlug('already-a-slug')).toBe('already-a-slug');
    });

    it('should handle unicode characters by removing them', () => {
      expect(generateSlug('café résumé')).toBe('caf-rsum');
    });
  });

  describe('ensureLeadingSlash', () => {
    it('should add leading slash if missing', () => {
      expect(ensureLeadingSlash('about')).toBe('/about');
    });

    it('should not double-add leading slash', () => {
      expect(ensureLeadingSlash('/about')).toBe('/about');
    });

    it('should handle empty string', () => {
      expect(ensureLeadingSlash('')).toBe('/');
    });

    it('should handle root path', () => {
      expect(ensureLeadingSlash('/')).toBe('/');
    });

    it('should handle nested paths', () => {
      expect(ensureLeadingSlash('blog/my-post')).toBe('/blog/my-post');
    });

    it('should not modify already-slashed nested paths', () => {
      expect(ensureLeadingSlash('/blog/my-post')).toBe('/blog/my-post');
    });
  });
});
