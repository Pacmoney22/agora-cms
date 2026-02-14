'use client';

import type { ComponentInstance } from '@nextgen-cms/shared';
import React from 'react';
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
} from '@nextgen-cms/ui';

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
  'product-card': ({ props }) => <ProductCard {...props as any} />,
  'product-grid': ({ props }) => <ProductGrid {...props as any} />,
  'cart-widget': ({ props }) => <CartWidget {...props as any} />,
  'featured-products': ({ props }) => <FeaturedProducts {...props as any} />,
  'category-list': ({ props }) => <CategoryList {...props as any} />,
  'product-configurator': ({ props }) => <ProductConfigurator {...props as any} />,
  'cart-page': ({ props }) => <CartPage {...props as any} />,
  'product-quick-view': ({ props }) => <ProductQuickView {...props as any} />,

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
 */
export function ComponentRenderer({
  instance,
}: {
  instance: ComponentInstance;
}) {
  const Renderer = componentRegistry[instance.componentId];

  const renderedChildren = instance.children.map((child) => (
    <ComponentRenderer key={child.instanceId} instance={child} />
  ));

  if (!Renderer) {
    return <UnknownComponent componentId={instance.componentId} />;
  }

  return (
    <Renderer props={instance.props}>
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
