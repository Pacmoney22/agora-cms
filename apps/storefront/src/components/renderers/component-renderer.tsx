'use client';

import type { ComponentInstance } from '@agora-cms/shared';
import React from 'react';
import { useCart } from '@/lib/cart-context';
import {
  // Layout
  Container,
  Section,
  Grid,
  Divider,
  Spacer,
  Tabs,
  Accordion,
  Columns,
  // Typography
  Heading,
  Paragraph,
  RichText,
  Blockquote,
  CodeBlock,
  List,
  // Media
  Image,
  Video,
  Gallery,
  Carousel,
  BackgroundVideo,
  AudioPlayer,
  // Marketing
  HeroBanner,
  CTABlock,
  FeatureGrid,
  Testimonial,
  TestimonialCarousel,
  PricingTable,
  Countdown,
  AnnouncementBar,
  LogoCloud,
  BeforeAfter,
  // Commerce
  ProductCard,
  ProductGrid,
  CartWidget,
  FeaturedProducts,
  CategoryList,
  ProductConfigurator,
  CartPage,
  ProductQuickView,
  // Navigation
  Header,
  Footer,
  Breadcrumb,
  SidebarMenu,
  MegaMenu,
  TableOfContents,
  // Forms
  ContactForm,
  NewsletterSignup,
  SearchBar,
  LoginRegister,
  FormWizard,
  // Data Display
  DataTable,
  Chart,
  StatsCounter,
  ProgressBar,
  Timeline,
  ComparisonTable,
  // Social & Embed
  SocialLinks,
  ShareButtons,
  Embed,
  Map,
  // Utility
  ButtonBlock,
  IconBlock,
  Alert,
  CookieConsent,
  BackToTop,
  Modal,
  // Events
  EventCard,
  EventGrid,
  // Courses
  CourseCard,
  CourseGrid,
  // Blog & Content
  BlogPostCard,
  BlogGrid,
  AuthorBio,
  RelatedPosts,
  PostNavigation,
  Comments,
  // Trust & Social Proof
  TrustBadges,
  ReviewAggregate,
  ReviewList,
  CaseStudiesGrid,
  Awards,
  // Interactive
  Toast,
  AnimatedTabs,
  Calculator,
  SearchableFAQ,
  Lightbox,
  // Global
  SiteMeta,
  ErrorPage,
  MaintenancePage,
} from '@agora-cms/ui';

/**
 * Wrapper that injects the cart context's `addItem` as `onAddToCart`
 * into ProductCard so detail mode can add to cart.
 */
function ProductCardWithCart(props: Record<string, unknown>) {
  let addItem: ((id: string, qty: number, vid?: string) => Promise<void>) | undefined;
  try {
    const cart = useCart();
    addItem = cart.addItem;
  } catch {
    // Outside CartProvider — no cart available
  }
  return (
    <ProductCard
      {...(props as any)}
      onAddToCart={
        addItem
          ? (id: string, qty: number, vid?: string) => { addItem!(id, qty, vid); }
          : undefined
      }
    />
  );
}

/**
 * Registry mapping componentId strings to React components.
 * Each renderer receives the component's props and children as React nodes.
 */
type ComponentRendererFn = React.FC<{
  props: Record<string, unknown>;
  children: React.ReactNode;
}>;

