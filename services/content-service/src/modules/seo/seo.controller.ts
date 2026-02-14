import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { SeoService } from './seo.service';
import { SeoAnalyzerService } from './seo-analyzer.service';
import { StructuredDataService } from './structured-data.service';

@ApiTags('seo')
@ApiBearerAuth()
@Controller('api/v1/seo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeoController {
  constructor(
    private readonly seoService: SeoService,
    private readonly seoAnalyzerService: SeoAnalyzerService,
    private readonly structuredDataService: StructuredDataService,
  ) {}

  // -----------------------------------------------------------------------
  // Existing endpoints
  // -----------------------------------------------------------------------

  @Get('page/:pageId')
  @ApiOperation({ summary: 'Get SEO configuration for a page' })
  @ApiParam({ name: 'pageId', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'SEO configuration for the page' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getPageSeo(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.seoService.getPageSeo(pageId);
  }

  @Put('page/:pageId')
  @Roles('editor', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update SEO configuration for a page' })
  @ApiParam({ name: 'pageId', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'SEO configuration updated' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async updatePageSeo(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Body() seo: {
      metaTitle?: string;
      metaDescription?: string;
      ogImage?: string;
      canonicalUrl?: string;
      noIndex?: boolean;
    },
  ) {
    return this.seoService.updatePageSeo(pageId, seo);
  }

  @Get('sitemap')
  @ApiOperation({ summary: 'Generate sitemap data for all published pages' })
  @ApiResponse({ status: 200, description: 'Sitemap data' })
  async getSitemapData() {
    return this.seoService.getSitemapData();
  }

  // -----------------------------------------------------------------------
  // SEO Analyzer
  // -----------------------------------------------------------------------

  @Get('analyze/:pageId')
  @ApiOperation({
    summary: 'Run on-page SEO analysis for a page',
    description:
      'Performs 12 SEO checks and returns a composite score (0-100) with detailed results and actionable suggestions.',
  })
  @ApiParam({ name: 'pageId', type: String, description: 'Page UUID' })
  @ApiResponse({ status: 200, description: 'SEO analysis result with score and checks' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async analyzePage(@Param('pageId', ParseUUIDPipe) pageId: string) {
    return this.seoAnalyzerService.analyze(pageId);
  }

  // -----------------------------------------------------------------------
  // Structured Data (JSON-LD)
  // -----------------------------------------------------------------------

  @Get('structured-data/:pageId')
  @ApiOperation({
    summary: 'Generate JSON-LD structured data for a page',
    description:
      'Returns schema.org JSON-LD markup (WebPage or Article) plus BreadcrumbList based on page content.',
  })
  @ApiParam({ name: 'pageId', type: String, description: 'Page UUID' })
  @ApiQuery({
    name: 'baseUrl',
    required: false,
    description: 'Base URL for the site (defaults to http://localhost:3000)',
  })
  @ApiQuery({
    name: 'organizationName',
    required: false,
    description: 'Organization name for publisher/org schema',
  })
  @ApiResponse({ status: 200, description: 'Array of JSON-LD structured data objects' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getStructuredData(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Query('baseUrl') baseUrl?: string,
    @Query('organizationName') organizationName?: string,
  ) {
    return this.structuredDataService.generateForPage(pageId, {
      baseUrl: baseUrl ?? 'http://localhost:3000',
      organizationName,
    });
  }

  // -----------------------------------------------------------------------
  // Robots.txt
  // -----------------------------------------------------------------------

  @Get('robots.txt')
  @ApiOperation({ summary: 'Get the current robots.txt content' })
  @ApiResponse({ status: 200, description: 'robots.txt content' })
  async getRobotsTxt() {
    return { content: this.seoService.getRobotsTxt() };
  }

  @Put('robots.txt')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update robots.txt content' })
  @ApiResponse({ status: 200, description: 'robots.txt updated' })
  async updateRobotsTxt(@Body() body: { content: string }) {
    return this.seoService.updateRobotsTxt(body.content);
  }
}
