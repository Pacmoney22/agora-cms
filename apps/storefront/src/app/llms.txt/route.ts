import { NextResponse } from 'next/server';
import { getPublicSettings, getArticles } from '@/lib/content-client';
import { listProducts, listCourses } from '@/lib/api';

export async function GET() {
  const settings = await getPublicSettings();
  const siteUrl = settings?.general?.siteUrl || 'http://localhost:3000';
  const siteName = settings?.general?.siteName || 'Site';
  const description = settings?.seo?.defaultDescription || '';
  const contentRouting = settings?.contentRouting as
    | Record<string, { basePath: string }>
    | undefined;

  const blogBase = contentRouting?.blog?.basePath
    ? '/' + contentRouting.blog.basePath.replace(/^\/+|\/+$/g, '')
    : '/blog';

  const lines: string[] = [
    `# ${siteName}`,
    '',
    `> ${description}`,
    '',
    '## Main Pages',
    '',
    `- [Home](${siteUrl}/)`,
    `- [Products](${siteUrl}/products)`,
    `- [Courses](${siteUrl}/courses)`,
  ];

  if (contentRouting?.blog) {
    lines.push(`- [Blog](${siteUrl}${blogBase})`);
  }

  // Products
  try {
    const products = await listProducts({ limit: 50, status: 'active' });
    if (products.data.length > 0) {
      lines.push('', '## Products', '');
      for (const p of products.data) {
        const desc = p.shortDescription || p.description || '';
        const truncated = desc.length > 120 ? desc.slice(0, 120) + '...' : desc;
        lines.push(
          `- [${p.name}](${siteUrl}/products/${p.id}): ${truncated}`,
        );
      }
    }
  } catch {
    /* skip */
  }

  // Courses
  try {
    const courses = await listCourses({ limit: 50 });
    if (courses.data.length > 0) {
      lines.push('', '## Courses', '');
      for (const c of courses.data as any[]) {
        const meta = c.courseMetadata || {};
        const difficulty = meta.difficulty ? ` [${meta.difficulty}]` : '';
        const desc = c.description || '';
        const truncated = desc.length > 120 ? desc.slice(0, 120) + '...' : desc;
        lines.push(
          `- [${c.title}](${siteUrl}/courses/${c.slug}):${difficulty} ${truncated}`,
        );
      }
    }
  } catch {
    /* skip */
  }

  // Articles
  try {
    const articles = await getArticles({
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    if (articles?.data && articles.data.length > 0) {
      lines.push('', '## Articles', '');
      for (const a of articles.data as any[]) {
        const desc = a.excerpt || a.summary || '';
        const truncated = desc.length > 120 ? desc.slice(0, 120) + '...' : desc;
        lines.push(
          `- [${a.title}](${siteUrl}${blogBase}/${a.slug}): ${truncated}`,
        );
      }
    }
  } catch {
    /* skip */
  }

  lines.push('', '## Feeds', '');
  lines.push(`- [Sitemap](${siteUrl}/sitemap.xml)`);
  lines.push(`- [RSS Feed](${siteUrl}/feed.xml)`);

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
