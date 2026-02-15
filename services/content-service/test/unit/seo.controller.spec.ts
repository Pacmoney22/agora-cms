import { Test, TestingModule } from '@nestjs/testing';

import { SeoController } from '../../src/modules/seo/seo.controller';
import { SeoService } from '../../src/modules/seo/seo.service';
import { SeoAnalyzerService } from '../../src/modules/seo/seo-analyzer.service';
import { StructuredDataService } from '../../src/modules/seo/structured-data.service';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';

describe('SeoController', () => {
  let controller: SeoController;

  const mockSeoService = {
    getPageSeo: jest.fn(),
    updatePageSeo: jest.fn(),
    getSitemapData: jest.fn(),
    getRobotsTxt: jest.fn(),
    updateRobotsTxt: jest.fn(),
  };

  const mockSeoAnalyzerService = {
    analyze: jest.fn(),
  };

  const mockStructuredDataService = {
    generateForPage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeoController],
      providers: [
        { provide: SeoService, useValue: mockSeoService },
        { provide: SeoAnalyzerService, useValue: mockSeoAnalyzerService },
        { provide: StructuredDataService, useValue: mockStructuredDataService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SeoController>(SeoController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── getPageSeo ────────────────────────────────────────────────

  describe('getPageSeo', () => {
    it('should call seoService.getPageSeo with the pageId', async () => {
      const expected = { metaTitle: 'Test', metaDescription: 'Desc' };
      mockSeoService.getPageSeo.mockResolvedValue(expected);

      const result = await controller.getPageSeo('page-1');

      expect(mockSeoService.getPageSeo).toHaveBeenCalledWith('page-1');
      expect(result).toEqual(expected);
    });

    it('should propagate not-found errors', async () => {
      mockSeoService.getPageSeo.mockRejectedValue(new Error('not found'));

      await expect(controller.getPageSeo('bad-id')).rejects.toThrow('not found');
    });
  });

  // ── updatePageSeo ─────────────────────────────────────────────

  describe('updatePageSeo', () => {
    it('should call seoService.updatePageSeo with pageId and seo data', async () => {
      const seo = {
        metaTitle: 'Updated Title',
        metaDescription: 'Updated Description',
        ogImage: '/images/og.png',
        canonicalUrl: 'https://example.com/page',
        noIndex: false,
      };
      const expected = { pageId: 'page-1', ...seo };
      mockSeoService.updatePageSeo.mockResolvedValue(expected);

      const result = await controller.updatePageSeo('page-1', seo);

      expect(mockSeoService.updatePageSeo).toHaveBeenCalledWith('page-1', seo);
      expect(result).toEqual(expected);
    });

    it('should call with partial seo data', async () => {
      const seo = { metaTitle: 'Only Title' };
      mockSeoService.updatePageSeo.mockResolvedValue({});

      await controller.updatePageSeo('page-1', seo);

      expect(mockSeoService.updatePageSeo).toHaveBeenCalledWith('page-1', seo);
    });
  });

  // ── getSitemapData ────────────────────────────────────────────

  describe('getSitemapData', () => {
    it('should call seoService.getSitemapData', async () => {
      const expected = [{ url: '/page-1', lastMod: '2024-01-01' }];
      mockSeoService.getSitemapData.mockResolvedValue(expected);

      const result = await controller.getSitemapData();

      expect(mockSeoService.getSitemapData).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  // ── analyzePage ───────────────────────────────────────────────

  describe('analyzePage', () => {
    it('should call seoAnalyzerService.analyze with the pageId', async () => {
      const expected = { score: 85, checks: [] };
      mockSeoAnalyzerService.analyze.mockResolvedValue(expected);

      const result = await controller.analyzePage('page-1');

      expect(mockSeoAnalyzerService.analyze).toHaveBeenCalledWith('page-1');
      expect(result).toEqual(expected);
    });

    it('should propagate not-found errors', async () => {
      mockSeoAnalyzerService.analyze.mockRejectedValue(new Error('not found'));

      await expect(controller.analyzePage('bad-id')).rejects.toThrow('not found');
    });
  });

  // ── getStructuredData ─────────────────────────────────────────

  describe('getStructuredData', () => {
    it('should call structuredDataService.generateForPage with defaults', async () => {
      const expected = [{ '@type': 'WebPage' }];
      mockStructuredDataService.generateForPage.mockResolvedValue(expected);

      const result = await controller.getStructuredData('page-1');

      expect(mockStructuredDataService.generateForPage).toHaveBeenCalledWith(
        'page-1',
        { baseUrl: 'http://localhost:3000', organizationName: undefined },
      );
      expect(result).toEqual(expected);
    });

    it('should pass custom baseUrl and organizationName', async () => {
      mockStructuredDataService.generateForPage.mockResolvedValue([]);

      await controller.getStructuredData(
        'page-1',
        'https://example.com',
        'My Company',
      );

      expect(mockStructuredDataService.generateForPage).toHaveBeenCalledWith(
        'page-1',
        { baseUrl: 'https://example.com', organizationName: 'My Company' },
      );
    });
  });

  // ── getRobotsTxt ──────────────────────────────────────────────

  describe('getRobotsTxt', () => {
    it('should call seoService.getRobotsTxt and wrap in content object', async () => {
      const robotsContent = 'User-agent: *\nDisallow: /admin';
      mockSeoService.getRobotsTxt.mockReturnValue(robotsContent);

      const result = await controller.getRobotsTxt();

      expect(mockSeoService.getRobotsTxt).toHaveBeenCalled();
      expect(result).toEqual({ content: robotsContent });
    });
  });

  // ── updateRobotsTxt ───────────────────────────────────────────

  describe('updateRobotsTxt', () => {
    it('should call seoService.updateRobotsTxt with the content', async () => {
      const newContent = 'User-agent: *\nAllow: /';
      const expected = { content: newContent };
      mockSeoService.updateRobotsTxt.mockResolvedValue(expected);

      const result = await controller.updateRobotsTxt({ content: newContent });

      expect(mockSeoService.updateRobotsTxt).toHaveBeenCalledWith(newContent);
      expect(result).toEqual(expected);
    });

    it('should propagate errors', async () => {
      mockSeoService.updateRobotsTxt.mockRejectedValue(new Error('fail'));

      await expect(
        controller.updateRobotsTxt({ content: '' }),
      ).rejects.toThrow('fail');
    });
  });
});
