import type { ContentType } from './content-routing';
import { getArticleBySlug } from './content-client';
import { getCourseBySlug } from './api';

const COMMERCE_API =
  process.env.NEXT_PUBLIC_COMMERCE_API_URL || 'http://localhost:3002';

/**
 * Fetch a single item by slug for a detail/card page.
 * Returns the item data or null if not found.
 */
export async function resolveDetailData(
  contentType: ContentType,
  slug: string,
): Promise<Record<string, unknown> | null> {
  switch (contentType) {
    case 'blog':
      return resolveArticleDetail(slug);
    case 'product':
      return resolveProductDetail(slug);
    case 'course':
      return resolveCourseDetail(slug);
    case 'event':
      return resolveEventDetail(slug);
    default:
      return null;
  }
}

async function resolveArticleDetail(
  slug: string,
): Promise<Record<string, unknown> | null> {
  return getArticleBySlug(slug);
}

async function resolveProductDetail(
  slug: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${COMMERCE_API}/api/v1/products/slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function resolveCourseDetail(
  slug: string,
): Promise<Record<string, unknown> | null> {
  try {
    const course = await getCourseBySlug(slug);
    return course as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function resolveEventDetail(
  _slug: string,
): Promise<Record<string, unknown> | null> {
  // Events API not yet implemented — return null for now.
  return null;
}
