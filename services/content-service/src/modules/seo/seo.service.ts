import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Sitemap: {baseUrl}/sitemap.xml`;

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  /** In-memory store for robots.txt content; overridable via updateRobotsTxt(). */
  private robotsTxtContent: string = DEFAULT_ROBOTS_TXT;

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async getPageSeo(pageId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { id: true, slug: true, title: true, seo: true },
    });

    if (!page) {
      throw new NotFoundException(`Page with id "${pageId}" not found`);
    }

    return {
      pageId: page.id,
      slug: page.slug,
      title: page.title,
      seo: page.seo,
    };
  }

  async updatePageSeo(
    pageId: string,
    seo: {
      metaTitle?: string;
      metaDescription?: string;
      ogImage?: string;
      canonicalUrl?: string;
      noIndex?: boolean;
    },
  ) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundException(`Page with id "${pageId}" not found`);
    }

    const updatedPage = await this.prisma.page.update({
      where: { id: pageId },
      data: { seo: seo as any },
      select: { id: true, slug: true, title: true, seo: true },
    });

    this.logger.log(`SEO updated for page ${pageId}`);
    return {
      pageId: updatedPage.id,
      slug: updatedPage.slug,
      title: updatedPage.title,
      seo: updatedPage.seo,
    };
  }

  async getSitemapData() {
    const pages = await this.prisma.page.findMany({
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

    return pages
      .filter((p: { slug: string; updatedAt: Date; seo: unknown }) => {
        const seo = p.seo as any;
        return !seo?.noIndex;
      })
      .map((p: { slug: string; updatedAt: Date; seo: unknown }) => ({
        loc: p.slug,
        lastmod: p.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: p.slug === '/' ? 1.0 : 0.8,
      }));
  }

  async generateSitemapXml(baseUrl: string) {
    const entries = await this.getSitemapData();

    const urls = entries
      .map(
        (e: { loc: string; lastmod: string; changefreq: string; priority: number }) =>
          `  <url>\n    <loc>${baseUrl}${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  }

  // -------------------------------------------------------------------------
  // Robots.txt
  // -------------------------------------------------------------------------

  /**
   * Returns the current robots.txt content.
   * The placeholder `{baseUrl}` is left for the consumer to replace at render time.
   */
  getRobotsTxt(): string {
    return this.robotsTxtContent;
  }

  /**
   * Update the in-memory robots.txt content.
   */
  updateRobotsTxt(content: string): { content: string; updatedAt: string } {
    this.robotsTxtContent = content;
    this.logger.log('robots.txt content updated');
    return {
      content: this.robotsTxtContent,
      updatedAt: new Date().toISOString(),
    };
  }
}
