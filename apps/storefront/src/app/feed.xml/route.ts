import { NextResponse } from 'next/server';
import { getPublicSettings, getArticles } from '@/lib/content-client';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const settings = await getPublicSettings();
  const siteUrl = settings?.general?.siteUrl || 'http://localhost:3000';
  const siteName = settings?.general?.siteName || 'Site';
  const description = settings?.seo?.defaultDescription || '';
  const language = settings?.general?.language || 'en';
  const contentRouting = settings?.contentRouting as
    | Record<string, { basePath: string }>
    | undefined;

  const blogBase = contentRouting?.blog?.basePath
    ? '/' + contentRouting.blog.basePath.replace(/^\/+|\/+$/g, '')
    : '/blog';

  let items = '';
  try {
    const articles = await getArticles({
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    if (articles?.data) {
      for (const article of articles.data as any[]) {
        const pubDate = new Date(
          article.publishedAt || article.createdAt,
        ).toUTCString();
        const articleUrl = `${siteUrl}${blogBase}/${escapeXml(article.slug)}`;
        const title = escapeXml(article.title);
        const desc = escapeXml(
          article.excerpt || article.summary || article.title,
        );

        items += `
    <item>
      <title>${title}</title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>${article.author?.name ? `\n      <author>${escapeXml(article.author.name)}</author>` : ''}${article.category ? `\n      <category>${escapeXml(article.category)}</category>` : ''}
    </item>`;
      }
    }
  } catch {
    /* Articles unavailable */
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>${language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
