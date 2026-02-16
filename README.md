# Agora CMS

A modern, all-in-one platform combining a headless CMS, e-commerce engine, learning management system (LMS), and drag-and-drop visual page builder. Built as a TypeScript monorepo with Turborepo and pnpm workspaces.

## Features

- **Visual Page Builder** — Drag-and-drop editor with 88 components across 14 categories
- **E-Commerce** — 7 product types (physical, digital, service, configurable, course, affiliate, print-on-demand), cart, checkout, orders, coupons, inventory
- **Content Management** — Pages, articles, media library, navigation menus, forms, SEO analyzer, Apple Wallet pass generation
- **Learning Management** — Courses, curriculum builder, assignments, quizzes, enrollments, grading, certificates
- **Event Management** — Events, sessions, attendees, badge printing, QR check-in, Apple Wallet tickets, sponsors, surveys
- **Email System** — 22 email templates with merge tags and trigger-based automation
- **Integrations** — Stripe payments, Google Analytics 4, Salesforce CRM, Printful print-on-demand, shipping carriers (UPS, USPS, FedEx, DHL)
- **Role-Based Access** — 6 user roles + 5 scoped roles for specialized access
- **Security** — XSS prevention, open redirect protection, secure password hashing (bcrypt 12 rounds), dependency vulnerability fixes

## Architecture

```
agora-cms/
├── apps/
│   ├── admin-dashboard/    # Admin UI (Next.js - port 3300)
│   ├── page-builder/       # Visual editor (Next.js - port 3100)
│   └── storefront/         # Public-facing site (Next.js - port 3200)
├── services/
│   ├── content-service/    # Pages, media, templates, Apple Wallet passes (NestJS - port 3001)
│   ├── commerce-service/   # Products, orders, payments (NestJS - port 3002)
│   ├── integration-service/# Stripe, GA4, Salesforce, Printful (NestJS - port 3003)
│   ├── shipping-gateway/   # Carrier rate calculations (NestJS - port 3004)
│   └── course-service/     # LMS, quizzes, assignments, certificates (NestJS - port 3005)
├── packages/
│   ├── ui/                 # Shared component library (88 components)
│   ├── shared/             # Shared types, schemas, utilities
│   ├── database/           # Prisma schema & client
│   ├── eslint-config/      # Shared ESLint configuration
│   └── tsconfig/           # Shared TypeScript configuration
└── docs/                   # Documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+, TypeScript, pnpm, Turborepo |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Search | Elasticsearch 8 |
| Messaging | Apache Kafka |
| Storage | MinIO (S3-compatible) |
| Gateway | Kong API Gateway |
| Testing | Jest, Playwright |
| CI/CD | GitHub Actions |
| Integrations | Stripe SDK 17.6, Google Analytics Data API 4.8, jsforce 3.10, Printful REST API |

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Setup

```bash
# Clone the repository
git clone https://github.com/Pacmoney22/agora-cms.git
cd agora-cms

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure (PostgreSQL, Redis, Elasticsearch, Kafka, MinIO)
docker compose -f docker/docker-compose.yml up -d

# Generate Prisma client & run migrations
pnpm db:migrate

# Seed the database
pnpm db:seed

# Start all services in development mode
pnpm dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps and services in dev mode |
| `pnpm build` | Build all workspaces |
| `pnpm lint` | Lint all code |
| `pnpm test` | Run unit tests |
| `pnpm test:integration` | Run integration tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm format` | Format code with Prettier |
| `pnpm clean` | Clean build artifacts and node_modules |

## Documentation

| Guide | Description |
|-------|-------------|
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Architecture, local setup, API reference, service deep-dives, testing, CI/CD, and extending the platform |
| [Admin Guide](docs/ADMIN_GUIDE.md) | Installation, deployment (Docker, AWS, Azure, Cloudflare), configuration, security hardening, monitoring, backup & recovery, scaling |
| [End User Guide](docs/END_USER_GUIDE.md) | Page builder usage, content & product management, order workflows, event management, LMS, email templates, SEO |

## License

See [LICENSE](LICENSE) for details.
