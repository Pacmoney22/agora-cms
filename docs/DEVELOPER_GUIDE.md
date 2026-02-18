# Developer Guide -- Agora CMS

**Version:** 2.0
**Last Updated:** February 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [Detailed Project Structure](#3-detailed-project-structure)
4. [Local Development Setup](#4-local-development-setup)
5. [Service Deep Dives](#5-service-deep-dives)
   - 5.1 [Content Service (port 3001)](#51-content-service-port-3001)
   - 5.2 [Commerce Service (port 3002)](#52-commerce-service-port-3002)
   - 5.3 [Integration Service (port 3003)](#53-integration-service-port-3003)
   - 5.4 [Shipping Gateway (port 3004)](#54-shipping-gateway-port-3004)
   - 5.5 [Course Service (port 3005)](#55-course-service-port-3005)
6. [Frontend App Architecture](#6-frontend-app-architecture)
   - 6.1 [Page Builder (port 3100)](#61-page-builder-port-3100)
   - 6.2 [Storefront (port 3200)](#62-storefront-port-3200)
   - 6.3 [Admin Dashboard (port 3300)](#63-admin-dashboard-port-3300)
7. [Database Schema](#7-database-schema)
8. [Component System](#8-component-system)
9. [API Reference](#9-api-reference)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Caching Strategy](#11-caching-strategy)
12. [Search Integration](#12-search-integration)
13. [File Storage](#13-file-storage)
14. [Testing Guide](#14-testing-guide)
15. [CI/CD Pipeline](#15-cicd-pipeline)
16. [Database Migrations](#16-database-migrations)
17. [Creating Custom Components](#17-creating-custom-components)
18. [Extending the API](#18-extending-the-api)
19. [Environment Variables](#19-environment-variables)
20. [Troubleshooting](#20-troubleshooting)
21. [Contributing](#21-contributing)

---

## 1. Architecture Overview

Agora CMS is a monorepo-based, microservices-oriented platform combining a headless CMS, e-commerce engine, LMS (Learning Management System), and a drag-and-drop visual page builder. The architecture uses an API gateway pattern with event-driven communication between services.

### High-Level Request Flow

```
Browser / Client
       |
       v
+--------------------+
|  Kong API Gateway  |  :8000 (proxy)  :8001 (admin)
|  Rate Limiting     |
|  CORS Management   |
+--------------------+
       |
       |--- /api/v1/pages, /api/v1/media, /api/v1/templates, /api/v1/navigation,
       |    /api/v1/redirects, /api/v1/sitemap, /api/v1/seo, /api/v1/auth
       |    --> Content Service (:3001)
       |
       |--- /api/v1/products, /api/v1/categories, /api/v1/cart,
       |    /api/v1/checkout, /api/v1/orders, /api/v1/coupons
       |    --> Commerce Service (:3002)
       |
       |--- /api/v1/integrations, /api/v1/analytics,
       |    /api/v1/webhooks
       |    --> Integration Service (:3003)
       |
       |--- /api/v1/shipping
       |    --> Shipping Gateway (:3004)
       |
       +--- (direct) /api/v1/courses, /api/v1/enrollments, etc.
            --> Course Service (:3005)
```

### Inter-Service Communication

```
+------------------+       Kafka Topics        +------------------+
| Commerce Service | ------ commerce.events --> | Course Service   |
|   (Producer)     |                            |   (Consumer)     |
+------------------+                            +------------------+
        |                                              |
        v                                              v
+------------------+                            +------------------+
|   PostgreSQL     | <---- Shared Database ----> |   PostgreSQL     |
|   (agora_cms)  |                            |   (same DB)      |
+------------------+                            +------------------+
        |
        v
+------------------+     +------------------+     +------------------+
|      Redis       |     |  Elasticsearch   |     |   MinIO (S3)     |
|  Cache / Tokens  |     |  Product Search  |     |  Media Storage   |
|     :6379        |     |     :9200        |     |  :9000 / :9001   |
+------------------+     +------------------+     +------------------+
```

### Key Design Decisions

- **Monorepo with Turborepo**: All services, apps, and packages live in one repository managed by pnpm workspaces and Turborepo for orchestrated builds
- **Shared database**: All services share one PostgreSQL database via a centralized Prisma schema in `packages/database`
- **Event-driven decoupling**: Services communicate asynchronously through Kafka events (e.g., `ORDER_CREATED` triggers auto-enrollment in the Course Service)
- **API Gateway**: Kong provides centralized routing, CORS, and rate limiting without service-level awareness
- **Component tree architecture**: Pages are stored as JSON component trees, rendered by both the Page Builder (editing) and Storefront (display)

---

## 2. Complete Technology Stack

### Runtime & Build Tools

| Technology | Version | Purpose |
|---|---|---|
| Node.js | >=20.0.0 | Runtime for all services and apps |
| pnpm | 10.29.2 | Package manager (workspace support) |
| Turborepo | ^2.4.0 | Monorepo build orchestration |
| TypeScript | ^5.7.0 | Type safety across entire codebase |

### Backend (NestJS Services)

| Technology | Version | Purpose |
|---|---|---|
| NestJS Core | ^10.3.0 - ^10.4.0 | Backend framework for all 5 services |
| NestJS Config | ^3.1.0 - ^3.3.0 | Environment configuration |
| NestJS Swagger | ^7.2.0 - ^7.4.0 | OpenAPI documentation |
| NestJS JWT | ^10.2.0 | JWT token management |
| NestJS Passport | ^10.0.3 | Authentication strategies |
| NestJS Schedule | ^4.0.0 - ^4.1.0 | Cron job scheduling |
| Prisma Client | ^6.3.0 - ^6.19.2 | Database ORM |
| class-validator | ^0.14.1 | DTO validation |
| class-transformer | ^0.5.1 | Request transformation |
| bcrypt | ^5.1.1 | Password hashing |
| ioredis | ^5.3.2 - ^5.4.0 | Redis client |
| kafkajs | ^2.2.0 - ^2.2.4 | Kafka producer/consumer |
| @elastic/elasticsearch | ^8.12.0 | Product search |
| @aws-sdk/client-s3 | ^3.490.0 | S3/MinIO file storage |
| @aws-sdk/s3-request-presigner | ^3.490.0 | Presigned URL generation |
| sharp | ^0.33.2 | Image processing (WebP, thumbnails) |
| stripe | ^17.5.0 | Payment processing |
| pdfkit | ^0.15.0 | PDF certificate generation |
| passport-jwt | ^4.0.1 | JWT authentication strategy |
| rxjs | ^7.8.1 | Reactive extensions |
| uuid | ^9.0.0 - ^11.0.0 | UUID generation |
| zod | ^3.24.0 | Schema validation (shared package) |

### Frontend (Next.js Apps)

| Technology | Version | Purpose |
|---|---|---|
| Next.js | ^14.2.15 | React meta-framework (App Router) |
| React | ^18.3.1 | UI library |
| Tailwind CSS | ^3.4.13 | Utility-first CSS |
| Zustand | ^4.5.5 | State management (Page Builder) |
| Immer | ^10.1.1 | Immutable state updates |
| @dnd-kit/core | ^6.1.0 | Drag-and-drop framework |
| @dnd-kit/sortable | ^8.0.0 | Sortable drag-and-drop |
| @tanstack/react-query | ^5.59.0 | Server state management (Admin) |
| react-hot-toast | ^2.4.1 | Toast notifications (Admin) |
| qrcode.react | ^4.2.0 | QR code generation (Admin) |
| clsx | ^2.1.0 - ^2.1.1 | Class name utility |
| lucide-react | ^0.468.0 | Icon library (UI package) |
| embla-carousel-react | ^8.5.0 | Carousel component |
| react-intersection-observer | ^9.13.0 | Lazy loading |
| prismjs | ^1.29.0 | Code syntax highlighting |
| chart.js | ^4.4.0 | Chart rendering |
| react-chartjs-2 | ^5.2.0 | React Chart.js wrapper |

### Infrastructure

| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 16-alpine | Primary database |
| Redis | 7-alpine | Caching, session storage, rate limiting |
| Elasticsearch | 8.12.0 | Full-text product search |
| Apache Kafka (Confluent) | 7.6.0 | Event streaming / message broker |
| MinIO | latest | S3-compatible object storage |
| Kong | 3.6 | API gateway |

### Testing

| Technology | Version | Purpose |
|---|---|---|
| Jest | ^29.7.0 | Unit & integration test runner |
| ts-jest | ^29.1.2 - ^29.2.0 | TypeScript Jest transform |
| Supertest | ^6.3.4 - ^7.0.0 | HTTP assertion testing |
| Playwright | (config present) | End-to-end browser testing |
| Prettier | ^3.5.0 | Code formatting |

---

## 3. Detailed Project Structure

```
agora-cms/
|-- .github/
|   +-- workflows/
|       +-- ci.yml                    # GitHub Actions CI pipeline
|
|-- apps/
|   |-- admin-dashboard/             # Admin panel (Next.js :3300)
|   |   |-- src/
|   |   |   |-- app/                  # App Router pages (60+ routes)
|   |   |   |   |-- dashboard/       # Dashboard overview
|   |   |   |   |-- pages/           # CMS page management
|   |   |   |   |-- products/        # Product CRUD (list, [id], new)
|   |   |   |   |-- orders/          # Order management (list, [id])
|   |   |   |   |-- categories/      # Category management
|   |   |   |   |-- coupons/         # Coupon management
|   |   |   |   |-- courses/         # Course management ([id]/curriculum, [id]/quizzes)
|   |   |   |   |-- enrollments/     # Enrollment tracking
|   |   |   |   |-- grading/         # Quiz grading
|   |   |   |   |-- events/          # Event management (attendees, badges, check-in, etc.)
|   |   |   |   |-- media/           # Media library
|   |   |   |   |-- navigation/      # Navigation menu editor
|   |   |   |   |-- redirects/       # URL redirect rules
|   |   |   |   |-- seo/             # SEO tools
|   |   |   |   |-- settings/        # Site settings (general, appearance, analytics, etc.)
|   |   |   |   |-- users/           # User management
|   |   |   |   |-- articles/        # Blog articles
|   |   |   |   |-- reviews/         # Product reviews
|   |   |   |   |-- forms/           # Form submissions
|   |   |   |   |-- files/           # File management
|   |   |   |   +-- ...              # Additional admin routes
|   |   |   +-- components/
|   |   |       |-- layout/          # Sidebar, navigation
|   |   |       +-- providers/       # QueryProvider (TanStack Query)
|   |   |-- next.config.js
|   |   +-- package.json
|   |
|   |-- page-builder/                # Visual page builder (Next.js :3100)
|   |   |-- src/
|   |   |   |-- app/
|   |   |   |   +-- page.tsx         # Single-page builder application
|   |   |   |-- components/
|   |   |   |   |-- canvas/          # CanvasRenderer, ComponentWrapper, DropZone
|   |   |   |   +-- sidebar/         # ComponentPalette, PropertiesPanel, TreeNavigator
|   |   |   |-- lib/
|   |   |   |   |-- component-registry.ts  # Maps componentId -> React component + schema
|   |   |   |   +-- tree-operations.ts     # Tree manipulation utilities
|   |   |   +-- stores/
|   |   |       |-- builder-store.ts       # Zustand store for component tree state
|   |   |       +-- history-store.ts       # Undo/redo with Immer patches
|   |   |-- next.config.js
|   |   +-- package.json
|   |
|   +-- storefront/                   # Customer-facing store (Next.js :3200)
|       |-- src/
|       |   |-- app/
|       |   |   |-- page.tsx          # Homepage
|       |   |   |-- products/         # Product listing and detail ([id])
|       |   |   |-- cart/             # Shopping cart
|       |   |   |-- checkout/         # Checkout flow + success page
|       |   |   |-- courses/          # Course catalog + detail ([slug])
|       |   |   |-- learn/            # Learning portal ([enrollmentId], quiz, certificate)
|       |   |   |-- dashboard/        # Student dashboard (my-courses)
|       |   |   +-- certificates/     # Certificate verification ([code])
|       |   |-- components/
|       |   |   |-- renderers/        # component-renderer.tsx (runtime component tree renderer)
|       |   |   |-- site-header.tsx
|       |   |   +-- site-footer.tsx
|       |   +-- lib/
|       |       |-- cart-context.tsx   # Cart state provider
|       |       +-- content-client.ts # API client for content-service
|       |-- next.config.js
|       +-- package.json
|
|-- services/
|   |-- content-service/              # CMS + Auth API (:3001)
|   |   +-- src/
|   |       |-- main.ts               # NestJS bootstrap, Swagger, CORS
|   |       |-- app.module.ts          # Module imports
|   |       |-- common/
|   |       |   +-- guards/
|   |       |       |-- jwt-auth.guard.ts   # JWT authentication guard
|   |       |       +-- roles.guard.ts      # Role-based authorization guard
|   |       +-- modules/
|   |           |-- auth/             # JWT auth (register, login, refresh, logout)
|   |           |-- users/            # User management
|   |           |-- pages/            # Page CRUD with versioning
|   |           |-- media/            # Media upload with S3 + image processing
|   |           |-- templates/        # Page templates
|   |           |-- versions/         # Page version history
|   |           |-- navigation/       # Site navigation menus
|   |           |-- redirects/        # URL redirect rules
|   |           |-- seo/              # SEO config, analyzer, structured data
|   |           +-- settings/         # Site-wide settings (theme, general, etc.)
|   |
|   |-- commerce-service/             # E-commerce API (:3002)
|   |   +-- src/
|   |       |-- main.ts
|   |       |-- app.module.ts
|   |       +-- modules/
|   |           |-- products/         # Product CRUD + variants + configuration
|   |           |-- variants/         # Variant management
|   |           |-- categories/       # Category hierarchy
|   |           |-- cart/             # Shopping cart (Redis-backed)
|   |           |-- checkout/         # Checkout orchestration
|   |           |-- orders/           # Order lifecycle management
|   |           |-- fulfillment/      # Order fulfillment (physical + digital)
|   |           |-- inventory/        # Inventory tracking + reservations
|   |           |-- coupons/          # Coupon engine (percentage, fixed, BOGO, etc.)
|   |           |-- license-keys/     # License key pools + claiming
|   |           +-- service-bookings/ # Service product booking management
|   |
|   |-- integration-service/          # Third-party integrations (:3003)
|   |   +-- src/
|   |       |-- main.ts
|   |       |-- app.module.ts
|   |       +-- modules/
|   |           |-- stripe/           # Stripe payment gateway
|   |           |-- analytics/        # GA4 analytics integration
|   |           |-- salesforce/       # Salesforce CRM connector
|   |           +-- webhooks/         # Inbound webhook handler (Stripe)
|   |
|   |-- shipping-gateway/             # Shipping API (:3004)
|   |   +-- src/
|   |       |-- main.ts
|   |       |-- app.module.ts
|   |       +-- modules/
|   |           |-- rates/            # Rate aggregation from carriers
|   |           |-- labels/           # Shipping label generation (single + batch)
|   |           |-- tracking/         # Package tracking
|   |           |-- bin-packing/      # Box optimization algorithm
|   |           |-- address-validation/  # (placeholder)
|   |           +-- rules/            # (placeholder)
|   |
|   +-- course-service/               # LMS API (:3005)
|       +-- src/
|           |-- main.ts
|           |-- app.module.ts
|           |-- app.controller.ts
|           +-- modules/
|               |-- courses/          # Course CRUD + publish/unpublish
|               |-- sections/         # Course section management
|               |-- lessons/          # Lesson content management
|               |-- enrollments/      # Student enrollment + Kafka consumer
|               |-- progress/         # Lesson-level progress tracking
|               |-- quizzes/          # Quiz CRUD + attempts + grading
|               +-- certificates/     # Certificate generation + verification
|
|-- packages/
|   |-- database/                     # Shared Prisma schema + migrations
|   |   |-- prisma/
|   |   |   |-- schema.prisma        # Complete database schema (30+ models)
|   |   |   +-- seed.ts              # Database seed script
|   |   |-- src/
|   |   |   +-- index.ts             # Prisma client export
|   |   +-- package.json
|   |
|   |-- shared/                       # Shared types, constants, events, validators
|   |   |-- src/
|   |   |   |-- index.ts             # Barrel export
|   |   |   |-- types/
|   |   |   |   |-- page.ts          # ComponentInstance, ComponentTree, PageDto
|   |   |   |   |-- product.ts       # ProductDto, ProductType, ProductVariant
|   |   |   |   |-- order.ts         # OrderDto, OrderStatus
|   |   |   |   |-- user.ts          # UserRole, JwtPayload, AuthTokens
|   |   |   |   |-- cart.ts          # CartDto, CartItem, CartItemConfiguration
|   |   |   |   |-- shipping.ts      # ICarrierAdapter, ShippingRate, TrackingResult
|   |   |   |   +-- integration.ts   # IPaymentGateway, IAnalyticsProvider, ICRMConnector
|   |   |   |-- constants/
|   |   |   |   |-- roles.ts         # ROLE_HIERARCHY, hasMinimumRole()
|   |   |   |   |-- product-types.ts # Product type constants
|   |   |   |   +-- order-status.ts  # Order status constants
|   |   |   |-- events/
|   |   |   |   +-- event-types.ts   # Kafka event definitions (EVENTS const)
|   |   |   |-- validators/
|   |   |   |   +-- pagination.ts    # Pagination validation
|   |   |   +-- utils/
|   |   |       |-- slug.ts          # generateSlug utility
|   |   |       +-- price.ts         # Price formatting utilities
|   |   +-- package.json
|   |
|   |-- ui/                           # 85 shared React components
|   |   |-- src/
|   |   |   |-- index.ts             # Barrel export of all components
|   |   |   |-- primitives/
|   |   |   |   +-- Button.tsx
|   |   |   |-- components/
|   |   |   |   |-- shared/          # SharedPropsWrapper.tsx
|   |   |   |   |-- layout/          # Container, Section, Grid, Divider, Spacer, Tabs, Accordion, Columns
|   |   |   |   |-- typography/      # Heading, Paragraph, RichText, Blockquote, CodeBlock, List
|   |   |   |   |-- media/           # Image, Video, Gallery, Carousel, BackgroundVideo, AudioPlayer
|   |   |   |   |-- marketing/       # HeroBanner, CTABlock, FeatureGrid, Testimonial, PricingTable, etc.
|   |   |   |   |-- commerce/        # ProductCard, ProductGrid, CartWidget, FeaturedProducts, etc.
|   |   |   |   |-- navigation/      # Header, Footer, Breadcrumb, SidebarMenu, MegaMenu, TableOfContents
|   |   |   |   |-- forms/           # ContactForm, NewsletterSignup, SearchBar, LoginRegister, FormWizard
|   |   |   |   |-- data/            # DataTable, Chart, StatsCounter, ProgressBar, Timeline, ComparisonTable
|   |   |   |   |-- social/          # SocialLinks, ShareButtons, Embed, Map
|   |   |   |   |-- utility/         # ButtonBlock, IconBlock, Alert, CookieConsent, BackToTop, Modal
|   |   |   |   |-- blog/            # BlogPostCard, BlogGrid, AuthorBio, RelatedPosts, PostNavigation, Comments
|   |   |   |   |-- trust/           # TrustBadges, ReviewAggregate, ReviewList, CaseStudiesGrid, Awards
|   |   |   |   |-- interactive/     # Toast, AnimatedTabs, Calculator, SearchableFAQ, Lightbox
|   |   |   |   +-- global/          # SiteMeta, ErrorPage, MaintenancePage
|   |   |   +-- schemas/             # JSON schema files for each component (85 .schema.json files)
|   |   +-- package.json
|   |
|   |-- tsconfig/                     # Shared TypeScript configurations
|   |   |-- base.json                # Base config (ES2022, strict, bundler resolution)
|   |   |-- nextjs.json              # Next.js-specific config
|   |   |-- nestjs.json              # NestJS-specific config
|   |   +-- library.json             # Library package config
|   |
|   +-- eslint-config/               # Shared ESLint configuration
|       |-- index.js
|       +-- package.json
|
|-- docker/
|   |-- docker-compose.yml           # All infrastructure services
|   +-- kong/
|       +-- kong.yml                  # Kong declarative configuration
|
|-- e2e/
|   |-- playwright.config.ts         # Playwright E2E test configuration
|   +-- tests/                       # E2E test files
|
|-- docs/
|   |-- DEVELOPER_GUIDE.md           # This file
|   |-- ADMIN_GUIDE.md               # Administrator guide
|   +-- END_USER_GUIDE.md            # End-user guide
|
|-- .env.example                      # Environment variable template
|-- turbo.json                        # Turborepo task pipeline
|-- pnpm-workspace.yaml              # Workspace package declarations
+-- package.json                      # Root package scripts
```

---

## 4. Local Development Setup

### Prerequisites

- **Node.js** v20.0.0 or later
- **pnpm** v9.0.0 or later (v10.29.2 recommended)
- **Docker** and **Docker Compose** (for infrastructure services)
- **Git**

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd agora-cms
pnpm install
```

### Step 2: Environment Configuration

```bash
cp .env.example .env
```

The default values in `.env.example` work out-of-the-box with the Docker Compose setup. No changes are required for local development unless you want to enable third-party integrations (Stripe, GA4, Salesforce, shipping carriers).

### Step 3: Start Infrastructure

```bash
# Start all required infrastructure services
docker compose -f docker/docker-compose.yml up -d

# Verify all services are healthy
docker compose -f docker/docker-compose.yml ps
```

This starts:

| Service | Port | Health Check |
|---|---|---|
| PostgreSQL 16 | 5432 | `pg_isready` |
| Redis 7 | 6379 | `redis-cli ping` |
| Elasticsearch 8.12 | 9200 | HTTP cluster health |
| Kafka (KRaft mode) | 9092 | `kafka-topics --list` |
| MinIO | 9000 (API), 9001 (Console) | `mc ready local` |
| Kong Gateway | 8000 (proxy), 8001 (admin) | Depends on postgres, redis |

MinIO auto-initializes with two buckets: `agora-media` (public download) and `agora-labels` (private).

**Optional debug tools** (start separately):

```bash
docker compose -f docker/docker-compose.yml --profile debug up -d

# Kafka UI:         http://localhost:8080
# Redis Commander:  http://localhost:8081
```

### Step 4: Generate Prisma Client and Migrate

```bash
# Generate the Prisma client
pnpm --filter @agora-cms/database db:generate

# Run database migrations (creates all tables)
pnpm db:migrate

# Seed the database with demo data
pnpm db:seed
```

### Step 5: Start All Services

```bash
# Start everything in development mode (hot reload)
pnpm dev
```

This starts all 5 backend services and 3 frontend apps simultaneously via Turborepo. You can also start individual services:

```bash
# Start only a specific service
pnpm --filter @agora-cms/content-service dev
pnpm --filter @agora-cms/commerce-service dev
pnpm --filter @agora-cms/page-builder dev
```

### Step 6: Verify

| Application | URL |
|---|---|
| Page Builder | http://localhost:3100 |
| Storefront | http://localhost:3200 |
| Admin Dashboard | http://localhost:3300 |
| Content Service Swagger | http://localhost:3001/docs |
| Commerce Service Swagger | http://localhost:3002/docs |
| Integration Service Swagger | http://localhost:3003/api/docs |
| Shipping Gateway Swagger | http://localhost:3004/api/docs |
| Course Service Swagger | http://localhost:3005/api |
| Kong Gateway (proxied APIs) | http://localhost:8000/api/v1/... |
| MinIO Console | http://localhost:9001 |
| Prisma Studio | `pnpm db:studio` (opens browser) |

### Seed User Accounts

The seed script creates one user per role. All accounts use the password `Password123!`:

| Email | Role |
|---|---|
| viewer@agora-cms.dev | viewer |
| editor@agora-cms.dev | editor |
| manager@agora-cms.dev | store_manager |
| admin@agora-cms.dev | admin |
| super@agora-cms.dev | super_admin |

---

## 5. Service Deep Dives

### 5.1 Content Service (port 3001)

**Package:** `@agora-cms/content-service`
**Bootstrap:** `services/content-service/src/main.ts`
**Swagger:** http://localhost:3001/docs

The content service is the core CMS engine. It manages pages, media assets, templates, navigation menus, URL redirects, SEO configuration, site settings, and user authentication.

#### Modules

| Module | Path | Purpose |
|---|---|---|
| AuthModule | `modules/auth/` | JWT authentication (register, login, refresh, logout, profile) |
| UsersModule | `modules/users/` | User CRUD |
| PagesModule | `modules/pages/` | Page CRUD with versioning, publish/unpublish, rollback |
| MediaModule | `modules/media/` | File upload to MinIO/S3 with WebP conversion + responsive variants |
| TemplatesModule | `modules/templates/` | Create templates from pages, instantiate pages from templates |
| VersionsModule | `modules/versions/` | Page version history |
| NavigationModule | `modules/navigation/` | Navigation menu management (header, footer, sidebar, mobile) |
| RedirectsModule | `modules/redirects/` | URL redirect rules (301/302) |
| SeoModule | `modules/seo/` | Per-page SEO, sitemap generation, robots.txt, SEO analyzer (12 checks, 0-100 score), JSON-LD structured data |
| SettingsModule | `modules/settings/` | Key-value site settings (general, theme, analytics, payments, system), public endpoint for storefront, theme CSS endpoint |
| PassesModule | `modules/passes/` | Apple Wallet PKPass generation for event tickets with QR codes |

#### Authorization Guards

The content service implements specialized guards for event management:

- **EventStaffGuard**: Requires `event_staff` role for event management endpoints
- **ExhibitorGuard**: Requires `exhibitor` role for exhibitor portal access
- **KioskGuard**: Requires `kiosk` role for self-service kiosk operations (check-in, badge printing)

#### Key Features

- **Page Versioning**: Every page update auto-creates a version snapshot. Supports rollback to any previous version.
- **Image Processing**: Uploaded images are auto-converted to WebP with responsive variants (thumbnail, medium, large) using Sharp.
- **SEO Analyzer**: 12-point on-page SEO analysis with composite score (0-100) and actionable suggestions.
- **Structured Data**: Auto-generates JSON-LD markup (WebPage/Article + BreadcrumbList).
- **Theme CSS**: Generates CSS custom properties from theme settings, served with a 5-minute cache header.
- **Apple Wallet Passes**: Generates PKPass files for event tickets with QR codes, stores in S3, and provides public download URLs.

#### Caching Strategy

- **Auth tokens**: Refresh tokens stored in Redis with configurable TTL (default 7 days)
- **Settings**: Theme CSS served with `Cache-Control: public, max-age=300`

### 5.2 Commerce Service (port 3002)

**Package:** `@agora-cms/commerce-service`
**Bootstrap:** `services/commerce-service/src/main.ts`
**Swagger:** http://localhost:3002/docs

The commerce service handles the full e-commerce lifecycle from product catalog through checkout and order fulfillment.

#### Modules

| Module | Path | Purpose |
|---|---|---|
| ProductsModule | `modules/products/` | Product CRUD, variant management, variant auto-generation, configurable product resolution |
| VariantsModule | `modules/variants/` | Standalone variant operations |
| CategoriesModule | `modules/categories/` | Hierarchical category tree management |
| CartModule | `modules/cart/` | Redis-backed shopping cart with x-cart-id header |
| CheckoutModule | `modules/checkout/` | Checkout orchestration with inventory reservation |
| OrdersModule | `modules/orders/` | Order lifecycle (pending -> confirmed -> shipped -> delivered), refunds |
| FulfillmentModule | `modules/fulfillment/` | Physical shipment + digital delivery fulfillment |
| InventoryModule | `modules/inventory/` | Stock tracking, low-stock alerts, inventory reservations with TTL |
| CouponsModule | `modules/coupons/` | Coupon engine (percentage, fixed_amount, free_shipping, buy_x_get_y) |
| LicenseKeysModule | `modules/license-keys/` | License key pool management for virtual products |
| ServiceBookingsModule | `modules/service-bookings/` | Service product booking, availability, rescheduling |

#### Product Types

The system supports 5 product types:

| Type | Description |
|---|---|
| `physical` | Shipped products requiring fulfillment |
| `virtual` | Digital products (license keys, downloads) |
| `service` | Bookable services with time slots |
| `configurable` | Products with configuration steps that resolve to a final SKU/price |
| `course` | Course products linking to the LMS |

#### Kafka Events Published

The commerce service publishes events to the `commerce.events` Kafka topic:

- `product.created`, `product.updated`, `product.deleted`
- `cart.updated`, `cart.abandoned`
- `checkout.started`
- `order.created`, `order.confirmed`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.refunded`
- `inventory.updated`, `inventory.low`, `inventory.reserved`

#### Cart Architecture

Carts are identified by an `x-cart-id` header (UUID) and backed by Redis. Cart state includes:
- Items with product details, variant info, configuration data
- Subtotal, item count
- Flags for physical/virtual/service items
- Coupon and discount tracking

#### Inventory Reservations

The inventory system uses a reservation pattern for checkout:

1. `POST /api/v1/inventory/reserve` - Temporarily hold stock for a cart (TTL-based)
2. `POST /api/v1/inventory/reserve/:id/confirm` - Commit reservation after payment
3. `DELETE /api/v1/inventory/reserve/:id` - Cancel reservation (releases stock)

Expired reservations are automatically released.

### 5.3 Integration Service (port 3003)

**Package:** `@agora-cms/integration-service`
**Bootstrap:** `services/integration-service/src/main.ts`
**Swagger:** http://localhost:3003/api/docs

The integration service connects Agora CMS to external platforms. It implements the adapter pattern with automatic stub/real mode switching based on environment variables. When an API key is provided, the real integration is used; otherwise, a stub implementation allows development without live credentials.

#### Modules

| Module | Path | Purpose |
|---|---|---|
| StripeModule | `modules/stripe/` | Payment gateway adapter (implements `IPaymentGateway`) |
| AnalyticsModule | `modules/analytics/` | GA4 tracking and dashboard analytics (implements `IAnalyticsProvider`) |
| SalesforceModule | `modules/salesforce/` | CRM sync for contacts, leads, opportunities (implements `ICRMConnector`) |
| PrintfulModule | `modules/printful/` | Print-on-demand fulfillment (implements `IPrintfulConnector`) |
| WebhooksModule | `modules/webhooks/` | Inbound webhook handler with signature verification |

#### Stripe Integration

**Real Implementation:** `StripePaymentGateway`
**Activation:** Requires `STRIPE_SECRET_KEY` environment variable

Features:
- Payment Intents API with automatic payment methods
- Customer management and metadata storage
- Refund processing
- Webhook signature verification (HMAC-SHA256)

Webhook Events Handled:
- `payment_intent.succeeded` - Payment success
- `payment_intent.payment_failed` - Payment failure
- `charge.refunded` - Refund processed

#### Google Analytics 4 Integration

**Real Implementation:** `GoogleAnalyticsProvider`
**Activation:** Requires `GA4_MEASUREMENT_ID` and `GA4_API_SECRET`

Features:
- Measurement Protocol v2 for server-side event tracking
- Data API (BetaAnalyticsDataClient) for dashboard analytics
- Real-time metrics: active users, top pages, traffic sources
- E-commerce funnel analysis and revenue tracking

#### Salesforce Integration

**Real Implementation:** `SalesforceConnector`
**Activation:** Requires `SALESFORCE_USERNAME`, `SALESFORCE_CLIENT_ID`, and `SALESFORCE_PRIVATE_KEY`

Features:
- JWT OAuth authentication with Connected App
- Contact synchronization with custom field mapping (CMS_User_ID__c)
- Lead creation and tracking
- Opportunity management
- Automatic upsert based on external ID

#### Printful Integration

**Real Implementation:** `PrintfulConnector`
**Activation:** Requires `PRINTFUL_API_KEY`

Features:
- Product catalog sync with variant mapping
- Order creation and confirmation (draft → pending → fulfilled)
- Real-time shipping rate calculations
- Shipment tracking integration
- Webhook support for order updates

Webhook Events Handled:
- `package_shipped` - Tracking information available
- `order_updated` - Status changes
- `order_failed` - Production issues

Database Models:
- **PrintfulProduct**: Links CMS products to Printful sync variants
- **PrintfulFulfillment**: Tracks order fulfillment status and shipments

#### Adapter Interfaces

All integrations implement typed interfaces from `@agora-cms/shared`:

- **IPaymentGateway**: `createPaymentIntent()`, `confirmPayment()`, `createRefund()`, `createCustomer()`, `handleWebhook()`
- **IAnalyticsProvider**: `trackEvent()`, `trackServerEvent()`, `getDashboardData()`
- **ICRMConnector**: `syncContact()`, `syncLead()`, `syncOpportunity()`, `getFieldMappings()`
- **IPrintfulConnector**: `syncProduct()`, `createOrder()`, `confirmOrder()`, `calculateShippingRates()`, `handleWebhook()`

### 5.4 Shipping Gateway (port 3004)

**Package:** `@agora-cms/shipping-gateway`
**Bootstrap:** `services/shipping-gateway/src/main.ts`
**Swagger:** http://localhost:3004/api/docs

The shipping gateway aggregates rates from multiple carriers, generates shipping labels, and provides package tracking through a carrier adapter pattern.

#### Modules

| Module | Path | Purpose |
|---|---|---|
| RatesModule | `modules/rates/` | Rate aggregation from all enabled carrier adapters + address validation |
| LabelsModule | `modules/labels/` | Single and batch shipping label generation |
| TrackingModule | `modules/tracking/` | Package tracking by tracking number |
| BinPackingModule | `modules/bin-packing/` | Optimal box packing algorithm |

#### Carrier Adapters

Carriers implement the `ICarrierAdapter` interface from `@agora-cms/shared`:

```typescript
interface ICarrierAdapter {
  readonly carrierName: string;
  getRates(request: ShippingRateRequest): Promise<ShippingRate[]>;
  createShipment(params: CreateShipmentParams): Promise<ShipmentResult>;
  getTracking(trackingNumber: string): Promise<TrackingResult>;
  validateAddress(address: AddressValidationRequest): Promise<AddressValidationResult>;
}
```

Supported carriers (feature-flag controlled):
- **UPS** (`UPS_ENABLED`)
- **USPS** (`USPS_ENABLED`)
- **FedEx** (`FEDEX_ENABLED`)
- **DHL** (`DHL_ENABLED`)
- **Stub adapter** (always available for development)

#### Rate Caching

Shipping rates are cached in Redis to avoid repeated carrier API calls for the same origin/destination/package combination.

### 5.5 Course Service (port 3005)

**Package:** `@agora-cms/course-service`
**Bootstrap:** `services/course-service/src/main.ts`
**Swagger:** http://localhost:3005/api

The course service provides full LMS (Learning Management System) functionality including courses, sections, lessons, enrollments, progress tracking, quizzes, and certificates.

#### Modules

| Module | Path | Purpose |
|---|---|---|
| CoursesModule | `modules/courses/` | Course CRUD, publish/unpublish, versioning |
| SectionsModule | `modules/sections/` | Course section (module) management |
| LessonsModule | `modules/lessons/` | Lesson content with video, attachments, versioning. Lesson types: `video`, `text`, `quiz`, `assignment` |
| EnrollmentsModule | `modules/enrollments/` | Student enrollment, Kafka consumer for auto-enrollment |
| ProgressModule | `modules/progress/` | Lesson-level progress tracking with video resume points |
| QuizzesModule | `modules/quizzes/` | Quiz CRUD, question management, attempt submission, auto-grading + manual grading |
| CertificatesModule | `modules/certificates/` | PDF certificate generation (pdfkit), verification by code |
| AssignmentsModule | `modules/assignments/` | Instructor assignments to course sections |
| SubmissionsModule | `modules/submissions/` | Student assignment submissions with grading rubrics |

#### Authorization Guards

The course service implements role-based guards for instructor and administrative access:

- **JwtAuthGuard**: Base JWT authentication using `@nestjs/passport`
- **InstructorGuard**: Requires `instructor` or `course_admin` role
- **CourseAdminGuard**: Requires `course_admin` role for administrative operations

Guards use the scoped role system from the User model to control access to course management endpoints.

#### Kafka Consumer

The course service consumes events from the `commerce.events` Kafka topic via `EnrollmentConsumerService`:

- **Topic:** `commerce.events`
- **Consumer Group:** `course-enrollment-group`
- **Event handled:** `ORDER_CREATED` - Auto-enrolls users in courses when they purchase course products with `autoEnroll: true`

#### Quiz System

The quiz system supports 4 question types:
- `multiple_choice` - Multiple choice with explanations
- `true_false` - True/false with explanations
- `fill_blank` - Fill-in-the-blank with multiple accepted answers
- `essay` - Free-form essay requiring manual grading

**Auto-creation:** When a lesson of type `quiz` is created via the curriculum editor, a quiz is automatically created and linked to that lesson.

**CreateQuizDto** — fields are flat (the service wraps `passingScore`, `maxAttempts`, and `timeLimit` into a `quizConfig` JSONB column internally):

```typescript
{
  title: string;         // required
  description?: string;
  questions: [];         // required (empty array for new quizzes)
  passingScore?: number; // default 70
  maxAttempts?: number;  // default 3
  timeLimit?: number;    // minutes, optional
}
```

> **Important:** Do NOT send nested `quizConfig` or `position` — the DTO validation will reject them.

Grading follows a multi-stage workflow:
1. **Auto-grading**: Multiple choice, true/false, and fill-blank questions are graded immediately
2. **Manual grading**: Essay questions enter `needs_manual_grading` status
3. **Final grading**: Instructor provides points, feedback via `POST /api/v1/attempts/:attemptId/grade`

#### Assignment Submissions

Students submit work for `assignment`-type lessons. Submissions support text content plus optional links.

**Grading workflow:**
1. Student submits via `POST /api/v1/lessons/:lessonId/submissions`
2. Submission enters pending status, appears in the grading queue
3. Instructor reviews via `GET /api/v1/grading/pending-submissions`
4. Instructor grades via `POST /api/v1/submissions/:id/grade` (score, feedback, status: `graded` or `returned`)

#### Section Offerings

Section offerings (delivery instances of a course — on-demand or scheduled) are stored in the **Settings API** under the key `course_sections_registry`, not in the Course database. They are managed via the admin dashboard's Course Sections page and retrieved by the storefront from `GET /api/v1/settings/public`.

#### Settings-Based Registries

Course categories and tags use the same settings-based registry pattern as articles and events:

| Settings Key | Purpose | Admin Route |
|---|---|---|
| `course_categories` | Course category taxonomy (name, slug, description, image, SEO) | `/course-categories` |
| `course_tags` | Course tag taxonomy (name, slug, description, image, color, SEO) | `/course-tags` |
| `course_sections_registry` | Section offerings (on-demand/scheduled delivery) | `/course-sections` |

#### Certificate Generation

Certificates are generated as PDFs using pdfkit, stored in MinIO/S3, and can be verified using a unique verification code via `GET /api/v1/certificates/verify/:code`.

---

## 6. Frontend App Architecture

All three frontend applications use Next.js 14 with the App Router, React 18, and Tailwind CSS 3.

### 6.1 Page Builder (port 3100)

**Package:** `@agora-cms/page-builder`

The page builder is a single-page application (SPA) providing a visual drag-and-drop interface for constructing pages from the 92-component library.

#### State Management

Uses **Zustand** with **Immer** middleware for immutable state updates:

- **`builder-store.ts`** - Core state:
  - `componentTree` - The page's component tree structure
  - `selectedInstanceId` - Currently selected component
  - `clipboard` - Copy/paste buffer
  - `responsiveMode` - Desktop/tablet/mobile preview
  - `isDirty` - Unsaved changes flag
  - Actions: `insertComponent`, `moveComponent`, `removeComponent`, `updateComponentProps`, `duplicateComponent`, `copyComponent`, `pasteComponent`

- **`history-store.ts`** - Undo/redo system:
  - Uses Immer patches for efficient state diffing
  - 100-level undo stack
  - Actions: `pushState`, `undo`, `redo`, `clear`

#### Key Components

- **CanvasRenderer** (`components/canvas/CanvasRenderer.tsx`) - Renders the component tree with drag-and-drop zones using @dnd-kit
- **ComponentWrapper** (`components/canvas/ComponentWrapper.tsx`) - Wraps each component with selection UI and drag handle
- **DropZone** (`components/canvas/DropZone.tsx`) - Drop targets between components
- **ComponentPalette** (`components/sidebar/ComponentPalette.tsx`) - Draggable component picker organized by category
- **PropertiesPanel** (`components/sidebar/PropertiesPanel.tsx`) - Property editor driven by component schemas
- **TreeNavigator** (`components/sidebar/TreeNavigator.tsx`) - Visual component tree hierarchy

#### Component Registry

Located at `src/lib/component-registry.ts`, the registry maps component IDs to their React implementations and JSON schemas:

```typescript
interface RegisteredComponent {
  component: React.ComponentType<any>;
  schema: ComponentSchema;
}

// Lookup functions
getComponent(componentId: string): RegisteredComponent | undefined
getAllComponents(): RegisteredComponent[]
getComponentsByCategory(): Record<string, RegisteredComponent[]>
```

### 6.2 Storefront (port 3200)

**Package:** `@agora-cms/storefront`

The storefront is the customer-facing website. It renders CMS pages dynamically, displays the product catalog, provides a shopping cart and checkout flow, and hosts the learning portal.

#### Routes

| Route | Purpose |
|---|---|
| `/` | Homepage (rendered from CMS page) |
| `/products` | Product catalog listing |
| `/products/[id]` | Product detail page |
| `/cart` | Shopping cart |
| `/checkout` | Checkout flow |
| `/checkout/success` | Order confirmation |
| `/courses` | Course catalog |
| `/courses/[slug]` | Course detail page |
| `/learn/[enrollmentId]` | Learning portal (course player) |
| `/learn/[enrollmentId]/quiz/[quizId]` | Quiz taking |
| `/learn/[enrollmentId]/certificate` | Certificate view |
| `/learn/[enrollmentId]/lesson/[lessonId]/discussions` | Lesson discussions |
| `/dashboard/my-courses` | Student dashboard |
| `/certificates/verify/[code]` | Public certificate verification |

#### Runtime Component Rendering

The storefront uses `ComponentRenderer` (`src/components/renderers/component-renderer.tsx`) to render CMS page content at runtime:

1. Fetches page data from the content service (includes `componentTree` JSON)
2. Recursively walks the tree starting from `root`
3. Looks up each `componentId` in the local `componentRegistry`
4. Renders the corresponding React component with its props
5. Unknown components display a warning placeholder

Custom components can be registered at runtime:

```typescript
import { registerComponent } from '@/components/renderers/component-renderer';

registerComponent('my-custom-widget', ({ props, children }) => (
  <div className="custom-widget">{props.title}</div>
));
```

#### Features

- **Dynamic metadata**: Root layout fetches site settings to generate SEO-optimized `<head>` tags
- **Theme CSS**: Injects CSS custom properties from the content service's theme endpoint
- **Google Analytics**: Conditionally loads GA4 based on site settings
- **Structured data**: Generates Organization schema.org JSON-LD
- **Cart context**: React Context provider for cart state management

### 6.3 Admin Dashboard (port 3300)

**Package:** `@agora-cms/admin-dashboard`

The admin dashboard provides comprehensive management for all CMS, commerce, and LMS functionality.

#### State Management

Uses **TanStack React Query** (`@tanstack/react-query` v5) for server state management, providing:
- Automatic caching and background refetching
- Optimistic updates
- Request deduplication

#### Routes (60+)

The admin dashboard has the most extensive routing of all three apps:

**Content Management:**
- `/pages` - CMS page list
- `/media` - Media library
- `/navigation` - Navigation menu editor
- `/redirects` - URL redirect management
- `/seo` - SEO tools
- `/articles` - Blog article management
- `/article-categories`, `/article-tags` - Article taxonomy

**Commerce:**
- `/products` - Product list
- `/products/new` - Create product
- `/products/[id]` - Edit product
- `/categories` - Category management
- `/orders` - Order list
- `/orders/[id]` - Order detail
- `/coupons` - Coupon management
- `/product-tags`, `/product-feeds` - Product taxonomy and feeds
- `/reviews` - Product review moderation

**LMS:**
- `/courses` - Course list
- `/courses/[id]/edit` - Course editor (MediaPicker thumbnail, category/tag selectors)
- `/courses/[id]/curriculum` - Course curriculum editor (auto-creates quizzes for quiz-type lessons)
- `/courses/[id]/quizzes` - Quiz management
- `/course-categories` - Course category registry management
- `/course-tags` - Course tag registry management
- `/enrollments` - Enrollment tracking
- `/grading` - Pending quiz and assignment grading queue
- `/course-sections` - Section offering management

**Events:**
- `/events` - Event list
- `/events/new` - Create event
- `/events/[id]` - Event detail
- `/events/[id]/sessions` - Event sessions
- `/events/[id]/attendees` - Attendee management
- `/events/[id]/badges` - Badge management
- `/events/[id]/check-in` - Check-in management
- `/events/[id]/sponsors` - Sponsor management
- `/events/[id]/surveys` - Survey management
- `/events/[id]/exhibitor-scanner` - Exhibitor QR scanner
- `/events/[id]/session-scanner` - Session attendance scanner
- `/event-categories`, `/event-tags` - Event taxonomy

**Settings:**
- `/settings/general` - Site name, logo, favicon
- `/settings/appearance` - Theme customization
- `/settings/seo` - Global SEO settings
- `/settings/analytics` - GA4 configuration
- `/settings/payments` - Stripe configuration
- `/settings/shipping` - Shipping settings
- `/settings/tax` - Tax configuration
- `/settings/email` - Email template configuration
- `/settings/blog` - Blog settings
- `/settings/system` - System configuration
- `/settings/site-status` - Maintenance mode

**Other:**
- `/users` - User management
- `/venues` - Venue management
- `/forms` - Form submission viewer
- `/files` - File management
- `/comments` - Comment moderation
- `/email-templates` - Email template editor

---

## 7. Database Schema

The database uses PostgreSQL 16 with a single schema managed by Prisma. All models use UUIDs as primary keys and include `createdAt`/`updatedAt` timestamps.

### Models Overview

#### User & Auth

| Model | Table | Key Fields | Relations |
|---|---|---|---|
| User | `users` | email (unique), name, passwordHash, role (enum), sfContactId, stripeCustId, failedLogins, lockedUntil, isActive | Pages, Media, Orders, Enrollments |

#### Content

| Model | Table | Key Fields | Relations |
|---|---|---|---|
| Page | `pages` | slug (unique), title, status (enum), seo (JSONB), componentTree (JSONB), version, isTemplate, templateName, parentId, position, publishedAt, scheduledAt | Author, Versions, Parent/Children |
| PageVersion | `page_versions` | pageId, version, componentTree (JSONB), seo (JSONB), title | Page, Author |
| Media | `media` | filename, originalName, mimeType, size, s3Key, altText, dimensions (JSONB), variants (JSONB) | Author |
| Navigation | `navigation` | location (unique: header/footer/sidebar/mobile), items (JSONB) | - |
| Redirect | `redirects` | fromPath (unique), toPath, statusCode (default 301) | - |

#### Commerce

| Model | Table | Key Fields | Relations |
|---|---|---|---|
| Product | `products` | sku (unique), name, slug (unique), description, type (enum), status (enum), pricing (JSONB), shipping/digital/service/configuration/course (JSONB), variantAttrs (JSONB), variants (JSONB), images (JSONB), tags, relatedProducts, crossSells, upSells | Categories, LicenseKeyPools |
| Category | `categories` | name, slug (unique), parentId, position, image, seo (JSONB) | Parent/Children, Products |
| ProductCategory | `product_categories` | productId, categoryId, position | Product, Category |
| Order | `orders` | orderNumber (unique), userId, guestEmail, status (enum), lineItems (JSONB), subtotal/tax/shippingCost/discount/total (cents), currency, shippingAddress/billingAddress (JSONB), stripePaymentIntentId, sfOpportunityId, couponCode, notes | User, Events, Shipments, Bookings, LicenseKeys, Enrollments |
| OrderEvent | `order_events` | orderId, eventType, payload (JSONB) | Order |
| Coupon | `coupons` | code (unique), discountType, discountValue, maxDiscountAmount, appliesTo, productIds/categoryIds/productTypes (arrays), excludedProductIds/excludedCategoryIds, minOrderAmount/maxOrderAmount/minItemCount, maxUsageCount/usagePerUser/currentUsage, stackable/stackGroup/priority, buyXQuantity/getYQuantity, stripeCouponId, startsAt/expiresAt, isActive | - |

#### Shipping

| Model | Table | Key Fields | Relations |
|---|---|---|---|
| Shipment | `shipments` | orderId, carrier, service, trackingNumber, labelUrl, status (enum), shipFrom/shipTo (JSONB), packages (JSONB), rateCents, trackingEvents (JSONB), shippedAt, deliveredAt | Order |

#### Virtual Products

| Model | Table | Key Fields | Relations |
|---|---|---|---|
| LicenseKeyPool | `license_key_pools` | productId, name | Product, Keys |
| LicenseKey | `license_keys` | poolId, keyValue (unique), status (enum), orderId, allocatedAt, expiresAt | Pool, Order |

#### Service Products

| Model | Table | Key Fields | Relations |
|---|---|---|---|
| ServiceBooking | `service_bookings` | orderId, productId, userId, scheduledAt, durationMinutes, status (enum), calendarEventId, notes | Order, User |

#### LMS

| Model | Table | Key Fields | Relations |
|---|---|---|---|
| Course | `courses` | title, slug (unique), description, version, status (enum), courseMetadata (JSONB), thumbnailUrl, instructorName/Bio | Author, Sections, Enrollments, Versions |
| CourseVersion | `course_versions` | courseId, version, title, description, courseMetadata (JSONB) | Course, Author |
| CourseSection | `course_sections` | courseId, title, description, position | Course, Lessons |
| CourseLesson | `course_lessons` | courseSectionId, title, lessonType (video/text/quiz/assignment), version, content (text), videoUrl, videoProvider, videoDuration, attachments (JSONB), position, isFree | Section, Versions, Quizzes, Submissions, Progress |
| CourseLessonVersion | `course_lesson_versions` | lessonId, version, content, videoUrl, attachments (JSONB) | Lesson, Author |
| CourseEnrollment | `course_enrollments` | courseId, userId (unique pair), orderId, status (enum), enrolledAt, completedAt, lastAccessedAt, expiresAt, progressPercent | Course, User, Order, Progress, Attempts, Certificates |
| CourseProgress | `course_progress` | enrollmentId, lessonId (unique pair), isCompleted, completedAt, videoProgress, lastViewedAt | Enrollment, Lesson |
| Quiz | `quizzes` | lessonId, title, description, quizConfig (JSONB), position | Lesson, Questions, Attempts |
| QuizQuestion | `quiz_questions` | quizId, questionType, questionText, questionData (JSONB), points, position, requiresManualGrading | Quiz |
| QuizAttempt | `quiz_attempts` | quizId, enrollmentId, attemptNumber (unique triple), answers (JSONB), score, totalPoints, passed, gradingStatus, gradedBy | Quiz, Enrollment, Grader |
| Certificate | `certificates` | enrollmentId, certificateUrl, certificateMediaId, issuedAt, verificationCode (unique) | Enrollment, Media |

#### Integration & System

| Model | Table | Key Fields | Relations |
|---|---|---|---|
| Integration | `integrations` | type (unique: stripe/ga4/salesforce), config (JSONB), credentials (encrypted bytes), status, lastSyncAt | - |
| SyncLog | `sync_log` | integration, direction, entityType, entityId, status (enum), errorMsg, durationMs | - |
| SiteSettings | `site_settings` | key (unique: general/theme/seo/analytics/payments/system), value (JSONB) | - |
| ProcessedEvent | `processed_events` | id (Stripe event ID), source, processedAt | - |
| AuditLog | `audit_logs` | userId, action, resourceType, resourceId, details (JSONB), ipAddress, result | User |

### Key Enums

```
UserRole:            customer, viewer, editor, store_manager, admin, super_admin
ScopedRoles:         event_staff, exhibitor, kiosk, course_admin, instructor
PageStatus:          draft, review, published, archived
ProductType:         physical, virtual, service, configurable, course, affiliate, printful
ProductStatus:       draft, active, archived
OrderStatus:         pending, confirmed, processing, shipped, in_transit, delivered,
                     completed, cancelled, refunded, returned
LicenseKeyStatus:    available, allocated, revoked
ServiceBookingStatus: confirmed, rescheduled, completed, cancelled, no_show
ShipmentStatus:      label_created, picked_up, in_transit, out_for_delivery, delivered, exception
CourseStatus:        draft, published, archived
EnrollmentStatus:    active, completed, suspended
SyncStatus:          success, partial, failed
```

### Key Indexes

- `pages`: slug+status, status, parentId, isTemplate, scheduledAt
- `products`: type+status, slug, sku, status
- `orders`: userId+status, orderNumber, status, createdAt
- `shipments`: orderId, status, trackingNumber
- `course_enrollments`: courseId+userId (unique), userId+status, courseId
- `quiz_attempts`: enrollmentId, gradingStatus
- `audit_logs`: userId, action, resourceType+resourceId, createdAt

---

## 8. Component System

### Architecture

The UI component system uses a **schema-driven** architecture where each component has two parts:

1. **React Component** (`packages/ui/src/components/<category>/<Name>.tsx`) - The visual implementation
2. **JSON Schema** (`packages/ui/src/schemas/<name>.schema.json`) - Property definitions for the page builder

### Component Categories (92 total)

| Category | Components |
|---|---|
| Layout (8) | Container, Section, Grid, Divider, Spacer, Tabs, Accordion, Columns |
| Typography (6) | Heading, Paragraph, RichText, Blockquote, CodeBlock, List |
| Media (6) | Image, Video, Gallery, Carousel, BackgroundVideo, AudioPlayer |
| Marketing (10) | HeroBanner, CTABlock, FeatureGrid, Testimonial, TestimonialCarousel, PricingTable, Countdown, AnnouncementBar, LogoCloud, BeforeAfter |
| Commerce (8) | ProductCard, ProductGrid, CartWidget, FeaturedProducts, CategoryList, ProductConfigurator, CartPage, ProductQuickView |
| Navigation (6) | Header, Footer, Breadcrumb, SidebarMenu, MegaMenu, TableOfContents |
| Forms (5) | ContactForm, NewsletterSignup, SearchBar, LoginRegister, FormWizard |
| Data Display (6) | DataTable, Chart, StatsCounter, ProgressBar, Timeline, ComparisonTable |
| Social (4) | SocialLinks, ShareButtons, Embed, Map |
| Utility (6) | ButtonBlock, IconBlock, Alert, CookieConsent, BackToTop, Modal |
| Blog (6) | BlogPostCard, BlogGrid, AuthorBio, RelatedPosts, PostNavigation, Comments |
| Trust (5) | TrustBadges, ReviewAggregate, ReviewList, CaseStudiesGrid, Awards |
| Interactive (5) | Toast, AnimatedTabs, Calculator, SearchableFAQ, Lightbox |
| Events (4) | EventCard, EventGrid, EventSessionList, EventSponsorBar |
| Courses (3) | CourseCard, CourseGrid, CourseCurriculum |
| Global (3) | SiteMeta, ErrorPage, MaintenancePage |
| Primitives (1) | Button |

### Schema Format

Each component schema JSON defines:

```json
{
  "id": "heading",
  "name": "Heading",
  "category": "Typography",
  "icon": "heading",
  "acceptsChildren": false,
  "properties": {
    "level": {
      "type": "enum",
      "values": [1, 2, 3, 4, 5, 6],
      "default": 2,
      "label": "Level"
    },
    "text": {
      "type": "string",
      "default": "Heading Text",
      "label": "Text"
    },
    "alignment": {
      "type": "enum",
      "values": ["left", "center", "right"],
      "default": "left",
      "label": "Alignment"
    },
    "color": {
      "type": "color",
      "default": null,
      "label": "Color"
    }
  }
}
```

**Property types supported:** `string`, `number`, `boolean`, `enum`, `color`, `url`, `image`, `object`, `array`

### SharedPropsWrapper

All components can use shared layout/visibility/animation properties via the `useSharedProps` hook:

```typescript
import { useSharedProps, type SharedProps } from '@agora-cms/ui';

function MyComponent(props: MyProps & SharedProps) {
  const { className, style, attrs } = useSharedProps(props);
  return <div className={className} style={style} {...attrs}>...</div>;
}
```

**Shared properties include:**
- **Spacing**: marginTop/Bottom, paddingTop/Bottom/Left/Right (none/xs/small/medium/large/xl)
- **Visibility**: hideOnDesktop, hideOnTablet, hideOnMobile
- **Conditional**: visibilityCondition (always/logged-in/logged-out/has-cart-items)
- **Animation**: entranceAnimation (fade-in/fade-up/zoom-in/slide-up/etc.), duration, delay, easing
- **Accessibility**: ariaLabel, ariaHidden, role
- **Custom**: customCssClass, customId, opacity, overflow

### Component Tree Data Structure

Pages store their content as a JSON `componentTree`:

```typescript
interface ComponentTree {
  root: ComponentInstance;
}

interface ComponentInstance {
  instanceId: string;      // Unique UUID per instance
  componentId: string;     // References schema id (e.g., "heading")
  props: Record<string, unknown>;  // Property values
  children: ComponentInstance[];    // Nested child components
}
```

---

## 9. API Reference

### Content Service (port 3001)

#### Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login (returns JWT tokens) | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| POST | `/api/v1/auth/logout` | Invalidate refresh token | Yes |
| GET | `/api/v1/auth/me` | Get current user profile | Yes |

#### Pages

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/v1/pages` | List pages (pagination, filtering) | Any authenticated |
| POST | `/api/v1/pages` | Create a page | editor+ |
| GET | `/api/v1/pages/:id` | Get page by ID | Any authenticated |
| PUT | `/api/v1/pages/:id` | Update page (auto-creates version) | editor+ |
| DELETE | `/api/v1/pages/:id` | Delete a page | admin+ |
| POST | `/api/v1/pages/:id/publish` | Publish a page | editor+ |
| POST | `/api/v1/pages/:id/unpublish` | Unpublish a page | editor+ |
| GET | `/api/v1/pages/:id/versions` | List all versions | Any authenticated |
| POST | `/api/v1/pages/:id/rollback/:version` | Rollback to version | admin+ |

#### Media

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| POST | `/api/v1/media/upload` | Upload file (max 10MB, auto WebP) | editor+ |
| GET | `/api/v1/media` | List media (pagination, mimeType filter) | Any authenticated |
| GET | `/api/v1/media/:id/url` | Get presigned URL | Any authenticated |
| DELETE | `/api/v1/media/:id` | Delete media + variants | admin+ |

#### Templates

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/v1/templates` | List all templates | Any authenticated |
| GET | `/api/v1/templates/:id` | Get template by ID | Any authenticated |
| POST | `/api/v1/templates/from-page/:pageId` | Create template from page | editor+ |
| POST | `/api/v1/templates/:id/instantiate` | Create page from template | editor+ |
| DELETE | `/api/v1/templates/:id` | Delete template | admin+ |

#### Navigation

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/v1/navigation` | List all menus | Any authenticated |
| GET | `/api/v1/navigation/:location` | Get menu by location | Any authenticated |
| PUT | `/api/v1/navigation/:location` | Create/update menu | editor+ |
| DELETE | `/api/v1/navigation/:location` | Delete menu | admin+ |

#### Redirects

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/v1/redirects` | List redirects (pagination) | Any authenticated |
| POST | `/api/v1/redirects` | Create redirect | editor+ |
| DELETE | `/api/v1/redirects/:id` | Delete redirect | admin+ |

#### SEO

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/api/v1/seo/page/:pageId` | Get page SEO config | Any authenticated |
| PUT | `/api/v1/seo/page/:pageId` | Update page SEO | editor+ |
| GET | `/api/v1/seo/sitemap` | Generate sitemap data | Any authenticated |
| GET | `/api/v1/seo/analyze/:pageId` | Run 12-point SEO analysis | Any authenticated |
| GET | `/api/v1/seo/structured-data/:pageId` | Generate JSON-LD | Any authenticated |
| GET | `/api/v1/seo/robots.txt` | Get robots.txt | Any authenticated |
| PUT | `/api/v1/seo/robots.txt` | Update robots.txt | admin+ |

#### Settings

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/v1/settings/public` | Get public settings | No |
| GET | `/api/v1/settings/theme/css` | Get theme as CSS properties | No |
| GET | `/api/v1/settings` | Get all settings (admin) | admin+ |
| GET | `/api/v1/settings/:key` | Get setting by key | admin+ |
| PUT | `/api/v1/settings/:key` | Update setting | admin+ |

### Commerce Service (port 3002)

#### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/products` | List products (filtering, pagination, search) |
| POST | `/api/v1/products` | Create product |
| GET | `/api/v1/products/:id` | Get product by ID |
| PUT | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Delete product |
| GET | `/api/v1/products/:id/variants` | List variants |
| POST | `/api/v1/products/:id/variants` | Add variant |
| PUT | `/api/v1/products/:id/variants/:vid` | Update variant |
| POST | `/api/v1/products/:id/variants/generate` | Auto-generate variant combos |
| POST | `/api/v1/products/:id/configure` | Resolve configurable product |

#### Categories

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/categories/tree` | Get full category tree |
| POST | `/api/v1/categories` | Create category |
| GET | `/api/v1/categories/:id` | Get category |
| PUT | `/api/v1/categories/:id` | Update category |
| DELETE | `/api/v1/categories/:id` | Delete category |

#### Cart

| Method | Endpoint | Headers | Description |
|---|---|---|---|
| GET | `/api/v1/cart` | x-cart-id | Get cart |
| POST | `/api/v1/cart/items` | x-cart-id | Add item to cart |
| PUT | `/api/v1/cart/items/:id` | x-cart-id | Update item quantity |
| DELETE | `/api/v1/cart/items/:id` | x-cart-id | Remove item |

#### Checkout

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/checkout` | Process checkout (creates order) |
| POST | `/api/v1/checkout/:reservationId/confirm-payment` | Confirm payment, commit inventory |

#### Orders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/orders` | List orders (filtering, pagination) |
| GET | `/api/v1/orders/:id` | Get order details |
| POST | `/api/v1/orders/:id/refund` | Refund order |
| POST | `/api/v1/orders/:id/fulfill` | Fulfill order |

#### Fulfillment

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/fulfillment/pending` | List orders pending fulfillment |
| POST | `/api/v1/fulfillment/:orderId/ship` | Ship order |
| POST | `/api/v1/fulfillment/:orderId/deliver-digital` | Deliver digital items |

#### Inventory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/inventory/low-stock` | List low stock items |
| GET | `/api/v1/inventory/:productId` | Get inventory levels |
| PUT | `/api/v1/inventory/:productId/variant/:variantId` | Update variant inventory |
| GET | `/api/v1/inventory/:productId/availability` | Get available quantity |
| POST | `/api/v1/inventory/reserve` | Reserve inventory |
| POST | `/api/v1/inventory/reserve/:id/confirm` | Confirm reservation |
| DELETE | `/api/v1/inventory/reserve/:id` | Cancel reservation |

#### Coupons

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/coupons` | List coupons |
| POST | `/api/v1/coupons` | Create coupon |
| GET | `/api/v1/coupons/:id` | Get coupon |
| POST | `/api/v1/coupons/validate/:code` | Validate coupon code |
| PUT | `/api/v1/coupons/:id` | Update coupon |
| DELETE | `/api/v1/coupons/:id` | Delete coupon |

#### License Keys

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/license-keys/pools` | List pools |
| POST | `/api/v1/license-keys/pools` | Create pool |
| POST | `/api/v1/license-keys/pools/:poolId/keys` | Add keys to pool |
| POST | `/api/v1/license-keys/pools/:poolId/claim` | Claim a key |
| GET | `/api/v1/license-keys/:id` | Get key by ID |
| PUT | `/api/v1/license-keys/:id/revoke` | Revoke key |

#### Service Bookings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/service-bookings` | List bookings |
| POST | `/api/v1/service-bookings` | Create booking |
| GET | `/api/v1/service-bookings/availability/:productId` | Get available slots |
| GET | `/api/v1/service-bookings/:id` | Get booking |
| PUT | `/api/v1/service-bookings/:id/reschedule` | Reschedule booking |
| POST | `/api/v1/service-bookings/:id/cancel` | Cancel booking |
| POST | `/api/v1/service-bookings/:id/complete` | Mark complete |
| POST | `/api/v1/service-bookings/:id/no-show` | Mark no-show |

### Integration Service (port 3003)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/webhooks/stripe` | Handle Stripe webhook events |

### Shipping Gateway (port 3004)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/shipping/rates` | Get shipping rates from all carriers |
| POST | `/api/v1/shipping/validate-address` | Validate shipping address |
| POST | `/api/v1/shipping/labels` | Create single shipping label |
| POST | `/api/v1/shipping/labels/batch` | Create batch shipping labels |
| GET | `/api/v1/shipping/tracking/:id` | Get tracking information |

### Course Service (port 3005)

#### Courses

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/courses` | List courses (filtering, pagination) |
| POST | `/api/v1/courses` | Create course |
| GET | `/api/v1/courses/:id` | Get course with sections/lessons |
| PUT | `/api/v1/courses/:id` | Update course |
| DELETE | `/api/v1/courses/:id` | Delete course (if no enrollments) |
| POST | `/api/v1/courses/:id/publish` | Publish course |
| POST | `/api/v1/courses/:id/unpublish` | Unpublish course |

#### Enrollments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/enrollments` | List enrollments |
| POST | `/api/v1/enrollments` | Enroll user in course |
| GET | `/api/v1/enrollments/:id` | Get enrollment with progress |
| POST | `/api/v1/enrollments/:id/cancel` | Cancel enrollment |
| POST | `/api/v1/enrollments/:id/complete` | Complete enrollment |

#### Quizzes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/lessons/:lessonId/quizzes` | Get quizzes for lesson |
| POST | `/api/v1/lessons/:lessonId/quizzes` | Create quiz |
| GET | `/api/v1/quizzes/:id` | Get quiz |
| PUT | `/api/v1/quizzes/:id` | Update quiz |
| DELETE | `/api/v1/quizzes/:id` | Delete quiz |
| POST | `/api/v1/quizzes/:id/attempts` | Submit quiz attempt |
| GET | `/api/v1/quizzes/:quizId/attempts/:enrollmentId` | Get attempts |
| GET | `/api/v1/attempts/:attemptId` | Get single attempt |
| POST | `/api/v1/quizzes/:quizId/questions` | Add question |
| PUT | `/api/v1/questions/:questionId` | Update question |
| DELETE | `/api/v1/questions/:questionId` | Delete question |
| POST | `/api/v1/attempts/:attemptId/grade` | Grade essay question |
| GET | `/api/v1/grading/pending` | Get pending grading queue |

#### Instructor Assignments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/assignments/instructors` | Assign instructor to course section |
| GET | `/api/v1/assignments/instructors/user/:userId` | Get instructor assignments by user |
| GET | `/api/v1/assignments/instructors/section/:sectionId` | Get instructors for a section |
| DELETE | `/api/v1/assignments/instructors/:assignmentId` | Remove instructor assignment |

#### Assignment Submissions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/lessons/:lessonId/submissions` | Submit assignment (enrollmentId, content, links, totalPoints) |
| GET | `/api/v1/submissions/:id` | Get submission |
| GET | `/api/v1/lessons/:lessonId/submissions/:enrollmentId` | Get submissions for lesson by enrollment |
| POST | `/api/v1/submissions/:id/grade` | Grade submission (score, feedback, gradedBy, status) |
| GET | `/api/v1/grading/pending-submissions` | List pending submissions (optional `instructorId` query) |

#### Certificates

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/certificates/enrollments/:enrollmentId` | Generate certificate |
| GET | `/api/v1/certificates/enrollments/:enrollmentId` | Get certificate by enrollment |
| GET | `/api/v1/certificates/verify/:code` | Verify certificate |
| GET | `/api/v1/certificates/user/:userId` | Get user's certificates |

### Kafka Topics and Events

| Topic | Producer | Consumer | Events |
|---|---|---|---|
| `commerce.events` | Commerce Service | Course Service | ORDER_CREATED (triggers auto-enrollment for course products) |

**Event payload format:**

```typescript
interface BaseEvent {
  eventId: string;
  eventType: EventType;  // e.g., "order.created"
  timestamp: string;
  source: string;        // e.g., "commerce-service"
}

interface OrderEvent extends BaseEvent {
  payload: {
    orderId: string;
    orderNumber: string;
    userId: string | null;
    total: number;
    currency: string;
    lineItems: Array<{
      productId: string;
      productType: string;
      quantity: number;
      amount: number;
    }>;
  };
}
```

**Full event catalog** (defined in `packages/shared/src/events/event-types.ts`):

- Content: `page.created`, `page.updated`, `page.published`, `page.unpublished`, `page.deleted`
- Commerce: `product.created`, `product.updated`, `product.deleted`, `cart.updated`, `cart.abandoned`, `checkout.started`, `order.created`, `order.confirmed`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.refunded`, `inventory.updated`, `inventory.low`, `inventory.reserved`
- Integration: `payment.succeeded`, `payment.failed`, `contact.synced`, `lead.created`
- User: `user.registered`, `user.logged_in`, `form.submitted`

---

## 10. Authentication & Authorization

### JWT Authentication Flow

```
1. Client calls POST /api/v1/auth/login with email + password
2. Server verifies credentials (bcrypt, 12 rounds)
3. Server checks for account lockout (5 failed attempts = 30 min lock)
4. Server generates:
   - Access token (JWT, 15 min TTL)
   - Refresh token (stored in Redis, 7 day TTL)
5. Client stores tokens
6. Client sends Authorization: Bearer <accessToken> on subsequent requests
7. When access token expires, client calls POST /api/v1/auth/refresh
8. On logout, refresh token is invalidated in Redis
```

### JWT Payload

```typescript
interface JwtPayload {
  sub: string;      // User ID (UUID)
  email: string;
  role: UserRole;
  iat: number;      // Issued at
  exp: number;      // Expiration
}
```

### JWT Strategy

Extracted from Bearer token in Authorization header via `passport-jwt`:

```
File: services/content-service/src/modules/auth/strategies/jwt.strategy.ts
```

### Guards

Two guards protect endpoints:

1. **JwtAuthGuard** (`common/guards/jwt-auth.guard.ts`)
   - Extends Passport's `AuthGuard('jwt')`
   - Returns 401 for invalid/expired tokens
   - Attaches user payload to `request.user`

2. **RolesGuard** (`common/guards/roles.guard.ts`)
   - Checks user's role against required roles using hierarchy
   - Uses `@Roles('editor', 'admin', 'super_admin')` decorator
   - If no `@Roles()` decorator is present, all authenticated users are allowed

### Role Hierarchy

Roles are hierarchical. A higher role inherits all permissions of lower roles:

```
customer (0) < viewer (1) < editor (2) < store_manager (3) < admin (4) < super_admin (5)
```

The `hasMinimumRole(userRole, requiredRole)` function from `@agora-cms/shared` checks if a user's role meets the minimum required level.

### Scoped Roles

In addition to the global role hierarchy, the platform supports specialized scoped roles for specific use cases:

- **event_staff**: Access to event management, attendee check-in, badge printing
- **exhibitor**: Access to exhibitor portal, booth management, lead capture
- **kiosk**: Self-service kiosk operations (check-in, badge printing without full admin access)
- **course_admin**: Course administration without full LMS admin privileges
- **instructor**: Teaching capabilities (create courses, assignments, grade submissions)

Scoped roles are stored as boolean flags on the User model and checked via dedicated guards (`EventStaffGuard`, `ExhibitorGuard`, `KioskGuard`, `InstructorGuard`, `CourseAdminGuard`).

### Security Improvements (v2.0)

**Dependency Security:**
- Upgraded Next.js to 16.1.6 (fixes CVE for resource allocation without limits)
- Forced ajv@8.18.0 via package overrides (fixes ReDoS vulnerability)
- All critical security patches applied

**XSS Prevention:**
- HTML sanitization utilities in `@agora-cms/ui/utils/sanitize`
  - `sanitizeHtml()`: Removes dangerous tags, scripts, and event handlers
  - `escapeHtml()`: Escapes HTML entities for safe display
  - `sanitizeJsonLd()`: Escapes JSON-LD for script injection prevention
- Use these utilities on all user-generated content before rendering with `dangerouslySetInnerHTML`

**Open Redirect Prevention:**
- URL validation in ShareButtons component blocks `javascript:`, `data:`, `file:`, and `vbscript:` protocols
- All share URLs validated before `window.open()`
- External links force `target="_blank"` and `rel="noopener noreferrer"`

**Development Credentials:**
- MinIO defaults clearly marked as development-only (MINIO_DEFAULT_USER/PASSWORD constants)
- Demo seed password documented with production warnings
- All production deployments require explicit environment variable configuration

### Account Security

- **Password hashing**: bcrypt with 12 rounds
- **Account lockout**: 5 failed login attempts triggers 30-minute lockout
- **Failed login tracking**: Counter resets on successful login
- **Account deactivation**: `isActive` flag prevents login

### CORS Configuration

CORS is configured at two levels:

1. **Kong Gateway** (global): Allows origins `localhost:3100`, `localhost:3200`, `localhost:3300`
2. **Service-level** (Content/Commerce/Course): Each service configures CORS via `CORS_ORIGINS` env var

Allowed headers: `Authorization`, `Content-Type`, `X-Request-ID`

### Rate Limiting

Kong applies global rate limiting: **300 requests per minute per client** (`policy: local`).

---

## 11. Caching Strategy

### Redis Usage by Service

#### Content Service
- **Refresh tokens**: Stored with 7-day TTL for JWT refresh flow
- **Theme CSS**: Served with `Cache-Control: public, max-age=300` (5 minutes)

#### Commerce Service
- **Shopping carts**: Full cart state stored in Redis, keyed by cart ID
- **Inventory reservations**: Reservation records with TTL-based expiration

#### Shipping Gateway
- **Rate caching**: Shipping rate quotes cached to avoid repeated carrier API calls
- **Tracking cache**: Recent tracking results cached briefly

### Redis Connection

All services connect to Redis using `ioredis`:

```typescript
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});
```

Or via `REDIS_URL`:
```
REDIS_URL=redis://localhost:6379
```

---

## 12. Search Integration

### Elasticsearch Setup

The commerce service uses Elasticsearch 8.12.0 for full-text product search.

**Index:** `products`

**Connection** (in `ProductService`):

```typescript
private initElasticsearch(): void {
  const esNode = this.config.get<string>('ELASTICSEARCH_URL');
  if (esNode) {
    this.esClient = new ElasticsearchClient({ node: esNode });
  }
}
```

**Graceful degradation:** If `ELASTICSEARCH_URL` is not set, search features are disabled and the service logs a warning. The product listing falls back to database queries.

**Product indexing:** Products are indexed/updated in Elasticsearch on create/update operations and removed on delete.

**Search features:**
- Full-text search across product name, description, SKU
- Faceted filtering by type, status, category
- Sorting and pagination

---

## 13. File Storage

### MinIO / S3 Integration

Agora CMS uses MinIO (S3-compatible) for all file storage. In production, this can be swapped for AWS S3 or any S3-compatible service.

#### Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `agora-media` | Media uploads (images, videos, documents) | Public download |
| `agora-labels` | Shipping labels (PDFs) | Private |

#### Media Upload Flow

```
1. Client sends multipart/form-data POST to /api/v1/media/upload
2. Content service receives file via Multer (FileInterceptor, max 10MB)
3. If image:
   a. Convert to WebP using Sharp
   b. Generate variants:
      - thumbnail (150px)
      - medium (800px)
      - large (1920px)
   c. Upload original + all variants to S3
4. Store metadata in Media table (filename, mimeType, s3Key, dimensions, variants)
5. Return media record with all variant URLs
```

#### S3 Configuration

```
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_MEDIA=agora-media
S3_BUCKET_LABELS=agora-labels
S3_REGION=us-east-1
```

#### Presigned URLs

Media files can be accessed via presigned URLs generated by `GET /api/v1/media/:id/url`, providing time-limited access to private files.

---

## 14. Testing Guide

### Test Types

#### Unit Tests

Run with Jest across all services and packages:

```bash
# Run all unit tests
pnpm test

# Run tests for a specific service
pnpm --filter @agora-cms/commerce-service test

# Run with coverage
pnpm test:cov

# Watch mode
pnpm --filter @agora-cms/content-service test:watch
```

**Configuration:** Each service has Jest configured either in `package.json` or `jest.config.ts`:
- Root dir: `src`
- Test pattern: `*.spec.ts`
- Transform: `ts-jest`
- Environment: `node`

#### Integration Tests

Integration tests run against real database and Redis instances:

```bash
# Requires PostgreSQL and Redis running
pnpm test:integration
```

The content service has a dedicated `jest.integration.config.ts` for integration tests.

**Required environment variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ELASTICSEARCH_URL` - (optional) Elasticsearch node
- `KAFKA_BROKERS` - (optional) Kafka broker list

#### End-to-End Tests

E2E tests use Playwright with Chromium and Firefox:

```bash
# Run all E2E tests
pnpm test:e2e

# Run with browser UI
pnpm test:e2e:ui

# Run in headed mode (see the browser)
pnpm test:e2e:headed

# Debug mode (step through tests)
pnpm test:e2e:debug
```

**Configuration** (`e2e/playwright.config.ts`):
- Base URL: `http://localhost:3300` (Admin Dashboard)
- Browsers: Chromium, Firefox
- Retries: 2 on CI, 0 locally
- Tracing: On first retry
- Parallelism: 1 worker on CI, auto locally
- Web server: Auto-starts `pnpm dev` if not already running

### Writing Tests

#### Unit Test Example (Service)

```typescript
// services/commerce-service/src/modules/products/product.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: 'PRISMA',
          useValue: {
            product: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should create a product', async () => {
    // test implementation
  });
});
```

#### API Test Example (Controller)

```typescript
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('ProductController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('/api/v1/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/products')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## 15. CI/CD Pipeline

### GitHub Actions Workflow

The CI pipeline (`.github/workflows/ci.yml`) runs on pushes to `main` and pull requests targeting `main`.

#### Pipeline Stages

```
1. lint-and-typecheck
   |-- Checkout code
   |-- Install pnpm 10
   |-- Setup Node.js 22
   |-- pnpm install --frozen-lockfile
   |-- Generate Prisma Client
   |-- Run lint (pnpm lint)
   |-- Type check / build (pnpm build)
   |
   v
2. unit-tests (depends on lint-and-typecheck)
   |-- Same setup steps
   |-- Generate Prisma Client
   |-- Run tests (pnpm test)
   |
   v
3. integration-tests (depends on unit-tests)
   |-- Services:
   |   |-- PostgreSQL 16 (agora_test DB)
   |   +-- Redis 7
   |-- Setup steps
   |-- Generate Prisma Client
   |-- Run migrations (pnpm db:migrate)
   +-- Run integration tests (pnpm test:integration)
```

#### Concurrency Control

The pipeline uses concurrency groups to cancel in-progress runs for the same branch:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## 16. Database Migrations

### Creating Migrations

Prisma manages database migrations from the schema at `packages/database/prisma/schema.prisma`.

```bash
# Edit schema.prisma, then create a migration
pnpm --filter @agora-cms/database db:migrate

# This will:
# 1. Detect schema changes
# 2. Generate SQL migration file in prisma/migrations/
# 3. Apply the migration to your local database
```

### Running Migrations

```bash
# Development (creates + applies)
pnpm db:migrate

# Production (applies existing migrations only)
pnpm --filter @agora-cms/database db:migrate:deploy
```

### Other Database Commands

```bash
# Push schema directly (no migration files, dev only)
pnpm --filter @agora-cms/database db:push

# Regenerate Prisma client after schema changes
pnpm --filter @agora-cms/database db:generate

# Open Prisma Studio (visual database browser)
pnpm db:studio

# Seed database with demo data
pnpm db:seed
```

### Database Seeding

The seed script (`packages/database/prisma/seed.ts`) creates:
- Demo users (one per role, password: `Password123!`)
- Sample products, categories, pages, and other reference data

Run with `pnpm db:seed` (automatically runs migrations first via Turborepo dependency).

---

## 17. Creating Custom Components

### Step 1: Create the JSON Schema

Create `packages/ui/src/schemas/my-widget.schema.json`:

```json
{
  "id": "my-widget",
  "name": "My Widget",
  "category": "Custom",
  "icon": "puzzle",
  "acceptsChildren": false,
  "properties": {
    "title": {
      "type": "string",
      "default": "Widget Title",
      "label": "Title",
      "required": true
    },
    "variant": {
      "type": "enum",
      "values": ["primary", "secondary", "outline"],
      "default": "primary",
      "label": "Variant"
    },
    "showIcon": {
      "type": "boolean",
      "default": true,
      "label": "Show Icon"
    },
    "items": {
      "type": "array",
      "label": "Items",
      "items": {
        "type": "object",
        "properties": {
          "label": {
            "type": "string",
            "default": "Item",
            "label": "Label"
          },
          "value": {
            "type": "string",
            "default": "",
            "label": "Value"
          }
        }
      }
    }
  }
}
```

### Step 2: Create the React Component

Create `packages/ui/src/components/custom/MyWidget.tsx`:

```tsx
import React from 'react';
import { clsx } from 'clsx';
import { useSharedProps, type SharedProps } from '../shared/SharedPropsWrapper';

interface MyWidgetItem {
  label: string;
  value: string;
}

interface MyWidgetProps extends SharedProps {
  title?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  showIcon?: boolean;
  items?: MyWidgetItem[];
}

export function MyWidget({
  title = 'Widget Title',
  variant = 'primary',
  showIcon = true,
  items = [],
  ...sharedProps
}: MyWidgetProps) {
  const { className, style, attrs } = useSharedProps(sharedProps);

  return (
    <div
      className={clsx(
        'rounded-lg p-6',
        variant === 'primary' && 'bg-blue-600 text-white',
        variant === 'secondary' && 'bg-gray-100 text-gray-900',
        variant === 'outline' && 'border-2 border-blue-600 text-blue-600',
        className,
      )}
      style={style}
      {...attrs}
    >
      <h3 className="text-xl font-bold">{title}</h3>
      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex justify-between">
              <span>{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Step 3: Export from UI Package

Add to `packages/ui/src/index.ts`:

```typescript
export { MyWidget } from './components/custom/MyWidget';
```

### Step 4: Register in Page Builder

Add to `apps/page-builder/src/lib/component-registry.ts`:

```typescript
import { MyWidget } from '@agora-cms/ui';
import myWidgetSchema from '@agora-cms/ui/src/schemas/my-widget.schema.json';

// In the registration section:
register(myWidgetSchema as unknown as ComponentSchema, MyWidget);
```

### Step 5: Register in Storefront Renderer

Add to `apps/storefront/src/components/renderers/component-renderer.tsx`:

```typescript
import { MyWidget } from '@agora-cms/ui';

// In the componentRegistry object:
'my-widget': ({ props }) => <MyWidget {...props as any} />,
```

### Step 6: Build and Test

```bash
pnpm build
pnpm dev
```

Your component will now appear in the Page Builder's component palette under the "Custom" category and render correctly in the storefront.

---

## 18. Extending the API

### Adding a New Module to a Service

#### Step 1: Create Module Files

```bash
# Create module directory structure
mkdir -p services/commerce-service/src/modules/reviews
```

Create four files:

**`review.module.ts`**:
```typescript
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  controllers: [ReviewController],
  providers: [
    ReviewService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
})
export class ReviewsModule {}
```

**`review.controller.ts`**:
```typescript
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('api/v1/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({ summary: 'List reviews for a product' })
  @ApiResponse({ status: 200, description: 'Review list' })
  async list(@Query('productId') productId: string) {
    return this.reviewService.findByProduct(productId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async create(@Body() dto: CreateReviewDto) {
    return this.reviewService.create(dto);
  }
}
```

**`review.service.ts`**:
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findByProduct(productId: string) {
    // Implementation
  }

  async create(dto: any) {
    // Implementation
  }
}
```

**`dto/create-review.dto.ts`**:
```typescript
import { IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty()
  @IsString()
  comment!: string;
}
```

#### Step 2: Register the Module

Add to `services/commerce-service/src/app.module.ts`:

```typescript
import { ReviewsModule } from './modules/reviews/review.module';

@Module({
  imports: [
    // ... existing modules
    ReviewsModule,
  ],
})
export class AppModule {}
```

#### Step 3: Add Database Model (if needed)

Edit `packages/database/prisma/schema.prisma` to add the model, then:

```bash
pnpm db:migrate
```

#### Step 4: Add Route to Kong (if exposed through gateway)

Edit `docker/kong/kong.yml`:

```yaml
- name: commerce-reviews
  paths:
    - /api/v1/reviews
  strip_path: false
```

Restart Kong: `docker compose -f docker/docker-compose.yml restart kong`

### Adding Shared Types

Add type definitions to `packages/shared/src/types/` and export from `packages/shared/src/index.ts`.

### Adding Kafka Events

1. Add event constant to `packages/shared/src/events/event-types.ts`
2. Implement producer in the publishing service
3. Implement consumer in the subscribing service (following `EnrollmentConsumerService` as a pattern)

---

## 19. Environment Variables

### Complete Reference

#### Database

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://agora:agora_dev@localhost:5432/agora_cms` | PostgreSQL connection string |

#### Redis

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |

#### Elasticsearch

| Variable | Default | Description |
|---|---|---|
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch node URL |

#### Kafka

| Variable | Default | Description |
|---|---|---|
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker list |

#### MinIO / S3

| Variable | Default | Description |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:9000` | S3-compatible endpoint |
| `S3_ACCESS_KEY` | `minioadmin` | Access key |
| `S3_SECRET_KEY` | `minioadmin` | Secret key |
| `S3_BUCKET_MEDIA` | `agora-media` | Media upload bucket |
| `S3_BUCKET_LABELS` | `agora-labels` | Shipping label bucket |
| `S3_REGION` | `us-east-1` | S3 region |

#### Kong

| Variable | Default | Description |
|---|---|---|
| `API_GATEWAY_URL` | `http://localhost:8000` | Kong proxy URL |

#### JWT

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `your-jwt-secret-change-in-production` | JWT signing secret |
| `JWT_EXPIRATION` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRATION` | `7d` | Refresh token TTL |

#### Service Ports

| Variable | Default | Description |
|---|---|---|
| `CONTENT_SERVICE_PORT` | `3001` | Content service |
| `COMMERCE_SERVICE_PORT` | `3002` | Commerce service |
| `INTEGRATION_SERVICE_PORT` | `3003` | Integration service |
| `SHIPPING_GATEWAY_PORT` | `3004` | Shipping gateway |
| `COURSE_SERVICE_PORT` | `3005` | Course service |
| `PAGE_BUILDER_PORT` | `3100` | Page builder |
| `STOREFRONT_PORT` | `3200` | Storefront |
| `ADMIN_DASHBOARD_PORT` | `3300` | Admin dashboard |

#### Frontend API URLs

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_CONTENT_API_URL` | `http://localhost:3001` | Content API (bypasses Kong) |
| `NEXT_PUBLIC_COMMERCE_API_URL` | `http://localhost:3002` | Commerce API (bypasses Kong) |
| `NEXT_PUBLIC_COURSE_API_URL` | `http://localhost:3005` | Course API (bypasses Kong) |

#### CORS

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:3100,http://localhost:3200,http://localhost:3300` | Allowed origins |

#### Inter-Service Communication

| Variable | Default | Description |
|---|---|---|
| `CONTENT_API_URL` | `http://localhost:3001` | Commerce -> Content for settings |

#### Stripe

| Variable | Default | Description |
|---|---|---|
| `STRIPE_ENABLED` | `false` | Enable Stripe integration |
| `STRIPE_SECRET_KEY` | (empty) | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | (empty) | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | (empty) | Stripe webhook signing secret |

#### Google Analytics

| Variable | Default | Description |
|---|---|---|
| `GA4_ENABLED` | `false` | Enable GA4 integration |
| `GA4_MEASUREMENT_ID` | (empty) | GA4 measurement ID |
| `GA4_API_SECRET` | (empty) | GA4 API secret |

#### Salesforce

| Variable | Default | Description |
|---|---|---|
| `SALESFORCE_ENABLED` | `false` | Enable Salesforce integration |
| `SALESFORCE_CLIENT_ID` | (empty) | Connected App client ID |
| `SALESFORCE_PRIVATE_KEY` | (empty) | JWT auth private key |
| `SALESFORCE_USERNAME` | (empty) | Integration user |
| `SALESFORCE_LOGIN_URL` | `https://login.salesforce.com` | Login URL |

#### Printful

| Variable | Default | Description |
|---|---|---|
| `PRINTFUL_API_KEY` | (empty) | Printful API key from dashboard |
| `PRINTFUL_WEBHOOK_SECRET` | (empty) | Webhook signature verification secret |

#### Apple Wallet (PKPass)

| Variable | Default | Description |
|---|---|---|
| `APPLE_PASS_TEMPLATE_PATH` | `./pass-templates/event-ticket` | Path to .pass template directory |
| `APPLE_SIGNER_CERT_PATH` | (empty) | Path to Apple Pass Type ID certificate (.pem) |
| `APPLE_SIGNER_KEY_PATH` | (empty) | Path to certificate private key (.pem) |
| `APPLE_WWDR_CERT_PATH` | (empty) | Path to Apple WWDR certificate (.pem) |
| `APPLE_ORGANIZATION_NAME` | `Agora CMS` | Organization name displayed in Wallet |
| `AWS_REGION` | `us-east-1` | S3 region for pass storage |
| `S3_BUCKET` | `agora-cms` | S3 bucket for .pkpass files |

#### Shipping Carriers

| Variable | Default | Description |
|---|---|---|
| `UPS_ENABLED` | `false` | Enable UPS |
| `UPS_CLIENT_ID` | (empty) | UPS OAuth client ID |
| `UPS_CLIENT_SECRET` | (empty) | UPS OAuth secret |
| `UPS_ACCOUNT_NUMBER` | (empty) | UPS account number |
| `USPS_ENABLED` | `false` | Enable USPS |
| `USPS_USER_ID` | (empty) | USPS Web Tools user ID |
| `FEDEX_ENABLED` | `false` | Enable FedEx |
| `FEDEX_CLIENT_ID` | (empty) | FedEx OAuth client ID |
| `FEDEX_CLIENT_SECRET` | (empty) | FedEx OAuth secret |
| `FEDEX_ACCOUNT_NUMBER` | (empty) | FedEx account number |
| `DHL_ENABLED` | `false` | Enable DHL |
| `DHL_API_KEY` | (empty) | DHL API key |
| `DHL_API_SECRET` | (empty) | DHL API secret |

---

## 20. Troubleshooting

### Docker Services

**Problem:** Containers fail health checks on first start
**Solution:** Elasticsearch and Kafka can take 30-60 seconds to become healthy. Run `docker compose -f docker/docker-compose.yml ps` and wait for all services to show "healthy".

**Problem:** Port conflicts
**Solution:** Check for existing services on ports 5432, 6379, 9200, 9092, 9000, 9001, 8000, 8001. Stop conflicting services or modify ports in `docker-compose.yml`.

**Problem:** MinIO buckets not created
**Solution:** The `minio-init` container runs once after MinIO is healthy. If it failed, manually create buckets:
```bash
docker exec agora-minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec agora-minio mc mb --ignore-existing local/agora-media
docker exec agora-minio mc mb --ignore-existing local/agora-labels
docker exec agora-minio mc anonymous set download local/agora-media
```

### Database

**Problem:** Prisma Client not generated
**Solution:** Run `pnpm --filter @agora-cms/database db:generate` before starting services.

**Problem:** Migration fails
**Solution:** Check `DATABASE_URL` is correct and PostgreSQL is running. For a fresh start:
```bash
docker compose -f docker/docker-compose.yml down -v  # removes volumes
docker compose -f docker/docker-compose.yml up -d
pnpm db:migrate
pnpm db:seed
```

**Problem:** "Prisma schema validation failed"
**Solution:** After editing `schema.prisma`, run `pnpm --filter @agora-cms/database db:generate` to validate.

### Services

**Problem:** Service starts but connections fail to Redis/Elasticsearch/Kafka
**Solution:** These services initialize lazily and log warnings if unavailable. This is by design -- the service will function with reduced capabilities (no caching, no search, no events).

**Problem:** CORS errors in browser
**Solution:** Verify the frontend origin is listed in `CORS_ORIGINS` and that Kong is running with the correct configuration.

**Problem:** JWT authentication fails
**Solution:** Ensure `JWT_SECRET` is the same across all services. Default is `dev-secret-change-in-production`.

### Frontend

**Problem:** `@agora-cms/ui` components not found
**Solution:** Ensure `transpilePackages` includes `@agora-cms/ui` in `next.config.js` (already configured for storefront and page-builder).

**Problem:** TypeScript errors after schema changes
**Solution:** Rebuild shared packages: `pnpm --filter @agora-cms/shared build && pnpm --filter @agora-cms/database db:generate`

### Kafka

**Problem:** "Kafka consumer unavailable" warning in course-service
**Solution:** This is expected if Kafka is not running. Start it with:
```bash
docker compose -f docker/docker-compose.yml up -d kafka
```

**Problem:** Consumer not receiving events
**Solution:** Check the consumer group ID (`course-enrollment-group`), topic name (`commerce.events`), and ensure the producer is connected. Use Kafka UI at http://localhost:8080 (requires debug profile).

---

## 21. Contributing

### Branching Strategy

- `main` - Production-ready code
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes
- `chore/<name>` - Maintenance tasks

### Commit Conventions

Follow conventional commits:

```
feat: add product review module
fix: resolve cart total calculation error
chore: update dependencies
docs: add shipping API documentation
refactor: extract inventory reservation logic
test: add fulfillment service unit tests
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make changes and write tests
3. Ensure all checks pass locally:
   ```bash
   pnpm lint
   pnpm build
   pnpm test
   ```
4. Push branch and open PR targeting `main`
5. CI pipeline runs automatically (lint, typecheck, unit tests, integration tests)
6. Request code review
7. Merge after approval

### Code Quality

- **Formatting**: Prettier (`pnpm format` / `pnpm format:check`)
- **Linting**: ESLint with `@agora-cms/eslint-config`
- **Type Safety**: Strict TypeScript (`noUncheckedIndexedAccess`, `isolatedModules`)
- **Validation**: DTOs validated with `class-validator` (whitelist + forbidNonWhitelisted)

### Adding a New Service

1. Create service directory in `services/`
2. Use `@agora-cms/tsconfig/nestjs.json` as TypeScript base
3. Use `@agora-cms/eslint-config` for linting
4. Add `workspace:*` dependencies on `@agora-cms/database` and `@agora-cms/shared`
5. Register routes in `docker/kong/kong.yml`
6. Add port to `.env.example`
7. Update this developer guide

### Adding a New Frontend App

1. Create app directory in `apps/`
2. Use Next.js 14 with App Router
3. Use `@agora-cms/tsconfig/nextjs.json` as TypeScript base
4. Add `transpilePackages` for workspace dependencies in `next.config.js`
5. Add origin to CORS configuration (Kong + service-level)
6. Add port to `.env.example`
