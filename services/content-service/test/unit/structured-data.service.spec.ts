import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { StructuredDataService } from '../../src/modules/seo/structured-data.service';

describe('StructuredDataService', () => {
  let service: StructuredDataService;

  const mockPrisma = {
    page: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StructuredDataService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StructuredDataService>(StructuredDataService);
    jest.clearAllMocks();
  });

  const baseOptions = {
    baseUrl: 'https://example.com',
    organizationName: 'Test Org',
  };

  const createMockPage = (overrides: any = {}) => ({
    id: 'p1',
    title: 'Test Page',
    slug: '/test-page',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
    seo: {},
    componentTree: {},
    author: { name: 'John Doe', email: 'john@test.com' },
    ...overrides,
  });

  // -----------------------------------------------------------------------
  // generateForPage
  // -----------------------------------------------------------------------
  describe('generateForPage', () => {
    it('should throw NotFoundException when page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(
        service.generateForPage('non-existent', baseOptions),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate WebPage schema for pages with few text components', async () => {
      const page = createMockPage({
        componentTree: {
          componentId: 'hero',
          children: [
            { componentId: 'image', props: { src: 'hero.jpg' } },
            { componentId: 'button', props: { label: 'Click Me' } },
            { componentId: 'gallery', props: {} },
          ],
        },
      });
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.generateForPage('p1', baseOptions);

      expect(result.length).toBeGreaterThanOrEqual(2); // WebPage + Breadcrumb
      const webPage = result.find((r) => r['@type'] === 'WebPage');
      expect(webPage).toBeDefined();
      expect(webPage!['@context']).toBe('https://schema.org');
      expect(webPage!['name']).toBe('Test Page');
      expect(webPage!['url']).toBe('https://example.com/test-page');
    });

    it('should generate Article schema when text components dominate', async () => {
      const page = createMockPage({
        componentTree: {
          componentId: 'article-container',
          children: [
            { componentId: 'heading', props: { text: 'Article Title' } },
            {
              componentId: 'paragraph',
              props: { content: 'First paragraph of article text.' },
            },
            {
              componentId: 'rich-text',
              props: { body: 'More article content here.' },
            },
            {
              componentId: 'text',
              props: { content: 'Even more text content.' },
            },
          ],
        },
      });
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.generateForPage('p1', baseOptions);

      const article = result.find((r) => r['@type'] === 'Article');
      expect(article).toBeDefined();
      expect(article!['headline']).toBe('Test Page');
      expect(article!['author']).toEqual({
        '@type': 'Person',
        name: 'John Doe',
      });
      expect(article!['publisher']).toEqual({
        '@type': 'Organization',
        name: 'Test Org',
        url: 'https://example.com',
      });
    });

    it('should always include BreadcrumbList', async () => {
      const page = createMockPage();
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.generateForPage('p1', baseOptions);

      const breadcrumb = result.find((r) => r['@type'] === 'BreadcrumbList');
      expect(breadcrumb).toBeDefined();
    });

    it('should use metaTitle from SEO when available', async () => {
      const page = createMockPage({
        seo: { metaTitle: 'Custom SEO Title' },
      });
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.generateForPage('p1', baseOptions);

      const webPage = result.find(
        (r) => r['@type'] === 'WebPage' || r['@type'] === 'Article',
      );
      expect(
        webPage!['name'] || webPage!['headline'],
      ).toBe('Custom SEO Title');
    });

    it('should use metaDescription from SEO when available', async () => {
      const page = createMockPage({
        seo: { metaDescription: 'Custom meta description for the page' },
      });
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.generateForPage('p1', baseOptions);

      const webPage = result.find(
        (r) => r['@type'] === 'WebPage' || r['@type'] === 'Article',
      );
      expect(webPage!['description']).toBe(
        'Custom meta description for the page',
      );
    });

    it('should include image when found in component tree', async () => {
      const page = createMockPage({
        componentTree: {
          componentId: 'container',
          children: [
            {
              componentId: 'hero',
              props: { src: 'https://example.com/hero.jpg' },
            },
          ],
        },
      });
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.generateForPage('p1', baseOptions);

      const schema = result.find(
        (r) => r['@type'] === 'WebPage' || r['@type'] === 'Article',
      );
      expect(schema!['image']).toBe('https://example.com/hero.jpg');
    });

    it('should prefer ogImage from SEO over component tree image', async () => {
      const page = createMockPage({
        seo: { ogImage: 'https://example.com/og.jpg' },
        componentTree: {
          componentId: 'container',
          children: [
            { componentId: 'image', props: { src: 'https://example.com/other.jpg' } },
          ],
        },
      });
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.generateForPage('p1', baseOptions);

      const schema = result.find(
        (r) => r['@type'] === 'WebPage' || r['@type'] === 'Article',
      );
      expect(schema!['image']).toBe('https://example.com/og.jpg');
    });

    it('should include wordCount for Article type', async () => {
      const page = createMockPage({
        componentTree: {
          componentId: 'article',
          children: [
            { componentId: 'text', props: { content: 'word one two three four five' } },
            { componentId: 'paragraph', props: { content: 'six seven eight nine ten' } },
            { componentId: 'rich-text', props: { body: 'eleven twelve' } },
          ],
        },
      });
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.generateForPage('p1', baseOptions);

      const article = result.find((r) => r['@type'] === 'Article');
      if (article) {
        expect(article['wordCount']).toBeGreaterThan(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // generateBreadcrumb
  // -----------------------------------------------------------------------
  describe('generateBreadcrumb', () => {
    it('should generate breadcrumb for root page', () => {
      const result = service.generateBreadcrumb('/', baseOptions);

      expect(result['@type']).toBe('BreadcrumbList');
      const items = result['itemListElement'] as any[];
      expect(items).toHaveLength(1); // Just Home
      expect(items[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://example.com',
      });
    });

    it('should generate breadcrumb for nested page', () => {
      const result = service.generateBreadcrumb(
        '/blog/my-article',
        baseOptions,
      );

      const items = result['itemListElement'] as any[];
      expect(items).toHaveLength(3); // Home, Blog, My Article
      expect(items[0].name).toBe('Home');
      expect(items[1].name).toBe('Blog');
      expect(items[1].item).toBe('https://example.com/blog');
      expect(items[2].name).toBe('My Article');
      expect(items[2].item).toBe('https://example.com/blog/my-article');
    });

    it('should convert slug segments to title case', () => {
      const result = service.generateBreadcrumb(
        '/getting-started',
        baseOptions,
      );

      const items = result['itemListElement'] as any[];
      expect(items[1].name).toBe('Getting Started');
    });

    it('should assign sequential positions', () => {
      const result = service.generateBreadcrumb('/a/b/c', baseOptions);

      const items = result['itemListElement'] as any[];
      expect(items[0].position).toBe(1);
      expect(items[1].position).toBe(2);
      expect(items[2].position).toBe(3);
      expect(items[3].position).toBe(4);
    });
  });

  // -----------------------------------------------------------------------
  // generateOrganization
  // -----------------------------------------------------------------------
  describe('generateOrganization', () => {
    it('should generate Organization schema with name', () => {
      const result = service.generateOrganization(baseOptions);

      expect(result['@context']).toBe('https://schema.org');
      expect(result['@type']).toBe('Organization');
      expect(result['name']).toBe('Test Org');
      expect(result['url']).toBe('https://example.com');
      expect(result['logo']).toBe('https://example.com/logo.png');
    });

    it('should use default name when organizationName not provided', () => {
      const result = service.generateOrganization({
        baseUrl: 'https://example.com',
      });

      expect(result['name']).toBe('Organization');
      expect(result).not.toHaveProperty('logo');
    });

    it('should include sameAs array when organizationName provided', () => {
      const result = service.generateOrganization(baseOptions);

      expect(result['sameAs']).toEqual([]);
    });
  });
});
