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

// Layout schemas
import containerSchema from '@nextgen-cms/ui/src/schemas/container.schema.json';
import sectionSchema from '@nextgen-cms/ui/src/schemas/section.schema.json';
import gridSchema from '@nextgen-cms/ui/src/schemas/grid.schema.json';
import dividerSchema from '@nextgen-cms/ui/src/schemas/divider.schema.json';
import spacerSchema from '@nextgen-cms/ui/src/schemas/spacer.schema.json';
import tabsSchema from '@nextgen-cms/ui/src/schemas/tabs.schema.json';
import accordionSchema from '@nextgen-cms/ui/src/schemas/accordion.schema.json';
import columnsSchema from '@nextgen-cms/ui/src/schemas/columns.schema.json';

// Typography schemas
import headingSchema from '@nextgen-cms/ui/src/schemas/heading.schema.json';
import paragraphSchema from '@nextgen-cms/ui/src/schemas/paragraph.schema.json';
import richTextSchema from '@nextgen-cms/ui/src/schemas/rich-text.schema.json';
import blockquoteSchema from '@nextgen-cms/ui/src/schemas/blockquote.schema.json';
import codeBlockSchema from '@nextgen-cms/ui/src/schemas/code-block.schema.json';
import listSchema from '@nextgen-cms/ui/src/schemas/list.schema.json';

// Media schemas
import imageSchema from '@nextgen-cms/ui/src/schemas/image.schema.json';
import videoSchema from '@nextgen-cms/ui/src/schemas/video.schema.json';
import gallerySchema from '@nextgen-cms/ui/src/schemas/gallery.schema.json';
import carouselSchema from '@nextgen-cms/ui/src/schemas/carousel.schema.json';
import backgroundVideoSchema from '@nextgen-cms/ui/src/schemas/background-video.schema.json';
import audioPlayerSchema from '@nextgen-cms/ui/src/schemas/audio-player.schema.json';

// Marketing schemas
import heroBannerSchema from '@nextgen-cms/ui/src/schemas/hero-banner.schema.json';
import ctaBlockSchema from '@nextgen-cms/ui/src/schemas/cta-block.schema.json';
import featureGridSchema from '@nextgen-cms/ui/src/schemas/feature-grid.schema.json';
import testimonialSchema from '@nextgen-cms/ui/src/schemas/testimonial.schema.json';
import testimonialCarouselSchema from '@nextgen-cms/ui/src/schemas/testimonial-carousel.schema.json';
import pricingTableSchema from '@nextgen-cms/ui/src/schemas/pricing-table.schema.json';
import countdownSchema from '@nextgen-cms/ui/src/schemas/countdown.schema.json';
import announcementBarSchema from '@nextgen-cms/ui/src/schemas/announcement-bar.schema.json';
import logoCloudSchema from '@nextgen-cms/ui/src/schemas/logo-cloud.schema.json';
import beforeAfterSchema from '@nextgen-cms/ui/src/schemas/before-after.schema.json';

// Commerce schemas
import productCardSchema from '@nextgen-cms/ui/src/schemas/product-card.schema.json';
import productGridSchema from '@nextgen-cms/ui/src/schemas/product-grid.schema.json';
import cartWidgetSchema from '@nextgen-cms/ui/src/schemas/cart-widget.schema.json';
import featuredProductsSchema from '@nextgen-cms/ui/src/schemas/featured-products.schema.json';
import categoryListSchema from '@nextgen-cms/ui/src/schemas/category-list.schema.json';
import productConfiguratorSchema from '@nextgen-cms/ui/src/schemas/product-configurator.schema.json';
import cartPageSchema from '@nextgen-cms/ui/src/schemas/cart-page.schema.json';
import productQuickViewSchema from '@nextgen-cms/ui/src/schemas/product-quick-view.schema.json';