const componentRegistry: Record<string, ComponentRendererFn> = {
  // Special page root
  'page-root': ({ children }) => (
    <div className="page-root">{children}</div>
  ),

  // Layout
  'container': ({ props, children }) => <Container {...props as any}>{children}</Container>,
  'section': ({ props, children }) => <Section {...props as any}>{children}</Section>,
  'grid': ({ props, children }) => <Grid {...props as any}>{children}</Grid>,
  'divider': ({ props }) => <Divider {...props as any} />,
  'spacer': ({ props }) => <Spacer {...props as any} />,
  'tabs': ({ props, children }) => <Tabs {...props as any}>{children}</Tabs>,
  'accordion': ({ props }) => <Accordion {...props as any} />,
  'columns': ({ props, children }) => <Columns {...props as any}>{children}</Columns>,

  // Typography
  'heading': ({ props }) => <Heading {...props as any} />,
  'paragraph': ({ props }) => <Paragraph {...props as any} />,
  'rich-text': ({ props }) => <RichText {...props as any} />,
  'blockquote': ({ props }) => <Blockquote {...props as any} />,
  'code-block': ({ props }) => <CodeBlock {...props as any} />,
  'list': ({ props }) => <List {...props as any} />,

  // Media
  'image': ({ props }) => <Image {...props as any} />,
  'video': ({ props }) => <Video {...props as any} />,
  'gallery': ({ props }) => <Gallery {...props as any} />,
  'carousel': ({ props, children }) => <Carousel {...props as any}>{children}</Carousel>,
  'background-video': ({ props, children }) => <BackgroundVideo {...props as any}>{children}</BackgroundVideo>,
  'audio-player': ({ props }) => <AudioPlayer {...props as any} />,

  // Marketing
  'hero-banner': ({ props }) => <HeroBanner {...props as any} />,
  'cta-block': ({ props }) => <CTABlock {...props as any} />,
  'feature-grid': ({ props }) => <FeatureGrid {...props as any} />,
  'testimonial': ({ props }) => <Testimonial {...props as any} />,
  'testimonial-carousel': ({ props }) => <TestimonialCarousel {...props as any} />,
  'pricing-table': ({ props }) => <PricingTable {...props as any} />,
  'countdown': ({ props }) => <Countdown {...props as any} />,
  'announcement-bar': ({ props }) => <AnnouncementBar {...props as any} />,
  'logo-cloud': ({ props }) => <LogoCloud {...props as any} />,
  'before-after': ({ props }) => <BeforeAfter {...props as any} />,

  // Commerce
  'product-card': ({ props }) => <ProductCardWithCart {...props as any} />,
  'product-grid': ({ props }) => <ProductGrid {...props as any} />,
  'cart-widget': ({ props }) => <CartWidget {...props as any} />,
  'featured-products': ({ props }) => <FeaturedProducts {...props as any} />,
  'category-list': ({ props }) => <CategoryList {...props as any} />,
  'product-configurator': ({ props }) => <ProductConfigurator {...props as any} />,
  'cart-page': ({ props }) => <CartPage {...props as any} />,
  'product-quick-view': ({ props }) => <ProductQuickView {...props as any} />,

  // Events
  'event-card': ({ props }) => <EventCard {...props as any} />,
  'event-grid': ({ props }) => <EventGrid {...props as any} />,

  // Courses
  'course-card': ({ props }) => <CourseCard {...props as any} />,
  'course-grid': ({ props }) => <CourseGrid {...props as any} />,

  // Navigation
  'header': ({ props }) => <Header {...props as any} />,
  'footer': ({ props }) => <Footer {...props as any} />,
  'breadcrumb': ({ props }) => <Breadcrumb {...props as any} />,
  'sidebar-menu': ({ props }) => <SidebarMenu {...props as any} />,
  'mega-menu': ({ props }) => <MegaMenu {...props as any} />,
  'table-of-contents': ({ props }) => <TableOfContents {...props as any} />,

  // Forms
  'contact-form': ({ props }) => <ContactForm {...props as any} />,
  'newsletter-signup': ({ props }) => <NewsletterSignup {...props as any} />,
  'search-bar': ({ props }) => <SearchBar {...props as any} />,
  'login-register': ({ props }) => <LoginRegister {...props as any} />,
  'form-wizard': ({ props }) => <FormWizard {...props as any} />,

  // Data Display
  'data-table': ({ props }) => <DataTable {...props as any} />,
  'chart': ({ props }) => <Chart {...props as any} />,
  'stats-counter': ({ props }) => <StatsCounter {...props as any} />,
  'progress-bar': ({ props }) => <ProgressBar {...props as any} />,
  'timeline': ({ props }) => <Timeline {...props as any} />,
  'comparison-table': ({ props }) => <ComparisonTable {...props as any} />,

  // Social & Embed
  'social-links': ({ props }) => <SocialLinks {...props as any} />,
  'share-buttons': ({ props }) => <ShareButtons {...props as any} />,
  'embed': ({ props }) => <Embed {...props as any} />,
  'map': ({ props }) => <Map {...props as any} />,

  // Utility
  'button': ({ props }) => <ButtonBlock {...props as any} />,
  'icon': ({ props }) => <IconBlock {...props as any} />,
  'alert': ({ props }) => <Alert {...props as any} />,
  'cookie-consent': ({ props }) => <CookieConsent {...props as any} />,
  'back-to-top': ({ props }) => <BackToTop {...props as any} />,
  'modal': ({ props, children }) => <Modal {...props as any}>{children}</Modal>,

  // Blog & Content
  'blog-post-card': ({ props }) => <BlogPostCard {...props as any} />,
  'blog-grid': ({ props }) => <BlogGrid {...props as any} />,
  'author-bio': ({ props }) => <AuthorBio {...props as any} />,
  'related-posts': ({ props }) => <RelatedPosts {...props as any} />,
  'post-navigation': ({ props }) => <PostNavigation {...props as any} />,
  'comments': ({ props }) => <Comments {...props as any} />,

  // Trust & Social Proof
  'trust-badges': ({ props }) => <TrustBadges {...props as any} />,
  'review-aggregate': ({ props }) => <ReviewAggregate {...props as any} />,
  'review-list': ({ props }) => <ReviewList {...props as any} />,
  'case-studies-grid': ({ props }) => <CaseStudiesGrid {...props as any} />,
  'awards': ({ props }) => <Awards {...props as any} />,

  // Interactive
  'toast': ({ props }) => <Toast {...props as any} />,
  'animated-tabs': ({ props }) => <AnimatedTabs {...props as any} />,
  'calculator': ({ props }) => <Calculator {...props as any} />,
  'faq-searchable': ({ props }) => <SearchableFAQ {...props as any} />,
  'lightbox': ({ props }) => <Lightbox {...props as any} />,

  // Global
  'site-meta': ({ props }) => <SiteMeta {...props as any} />,
  'error-page': ({ props }) => <ErrorPage {...props as any} />,
  'maintenance-page': ({ props }) => <MaintenancePage {...props as any} />,
};

