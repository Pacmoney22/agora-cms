import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { SeoService } from '../../src/modules/seo/seo.service';

describe('SeoService', () => {
  let service: SeoService;

  const mockPrisma = {
    page: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SeoService>(SeoService);
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // getPageSeo
  // -----------------------------------------------------------------------
  describe('getPageSeo', () => {
    it('should return page SEO data', async () => {
      const page = {
        id: 'p1',
        slug: '/test',
        title: 'Test Page',
        seo: { metaTitle: 'SEO Title', metaDescription: 'Description' },
      };
      mockPrisma.page.findUnique.mockResolvedValue(page);

      const result = await service.getPageSeo('p1');

      expect(result).toEqual({
        pageId: 'p1',
        slug: '/test',
        title: 'Test Page',
        seo: page.seo,
      });
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(service.getPageSeo('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle page with no SEO data', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({
        id: 'p1',
        slug: '/test',
        title: 'Test',
        seo: null,
      });

      const result = await service.getPageSeo('p1');

      expect(result.seo).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // updatePageSeo
  // -----------------------------------------------------------------------
  describe('updatePageSeo', () => {
    it('should update page SEO and return updated data', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.page.update.mockResolvedValue({
        id: 'p1',
        slug: '/test',
        title: 'Test',
        seo: { metaTitle: 'New Title', metaDescription: 'New Desc' },
      });

      const result = await service.updatePageSeo('p1', {
        metaTitle: 'New Title',
        metaDescription: 'New Desc',
      });

      expect(result.pageId).toBe('p1');
      expect(result.seo).toEqual({
        metaTitle: 'New Title',
        metaDescription: 'New Desc',
      });
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePageSeo('non-existent', { metaTitle: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update noIndex field', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.page.update.mockResolvedValue({
        id: 'p1',
        slug: '/test',
        title: 'Test',
        seo: { noIndex: true },
      });

      const result = await service.updatePageSeo('p1', { noIndex: true });

      expect((result.seo as any).noIndex).toBe(true);
    });

    it('should update canonical URL', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.page.update.mockResolvedValue({
        id: 'p1',
        slug: '/test',
        title: 'Test',
        seo: { canonicalUrl: 'https://example.com/canonical' },
      });

      const result = await service.updatePageSeo('p1', {
        canonicalUrl: 'https://example.com/canonical',
      });

      expect((result.seo as any).canonicalUrl).toBe(
        'https://example.com/canonical',
      );
    });
  });

  // -----------------------------------------------------------------------
  // getSitemapData
  // -----------------------------------------------------------------------
  describe('getSitemapData', () => {
    it('should return sitemap entries for published non-template pages', async () => {
      const now = new Date();
      mockPrisma.page.findMany.mockResolvedValue([
        { slug: '/', updatedAt: now, seo: null },
        { slug: '/about', updatedAt: now, seo: {} },
      ]);

      const result = await service.getSitemapData();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        loc: '/',
        lastmod: now.toISOString(),
        changefreq: 'weekly',
        priority: 1.0,
      });
      expect(result[1].priority).toBe(0.8);
    });

    it('should exclude pages with noIndex', async () => {
      const now = new Date();
      mockPrisma.page.findMany.mockResolvedValue([
        { slug: '/', updatedAt: now, seo: null },
        { slug: '/hidden', updatedAt: now, seo: { noIndex: true } },
      ]);

      const result = await service.getSitemapData();

      expect(result).toHaveLength(1);
      expect(result[0].loc).toBe('/');
    });

    it('should return empty array when no published pages exist', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      const result = await service.getSitemapData();

      expect(result).toEqual([]);
    });

    it('should query with correct filters', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      await service.getSitemapData();

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: {
          status: 'published',
          isTemplate: false,
        },
        select: {
          slug: true,
          updatedAt: true,
          seo: true,
        },
        orderBy: { slug: 'asc' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // generateSitemapXml
  // -----------------------------------------------------------------------
  describe('generateSitemapXml', () => {
    it('should generate valid sitemap XML', async () => {
      const now = new Date();
      mockPrisma.page.findMany.mockResolvedValue([
        { slug: '/', updatedAt: now, seo: null },
        { slug: '/about', updatedAt: now, seo: {} },
      ]);

      const xml = await service.generateSitemapXml('https://example.com');

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(xml).toContain('<loc>https://example.com/</loc>');
      expect(xml).toContain('<loc>https://example.com/about</loc>');
      expect(xml).toContain('<priority>1</priority>');
      expect(xml).toContain('<priority>0.8</priority>');
    });

    it('should generate empty sitemap when no pages', async () => {
      mockPrisma.page.findMany.mockResolvedValue([]);

      const xml = await service.generateSitemapXml('https://example.com');

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset');
      expect(xml).not.toContain('<url>');
    });
  });

  // -----------------------------------------------------------------------
  // getRobotsTxt
  // -----------------------------------------------------------------------
  describe('getRobotsTxt', () => {
    it('should return default robots.txt content', () => {
      const result = service.getRobotsTxt();

      expect(result).toContain('User-agent: *');
      expect(result).toContain('Allow: /');
      expect(result).toContain('Disallow: /admin');
      expect(result).toContain('Disallow: /api');
      expect(result).toContain('{baseUrl}/sitemap.xml');
    });
  });

  // -----------------------------------------------------------------------
  // updateRobotsTxt
  // -----------------------------------------------------------------------
  describe('updateRobotsTxt', () => {
    it('should update robots.txt content', () => {
      const newContent = 'User-agent: *\nDisallow: /private\n';
      const result = service.updateRobotsTxt(newContent);

      expect(result.content).toBe(newContent);
      expect(result.updatedAt).toBeDefined();
      expect(new Date(result.updatedAt).getTime()).not.toBeNaN();
    });

    it('should persist updated content for subsequent reads', () => {
      const newContent = 'User-agent: Googlebot\nAllow: /\n';
      service.updateRobotsTxt(newContent);

      const result = service.getRobotsTxt();

      expect(result).toBe(newContent);
    });

    it('should handle empty content', () => {
      const result = service.updateRobotsTxt('');

      expect(result.content).toBe('');
    });
  });
});
