import { getPublicSettings } from './content-client';

export type ContentType = 'blog' | 'product' | 'event' | 'course';

export interface ContentRouteConfig {
  basePath: string;
  listingPageId: string | null;
  detailPageId: string | null;
}

export interface ResolvedContentRoute {
  contentType: ContentType;
  mode: 'listing' | 'detail';
  pageId: string;
  basePath: string;
  itemSlug?: string;
}

/**
 * Given a URL path (e.g. "/blog" or "/blog/my-article"),
 * check content routing settings to determine what to render.
 *
 * Returns null if the path doesn't match any configured content route.
 */
export async function resolveContentRoute(
  path: string,
): Promise<ResolvedContentRoute | null> {
  const settings = await getPublicSettings();
  if (!settings?.contentRouting) return null;

  const routing = settings.contentRouting as Record<string, ContentRouteConfig>;

  // Normalize path: ensure leading slash, strip trailing slash
  const normalizedPath = '/' + path.replace(/^\/+|\/+$/g, '');

  for (const [contentType, config] of Object.entries(routing)) {
    if (!config.basePath) continue;

    const base = '/' + config.basePath.replace(/^\/+|\/+$/g, '');

    // Exact match → listing page
    if (normalizedPath === base) {
      if (!config.listingPageId) continue;
      return {
        contentType: contentType as ContentType,
        mode: 'listing',
        pageId: config.listingPageId,
        basePath: base,
      };
    }

    // Prefix match with a slug segment → detail page
    if (normalizedPath.startsWith(base + '/')) {
      const remainder = normalizedPath.slice(base.length + 1);
      // Only match single-segment slugs (no nested paths)
      if (remainder && !remainder.includes('/')) {
        if (!config.detailPageId) continue;
        return {
          contentType: contentType as ContentType,
          mode: 'detail',
          pageId: config.detailPageId,
          basePath: base,
          itemSlug: remainder,
        };
      }
    }
  }

  return null;
}
