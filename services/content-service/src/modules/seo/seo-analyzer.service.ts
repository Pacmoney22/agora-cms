import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeoCheckResult {
  check: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  score: number; // 0 – maxScore
  maxScore: number;
}

export interface SeoAnalysisResult {
  pageId: string;
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: SeoCheckResult[];
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// Helpers – component-tree walking
// ---------------------------------------------------------------------------

interface ComponentNode {
  instanceId?: string;
  componentId?: string;
  props?: Record<string, unknown>;
  children?: ComponentNode[];
}

/** Recursively collect plain text from well-known content props. */
function extractText(node: unknown): string {
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
    'label',
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
      parts.push(extractText(child));
    }
  }

  return parts.filter(Boolean).join(' ');
}

/** Count the total number of component nodes in the tree. */
function countComponents(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  const n = node as ComponentNode;
  let count = 1;
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      count += countComponents(child);
    }
  }
  return count;
}

/** Collect all component IDs (lowercased) from the tree. */
function collectComponentIds(node: unknown, ids: string[] = []): string[] {
  if (!node || typeof node !== 'object') return ids;
  const n = node as ComponentNode;
  if (n.componentId) {
    ids.push(n.componentId.toLowerCase());
  }
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      collectComponentIds(child, ids);
    }
  }
  return ids;
}

