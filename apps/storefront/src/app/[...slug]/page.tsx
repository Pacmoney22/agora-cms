import { notFound } from 'next/navigation';
import { getPage, getPageById, getPublicSettings } from '@/lib/content-client';
import { resolveContentRoute } from '@/lib/content-routing';
import { resolveGridData } from '@/lib/grid-data-resolver';
import { resolveDetailData } from '@/lib/detail-data-resolver';
import { ComponentRenderer, type DataContext } from '@/components/renderers/component-renderer';
import type { ComponentInstance, ComponentTree } from '@agora-cms/shared';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

/**
 * Extract the root ComponentInstance from a page's componentTree.
 */
function getRootInstance(tree: ComponentTree | null | undefined): ComponentInstance | null {
  if (!tree) return null;
  return tree.root ?? null;
}

/**
 * Catch-all route for the storefront.
 *
 * 1. Joins the slug segments into a path (e.g. ["blog", "my-post"] → "/blog/my-post")
 * 2. Checks content routing settings to see if the path matches a content type
 * 3. If listing: loads the CMS listing page and fetches grid data
 * 4. If detail:  loads the CMS detail page and fetches single-item data
 * 5. If no content route matches: falls back to standard CMS page lookup by slug
 */
export default async function CatchAllPage({ params }: PageProps) {
  const { slug } = await params;
  const path = '/' + slug.join('/');

  // Fetch site settings for component rendering (e.g. blog social sharing limits)
  const siteSettings = await getPublicSettings() ?? undefined;

  // --- Try content routing first ---
  const contentRoute = await resolveContentRoute(path);

  if (contentRoute) {
    const page = await getPageById(contentRoute.pageId);
    if (!page) {
      notFound();
    }

    const rootInstance = getRootInstance(page.componentTree);
    if (!rootInstance) {
      notFound();
    }

    // Build data context for the component renderer
    const dataContext: DataContext = {
      contentType: contentRoute.contentType,
      mode: contentRoute.mode,
      basePath: contentRoute.basePath,
      siteSettings: siteSettings ?? undefined,
    };

    if (contentRoute.mode === 'listing') {
      // Fetch grid data for all grid components on this page
      const gridComponents = findComponentsByType(rootInstance, [
        'blog-grid',
        'product-grid',
        'featured-products',
        'course-grid',
        'event-grid',
      ]);

      const firstGrid = gridComponents[0];
      if (firstGrid) {
        const gridProps = firstGrid.props;
        const items = await resolveGridData(contentRoute.contentType, gridProps);
        dataContext.items = items;
      }
    } else if (contentRoute.mode === 'detail' && contentRoute.itemSlug) {
      const item = await resolveDetailData(
        contentRoute.contentType,
        contentRoute.itemSlug,
      );
      if (!item) {
        notFound();
      }
      dataContext.item = item;
    }

    return (
      <div className="content-routed-page">
        <ComponentRenderer instance={rootInstance} dataContext={dataContext} />
      </div>
    );
  }

  // --- Fallback: standard CMS page by slug ---
  const cmsPage = await getPage(path);
  if (!cmsPage) {
    notFound();
  }

  const rootInstance = getRootInstance(cmsPage.componentTree);
  if (!rootInstance) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-500">This page has no content yet.</div>;
  }

  return (
    <div className="cms-page">
      <ComponentRenderer instance={rootInstance} dataContext={{ siteSettings: siteSettings ?? undefined }} />
    </div>
  );
}

/**
 * Recursively find all component instances matching any of the given componentIds.
 */
function findComponentsByType(
  instance: ComponentInstance,
  componentIds: string[],
): ComponentInstance[] {
  const results: ComponentInstance[] = [];

  if (componentIds.includes(instance.componentId)) {
    results.push(instance);
  }

  if (instance.children) {
    for (const child of instance.children) {
      results.push(...findComponentsByType(child, componentIds));
    }
  }

  return results;
}
