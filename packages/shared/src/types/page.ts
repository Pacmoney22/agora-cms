export interface ComponentInstance {
  instanceId: string;
  componentId: string;
  props: Record<string, unknown>;
  children: ComponentInstance[];
}

export interface ComponentTree {
  root: ComponentInstance;
}

export interface PageSeo {
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
}

export interface PageDto {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  seo: PageSeo | null;
  componentTree: ComponentTree;
  version: number;
  isTemplate: boolean;
  templateName: string | null;
  parentId: string | null;
  position: number;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageDto {
  title: string;
  slug?: string;
  componentTree?: ComponentTree;
  seo?: Partial<PageSeo>;
  isTemplate?: boolean;
  templateName?: string;
  parentId?: string;
}

export interface UpdatePageDto {
  title?: string;
  slug?: string;
  componentTree?: ComponentTree;
  seo?: Partial<PageSeo>;
  parentId?: string | null;
  position?: number;
}