/**
 * Data context passed from the catch-all route to inject API data into
 * grid and card components at render time.
 */
export interface DataContext {
  contentType?: string;
  mode?: 'listing' | 'detail';
  basePath?: string;
  items?: unknown[];
  item?: Record<string, unknown>;
  siteSettings?: Record<string, any>;
}

/** Component IDs that represent grid/listing components. */
const GRID_COMPONENT_IDS = new Set([
  'blog-grid',
  'product-grid',
  'featured-products',
  'category-list',
  'event-grid',
  'course-grid',
]);

/** Component IDs that represent card/detail components. */
const CARD_COMPONENT_IDS = new Set([
  'blog-post-card',
  'product-card',
  'event-card',
  'course-card',
  'product-quick-view',
]);

/**
 * Merge data context into component props when appropriate.
 * - Grid components receive `items` as their data prop (posts, products, etc.)
 * - Card components receive the single `item` as their data prop
 * - All content-routed components receive `detailBasePath`
 */
function mergeDataContext(
  componentId: string,
  props: Record<string, unknown>,
  dataContext?: DataContext,
): Record<string, unknown> {
  if (!dataContext) return props;

  const merged = { ...props };

  // Inject basePath for link construction
  if (dataContext.basePath) {
    merged.detailBasePath = dataContext.basePath;
  }

  // Inject items into grid components (listing mode)
  if (dataContext.mode === 'listing' && GRID_COMPONENT_IDS.has(componentId) && dataContext.items) {
    // Each grid type uses a different prop name for its data array
    const dataPropMap: Record<string, string> = {
      'blog-grid': 'posts',
      'product-grid': 'products',
      'featured-products': 'products',
      'category-list': 'categories',
      'event-grid': 'events',
      'course-grid': 'courses',
    };
    const dataProp = dataPropMap[componentId];
    if (dataProp) {
      merged[dataProp] = dataContext.items;
    }
  }

  // Enforce blog social sharing settings on ShareButtons
  if (componentId === 'share-buttons' && dataContext.siteSettings?.blog) {
    const blog = dataContext.siteSettings.blog;
    if (blog.showShareButtons === false) {
      // Hide share buttons entirely when disabled in settings
      merged.platforms = [];
    } else if (Array.isArray(blog.shareButtons)) {
      merged.allowedPlatforms = blog.shareButtons;
    }
  }

  // Inject single item into card components (detail mode) and auto-set mode
  if (dataContext.mode === 'detail' && CARD_COMPONENT_IDS.has(componentId) && dataContext.item) {
    const itemPropMap: Record<string, string> = {
      'blog-post-card': 'post',
      'product-card': 'product',
      'event-card': 'eventData',
      'course-card': 'courseData',
      'product-quick-view': 'product',
    };
    const itemProp = itemPropMap[componentId];
    if (itemProp) {
      merged[itemProp] = dataContext.item;
    }
    // Auto-set mode to 'detail' so cards render their full interactive view
    merged.mode = 'detail';
  }

  return merged;
}

/**
 * Placeholder component for unknown/unregistered componentIds.
 */
function UnknownComponent({ componentId }: { componentId: string }) {
  return (
    <div className="my-2 rounded border border-dashed border-orange-300 bg-orange-50 p-4 text-sm text-orange-600">
      Unknown component: <code>{componentId}</code>
    </div>
  );
}

/**
 * Recursively renders a ComponentInstance tree.
 * Looks up each component in the registry and renders its children recursively.
 *
 * When `dataContext` is provided (from the catch-all content route),
 * it injects API data into matching grid and card components.
 */
export function ComponentRenderer({
  instance,
  dataContext,
}: {
  instance: ComponentInstance;
  dataContext?: DataContext;
}) {
  const Renderer = componentRegistry[instance.componentId];

  const renderedChildren = instance.children.map((child) => (
    <ComponentRenderer key={child.instanceId} instance={child} dataContext={dataContext} />
  ));

  if (!Renderer) {
    return <UnknownComponent componentId={instance.componentId} />;
  }

  const mergedProps = mergeDataContext(instance.componentId, instance.props, dataContext);

  return (
    <Renderer props={mergedProps}>
      {renderedChildren.length > 0 ? renderedChildren : null}
    </Renderer>
  );
}

/**
 * Register a custom component renderer at runtime.
 */
export function registerComponent(
  componentId: string,
  renderer: ComponentRendererFn
): void {
  componentRegistry[componentId] = renderer;
}
