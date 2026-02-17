import type { ContentType } from './content-routing';
import { getArticles } from './content-client';
import { listProducts, listCourses } from './api';

/**
 * Fetch data for a grid component based on content type and grid props.
 * Returns an array of items to pass as the grid's data prop.
 */
export async function resolveGridData(
  contentType: ContentType,
  gridProps: Record<string, unknown>,
): Promise<unknown[]> {
  switch (contentType) {
    case 'blog':
      return resolveBlogGridData(gridProps);
    case 'product':
      return resolveProductGridData(gridProps);
    case 'course':
      return resolveCourseGridData(gridProps);
    case 'event':
      return resolveEventGridData(gridProps);
    default:
      return [];
  }
}

async function resolveBlogGridData(
  props: Record<string, unknown>,
): Promise<unknown[]> {
  const sortBy = (props.sortBy as string) || 'newest';
  const maxPosts = (props.maxPosts as number) || 20;

  const sortMap: Record<string, { sortBy: string; sortOrder: string }> = {
    newest: { sortBy: 'createdAt', sortOrder: 'desc' },
    oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
    title: { sortBy: 'title', sortOrder: 'asc' },
  };
  const defaultSort = { sortBy: 'createdAt', sortOrder: 'desc' };
  const sort = sortMap[sortBy] ?? defaultSort;

  const result = await getArticles({
    limit: maxPosts,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
  });

  return result?.data ?? [];
}

async function resolveProductGridData(
  props: Record<string, unknown>,
): Promise<unknown[]> {
  const maxProducts = (props.maxProducts as number) || 24;
  const source = (props.source as string) || 'new-arrivals';

  const params: Record<string, unknown> = {
    limit: maxProducts,
    status: 'active',
  };

  if (source === 'category' && props.categoryId) {
    params.category = props.categoryId as string;
  }

  try {
    const result = await listProducts(params as Parameters<typeof listProducts>[0]);
    return result?.data ?? [];
  } catch {
    return [];
  }
}

async function resolveCourseGridData(
  props: Record<string, unknown>,
): Promise<unknown[]> {
  const maxCourses = (props.maxCourses as number) || 12;

  try {
    const result = await listCourses({ limit: maxCourses });
    return result?.data ?? [];
  } catch {
    return [];
  }
}

async function resolveEventGridData(
  _props: Record<string, unknown>,
): Promise<unknown[]> {
  // Events API not yet implemented — return empty for now.
  // When the events API is available, fetch from it here.
  return [];
}