/** Collect image-related nodes and check whether they have alt text. */
function collectImageInfo(node: unknown): { total: number; withAlt: number } {
  const result = { total: 0, withAlt: 0 };

  function walk(n: unknown) {
    if (!n || typeof n !== 'object') return;
    const comp = n as ComponentNode;

    const isImage =
      (comp.componentId && comp.componentId.toLowerCase().includes('image')) ||
      (comp.props &&
        Object.values(comp.props).some(
          (v) => typeof v === 'string' && /\.(jpe?g|png|gif|svg|webp|avif)(\?|$)/i.test(v),
        ));

    if (isImage) {
      result.total++;
      if (
        comp.props &&
        typeof comp.props['alt'] === 'string' &&
        comp.props['alt'].trim().length > 0
      ) {
        result.withAlt++;
      } else if (
        comp.props &&
        typeof comp.props['altText'] === 'string' &&
        comp.props['altText'].trim().length > 0
      ) {
        result.withAlt++;
      }
    }

    if (Array.isArray(comp.children)) {
      for (const child of comp.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return result;
}

/** Detect headings in component tree and return them as { level, text }[]. */
function collectHeadings(
  node: unknown,
): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];

  function walk(n: unknown) {
    if (!n || typeof n !== 'object') return;
    const comp = n as ComponentNode;

    if (comp.componentId) {
      const id = comp.componentId.toLowerCase();
      // Match patterns like "heading", "h1", "h2", etc.
      const headingMatch = /^h(\d)$/.exec(id) || /heading-?(\d)?/i.exec(id);
      if (headingMatch) {
        const level = headingMatch[1] ? parseInt(headingMatch[1], 10) : 1;
        const text =
          (comp.props &&
            (typeof comp.props['text'] === 'string'
              ? comp.props['text']
              : typeof comp.props['headline'] === 'string'
                ? comp.props['headline']
                : typeof comp.props['content'] === 'string'
                  ? comp.props['content']
                  : '')) ||
          '';
        headings.push({ level, text });
      }
    }

    // Also check props.level / props.headingLevel for generic heading components
    if (comp.props) {
      const lvl = comp.props['level'] ?? comp.props['headingLevel'];
      if (typeof lvl === 'number' && lvl >= 1 && lvl <= 6) {
        const text =
          typeof comp.props['text'] === 'string'
            ? comp.props['text']
            : typeof comp.props['headline'] === 'string'
              ? comp.props['headline']
              : '';
        if (!headings.some((h) => h.level === lvl && h.text === text)) {
          headings.push({ level: lvl, text });
        }
      }
    }

    if (Array.isArray(comp.children)) {
      for (const child of comp.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return headings;
}

/** Check if component tree has responsive/mobile-aware components. */
function hasResponsiveComponents(node: unknown): boolean {
  function walk(n: unknown): boolean {
    if (!n || typeof n !== 'object') return false;
    const comp = n as ComponentNode;
    const id = (comp.componentId ?? '').toLowerCase();

    // Components whose names suggest responsive awareness
    if (
      id.includes('responsive') ||
      id.includes('grid') ||
      id.includes('flex') ||
      id.includes('container') ||
      id.includes('stack') ||
      id.includes('carousel') ||
      id.includes('adaptive')
    ) {
      return true;
    }

    // Props that suggest responsive behaviour
    if (comp.props) {
      const propKeys = Object.keys(comp.props).map((k) => k.toLowerCase());
      if (
        propKeys.some(
          (k) =>
            k.includes('responsive') ||
            k.includes('mobile') ||
            k.includes('breakpoint') ||
            k.includes('columns') ||
            k.includes('gridtemplate'),
        )
      ) {
        return true;
      }
    }

    if (Array.isArray(comp.children)) {
      for (const child of comp.children) {
        if (walk(child)) return true;
      }
    }
    return false;
  }

  return walk(node);
}

/** Check if image references have webp variants (by naming convention). */
function hasWebpVariants(node: unknown): boolean {
  function walk(n: unknown): boolean {
    if (!n || typeof n !== 'object') return false;
    const comp = n as ComponentNode;

    if (comp.props) {
      const values = Object.values(comp.props);
      for (const v of values) {
        if (typeof v === 'string' && /\.webp(\?|$)/i.test(v)) {
          return true;
        }
        // Check variant objects like { webp: "..." }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const vObj = v as Record<string, unknown>;
          if (typeof vObj['webp'] === 'string') return true;
        }
      }
    }

    if (Array.isArray(comp.children)) {
      for (const child of comp.children) {
        if (walk(child)) return true;
      }
    }
    return false;
  }

  return walk(node);
}

/** Detect internal links in component tree. */
function countInternalLinks(node: unknown): number {
  let count = 0;

  function walk(n: unknown) {
    if (!n || typeof n !== 'object') return;
    const comp = n as ComponentNode;

    if (comp.props) {
      const linkProps = ['href', 'to', 'url', 'link', 'linkUrl'];
      for (const key of linkProps) {
        const val = comp.props[key];
        if (typeof val === 'string') {
          // Internal if starts with "/" or doesn't start with "http"
          if (val.startsWith('/') || (!val.startsWith('http') && !val.startsWith('mailto:'))) {
            count++;
          }
        }
      }
    }

    if (Array.isArray(comp.children)) {
      for (const child of comp.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return count;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class SeoAnalyzerService {
  private readonly logger = new Logger(SeoAnalyzerService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async analyze(pageId: string): Promise<SeoAnalysisResult> {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundException(`Page with id "${pageId}" not found`);
    }

    const seo = (page.seo ?? {}) as Record<string, unknown>;
    const tree = page.componentTree as unknown;
    const checks: SeoCheckResult[] = [];

    // 1. Title tag
    checks.push(this.checkTitle(seo, page.title));

    // 2. Meta description
    checks.push(this.checkMetaDescription(seo));

    // 3. Heading structure
    checks.push(this.checkHeadingStructure(tree));

    // 4. Content length
    checks.push(this.checkContentLength(tree));

    // 5. Image alt text
    checks.push(this.checkImageAltText(tree));

    // 6. URL slug
    checks.push(this.checkUrlSlug(page.slug));

    // 7. Internal links
    checks.push(this.checkInternalLinks(tree));

    // 8. Canonical URL
    checks.push(this.checkCanonicalUrl(seo));

    // 9. Open Graph
    checks.push(this.checkOpenGraph(seo));

    // 10. noIndex check
    checks.push(this.checkNoIndex(seo, page.status));

    // 11. Mobile content
    checks.push(this.checkMobileContent(tree));

    // 12. Page speed hints
    checks.push(this.checkPageSpeedHints(tree));

    // Calculate overall score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const totalMaxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);
    const overallScore =
      totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const grade = this.determineGrade(overallScore);

    // Collect suggestions from failed/warning checks
    const suggestions = checks
      .filter((c) => c.status === 'fail' || c.status === 'warning')
      .map((c) => c.message);

    this.logger.log(
      `SEO analysis for page ${pageId}: score=${overallScore}, grade=${grade}`,
    );

    return {
      pageId,
      overallScore,
      grade,
      checks,
      suggestions,
    };
  }

  // -----------------------------------------------------------------------
  // Individual checks
  // -----------------------------------------------------------------------

  private checkTitle(
    seo: Record<string, unknown>,
    pageTitle: string,
  ): SeoCheckResult {
    const maxScore = 10;
    const title =
      typeof seo['metaTitle'] === 'string'
        ? seo['metaTitle']
        : pageTitle;

    if (!title || title.trim().length === 0) {
      return {
        check: 'Title Tag',
        status: 'fail',
        message: 'Page is missing a title tag. Add a meta title between 30-70 characters.',
        score: 0,
        maxScore,
      };
    }

    const len = title.trim().length;

    if (len >= 30 && len <= 70) {
      return {
        check: 'Title Tag',
        status: 'pass',
        message: `Title tag is ${len} characters (optimal range: 30-70).`,
        score: maxScore,
        maxScore,
      };
    }

    if (len < 30) {
      return {
        check: 'Title Tag',
        status: 'warning',
        message: `Title tag is only ${len} characters. Aim for 30-70 characters for better SEO.`,
        score: 5,
        maxScore,
      };
    }

    // len > 70
    return {
      check: 'Title Tag',
      status: 'warning',
      message: `Title tag is ${len} characters and may be truncated in search results. Aim for 30-70 characters.`,
      score: 6,
      maxScore,
    };
  }

  private checkMetaDescription(
    seo: Record<string, unknown>,
  ): SeoCheckResult {
    const maxScore = 10;
    const desc =
      typeof seo['metaDescription'] === 'string'
        ? seo['metaDescription']
        : '';

    if (!desc || desc.trim().length === 0) {
      return {
        check: 'Meta Description',
        status: 'fail',
        message:
          'Page is missing a meta description. Add one between 120-160 characters.',
        score: 0,
        maxScore,
      };
    }

    const len = desc.trim().length;

    if (len >= 120 && len <= 160) {
      return {
        check: 'Meta Description',
        status: 'pass',
        message: `Meta description is ${len} characters (optimal range: 120-160).`,
        score: maxScore,
        maxScore,
      };
    }

    if (len < 120) {
      return {
        check: 'Meta Description',
        status: 'warning',
        message: `Meta description is only ${len} characters. Aim for 120-160 characters.`,
        score: 5,
        maxScore,
      };
    }

    return {
      check: 'Meta Description',
      status: 'warning',
      message: `Meta description is ${len} characters and may be truncated. Aim for 120-160 characters.`,
      score: 6,
      maxScore,
    };
  }

  private checkHeadingStructure(tree: unknown): SeoCheckResult {
    const maxScore = 8;
    const headings = collectHeadings(tree);
    const h1s = headings.filter((h) => h.level === 1);

    if (headings.length === 0) {
      return {
        check: 'Heading Structure',
        status: 'fail',
        message:
          'No headings found in the page content. Add an H1 heading and use proper heading hierarchy.',
        score: 0,
        maxScore,
      };
    }

    let score = 0;
    const issues: string[] = [];

    // Has H1?
    if (h1s.length === 1) {
      score += 4;
    } else if (h1s.length === 0) {
      issues.push('Page is missing an H1 heading.');
    } else {
      score += 2;
      issues.push(
        `Page has ${h1s.length} H1 headings. Use only one H1 per page.`,
      );
    }

    // Proper hierarchy: H1 -> H2 -> H3 etc. (no skips)
    let properHierarchy = true;
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1];
      const curr = headings[i];
      if (prev && curr && curr.level > prev.level + 1) {
        properHierarchy = false;
        break;
      }
    }

    if (properHierarchy) {
      score += 4;
    } else {
      score += 2;
      issues.push(
        'Heading hierarchy has skipped levels (e.g. H1 then H3). Use sequential heading levels.',
      );
    }

    if (issues.length === 0) {
      return {
        check: 'Heading Structure',
        status: 'pass',
        message: 'Heading structure is well-organized with a single H1 and proper hierarchy.',
        score,
        maxScore,
      };
    }

    return {
      check: 'Heading Structure',
      status: score >= 4 ? 'warning' : 'fail',
      message: issues.join(' '),
      score,
      maxScore,
    };
  }

  private checkContentLength(tree: unknown): SeoCheckResult {
    const maxScore = 8;
    const text = extractText(tree);
    const wordCount = text
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    if (wordCount >= 1000) {
      return {
        check: 'Content Length',
        status: 'pass',
        message: `Page has ${wordCount} words of content (excellent).`,
        score: maxScore,
        maxScore,
      };
    }

    if (wordCount >= 300) {
      return {
        check: 'Content Length',
        status: 'pass',
        message: `Page has ${wordCount} words of content (good). Consider adding more content for better SEO.`,
        score: 6,
        maxScore,
      };
    }

    if (wordCount >= 100) {
      return {
        check: 'Content Length',
        status: 'warning',
        message: `Page has only ${wordCount} words. Aim for at least 300 words for good SEO.`,
        score: 3,
        maxScore,
      };
    }

    return {
      check: 'Content Length',
      status: 'fail',
      message: `Page has only ${wordCount} words. Search engines prefer pages with substantial content (300+ words).`,
      score: wordCount > 0 ? 1 : 0,
      maxScore,
    };
  }

  private checkImageAltText(tree: unknown): SeoCheckResult {
    const maxScore = 8;
    const imageInfo = collectImageInfo(tree);

    if (imageInfo.total === 0) {
      return {
        check: 'Image Alt Text',
        status: 'pass',
        message: 'No images found on the page (no alt text issues).',
        score: maxScore,
        maxScore,
      };
    }

    const ratio = imageInfo.withAlt / imageInfo.total;

    if (ratio === 1) {
      return {
        check: 'Image Alt Text',
        status: 'pass',
        message: `All ${imageInfo.total} images have alt text.`,
        score: maxScore,
        maxScore,
      };
    }

    const missing = imageInfo.total - imageInfo.withAlt;
    const score = Math.round(ratio * maxScore);

    return {
      check: 'Image Alt Text',
      status: ratio >= 0.5 ? 'warning' : 'fail',
      message: `${missing} of ${imageInfo.total} images are missing alt text. Add descriptive alt text for accessibility and SEO.`,
      score,
      maxScore,
    };
  }

  private checkUrlSlug(slug: string): SeoCheckResult {
    const maxScore = 6;
    let score = 0;
    const issues: string[] = [];

    if (!slug || slug.trim().length === 0) {
      return {
        check: 'URL Slug',
        status: 'fail',
        message: 'Page has no URL slug.',
        score: 0,
        maxScore,
      };
    }

    // Short slug (under 75 chars, excluding leading /)
    const cleanSlug = slug.startsWith('/') ? slug.slice(1) : slug;
    if (cleanSlug.length <= 75) {
      score += 2;
    } else {
      issues.push('URL slug is too long. Keep it under 75 characters.');
    }

    // Lowercase
    if (slug === slug.toLowerCase()) {
      score += 1;
    } else {
      issues.push('URL slug contains uppercase characters. Use lowercase only.');
    }

    // No special characters (allow letters, numbers, hyphens, slashes)
    if (/^[a-z0-9\-\/]+$/.test(cleanSlug) || cleanSlug === '') {
      score += 2;
    } else {
      issues.push(
        'URL slug contains special characters. Use only lowercase letters, numbers, and hyphens.',
      );
    }

    // Descriptive (at least 2 chars, not just numbers)
    if (cleanSlug.length >= 2 && !/^\d+$/.test(cleanSlug)) {
      score += 1;
    } else {
      issues.push('URL slug should be descriptive and meaningful.');
    }

    if (issues.length === 0) {
      return {
        check: 'URL Slug',
        status: 'pass',
        message: 'URL slug is well-formatted: short, lowercase, and descriptive.',
        score,
        maxScore,
      };
    }

    return {
      check: 'URL Slug',
      status: score >= 4 ? 'warning' : 'fail',
      message: issues.join(' '),
      score,
      maxScore,
    };
  }

  private checkInternalLinks(tree: unknown): SeoCheckResult {
    const maxScore = 6;
    const linkCount = countInternalLinks(tree);

    if (linkCount >= 3) {
      return {
        check: 'Internal Links',
        status: 'pass',
        message: `Page has ${linkCount} internal links (good for SEO and user navigation).`,
        score: maxScore,
        maxScore,
      };
    }

    if (linkCount >= 1) {
      return {
        check: 'Internal Links',
        status: 'warning',
        message: `Page has only ${linkCount} internal link(s). Add more internal links to improve site structure and SEO.`,
        score: 3,
        maxScore,
      };
    }

    return {
      check: 'Internal Links',
      status: 'fail',
      message:
        'Page has no internal links. Add links to other pages to improve navigation and SEO.',
      score: 0,
      maxScore,
    };
  }

  private checkCanonicalUrl(
    seo: Record<string, unknown>,
  ): SeoCheckResult {
    const maxScore = 6;
    const canonical = seo['canonicalUrl'];

    if (typeof canonical === 'string' && canonical.trim().length > 0) {
      // Basic URL validation
      if (
        canonical.startsWith('https://') ||
        canonical.startsWith('http://')
      ) {
        return {
          check: 'Canonical URL',
          status: 'pass',
          message: 'Canonical URL is set and appears valid.',
          score: maxScore,
          maxScore,
        };
      }

      return {
        check: 'Canonical URL',
        status: 'warning',
        message:
          'Canonical URL is set but does not start with http(s)://. Use a fully qualified URL.',
        score: 3,
        maxScore,
      };
    }

    return {
      check: 'Canonical URL',
      status: 'warning',
      message:
        'No canonical URL is set. Consider adding one to prevent duplicate content issues.',
      score: 0,
      maxScore,
    };
  }

  private checkOpenGraph(
    seo: Record<string, unknown>,
  ): SeoCheckResult {
    const maxScore = 8;
    let score = 0;
    const missing: string[] = [];

    // Check og:title (could be metaTitle or ogTitle)
    const ogTitle = seo['ogTitle'] ?? seo['metaTitle'];
    if (typeof ogTitle === 'string' && ogTitle.trim().length > 0) {
      score += 3;
    } else {
      missing.push('og:title');
    }

    // Check og:description (could be ogDescription or metaDescription)
    const ogDesc = seo['ogDescription'] ?? seo['metaDescription'];
    if (typeof ogDesc === 'string' && ogDesc.trim().length > 0) {
      score += 3;
    } else {
      missing.push('og:description');
    }

    // Check og:image
    const ogImage = seo['ogImage'];
    if (typeof ogImage === 'string' && ogImage.trim().length > 0) {
      score += 2;
    } else {
      missing.push('og:image');
    }

    if (missing.length === 0) {
      return {
        check: 'Open Graph',
        status: 'pass',
        message: 'All Open Graph tags (title, description, image) are present.',
        score,
        maxScore,
      };
    }

    return {
      check: 'Open Graph',
      status: score >= 3 ? 'warning' : 'fail',
      message: `Missing Open Graph tags: ${missing.join(', ')}. Add these for better social media sharing.`,
      score,
      maxScore,
    };
  }

  private checkNoIndex(
    seo: Record<string, unknown>,
    status: string,
  ): SeoCheckResult {
    const maxScore = 5;
    const noIndex = seo['noIndex'] === true;

    if (!noIndex) {
      return {
        check: 'noIndex Check',
        status: 'pass',
        message: 'Page is indexable by search engines.',
        score: maxScore,
        maxScore,
      };
    }

    if (status === 'published') {
      return {
        check: 'noIndex Check',
        status: 'warning',
        message:
          'Published page is set to noIndex. This will prevent search engines from indexing it. Remove noIndex if this page should appear in search results.',
        score: 0,
        maxScore,
      };
    }

    return {
      check: 'noIndex Check',
      status: 'pass',
      message: 'Page is set to noIndex (acceptable for non-published pages).',
      score: maxScore,
      maxScore,
    };
  }

  private checkMobileContent(tree: unknown): SeoCheckResult {
    const maxScore = 10;
    const responsive = hasResponsiveComponents(tree);

    if (responsive) {
      return {
        check: 'Mobile Content',
        status: 'pass',
        message: 'Page uses responsive components for mobile compatibility.',
        score: maxScore,
        maxScore,
      };
    }

    return {
      check: 'Mobile Content',
      status: 'warning',
      message:
        'No responsive components detected. Ensure your page layout adapts to mobile devices using grid, flex, or responsive components.',
      score: 3,
      maxScore,
    };
  }

  private checkPageSpeedHints(tree: unknown): SeoCheckResult {
    const maxScore = 15;
    let score = 0;
    const issues: string[] = [];

    // Check for webp variants
    const webp = hasWebpVariants(tree);
    if (webp) {
      score += 8;
    } else {
      const imageInfo = collectImageInfo(tree);
      if (imageInfo.total > 0) {
        issues.push(
          'No WebP image variants detected. Use WebP format for faster loading.',
        );
      } else {
        // No images at all — no penalty
        score += 8;
      }
    }

    // Check component count
    const componentCount = countComponents(tree);
    if (componentCount < 50) {
      score += 7;
    } else if (componentCount < 100) {
      score += 4;
      issues.push(
        `Page has ${componentCount} components. Consider simplifying for faster rendering (aim for fewer than 50).`,
      );
    } else {
      issues.push(
        `Page has ${componentCount} components which may slow rendering. Simplify or lazy-load sections.`,
      );
    }

    if (issues.length === 0) {
      return {
        check: 'Page Speed Hints',
        status: 'pass',
        message:
          'Page structure looks optimized: manageable component count and modern image formats.',
        score,
        maxScore,
      };
    }

    return {
      check: 'Page Speed Hints',
      status: score >= 8 ? 'warning' : 'fail',
      message: issues.join(' '),
      score,
      maxScore,
    };
  }

  // -----------------------------------------------------------------------
  // Scoring
  // -----------------------------------------------------------------------

  private determineGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
