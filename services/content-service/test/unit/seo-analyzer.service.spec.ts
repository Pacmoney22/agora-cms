import { Test, TestingModule } from '@nestjs/testing';
import { SeoAnalyzerService } from '../../src/modules/seo/seo-analyzer.service';
import { NotFoundException } from '@nestjs/common';

describe('SeoAnalyzerService', () => {
  let service: SeoAnalyzerService;
  let prisma: any;

  const mockPrisma = {
    page: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoAnalyzerService,
        {
          provide: 'PRISMA',
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SeoAnalyzerService>(SeoAnalyzerService);
    prisma = mockPrisma;

    jest.clearAllMocks();
  });

  describe('analyze', () => {
    it('should throw NotFoundException if page does not exist', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.analyze('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return analysis result with overall score and grade', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test Page Title',
        slug: '/test-page',
        status: 'published',
        seo: {
          metaTitle: 'Optimal Title Length For SEO Testing',
          metaDescription:
            'This is a meta description that has optimal length for SEO testing. It contains between 120 and 160 characters total for best results.',
          canonicalUrl: 'https://example.com/test-page',
          ogTitle: 'OG Title',
          ogDescription: 'OG Description',
          ogImage: 'https://example.com/og-image.jpg',
        },
        componentTree: {
          componentId: 'container',
          children: [
            {
              componentId: 'h1',
              props: { text: 'Main Heading' },
            },
            {
              componentId: 'text',
              props: {
                content:
                  'This is a lengthy content section with many words to ensure we pass the content length check. ' +
                  'SEO requires substantial content, typically at least 300 words. ' +
                  'We need to add enough text here to simulate a real page with meaningful content. ' +
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
                  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
                  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. ' +
                  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. ' +
                  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia. ' +
                  'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor. ' +
                  'Additional content to reach the word count threshold for good SEO scoring. ' +
                  'More meaningful content about our topic to help search engines understand the page.',
              },
            },
            {
              componentId: 'image',
              props: {
                src: 'https://example.com/image.webp',
                alt: 'Image description',
              },
            },
          ],
        },
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');

      expect(result).toHaveProperty('pageId', 'page-123');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('grade');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('suggestions');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
      expect(Array.isArray(result.checks)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should score title tag correctly for optimal length', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test Page',
        slug: '/test',
        status: 'published',
        seo: {
          metaTitle: 'This is an optimal length title tag', // 38 chars
        },
        componentTree: {},
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const titleCheck = result.checks.find((c) => c.check === 'Title Tag');

      expect(titleCheck).toBeDefined();
      expect(titleCheck?.status).toBe('pass');
      expect(titleCheck?.score).toBe(10);
    });

    it('should fail title tag check for missing title', async () => {
      const mockPage = {
        id: 'page-123',
        title: '',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {},
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const titleCheck = result.checks.find((c) => c.check === 'Title Tag');

      expect(titleCheck).toBeDefined();
      expect(titleCheck?.status).toBe('fail');
      expect(titleCheck?.score).toBe(0);
    });

    it('should warn for short title', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Short',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {},
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const titleCheck = result.checks.find((c) => c.check === 'Title Tag');

      expect(titleCheck).toBeDefined();
      expect(titleCheck?.status).toBe('warning');
      expect(titleCheck?.score).toBe(5);
    });

    it('should score meta description correctly', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {
          metaDescription:
            'This is an optimal length meta description for SEO. It contains the right amount of characters to avoid truncation in search results.',
        },
        componentTree: {},
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const metaCheck = result.checks.find((c) => c.check === 'Meta Description');

      expect(metaCheck).toBeDefined();
      expect(metaCheck?.status).toBe('pass');
    });

    it('should fail for missing meta description', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {},
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const metaCheck = result.checks.find((c) => c.check === 'Meta Description');

      expect(metaCheck).toBeDefined();
      expect(metaCheck?.status).toBe('fail');
      expect(metaCheck?.score).toBe(0);
    });

    it('should check heading structure correctly', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {
          children: [
            { componentId: 'h1', props: { text: 'Main Heading' } },
            { componentId: 'h2', props: { text: 'Subheading' } },
            { componentId: 'h3', props: { text: 'Sub-subheading' } },
          ],
        },
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const headingCheck = result.checks.find((c) => c.check === 'Heading Structure');

      expect(headingCheck).toBeDefined();
      expect(headingCheck?.status).toBe('pass');
    });

    it('should fail for missing H1', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {
          children: [
            { componentId: 'h2', props: { text: 'Subheading' } },
            { componentId: 'h3', props: { text: 'Sub-subheading' } },
          ],
        },
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const headingCheck = result.checks.find((c) => c.check === 'Heading Structure');

      expect(headingCheck).toBeDefined();
      expect(headingCheck?.message).toContain('missing an H1');
    });

    it('should check content length', async () => {
      const longContent = Array(400).fill('word').join(' ');
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {
          children: [{ componentId: 'text', props: { content: longContent } }],
        },
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const contentCheck = result.checks.find((c) => c.check === 'Content Length');

      expect(contentCheck).toBeDefined();
      expect(contentCheck?.status).toBe('pass');
    });

    it('should check image alt text', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {
          children: [
            {
              componentId: 'image',
              props: { src: 'image.jpg', alt: 'Image description' },
            },
            {
              componentId: 'image',
              props: { src: 'image2.jpg', alt: 'Another image' },
            },
          ],
        },
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const imageCheck = result.checks.find((c) => c.check === 'Image Alt Text');

      expect(imageCheck).toBeDefined();
      expect(imageCheck?.status).toBe('pass');
    });

    it('should fail for missing image alt text', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {
          children: [
            { componentId: 'image', props: { src: 'image.jpg' } },
            { componentId: 'image', props: { src: 'image2.jpg' } },
          ],
        },
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const imageCheck = result.checks.find((c) => c.check === 'Image Alt Text');

      expect(imageCheck).toBeDefined();
      expect(imageCheck?.status).toBe('fail');
      expect(imageCheck?.message).toContain('missing alt text');
    });

    it('should check URL slug format', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/good-url-slug',
        status: 'published',
        seo: {},
        componentTree: {},
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const slugCheck = result.checks.find((c) => c.check === 'URL Slug');

      expect(slugCheck).toBeDefined();
      expect(slugCheck?.status).toBe('pass');
    });

    it('should check Open Graph tags', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {
          ogTitle: 'OG Title',
          ogDescription: 'OG Description',
          ogImage: 'https://example.com/og-image.jpg',
        },
        componentTree: {},
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const ogCheck = result.checks.find((c) => c.check === 'Open Graph');

      expect(ogCheck).toBeDefined();
      expect(ogCheck?.status).toBe('pass');
    });

    it('should warn for missing Open Graph tags', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Test',
        slug: '/test',
        status: 'published',
        seo: {},
        componentTree: {},
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');
      const ogCheck = result.checks.find((c) => c.check === 'Open Graph');

      expect(ogCheck).toBeDefined();
      expect(ogCheck?.status).toBe('fail');
      expect(ogCheck?.message).toContain('Missing Open Graph tags');
    });

    it('should determine grade correctly', async () => {
      const mockPage = {
        id: 'page-123',
        title: 'Optimal SEO Page Title Length',
        slug: '/optimal-seo-page',
        status: 'published',
        seo: {
          metaTitle: 'Optimal SEO Page Title Length Here',
          metaDescription:
            'This is an optimal length meta description for SEO testing purposes. It contains the right amount of characters to avoid truncation.',
          canonicalUrl: 'https://example.com/optimal-seo-page',
          ogTitle: 'OG Title',
          ogDescription: 'OG Description',
          ogImage: 'https://example.com/og-image.jpg',
        },
        componentTree: {
          componentId: 'responsive-container',
          children: [
            { componentId: 'h1', props: { text: 'Main Heading' } },
            {
              componentId: 'text',
              props: {
                content: Array(400).fill('meaningful content word').join(' '),
              },
            },
            {
              componentId: 'image',
              props: {
                src: 'https://example.com/image.webp',
                alt: 'Descriptive alt text',
              },
            },
          ],
        },
      };

      mockPrisma.page.findUnique.mockResolvedValue(mockPage);

      const result = await service.analyze('page-123');

      expect(result.overallScore).toBeGreaterThan(70);
      expect(['A', 'B', 'C']).toContain(result.grade);
    });
  });
});
