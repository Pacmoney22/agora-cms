import type { PageDto } from '@nextgen-cms/shared';

const CONTENT_API_BASE_URL =
  process.env.NEXT_PUBLIC_CONTENT_API_URL ?? 'http://localhost:3001';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface NavigationItem {
  id: string;
  label: string;
  url: string;
  children: NavigationItem[];
}

/**
 * Fetch public site settings (theme, SEO defaults, analytics config).
 */
export async function getPublicSettings(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${CONTENT_API_BASE_URL}/api/v1/settings/public`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch theme CSS custom properties.
 */
export async function getThemeCss(): Promise<string> {
  try {
    const res = await fetch(`${CONTENT_API_BASE_URL}/api/v1/settings/theme/css`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return '';
    return res.text();
  } catch {
    return '';
  }
}

/**
 * Fetch a single page by its slug.
 */
export async function getPage(slug: string): Promise<PageDto | null> {
  const res = await fetch(`${CONTENT_API_BASE_URL}/api/pages/slug/${slug}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch page: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch a paginated list of published pages.
 */
export async function getPages(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedResponse<PageDto>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);

  const res = await fetch(
    `${CONTENT_API_BASE_URL}/api/pages?${searchParams.toString()}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch pages: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch site navigation by menu identifier.
 */
export async function getNavigation(
  menuId: string = 'main'
): Promise<NavigationItem[]> {
  const res = await fetch(
    `${CONTENT_API_BASE_URL}/api/navigation/${menuId}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch navigation: ${res.statusText}`);
  }

  return res.json();
}