// Navigation schemas
import headerSchema from '@nextgen-cms/ui/src/schemas/header.schema.json';
import footerSchema from '@nextgen-cms/ui/src/schemas/footer.schema.json';
import breadcrumbSchema from '@nextgen-cms/ui/src/schemas/breadcrumb.schema.json';
import sidebarMenuSchema from '@nextgen-cms/ui/src/schemas/sidebar-menu.schema.json';
import megaMenuSchema from '@nextgen-cms/ui/src/schemas/mega-menu.schema.json';
import tableOfContentsSchema from '@nextgen-cms/ui/src/schemas/table-of-contents.schema.json';

// Form schemas
import contactFormSchema from '@nextgen-cms/ui/src/schemas/contact-form.schema.json';
import newsletterSignupSchema from '@nextgen-cms/ui/src/schemas/newsletter-signup.schema.json';
import searchBarSchema from '@nextgen-cms/ui/src/schemas/search-bar.schema.json';
import loginRegisterSchema from '@nextgen-cms/ui/src/schemas/login-register.schema.json';
import formWizardSchema from '@nextgen-cms/ui/src/schemas/form-wizard.schema.json';

// Data Display schemas
import dataTableSchema from '@nextgen-cms/ui/src/schemas/data-table.schema.json';
import chartSchema from '@nextgen-cms/ui/src/schemas/chart.schema.json';
import statsCounterSchema from '@nextgen-cms/ui/src/schemas/stats-counter.schema.json';
import progressBarSchema from '@nextgen-cms/ui/src/schemas/progress-bar.schema.json';
import timelineSchema from '@nextgen-cms/ui/src/schemas/timeline.schema.json';
import comparisonTableSchema from '@nextgen-cms/ui/src/schemas/comparison-table.schema.json';

// Social & Embed schemas
import socialLinksSchema from '@nextgen-cms/ui/src/schemas/social-links.schema.json';
import shareButtonsSchema from '@nextgen-cms/ui/src/schemas/share-buttons.schema.json';
import embedSchema from '@nextgen-cms/ui/src/schemas/embed.schema.json';
import mapSchema from '@nextgen-cms/ui/src/schemas/map.schema.json';

// Utility schemas
import buttonSchema from '@nextgen-cms/ui/src/schemas/button.schema.json';
import iconSchema from '@nextgen-cms/ui/src/schemas/icon.schema.json';
import alertSchema from '@nextgen-cms/ui/src/schemas/alert.schema.json';
import cookieConsentSchema from '@nextgen-cms/ui/src/schemas/cookie-consent.schema.json';
import backToTopSchema from '@nextgen-cms/ui/src/schemas/back-to-top.schema.json';
import modalSchema from '@nextgen-cms/ui/src/schemas/modal.schema.json';

// Blog & Content schemas
import blogPostCardSchema from '@nextgen-cms/ui/src/schemas/blog-post-card.schema.json';
import blogGridSchema from '@nextgen-cms/ui/src/schemas/blog-grid.schema.json';
import authorBioSchema from '@nextgen-cms/ui/src/schemas/author-bio.schema.json';
import relatedPostsSchema from '@nextgen-cms/ui/src/schemas/related-posts.schema.json';
import postNavigationSchema from '@nextgen-cms/ui/src/schemas/post-navigation.schema.json';
import commentsSchema from '@nextgen-cms/ui/src/schemas/comments.schema.json';

// Trust & Social Proof schemas
import trustBadgesSchema from '@nextgen-cms/ui/src/schemas/trust-badges.schema.json';
import reviewAggregateSchema from '@nextgen-cms/ui/src/schemas/review-aggregate.schema.json';
import reviewListSchema from '@nextgen-cms/ui/src/schemas/review-list.schema.json';
import caseStudiesGridSchema from '@nextgen-cms/ui/src/schemas/case-studies-grid.schema.json';
import awardsSchema from '@nextgen-cms/ui/src/schemas/awards.schema.json';

// Interactive schemas
import toastSchema from '@nextgen-cms/ui/src/schemas/toast.schema.json';
import animatedTabsSchema from '@nextgen-cms/ui/src/schemas/animated-tabs.schema.json';
import calculatorSchema from '@nextgen-cms/ui/src/schemas/calculator.schema.json';
import searchableFaqSchema from '@nextgen-cms/ui/src/schemas/faq-searchable.schema.json';
import lightboxSchema from '@nextgen-cms/ui/src/schemas/lightbox.schema.json';

