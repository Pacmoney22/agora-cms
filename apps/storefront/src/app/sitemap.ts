import type { MetadataRoute } from 'next';
import { getPublicSettings, getPages, getArticles } from '@/lib/content-client';
import { listProducts, listCourses } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getPublicSettings();
  const siteUrl = settings?.general?.siteUrl || 'http://localhost:3000';
  const contentRouting = settings?.contentRouting as
    | Record<string, { basePath: string }>
    | undefined;

  const entries: MetadataRoute.Sitemap = [];

  // Home page
  entries.push({
    url: siteUrl,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // Static listing pages
  for (const path of ['/products', '/courses']) {
    entries.push({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }

  // CMS pages
  try {
    const pagesResult = await getPages({ limit: 500, status: 'published' });
    for (const page of pagesResult.data) {
      const seo = (page.seo as unknown as Record<string, unknown>) || {};
      if (seo.noIndex) continue;
      entries.push({
        url: `${siteUrl}${page.slug}`,
        lastModified: new Date(page.updatedAt),
        changeFrequency: 'weekly',
        priority: page.slug === '/' ? 1.0 : 0.7,
      });
    }
  } catch {
    /* CMS pages unavailable */
  }

  // Articles
  const blogBase = contentRouting?.blog?.basePath
    ? '/' + contentRouting.blog.basePath.replace(/^\/+|\/+$/g, '')
    : '/blog';
  try {
    const articles = await getArticles({ limit: 500 });
    if (articles?.data) {
      for (const article of articles.data as any[]) {
        entries.push({
          url: `${siteUrl}${blogBase}/${article.slug}`,
          lastModified: new Date(article.updatedAt || article.createdAt),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch {
    /* Articles unavailable */
  }

  // Products
  try {
    const products = await listProducts({ limit: 500, status: 'active' });
    for (const product of products.data) {
      entries.push({
        url: `${siteUrl}/products/${product.id}`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    /* Products unavailable */
  }

  // Courses
  try {
    const courses = await listCourses({ limit: 500 });
    for (const course of courses.data) {
      entries.push({
        url: `${siteUrl}/courses/${(course as any).slug}`,
        lastModified: new Date((course as any).updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    /* Courses unavailable */
  }

  // Events
  const eventBase = contentRouting?.event?.basePath
    ? '/' + contentRouting.event.basePath.replace(/^\/+|\/+$/g, '')
    : '/events';
  try {
    const CONTENT_API =
      process.env.NEXT_PUBLIC_CONTENT_API_URL ?? 'http://localhost:3001';
    const res = await fetch(
      `${CONTENT_API}/api/v1/events?status=published&limit=500`,
      { next: { revalidate: 300 } },
    );
    if (res.ok) {
      const eventsData = await res.json();
      const events = eventsData.data || eventsData;
      for (const event of events) {
        if (event.slug) {
          entries.push({
            url: `${siteUrl}${eventBase}/${event.slug}`,
            lastModified: new Date(event.updatedAt || event.createdAt),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }
    }
  } catch {
    /* Events unavailable */
  }

  return entries;
}
