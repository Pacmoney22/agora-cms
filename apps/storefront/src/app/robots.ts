import type { MetadataRoute } from 'next';
import { getPublicSettings } from '@/lib/content-client';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicSettings();
  const siteUrl = settings?.general?.siteUrl || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/cart', '/checkout', '/checkout/success', '/learn/', '/dashboard/'],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'ClaudeBot', 'PerplexityBot', 'Bytespider', 'CCBot'],
        allow: ['/', '/products', '/courses'],
        disallow: ['/api/', '/cart', '/checkout', '/learn/', '/dashboard/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