// Global schemas
import siteMetaSchema from '@nextgen-cms/ui/src/schemas/site-meta.schema.json';
import errorPageSchema from '@nextgen-cms/ui/src/schemas/error-page.schema.json';
import maintenancePageSchema from '@nextgen-cms/ui/src/schemas/maintenance-page.schema.json';

export interface ComponentSchema {
  id: string;
  name: string;
  category: string;
  icon: string;
  acceptsChildren: boolean;
  properties: Record<string, PropertySchema>;
}

export interface PropertySchema {
  type: string;
  default?: unknown;
  label: string;
  values?: (string | number)[];
  multiline?: boolean;
  properties?: Record<string, PropertySchema>;
  items?: PropertySchema;
  required?: boolean;
  min?: number;
  max?: number;
  description?: string;
  maxLength?: number;
  constraints?: Record<string, unknown>;
}

export interface RegisteredComponent {
  component: React.ComponentType<any>;
  schema: ComponentSchema;
}

const registry = new globalThis.Map<string, RegisteredComponent>();

function register(schema: ComponentSchema, component: React.ComponentType<any>) {
  registry.set(schema.id, { component, schema });
}

// Register all components — JSON schemas are cast through unknown since their
// structure is flexible and driven by the schema files rather than TS types.

// Layout
register(containerSchema as unknown as ComponentSchema, Container);
register(sectionSchema as unknown as ComponentSchema, Section);
register(gridSchema as unknown as ComponentSchema, Grid);
register(dividerSchema as unknown as ComponentSchema, Divider);
register(spacerSchema as unknown as ComponentSchema, Spacer);
register(tabsSchema as unknown as ComponentSchema, Tabs);
register(accordionSchema as unknown as ComponentSchema, Accordion);
register(columnsSchema as unknown as ComponentSchema, Columns);

// Typography
register(headingSchema as unknown as ComponentSchema, Heading);
register(paragraphSchema as unknown as ComponentSchema, Paragraph);
register(richTextSchema as unknown as ComponentSchema, RichText);
register(blockquoteSchema as unknown as ComponentSchema, Blockquote);
register(codeBlockSchema as unknown as ComponentSchema, CodeBlock);
register(listSchema as unknown as ComponentSchema, List);

// Media
register(imageSchema as unknown as ComponentSchema, Image);
register(videoSchema as unknown as ComponentSchema, Video);
register(gallerySchema as unknown as ComponentSchema, Gallery);
register(carouselSchema as unknown as ComponentSchema, Carousel);
register(backgroundVideoSchema as unknown as ComponentSchema, BackgroundVideo);
register(audioPlayerSchema as unknown as ComponentSchema, AudioPlayer);

// Marketing
register(heroBannerSchema as unknown as ComponentSchema, HeroBanner);
register(ctaBlockSchema as unknown as ComponentSchema, CTABlock);
register(featureGridSchema as unknown as ComponentSchema, FeatureGrid);
register(testimonialSchema as unknown as ComponentSchema, Testimonial);
register(testimonialCarouselSchema as unknown as ComponentSchema, TestimonialCarousel);
register(pricingTableSchema as unknown as ComponentSchema, PricingTable);
register(countdownSchema as unknown as ComponentSchema, Countdown);
register(announcementBarSchema as unknown as ComponentSchema, AnnouncementBar);
register(logoCloudSchema as unknown as ComponentSchema, LogoCloud);
register(beforeAfterSchema as unknown as ComponentSchema, BeforeAfter);

// Commerce
register(productCardSchema as unknown as ComponentSchema, ProductCard);
register(productGridSchema as unknown as ComponentSchema, ProductGrid);
register(cartWidgetSchema as unknown as ComponentSchema, CartWidget);
register(featuredProductsSchema as unknown as ComponentSchema, FeaturedProducts);
register(categoryListSchema as unknown as ComponentSchema, CategoryList);
register(productConfiguratorSchema as unknown as ComponentSchema, ProductConfigurator);
register(cartPageSchema as unknown as ComponentSchema, CartPage);
register(productQuickViewSchema as unknown as ComponentSchema, ProductQuickView);

