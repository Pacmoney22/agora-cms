import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StructuredDataOptions {
  baseUrl: string;
  organizationName?: string;
}

export interface JsonLdBase {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

interface ComponentNode {
  instanceId?: string;
  componentId?: string;
  props?: Record<string, unknown>;
  children?: ComponentNode[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively extract all text from component tree. */
function extractAllText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as ComponentNode;
  const parts: string[] = [];

  const textProps = [
    'text',
    'headline',
    'subheadline',
    'content',
    'description',
    'title',
    'body',
    'caption',
    'paragraph',
  ];

  if (n.props) {
    for (const key of textProps) {
      const val = n.props[key];
      if (typeof val === 'string' && val.trim().length > 0) {
        parts.push(val.trim());
      }
    }
  }

  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      parts.push(extractAllText(child));
    }
  }

  return parts.filter(Boolean).join(' ');
}

/** Collect all component IDs to determine page type. */
function collectComponentIds(node: unknown): string[] {
  const ids: string[] = [];

  function walk(n: unknown) {
    if (!n || typeof n !== 'object') return;
    const comp = n as ComponentNode;
    if (comp.componentId) {
      ids.push(comp.componentId.toLowerCase());
    }
    if (Array.isArray(comp.children)) {
      for (const child of comp.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return ids;
}

/** Count text-heavy component types. */
function countTextComponents(ids: string[]): number {
  const textPatterns = [
    'text',
    'paragraph',
    'rich-text',
    'richtext',
    'heading',
    'blockquote',
    'markdown',
    'article',
    'content',
    'prose',
  ];

  return ids.filter((id) =>
    textPatterns.some((pattern) => id.includes(pattern)),
  ).length;
}

/** Find the first image URL in the component tree. */
function findFirstImage(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null;
  const comp = node as ComponentNode;

  if (comp.props) {
    const imageProps = ['src', 'image', 'imageUrl', 'backgroundImage', 'thumbnail'];
    for (const key of imageProps) {
      const val = comp.props[key];
      if (
        typeof val === 'string' &&
        /\.(jpe?g|png|gif|svg|webp|avif)/i.test(val)
      ) {
        return val;
      }
    }
  }

  if (Array.isArray(comp.children)) {
    for (const child of comp.children) {
      const found = findFirstImage(child);
      if (found) return found;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class StructuredDataService {
  private readonly logger = new Logger(StructuredDataService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  /**
   * Generate JSON-LD structured data for a page.
   * Automatically detects page type (WebPage vs Article) and generates
   * appropriate schema.org markup.
   */
  async generateForPage(
    pageId: string,
    options: StructuredDataOptions,
  ): Promise<JsonLdBase[]> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      include: { author: { select: { name: true, email: true } } },
    });

    if (!page) {
      throw new NotFoundException(`Page with id "${pageId}" not found`);
    }

    const seo = (page.seo ?? {}) as Record<string, unknown>;
    const tree = page.componentTree as unknown;
    const results: JsonLdBase[] = [];

    // Determine page type
    const componentIds = collectComponentIds(tree);
    const textCount = countTextComponents(componentIds);
    const totalComponents = componentIds.length;
    const isArticle =
      totalComponents > 0 && textCount / totalComponents > 0.5;

    if (isArticle) {
      results.push(
        this.buildArticleSchema(page, seo, tree, options),
      );
    } else {
      results.push(
        this.buildWebPageSchema(page, seo, tree, options),
      );
    }

    // Always include breadcrumb
    results.push(this.generateBreadcrumb(page.slug, options));

    this.logger.log(
      `Generated structured data for page ${pageId} (type: ${isArticle ? 'Article' : 'WebPage'})`,
    );

    return results;
  }

  /**
   * Generate BreadcrumbList schema from a page slug.
   */
  generateBreadcrumb(
    pageSlug: string,
    options: StructuredDataOptions,
  ): JsonLdBase {
    const { baseUrl } = options;
    const segments = pageSlug
      .split('/')
      .filter((s) => s.length > 0);

    const items: Array<{
      '@type': string;
      position: number;
      name: string;
      item: string;
    }> = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
    ];

    let pathAccumulator = '';
    segments.forEach((segment, index) => {
      pathAccumulator += `/${segment}`;
      items.push({
        '@type': 'ListItem',
        position: index + 2,
        name: this.slugToTitle(segment),
        item: `${baseUrl}${pathAccumulator}`,
      });
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    };
  }

  /**
   * Generate Organization schema.
   */
  generateOrganization(options: StructuredDataOptions): JsonLdBase {
    const { baseUrl, organizationName } = options;

    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: organizationName ?? 'Organization',
      url: baseUrl,
      ...(organizationName
        ? {
            logo: `${baseUrl}/logo.png`,
            sameAs: [],
          }
        : {}),
    };
  }

  // -----------------------------------------------------------------------
  // Private builders
  // -----------------------------------------------------------------------

  private buildWebPageSchema(
    page: {
      id: string;
      title: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
      author: { name: string; email: string };
    },
    seo: Record<string, unknown>,
    tree: unknown,
    options: StructuredDataOptions,
  ): JsonLdBase {
    const { baseUrl } = options;
    const description =
      typeof seo['metaDescription'] === 'string'
        ? seo['metaDescription']
        : this.truncateText(extractAllText(tree), 160);

    const image = findFirstImage(tree);
    const ogImage =
      typeof seo['ogImage'] === 'string' ? seo['ogImage'] : image;

    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name:
        typeof seo['metaTitle'] === 'string'
          ? seo['metaTitle']
          : page.title,
      description,
      url: `${baseUrl}${page.slug}`,
      datePublished: page.createdAt.toISOString(),
      dateModified: page.updatedAt.toISOString(),
      ...(ogImage ? { image: ogImage } : {}),
      isPartOf: {
        '@type': 'WebSite',
        url: baseUrl,
        name: options.organizationName ?? 'Website',
      },
    };
  }

  private buildArticleSchema(
    page: {
      id: string;
      title: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
      author: { name: string; email: string };
    },
    seo: Record<string, unknown>,
    tree: unknown,
    options: StructuredDataOptions,
  ): JsonLdBase {
    const { baseUrl } = options;
    const fullText = extractAllText(tree);
    const description =
      typeof seo['metaDescription'] === 'string'
        ? seo['metaDescription']
        : this.truncateText(fullText, 160);

    const wordCount = fullText.split(/\s+/).filter((w) => w.length > 0).length;
    const image = findFirstImage(tree);
    const ogImage =
      typeof seo['ogImage'] === 'string' ? seo['ogImage'] : image;

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline:
        typeof seo['metaTitle'] === 'string'
          ? seo['metaTitle']
          : page.title,
      description,
      url: `${baseUrl}${page.slug}`,
      datePublished: page.createdAt.toISOString(),
      dateModified: page.updatedAt.toISOString(),
      wordCount,
      author: {
        '@type': 'Person',
        name: page.author.name,
      },
      publisher: {
        '@type': 'Organization',
        name: options.organizationName ?? 'Organization',
        url: baseUrl,
      },
      ...(ogImage ? { image: ogImage } : {}),
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${baseUrl}${page.slug}`,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  /** Convert a slug segment to a human-readable title. */
  private slugToTitle(slug: string): string {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Truncate text to a given length, breaking at word boundary. */
  private truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    const truncated = text.slice(0, maxLen);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
  }
}