// Navigation
register(headerSchema as unknown as ComponentSchema, Header);
register(footerSchema as unknown as ComponentSchema, Footer);
register(breadcrumbSchema as unknown as ComponentSchema, Breadcrumb);
register(sidebarMenuSchema as unknown as ComponentSchema, SidebarMenu);
register(megaMenuSchema as unknown as ComponentSchema, MegaMenu);
register(tableOfContentsSchema as unknown as ComponentSchema, TableOfContents);

// Forms
register(contactFormSchema as unknown as ComponentSchema, ContactForm);
register(newsletterSignupSchema as unknown as ComponentSchema, NewsletterSignup);
register(searchBarSchema as unknown as ComponentSchema, SearchBar);
register(loginRegisterSchema as unknown as ComponentSchema, LoginRegister);
register(formWizardSchema as unknown as ComponentSchema, FormWizard);

// Data Display
register(dataTableSchema as unknown as ComponentSchema, DataTable);
register(chartSchema as unknown as ComponentSchema, Chart);
register(statsCounterSchema as unknown as ComponentSchema, StatsCounter);
register(progressBarSchema as unknown as ComponentSchema, ProgressBar);
register(timelineSchema as unknown as ComponentSchema, Timeline);
register(comparisonTableSchema as unknown as ComponentSchema, ComparisonTable);

// Social & Embed
register(socialLinksSchema as unknown as ComponentSchema, SocialLinks);
register(shareButtonsSchema as unknown as ComponentSchema, ShareButtons);
register(embedSchema as unknown as ComponentSchema, Embed);
register(mapSchema as unknown as ComponentSchema, Map);

// Utility
register(buttonSchema as unknown as ComponentSchema, ButtonBlock);
register(iconSchema as unknown as ComponentSchema, IconBlock);
register(alertSchema as unknown as ComponentSchema, Alert);
register(cookieConsentSchema as unknown as ComponentSchema, CookieConsent);
register(backToTopSchema as unknown as ComponentSchema, BackToTop);
register(modalSchema as unknown as ComponentSchema, Modal);

// Blog & Content
register(blogPostCardSchema as unknown as ComponentSchema, BlogPostCard);
register(blogGridSchema as unknown as ComponentSchema, BlogGrid);
register(authorBioSchema as unknown as ComponentSchema, AuthorBio);
register(relatedPostsSchema as unknown as ComponentSchema, RelatedPosts);
register(postNavigationSchema as unknown as ComponentSchema, PostNavigation);
register(commentsSchema as unknown as ComponentSchema, Comments);

// Trust & Social Proof
register(trustBadgesSchema as unknown as ComponentSchema, TrustBadges);
register(reviewAggregateSchema as unknown as ComponentSchema, ReviewAggregate);
register(reviewListSchema as unknown as ComponentSchema, ReviewList);
register(caseStudiesGridSchema as unknown as ComponentSchema, CaseStudiesGrid);
register(awardsSchema as unknown as ComponentSchema, Awards);

// Interactive
register(toastSchema as unknown as ComponentSchema, Toast);
register(animatedTabsSchema as unknown as ComponentSchema, AnimatedTabs);
register(calculatorSchema as unknown as ComponentSchema, Calculator);
register(searchableFaqSchema as unknown as ComponentSchema, SearchableFAQ);
register(lightboxSchema as unknown as ComponentSchema, Lightbox);

// Global
register(siteMetaSchema as unknown as ComponentSchema, SiteMeta);
register(errorPageSchema as unknown as ComponentSchema, ErrorPage);
register(maintenancePageSchema as unknown as ComponentSchema, MaintenancePage);

export function getComponent(componentId: string): RegisteredComponent | undefined {
  return registry.get(componentId);
}

export function getAllComponents(): RegisteredComponent[] {
  return Array.from(registry.values());
}

export function getComponentsByCategory(): Record<string, RegisteredComponent[]> {
  const categories: Record<string, RegisteredComponent[]> = {};
  for (const entry of registry.values()) {
    const cat = entry.schema.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(entry);
  }
  return categories;
}
