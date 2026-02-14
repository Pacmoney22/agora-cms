# Agora CMS - Administration & Installation Guide

> **Version 2.0** | February 2026
>
> Comprehensive guide for installing, configuring, deploying, and operating Agora CMS across local development, VPS, AWS, Azure, and Cloudflare environments.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [System Requirements](#2-system-requirements)
3. [Installation](#3-installation)
4. [Configuration Reference](#4-configuration-reference)
5. [Kong API Gateway](#5-kong-api-gateway)
6. [Database Administration](#6-database-administration)
7. [User & Role Management](#7-user--role-management)
8. [Email System](#8-email-system)
9. [Integration Administration](#9-integration-administration)
10. [Media & Storage](#10-media--storage)
11. [Search Administration](#11-search-administration)
12. [Cache Management](#12-cache-management)
13. [Message Queue](#13-message-queue)
14. [Security Hardening](#14-security-hardening)
15. [Monitoring & Health Checks](#15-monitoring--health-checks)
16. [Backup & Disaster Recovery](#16-backup--disaster-recovery)
17. [Scaling](#17-scaling)
18. [SSL/TLS & Domain Setup](#18-ssltls--domain-setup)
19. [Maintenance](#19-maintenance)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. System Overview

### Architecture Diagram

```
                                    Internet
                                       |
                              +--------+--------+
                              |    Nginx / CDN   |
                              |  (TLS Termination)|
                              +--------+--------+
                                       |
                              +--------+--------+
                              |   Kong Gateway   |  :8000 (proxy) / :8001 (admin)
                              |   (API Routing,  |
                              |    Rate Limiting, |
                              |    CORS)          |
                              +--------+--------+
                                       |
            +-------------+------------+------------+-------------+
            |             |            |            |             |
     +------+------+ +---+----+ +-----+-----+ +---+----+ +------+------+
     |  Content    | |Commerce| |Integration| |Shipping| |   Course    |
     |  Service    | |Service | |  Service  | |Gateway | |   Service   |
     |  :3001      | | :3002  | |   :3003   | | :3004  | |   :3005     |
     +------+------+ +---+----+ +-----+-----+ +---+----+ +------+------+
            |             |            |            |             |
            +------+------+------+-----+------+----+------+------+
                   |             |            |           |
            +------+------+ +---+----+ +-----+-----+ +--+---+
            | PostgreSQL  | | Redis  | |Elasticsearch| | Kafka|
            |   :5432     | | :6379  | |   :9200     | |:9092 |
            +-------------+ +--------+ +-------------+ +------+
                                                          |
                                                    +-----+-----+
                                                    | MinIO / S3 |
                                                    | :9000/:9001|
                                                    +-----------+

    Frontend Apps (Next.js 14):
    +-------------------+  +-------------------+  +-------------------+
    | Page Builder      |  | Storefront        |  | Admin Dashboard   |
    | :3100             |  | :3200             |  | :3300             |
    +-------------------+  +-------------------+  +-------------------+
```

### Service Topology

Agora CMS is a microservices-based platform built as a Turborepo monorepo using pnpm workspaces. It combines content management, e-commerce, event management, and a learning management system (LMS).

```
Agora-cms/
├── apps/
│   ├── admin-dashboard/     # Next.js 14 - Admin UI (port 3300)
│   ├── page-builder/        # Next.js 14 - Visual Page Builder (port 3100)
│   └── storefront/          # Next.js 14 - Customer-facing store (port 3200)
├── services/
│   ├── content-service/     # NestJS - Pages, media, navigation, auth, users (port 3001)
│   ├── commerce-service/    # NestJS - Products, orders, cart, coupons, fulfillment (port 3002)
│   ├── integration-service/ # NestJS - Stripe, Salesforce, GA4, webhooks (port 3003)
│   ├── shipping-gateway/    # NestJS - UPS, USPS, FedEx, DHL rates & labels (port 3004)
│   └── course-service/      # NestJS - LMS courses, quizzes, certificates (port 3005)
├── packages/
│   ├── database/            # Prisma schema, migrations, seed data
│   ├── shared/              # Shared TypeScript types, constants, utilities
│   ├── ui/                  # Shared React UI components
│   ├── tsconfig/            # Shared TypeScript configurations
│   └── eslint-config/       # Shared ESLint configurations
└── docker/
    ├── docker-compose.yml   # Infrastructure services
    └── kong/kong.yml        # API Gateway declarative config
```

### Port Assignments

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 3001 | Content Service | HTTP | Pages, media, navigation, auth, users, settings |
| 3002 | Commerce Service | HTTP | Products, orders, cart, checkout, coupons, fulfillment |
| 3003 | Integration Service | HTTP | Stripe, Salesforce, GA4, webhooks |
| 3004 | Shipping Gateway | HTTP | Shipping rates, labels, tracking, bin-packing |
| 3005 | Course Service | HTTP | LMS courses, sections, lessons, quizzes, certificates |
| 3100 | Page Builder | HTTP | Visual drag-and-drop page builder |
| 3200 | Storefront | HTTP | Customer-facing storefront |
| 3300 | Admin Dashboard | HTTP | Administration interface |
| 5432 | PostgreSQL | TCP | Primary database |
| 6379 | Redis | TCP | Cache, sessions, refresh tokens |
| 8000 | Kong Gateway (Proxy) | HTTP | API routing proxy |
| 8001 | Kong Gateway (Admin) | HTTP | Gateway administration |
| 8080 | Kafka UI (debug) | HTTP | Kafka topic browser |
| 8081 | Redis Commander (debug) | HTTP | Redis key browser |
| 9000 | MinIO API | HTTP | S3-compatible object storage |
| 9001 | MinIO Console | HTTP | MinIO web management UI |
| 9092 | Kafka | TCP | Message broker |
| 9200 | Elasticsearch | HTTP | Full-text search engine |

### Key Capabilities

- Content management with a visual page builder (drag-and-drop components)
- Blog/article system with categories, tags, comments, and reviews
- E-commerce engine supporting physical, virtual, service, configurable, and course product types
- Event management with attendees, sessions, sponsors, surveys, badge printing, and QR code check-in
- LMS with courses, sections, lessons, quizzes (multiple question types), grading, and certificates
- Email template system with multi-provider support (SMTP, SendGrid, Mailgun, SES, Postmark, Resend)
- Product feeds for Google, Facebook, Pinterest, TikTok, and Bing
- Form builder with Salesforce CRM integration
- Multi-carrier shipping (UPS, USPS, FedEx, DHL) with bin-packing optimization
- Integrations: Stripe (payments + tax), Salesforce, Google Analytics 4
- 6 user roles with hierarchical permissions: `customer`, `viewer`, `editor`, `store_manager`, `admin`, `super_admin`
- JWT authentication with bcrypt (12 rounds), refresh token rotation, and account lockout after 5 failed attempts
- Configurable deployment mode: Standalone (full Docker stack) or Shared Hosting (PostgreSQL-only)

---

## 2. System Requirements

### Hardware Recommendations

| Resource | Development | Staging | Production |
|----------|------------|---------|------------|
| CPU | 4 cores | 4 cores | 8+ cores |
| RAM | 8 GB | 8 GB | 16+ GB |
| Disk | 50 GB SSD | 50 GB SSD | 100+ GB SSD |
| Network | Broadband | 100 Mbps | 1 Gbps |

### Software Prerequisites

| Software | Minimum Version | Recommended | Purpose |
|----------|----------------|-------------|---------|
| Node.js | 20.0.0 | 20 LTS (22 LTS in CI) | Runtime for all services |
| pnpm | 9.0.0 (10.29.2 in lockfile) | 10+ | Package manager |
| Docker | 24+ | Latest | Infrastructure containers |
| Git | 2.30+ | Latest | Version control |
| PostgreSQL | 16 | 16-alpine | Primary database |
| Redis | 7 | 7-alpine | Cache and session store |
| Elasticsearch | 8.12 | 8.12+ | Full-text search |
| Kafka | 3.6 (Confluent 7.6.0) | 3.6+ | Message broker |

### Supported Platforms

- **Linux**: Ubuntu 22.04+, Debian 12+, Amazon Linux 2023, RHEL 9+
- **macOS**: 13 Ventura+ (Intel and Apple Silicon)
- **Windows**: Windows 10/11 with WSL2 (native Windows via Git Bash supported for development)
- **Cloud**: AWS, Azure, GCP, DigitalOcean, Cloudflare
- **Containers**: Docker, Kubernetes, AWS ECS Fargate, Azure Container Apps

---

## 3. Installation

### 3.1 Local Development Setup (Docker Compose)

**Step 1: Clone the repository**

```bash
git clone https://github.com/your-org/Agora-cms.git
cd Agora-cms
```

**Step 2: Install dependencies**

```bash
pnpm install
```

**Step 3: Configure environment variables**

```bash
cp .env.example .env
```

The default values in `.env.example` work out of the box with the Docker Compose infrastructure. No changes are needed for local development.

**Step 4: Start infrastructure services**

```bash
cd docker
docker compose up -d
```

Wait for all containers to become healthy:

```bash
docker compose ps
```

Expected output -- all services should show `healthy`:

| Container | Port(s) | Status |
|-----------|---------|--------|
| Agora-postgres | 5432 | healthy |
| Agora-redis | 6379 | healthy |
| Agora-elasticsearch | 9200 | healthy |
| Agora-kafka | 9092 | healthy |
| Agora-minio | 9000, 9001 | healthy |
| Agora-kong | 8000, 8001 | running |

The `minio-init` container runs once to create the `Agora-media` and `Agora-labels` buckets, then exits.

**Step 5: Generate Prisma client and run migrations**

```bash
cd ..
pnpm --filter @Agora-cms/database exec prisma generate
pnpm db:migrate
```

**Step 6: Seed the database**

```bash
pnpm db:seed
```

This creates seed users, sample navigation menus, pages, categories, products, integrations, and coupons.

**Step 7: Start all services in development mode**

```bash
pnpm dev
```

Turborepo launches all 5 backend services and 3 frontend apps simultaneously with hot-reloading.

**Access Points:**

| Application | URL |
|------------|-----|
| Admin Dashboard | http://localhost:3300 |
| Page Builder | http://localhost:3100 |
| Storefront | http://localhost:3200 |
| Kong API Gateway | http://localhost:8000 |
| Content Service Swagger | http://localhost:3001/docs |
| Commerce Service Swagger | http://localhost:3002/docs |
| Integration Service Swagger | http://localhost:3003/api/docs |
| Shipping Gateway Swagger | http://localhost:3004/api/docs |
| Course Service Swagger | http://localhost:3005/api |
| MinIO Console | http://localhost:9001 |
| Prisma Studio | Run `pnpm db:studio` then http://localhost:5555 |

**Seed Data Credentials** (all users share the password `Password123!`):

| Email | Role |
|-------|------|
| superadmin@Agora-cms.dev | super_admin |
| admin@Agora-cms.dev | admin |
| manager@Agora-cms.dev | store_manager |
| editor@Agora-cms.dev | editor |
| viewer@Agora-cms.dev | viewer |

**Debug Tools:**

Start the debug profile to get Kafka UI and Redis Commander:

```bash
cd docker
docker compose --profile debug up -d
```

| Tool | URL | Purpose |
|------|-----|---------|
| Kafka UI | http://localhost:8080 | Inspect topics, consumers, messages |
| Redis Commander | http://localhost:8081 | Browse Redis keys and values |

### 3.2 Production Build

```bash
# Build everything (shared packages first, then services and apps via Turborepo)
pnpm build
```

Turborepo respects the dependency graph defined in `turbo.json`, building shared packages (`database`, `shared`, `ui`) before services and apps. Build outputs go to `dist/` (NestJS services) and `.next/` (Next.js apps).

**Docker Production Images:**

Backend Service Dockerfile pattern (e.g., `services/content-service/Dockerfile`):

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY services/content-service/package.json ./services/content-service/
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/content-service/node_modules ./services/content-service/node_modules
COPY . .
RUN pnpm --filter @Agora-cms/database exec prisma generate
RUN pnpm --filter @Agora-cms/shared build
RUN pnpm --filter content-service build

# Stage 3: Production image
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/services/content-service/dist ./dist
COPY --from=builder /app/services/content-service/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/database/prisma ./prisma
USER node
EXPOSE 3001
ENTRYPOINT ["dumb-init", "node", "dist/main.js"]
```

Build and tag images:

```bash
# Backend services
docker build -f services/content-service/Dockerfile -t Agora-cms/content-service:latest .
docker build -f services/commerce-service/Dockerfile -t Agora-cms/commerce-service:latest .
docker build -f services/integration-service/Dockerfile -t Agora-cms/integration-service:latest .
docker build -f services/shipping-gateway/Dockerfile -t Agora-cms/shipping-gateway:latest .
docker build -f services/course-service/Dockerfile -t Agora-cms/course-service:latest .

# Frontend apps
docker build -f apps/page-builder/Dockerfile -t Agora-cms/page-builder:latest .
docker build -f apps/storefront/Dockerfile -t Agora-cms/storefront:latest .
docker build -f apps/admin-dashboard/Dockerfile -t Agora-cms/admin-dashboard:latest .
```

### 3.3 Bare Metal Deployment (PM2 + Nginx)

This is the recommended approach for GoDaddy VPS or any Ubuntu-based server.

**Step 1: Server setup**

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git curl wget unzip software-properties-common

# Install Node.js 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm alias default 20

# Install pnpm
corepack enable
corepack prepare pnpm@latest --activate

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**Step 2: Clone, configure, and build**

```bash
cd /opt
sudo mkdir Agora-cms && sudo chown $USER:$USER Agora-cms
git clone https://github.com/your-org/Agora-cms.git /opt/Agora-cms
cd /opt/Agora-cms

cp .env.example .env
# Edit .env with production values (see Section 4)

cd docker && docker compose up -d && cd ..
pnpm install --frozen-lockfile
pnpm --filter @Agora-cms/database exec prisma generate
pnpm db:migrate
pnpm db:seed
pnpm build
```

**Step 3: Set up PM2 process manager**

```bash
npm install -g pm2

cat > /opt/Agora-cms/ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [
    {
      name: 'content-service',
      cwd: '/opt/Agora-cms/services/content-service',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 3001 },
      max_memory_restart: '512M',
      error_file: '/var/log/Agora/content-service-error.log',
      out_file: '/var/log/Agora/content-service-out.log',
      merge_logs: true,
    },
    {
      name: 'commerce-service',
      cwd: '/opt/Agora-cms/services/commerce-service',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 3002 },
      max_memory_restart: '512M',
      error_file: '/var/log/Agora/commerce-service-error.log',
      out_file: '/var/log/Agora/commerce-service-out.log',
      merge_logs: true,
    },
    {
      name: 'integration-service',
      cwd: '/opt/Agora-cms/services/integration-service',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3003 },
      max_memory_restart: '512M',
      error_file: '/var/log/Agora/integration-service-error.log',
      out_file: '/var/log/Agora/integration-service-out.log',
      merge_logs: true,
    },
    {
      name: 'shipping-gateway',
      cwd: '/opt/Agora-cms/services/shipping-gateway',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3004 },
      max_memory_restart: '256M',
      error_file: '/var/log/Agora/shipping-gateway-error.log',
      out_file: '/var/log/Agora/shipping-gateway-out.log',
      merge_logs: true,
    },
    {
      name: 'course-service',
      cwd: '/opt/Agora-cms/services/course-service',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3005 },
      max_memory_restart: '512M',
      error_file: '/var/log/Agora/course-service-error.log',
      out_file: '/var/log/Agora/course-service-out.log',
      merge_logs: true,
    },
    {
      name: 'page-builder',
      cwd: '/opt/Agora-cms/apps/page-builder',
      script: 'node_modules/.bin/next',
      args: 'start -p 3100',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3100 },
      max_memory_restart: '512M',
      error_file: '/var/log/Agora/page-builder-error.log',
      out_file: '/var/log/Agora/page-builder-out.log',
      merge_logs: true,
    },
    {
      name: 'storefront',
      cwd: '/opt/Agora-cms/apps/storefront',
      script: 'node_modules/.bin/next',
      args: 'start -p 3200',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 3200 },
      max_memory_restart: '512M',
      error_file: '/var/log/Agora/storefront-error.log',
      out_file: '/var/log/Agora/storefront-out.log',
      merge_logs: true,
    },
    {
      name: 'admin-dashboard',
      cwd: '/opt/Agora-cms/apps/admin-dashboard',
      script: 'node_modules/.bin/next',
      args: 'start -p 3300',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3300 },
      max_memory_restart: '512M',
      error_file: '/var/log/Agora/admin-dashboard-error.log',
      out_file: '/var/log/Agora/admin-dashboard-out.log',
      merge_logs: true,
    },
  ],
};
PMEOF

sudo mkdir -p /var/log/Agora && sudo chown $USER:$USER /var/log/Agora
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

**Step 4: Nginx reverse proxy** -- See [Section 18: SSL/TLS & Domain Setup](#18-ssltls--domain-setup) for the full Nginx configuration.

### 3.4 Deployment on AWS (ECS Fargate)

#### Recommended Architecture

| Component | AWS Service |
|-----------|------------|
| Compute | ECS Fargate (serverless containers) |
| Database | RDS PostgreSQL 16 (Multi-AZ) |
| Cache | ElastiCache Redis 7 |
| Search | OpenSearch Service |
| Messaging | Amazon MSK (Managed Kafka) or SQS + EventBridge |
| Storage | S3 |
| Registry | ECR |
| Load Balancer | Application Load Balancer (ALB) |
| CDN | CloudFront |
| DNS | Route 53 |
| Secrets | Secrets Manager |
| Monitoring | CloudWatch |

#### Step 1: VPC Setup

```bash
# Create VPC with public and private subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=Agora-cms-vpc}]'

# Create public subnets (2 AZs)
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Create private subnets (2 AZs)
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.3.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.4.0/24 --availability-zone us-east-1b

# Create and attach Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=Agora-cms-igw}]'
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx

# Create NAT Gateway for private subnets
aws ec2 allocate-address --domain vpc
aws ec2 create-nat-gateway --subnet-id subnet-public-xxx --allocation-id eipalloc-xxx
```

#### Step 2: RDS PostgreSQL

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name Agora-cms-db-subnet \
  --db-subnet-group-description "Agora CMS DB" \
  --subnet-ids subnet-priv-a subnet-priv-b

aws rds create-db-instance \
  --db-instance-identifier Agora-cms-db \
  --db-instance-class db.t3.medium \
  --engine postgres --engine-version 16.1 \
  --master-username Agora \
  --master-user-password '<secure-password>' \
  --allocated-storage 100 --storage-type gp3 \
  --db-subnet-group-name Agora-cms-db-subnet \
  --vpc-security-group-ids sg-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --multi-az --storage-encrypted \
  --enable-cloudwatch-logs-exports '["postgresql"]'
```

#### Step 3: ElastiCache Redis

```bash
aws elasticache create-replication-group \
  --replication-group-id Agora-cms-redis \
  --replication-group-description "Agora CMS Redis" \
  --engine redis \
  --cache-node-type cache.t3.medium \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --cache-subnet-group-name Agora-cms-redis-subnet \
  --security-group-ids sg-redis \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled
```

#### Step 4: OpenSearch

```bash
aws opensearch create-domain \
  --domain-name Agora-cms-search \
  --engine-version "OpenSearch_2.11" \
  --cluster-config InstanceType=t3.medium.search,InstanceCount=2 \
  --ebs-options EBSEnabled=true,VolumeType=gp3,VolumeSize=100 \
  --vpc-options SubnetIds=subnet-priv-a,SecurityGroupIds=sg-es \
  --encryption-at-rest-options Enabled=true \
  --node-to-node-encryption-options Enabled=true \
  --domain-endpoint-options EnforceHTTPS=true
```

#### Step 5: S3 Buckets

```bash
aws s3 mb s3://Agora-cms-media-prod --region us-east-1
aws s3 mb s3://Agora-cms-labels-prod --region us-east-1

aws s3api put-bucket-versioning \
  --bucket Agora-cms-media-prod \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket Agora-cms-media-prod \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

aws s3api put-bucket-cors \
  --bucket Agora-cms-media-prod \
  --cors-configuration file://cors.json
```

#### Step 6: ECR -- Build and Push Images

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create repositories for each service
for svc in content-service commerce-service integration-service shipping-gateway course-service page-builder storefront admin-dashboard; do
  aws ecr create-repository --repository-name Agora-cms/$svc
done

# Build, tag, and push each image (example for content-service)
docker build -f services/content-service/Dockerfile -t Agora-cms/content-service:latest .
docker tag Agora-cms/content-service:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/Agora-cms/content-service:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/Agora-cms/content-service:latest
# Repeat for all services...
```

#### Step 7: ECS Fargate -- Task Definitions and Services

```bash
aws ecs create-cluster --cluster-name Agora-cms-cluster
```

Example task definition (`task-definitions/content-service.json`):

```json
{
  "family": "content-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "content-service",
    "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/Agora-cms/content-service:latest",
    "portMappings": [{"containerPort": 3001, "protocol": "tcp"}],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "PORT", "value": "3001"}
    ],
    "secrets": [
      {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:Agora-cms/database-url"},
      {"name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:Agora-cms/redis-url"},
      {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:Agora-cms/jwt-secret"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/content-service",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 60
    }
  }]
}
```

Register and create services:

```bash
aws ecs register-task-definition --cli-input-json file://task-definitions/content-service.json

aws ecs create-service \
  --cluster Agora-cms-cluster \
  --service-name content-service \
  --task-definition content-service:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-priv-a", "subnet-priv-b"],
      "securityGroups": ["sg-ecs"],
      "assignPublicIp": "DISABLED"
    }
  }' \
  --load-balancers '[{
    "targetGroupArn": "arn:aws:elasticloadbalancing:.../content-service-tg",
    "containerName": "content-service",
    "containerPort": 3001
  }]' \
  --health-check-grace-period-seconds 60
```

#### Step 8: Application Load Balancer

```bash
aws elbv2 create-load-balancer \
  --name Agora-cms-alb \
  --subnets subnet-pub-a subnet-pub-b \
  --security-groups sg-alb \
  --scheme internet-facing --type application

aws elbv2 create-target-group \
  --name content-service-tg \
  --protocol HTTP --port 3001 \
  --vpc-id vpc-xxx --target-type ip \
  --health-check-path /health

aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:...

# Path-based routing rules for each service
aws elbv2 create-rule \
  --listener-arn arn:... --priority 10 \
  --conditions Field=path-pattern,Values='/api/content/*' \
  --actions Type=forward,TargetGroupArn=arn:.../content-service-tg
```

#### Step 9: Route 53, CloudFront, Secrets Manager

```bash
# DNS
aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)

aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch '{
  "Changes": [{"Action": "CREATE", "ResourceRecordSet": {
    "Name": "yourdomain.com", "Type": "A",
    "AliasTarget": {"HostedZoneId": "Z123", "DNSName": "Agora-cms-alb-xxx.elb.amazonaws.com", "EvaluateTargetHealth": true}
  }}]
}'

# Secrets
aws secretsmanager create-secret --name Agora-cms/database-url \
  --secret-string "postgresql://Agora:pass@Agora-cms-db.xxx.rds.amazonaws.com:5432/Agora_cms"
aws secretsmanager create-secret --name Agora-cms/jwt-secret \
  --secret-string "$(openssl rand -base64 64)"

# CloudWatch log groups
for svc in content-service commerce-service integration-service shipping-gateway course-service; do
  aws logs create-log-group --log-group-name /ecs/$svc
  aws logs put-retention-policy --log-group-name /ecs/$svc --retention-in-days 30
done
```

#### Step 10: Auto Scaling

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/Agora-cms-cluster/content-service \
  --min-capacity 2 --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/Agora-cms-cluster/content-service \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ECSServiceAverageCPUUtilization"},
    "ScaleInCooldown": 300, "ScaleOutCooldown": 60
  }'
```

#### Terraform Example

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = var.aws_region }

module "vpc" {
  source               = "./modules/vpc"
  vpc_cidr             = "10.0.0.0/16"
  availability_zones   = ["us-east-1a", "us-east-1b"]
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]
}

module "rds" {
  source             = "./modules/rds"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  instance_class     = "db.t3.medium"
  allocated_storage  = 100
  multi_az           = true
}

module "ecs" {
  source             = "./modules/ecs"
  cluster_name       = "Agora-cms-cluster"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  services = {
    content-service  = { image = "${var.ecr_url}/content-service:latest",  cpu = 512, memory = 1024, port = 3001, desired_count = 2 }
    commerce-service = { image = "${var.ecr_url}/commerce-service:latest", cpu = 512, memory = 1024, port = 3002, desired_count = 2 }
  }
}
```

### 3.5 Deployment on Azure (Container Apps)

#### Recommended Architecture

| Component | Azure Service |
|-----------|--------------|
| Compute | Azure Container Apps or AKS |
| Database | Azure Database for PostgreSQL Flexible Server |
| Cache | Azure Cache for Redis |
| Search | Azure AI Search |
| Messaging | Azure Event Hubs (Kafka endpoint) |
| Storage | Azure Blob Storage |
| Registry | Azure Container Registry (ACR) |
| CDN | Azure Front Door |
| Secrets | Azure Key Vault |
| Monitoring | Application Insights / Azure Monitor |

#### Step 1: Resource Group and PostgreSQL

```bash
az group create --name Agora-cms-rg --location eastus

az postgres flexible-server create \
  --resource-group Agora-cms-rg \
  --name Agora-cms-db \
  --location eastus \
  --admin-user Agoraadmin \
  --admin-password '<SecurePassword123!>' \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --version 16 \
  --storage-size 128 \
  --backup-retention 7 \
  --high-availability ZoneRedundant

az postgres flexible-server db create \
  --resource-group Agora-cms-rg \
  --server-name Agora-cms-db \
  --database-name Agora_cms
```

#### Step 2: Redis Cache

```bash
az redis create \
  --resource-group Agora-cms-rg \
  --name Agora-cms-redis \
  --location eastus \
  --sku Premium --vm-size P1 \
  --replicas-per-master 1 \
  --enable-non-ssl-port false \
  --minimum-tls-version 1.2
```

#### Step 3: Event Hubs (Kafka-compatible)

```bash
az eventhubs namespace create \
  --resource-group Agora-cms-rg \
  --name Agora-cms-events \
  --location eastus \
  --sku Standard --enable-kafka true

az eventhubs eventhub create \
  --resource-group Agora-cms-rg \
  --namespace-name Agora-cms-events \
  --name content-events --partition-count 4

az eventhubs eventhub create \
  --resource-group Agora-cms-rg \
  --namespace-name Agora-cms-events \
  --name commerce-events --partition-count 4
```

#### Step 4: Blob Storage

```bash
az storage account create \
  --resource-group Agora-cms-rg \
  --name Agoracmsstorage \
  --location eastus \
  --sku Standard_GRS --kind StorageV2 \
  --https-only true --min-tls-version TLS1_2

az storage container create --account-name Agoracmsstorage --name media --public-access blob
az storage container create --account-name Agoracmsstorage --name labels --public-access blob
```

#### Step 5: Container Registry and Key Vault

```bash
az acr create \
  --resource-group Agora-cms-rg \
  --name Agoracmsacr \
  --sku Standard --admin-enabled true

az acr login --name Agoracmsacr

# Build and push images
az acr build --registry Agoracmsacr \
  --image Agora-cms/content-service:latest \
  --file services/content-service/Dockerfile .
# Repeat for all services...

az keyvault create \
  --resource-group Agora-cms-rg \
  --name Agora-cms-kv \
  --location eastus

az keyvault secret set --vault-name Agora-cms-kv --name database-url \
  --value "postgresql://Agoraadmin:pass@Agora-cms-db.postgres.database.azure.com:5432/Agora_cms"
az keyvault secret set --vault-name Agora-cms-kv --name jwt-secret \
  --value "$(openssl rand -base64 64)"
```

#### Step 6: Container Apps Environment

```bash
az monitor log-analytics workspace create \
  --resource-group Agora-cms-rg \
  --workspace-name Agora-cms-logs

LOG_ID=$(az monitor log-analytics workspace show \
  --resource-group Agora-cms-rg \
  --workspace-name Agora-cms-logs --query customerId -o tsv)

LOG_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group Agora-cms-rg \
  --workspace-name Agora-cms-logs --query primarySharedKey -o tsv)

az containerapp env create \
  --resource-group Agora-cms-rg \
  --name Agora-cms-env \
  --location eastus \
  --logs-workspace-id $LOG_ID \
  --logs-workspace-key $LOG_KEY
```

#### Step 7: Deploy Container Apps

```bash
az containerapp create \
  --resource-group Agora-cms-rg \
  --name content-service \
  --environment Agora-cms-env \
  --image Agoracmsacr.azurecr.io/Agora-cms/content-service:latest \
  --registry-server Agoracmsacr.azurecr.io \
  --registry-username Agoracmsacr \
  --registry-password $(az acr credential show --name Agoracmsacr --query "passwords[0].value" -o tsv) \
  --target-port 3001 --ingress external \
  --min-replicas 2 --max-replicas 10 \
  --cpu 0.5 --memory 1.0Gi \
  --env-vars NODE_ENV=production PORT=3001 \
  --secrets \
    database-url=keyvaultref:https://Agora-cms-kv.vault.azure.net/secrets/database-url \
    jwt-secret=keyvaultref:https://Agora-cms-kv.vault.azure.net/secrets/jwt-secret
# Repeat for all services...
```

#### Step 8: DNS and CDN

```bash
az network dns zone create --resource-group Agora-cms-rg --name yourdomain.com

az network dns record-set a add-record \
  --resource-group Agora-cms-rg \
  --zone-name yourdomain.com \
  --record-set-name @ \
  --ipv4-address $(az network public-ip show --resource-group Agora-cms-rg --name Agora-cms-pip --query ipAddress -o tsv)

az cdn profile create --resource-group Agora-cms-rg --name Agora-cms-cdn --sku Standard_Microsoft

az cdn endpoint create \
  --resource-group Agora-cms-rg \
  --profile-name Agora-cms-cdn \
  --name Agora-cms \
  --origin Agora-cms-env.eastus.azurecontainerapps.io \
  --enable-compression true
```

#### Bicep Example

```bicep
param location string = resourceGroup().location

module database 'modules/postgres.bicep' = {
  name: 'database'
  params: {
    location: location
    serverName: 'Agora-cms-db'
    administratorLogin: 'Agoraadmin'
    administratorPassword: '<secure-password>'
  }
}

module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: { location: location, redisCacheName: 'Agora-cms-redis', sku: 'Premium', capacity: 1 }
}

module containerAppsEnv 'modules/container-apps-env.bicep' = {
  name: 'containerAppsEnv'
  params: { location: location, environmentName: 'Agora-cms-env' }
}

module contentService 'modules/container-app.bicep' = {
  name: 'content-service'
  params: {
    location: location
    containerAppName: 'content-service'
    environmentId: containerAppsEnv.outputs.environmentId
    containerImage: 'Agoracmsacr.azurecr.io/Agora-cms/content-service:latest'
    targetPort: 3001
    minReplicas: 2
    maxReplicas: 10
  }
}
```

### 3.6 Deployment with Cloudflare (Hybrid Approach)

> **Important:** Cloudflare Workers have a 128 MB memory limit and do not support full Node.js runtime, long-running processes, or direct database connections. Use Cloudflare as a CDN and edge layer in front of backend services hosted on a VPS or cloud platform.

#### Architecture

| Layer | Service |
|-------|---------|
| DNS, CDN, WAF, DDoS | Cloudflare (integrated) |
| Edge Functions | Cloudflare Workers |
| Object Storage | Cloudflare R2 (S3-compatible, zero egress fees) |
| Frontend Hosting | Cloudflare Pages (optional, for static exports) |
| Backend Compute | External VPS, AWS, or Azure (NestJS services) |

#### Step 1: DNS Configuration

Add your domain to Cloudflare, then create DNS records:

```
Type   Name      Content            Proxy Status
A      @         YOUR_ORIGIN_IP     Proxied
A      www       YOUR_ORIGIN_IP     Proxied
A      admin     YOUR_ORIGIN_IP     Proxied
A      builder   YOUR_ORIGIN_IP     Proxied
CNAME  api       yourdomain.com     Proxied
```

#### Step 2: SSL/TLS

1. Navigate to **SSL/TLS** > **Overview** and set encryption mode to **Full (strict)**.
2. Enable **Always Use HTTPS** and **Automatic HTTPS Rewrites**.
3. Set **Minimum TLS Version** to 1.2.

#### Step 3: Caching Rules

```
Rule 1 -- Cache Static Assets:
  URL: *.yourdomain.com/media/*
  Edge Cache TTL: 1 month | Browser Cache TTL: 1 month

Rule 2 -- Cache Storefront Pages:
  URL: yourdomain.com/*
  Edge Cache TTL: 2 hours | Browser Cache TTL: 4 hours
  Bypass on Cookie: (if user is logged in)

Rule 3 -- Bypass API:
  URL: yourdomain.com/api/*
  Cache Level: Bypass
```

#### Step 4: Cloudflare Workers (Edge Routing)

```javascript
// workers/router.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return fetch(new Request(url, request), {
        headers: {
          ...request.headers,
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP'),
          'X-Real-IP': request.headers.get('CF-Connecting-IP')
        }
      });
    }

    return fetch(request);
  }
};
```

Deploy:

```bash
npm install -g wrangler
wrangler login
wrangler init Agora-cms-router
wrangler publish
```

#### Step 5: Cloudflare R2 (S3-Compatible Storage)

```bash
wrangler r2 bucket create Agora-media
wrangler r2 bucket create Agora-labels
```

Update `.env`:

```bash
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_ACCESS_KEY=<R2_ACCESS_KEY>
S3_SECRET_KEY=<R2_SECRET_KEY>
S3_BUCKET_MEDIA=Agora-media
S3_BUCKET_LABELS=Agora-labels
```

#### Step 6: WAF and DDoS Protection

1. Navigate to **Security** > **WAF** and enable Managed Rules.
2. Create custom rules:

```
Rate Limiting:  (http.request.uri.path eq "/api/auth/login") -- 5 req / 10 min
Block Bad Bots: (cf.bot_management.score lt 30) -- Block
Geo-blocking:   (ip.geoip.country in {"CN" "RU"}) -- Challenge (optional)
```

3. Navigate to **Security** > **DDoS** and enable HTTP DDoS Attack Protection with High sensitivity.

#### Step 7: Performance

- Enable **Auto Minify** for JS, CSS, HTML (Speed > Optimization).
- Enable **HTTP/3** (Network settings).
- Enable **Early Hints** (Speed > Optimization).
- **Rocket Loader** -- test carefully, may interfere with React hydration.

---

## 4. Configuration Reference

All environment variables are defined in `.env.example` at the repository root. Copy to `.env` and customize.

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://Agora:Agora_dev@localhost:5432/Agora_cms` | PostgreSQL connection string |

### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection string |

### Elasticsearch

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ELASTICSEARCH_URL` | Yes | `http://localhost:9200` | Elasticsearch endpoint |

### Kafka

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KAFKA_BROKERS` | Yes | `localhost:9092` | Comma-separated broker addresses |

### MinIO / S3

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `S3_ENDPOINT` | Yes | `http://localhost:9000` | S3-compatible endpoint. Omit for AWS S3. |
| `S3_ACCESS_KEY` | Yes | `minioadmin` | S3 access key ID |
| `S3_SECRET_KEY` | Yes | `minioadmin` | S3 secret access key |
| `S3_BUCKET_MEDIA` | Yes | `Agora-media` | Media files bucket |
| `S3_BUCKET_LABELS` | Yes | `Agora-labels` | Shipping labels bucket |
| `S3_REGION` | Yes | `us-east-1` | S3 region |

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | `your-jwt-secret-change-in-production` | JWT signing secret. Use 64+ random characters in production. |
| `JWT_EXPIRATION` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRATION` | No | `7d` | Refresh token lifetime (stored in Redis) |

Generate a strong JWT secret:

```bash
openssl rand -base64 64 | tr -d '\n'
```

### Service Ports

| Variable | Default |
|----------|---------|
| `CONTENT_SERVICE_PORT` | 3001 |
| `COMMERCE_SERVICE_PORT` | 3002 |
| `INTEGRATION_SERVICE_PORT` | 3003 |
| `SHIPPING_GATEWAY_PORT` | 3004 |
| `COURSE_SERVICE_PORT` | 3005 |
| `PAGE_BUILDER_PORT` | 3100 |
| `STOREFRONT_PORT` | 3200 |
| `ADMIN_DASHBOARD_PORT` | 3300 |

### Frontend API URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CONTENT_API_URL` | `http://localhost:3001` | Content service URL for frontends |
| `NEXT_PUBLIC_COMMERCE_API_URL` | `http://localhost:3002` | Commerce service URL for frontends |
| `NEXT_PUBLIC_COURSE_API_URL` | `http://localhost:3005` | Course service URL for frontends |
| `NEXT_PUBLIC_EVENTS_API_URL` | `http://localhost:3006` | Events service URL for frontends |
| `CONTENT_API_URL` | `http://localhost:3001` | Inter-service: commerce -> content for settings |
| `API_GATEWAY_URL` | `http://localhost:8000` | Kong gateway URL |

### CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `http://localhost:3100,http://localhost:3200,http://localhost:3300` | Comma-separated allowed origins |

### Stripe Integration

| Variable | Required | Default |
|----------|----------|---------|
| `STRIPE_ENABLED` | No | `false` |
| `STRIPE_SECRET_KEY` | If enabled | (empty) |
| `STRIPE_PUBLISHABLE_KEY` | If enabled | (empty) |
| `STRIPE_WEBHOOK_SECRET` | If enabled | (empty) |

### Google Analytics 4

| Variable | Required | Default |
|----------|----------|---------|
| `GA4_ENABLED` | No | `false` |
| `GA4_MEASUREMENT_ID` | If enabled | (empty) |
| `GA4_API_SECRET` | If enabled | (empty) |

### Salesforce

| Variable | Required | Default |
|----------|----------|---------|
| `SALESFORCE_ENABLED` | No | `false` |
| `SALESFORCE_CLIENT_ID` | If enabled | (empty) |
| `SALESFORCE_PRIVATE_KEY` | If enabled | (empty) |
| `SALESFORCE_USERNAME` | If enabled | (empty) |
| `SALESFORCE_LOGIN_URL` | No | `https://login.salesforce.com` |

### Shipping Carriers

| Variable | Required | Default |
|----------|----------|---------|
| `UPS_ENABLED` | No | `false` |
| `UPS_CLIENT_ID` | If enabled | (empty) |
| `UPS_CLIENT_SECRET` | If enabled | (empty) |
| `UPS_ACCOUNT_NUMBER` | If enabled | (empty) |
| `USPS_ENABLED` | No | `false` |
| `USPS_USER_ID` | If enabled | (empty) |
| `FEDEX_ENABLED` | No | `false` |
| `FEDEX_CLIENT_ID` | If enabled | (empty) |
| `FEDEX_CLIENT_SECRET` | If enabled | (empty) |
| `FEDEX_ACCOUNT_NUMBER` | If enabled | (empty) |
| `DHL_ENABLED` | No | `false` |
| `DHL_API_KEY` | If enabled | (empty) |
| `DHL_API_SECRET` | If enabled | (empty) |

---

## 5. Kong API Gateway

Kong 3.6 runs in DB-less (declarative) mode using the configuration file at `docker/kong/kong.yml`.

### Route Configuration

| Route Pattern | Backend Service | Port |
|--------------|----------------|------|
| `/api/v1/pages` | content-service | 3001 |
| `/api/v1/media` | content-service | 3001 |
| `/api/v1/templates` | content-service | 3001 |
| `/api/v1/navigation` | content-service | 3001 |
| `/api/v1/redirects` | content-service | 3001 |
| `/api/v1/sitemap` | content-service | 3001 |
| `/api/v1/seo` | content-service | 3001 |
| `/api/v1/auth` | content-service | 3001 |
| `/api/v1/products` | commerce-service | 3002 |
| `/api/v1/categories` | commerce-service | 3002 |
| `/api/v1/cart` | commerce-service | 3002 |
| `/api/v1/checkout` | commerce-service | 3002 |
| `/api/v1/orders` | commerce-service | 3002 |
| `/api/v1/coupons` | commerce-service | 3002 |
| `/api/v1/integrations` | integration-service | 3003 |
| `/api/v1/analytics` | integration-service | 3003 |
| `/api/v1/webhooks` | integration-service | 3003 |
| `/api/v1/shipping` | shipping-gateway | 3004 |

All routes use `strip_path: false`, meaning the full path is forwarded to the upstream service.

### Rate Limiting

Kong applies a global rate-limiting plugin:

```yaml
- name: rate-limiting
  config:
    minute: 300          # 300 requests per minute per IP
    policy: local        # In-memory counter (use 'redis' for distributed)
    fault_tolerant: true # Continue serving if counter fails
    hide_client_headers: false  # Expose X-RateLimit-* headers
```

For production, add per-route limits:

| Route | Recommended Limit | Reason |
|-------|-------------------|--------|
| `/api/v1/auth/login` | 10/minute | Brute-force protection |
| `/api/v1/auth/register` | 5/minute | Abuse prevention |
| `/api/v1/checkout` | 30/minute | Normal checkout flow |
| `/api/v1/webhooks` | 100/minute | Integration callbacks |

### CORS Policy

```yaml
- name: cors
  config:
    origins:
      - "http://localhost:3100"   # Page Builder
      - "http://localhost:3200"   # Storefront
      - "http://localhost:3300"   # Admin Dashboard
    methods: [GET, POST, PUT, DELETE, PATCH, OPTIONS]
    headers: [Authorization, Content-Type, X-Request-ID]
    exposed_headers: [X-Request-ID]
    credentials: true
    max_age: 3600
```

Update the `origins` list in production to match your actual domains.

### Administration

Access the Kong Admin API:

```bash
# List all services
curl http://localhost:8001/services

# List all routes
curl http://localhost:8001/routes

# Check gateway status
curl http://localhost:8001/status
```

---

## 6. Database Administration

### Schema Overview

The database uses PostgreSQL 16 with Prisma ORM. The schema is defined at `packages/database/prisma/schema.prisma`.

**Core Models (28 total):**

| Model | Table Name | Description |
|-------|-----------|-------------|
| User | `users` | User accounts with role-based access |
| Page | `pages` | CMS pages with component trees |
| PageVersion | `page_versions` | Page version history |
| Media | `media` | Uploaded files with S3 keys and variants |
| Navigation | `navigation` | Menu configurations (header, footer, etc.) |
| Redirect | `redirects` | URL redirect rules (301/302) |
| Product | `products` | Products (physical, virtual, service, configurable, course) |
| Category | `categories` | Product categories (hierarchical) |
| ProductCategory | `product_categories` | Product-to-category junction |
| Order | `orders` | Customer orders with line items |
| OrderEvent | `order_events` | Order lifecycle events |
| Shipment | `shipments` | Shipping records with tracking |
| LicenseKeyPool | `license_key_pools` | License key pools for virtual products |
| LicenseKey | `license_keys` | Individual license keys |
| ServiceBooking | `service_bookings` | Service product bookings |
| Integration | `integrations` | Integration configurations (stripe, ga4, salesforce) |
| SyncLog | `sync_log` | Integration sync history |
| Coupon | `coupons` | Discount coupons with targeting rules |
| AuditLog | `audit_logs` | Administrative action audit trail |
| SiteSettings | `site_settings` | Key-value site configuration |
| ProcessedEvent | `processed_events` | Webhook idempotency tracking |
| Course | `courses` | LMS courses |
| CourseVersion | `course_versions` | Course version history |
| CourseSection | `course_sections` | Course modules/sections |
| CourseLesson | `course_lessons` | Individual lessons |
| CourseLessonVersion | `course_lesson_versions` | Lesson version history |
| CourseEnrollment | `course_enrollments` | Student enrollments |
| CourseProgress | `course_progress` | Lesson-level progress tracking |
| Quiz | `quizzes` | Lesson quizzes |
| QuizQuestion | `quiz_questions` | Quiz questions (multiple_choice, true_false, fill_blank, essay) |
| QuizAttempt | `quiz_attempts` | Student quiz submissions |
| Certificate | `certificates` | Completion certificates |

### Key Enums

```
UserRole:       customer, viewer, editor, store_manager, admin, super_admin
PageStatus:     draft, review, published, archived
ProductType:    physical, virtual, service, configurable, course
ProductStatus:  draft, active, archived
OrderStatus:    pending, confirmed, processing, shipped, in_transit, delivered,
                completed, cancelled, refunded, returned
CourseStatus:   draft, published, archived
EnrollmentStatus: active, completed, suspended
```

### Prisma Commands Reference

```bash
# Generate Prisma client (after schema changes)
pnpm --filter @Agora-cms/database exec prisma generate

# Create and apply a new migration (development only)
pnpm --filter @Agora-cms/database exec prisma migrate dev --name describe_your_change

# Apply pending migrations (production -- never creates new migrations)
pnpm --filter @Agora-cms/database exec prisma migrate deploy

# Check migration status
pnpm --filter @Agora-cms/database exec prisma migrate status

# Reset database (WARNING: destroys all data)
pnpm --filter @Agora-cms/database exec prisma migrate reset

# Seed database
pnpm db:seed

# Open Prisma Studio (visual database browser at http://localhost:5555)
pnpm db:studio

# Push schema directly (no migration file -- development only)
pnpm --filter @Agora-cms/database exec prisma db push
```

### Connection Pooling

Prisma uses a built-in connection pool. Configure via the `DATABASE_URL` query parameters:

```
postgresql://user:pass@host:5432/Agora_cms?connection_limit=20&pool_timeout=10
```

For production with many service instances, use PgBouncer or Prisma Accelerate.

### PostgreSQL Maintenance

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('Agora_cms'));

-- Check table sizes
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 20;

-- Analyze tables for query optimizer
ANALYZE;

-- Vacuum to reclaim space
VACUUM (VERBOSE, ANALYZE);

-- Check long-running queries
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;

-- Kill a long-running query
SELECT pg_terminate_backend(PID);

-- Check index usage
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

---

## 7. User & Role Management

### Role Hierarchy

Agora CMS uses a hierarchical role system defined in `packages/shared/src/constants/roles.ts`. Higher roles inherit all permissions of lower roles.

```
customer (0)  <  viewer (1)  <  editor (2)  <  store_manager (3)  <  admin (4)  <  super_admin (5)
```

The `hasMinimumRole(userRole, requiredRole)` function checks if a user's role meets or exceeds the required role level.

### Role Permissions

| Capability | customer | viewer | editor | store_manager | admin | super_admin |
|-----------|----------|--------|--------|---------------|-------|-------------|
| Browse storefront | Yes | Yes | Yes | Yes | Yes | Yes |
| Place orders | Yes | Yes | Yes | Yes | Yes | Yes |
| View pages (admin) | -- | Yes | Yes | Yes | Yes | Yes |
| View products (admin) | -- | Yes | Yes | Yes | Yes | Yes |
| Create/edit pages | -- | -- | Yes | Yes | Yes | Yes |
| Upload media | -- | -- | Yes | Yes | Yes | Yes |
| Manage articles | -- | -- | Yes | Yes | Yes | Yes |
| Manage products | -- | -- | -- | Yes | Yes | Yes |
| Manage orders | -- | -- | -- | Yes | Yes | Yes |
| Manage coupons | -- | -- | -- | Yes | Yes | Yes |
| Manage categories | -- | -- | -- | Yes | Yes | Yes |
| View settings | -- | -- | -- | -- | Yes | Yes |
| Update settings | -- | -- | -- | -- | Yes | Yes |
| Manage users | -- | -- | -- | -- | Yes | Yes |
| Manage integrations | -- | -- | -- | -- | Yes | Yes |
| System configuration | -- | -- | -- | -- | -- | Yes |

### Managing Users via the Admin Dashboard

Navigate to **Commerce > Customers** in the sidebar (`/users`). The user management page supports:

- **List users**: Paginated with search by name or email, filter by role and active status
- **View user details**: Shows order count, enrollment count, pages created, media uploaded, Salesforce contact ID, Stripe customer ID, failed login count, and lockout status
- **Update user**: Change name, role, or active status via `PATCH /api/v1/users/:id`
- **Unlock account**: Reset failed login counter and clear lockout via `POST /api/v1/users/:id/unlock`

### Managing Users via the API

```bash
# List users with filters
curl http://localhost:3001/api/v1/users?page=1&limit=20&role=editor&isActive=true

# Get user by ID
curl http://localhost:3001/api/v1/users/{id}

# Update user role
curl -X PATCH http://localhost:3001/api/v1/users/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"role": "store_manager"}'

# Deactivate user
curl -X PATCH http://localhost:3001/api/v1/users/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"isActive": false}'

# Unlock a locked account
curl -X POST http://localhost:3001/api/v1/users/{id}/unlock \
  -H "Authorization: Bearer <token>"
```

### Account Lockout

Defined in `services/content-service/src/modules/auth/auth.service.ts`:

- **Threshold**: 5 consecutive failed login attempts (`MAX_FAILED_LOGINS = 5`)
- **Lockout duration**: 30 minutes (`LOCKOUT_MINUTES = 30`)
- **Behavior**: After 5 failed attempts, the `lockedUntil` field is set to 30 minutes in the future. Further login attempts are rejected with a `403 Forbidden` response indicating the remaining lockout time.
- **Reset**: Successful login resets the counter. Admins can manually unlock via the API or Admin Dashboard.

### Password Security

- Passwords are hashed with **bcrypt** using **12 salt rounds** (`BCRYPT_ROUNDS = 12`)
- Password is never returned in any API response (the `passwordHash` field is excluded from all `select` clauses)

---

## 8. Email System

### Email Provider Configuration

Navigate to **Settings > Email** in the Admin Dashboard (`/settings/email`). The email system supports six providers:

| Provider | Key | Required Fields |
|----------|-----|----------------|
| SMTP | `smtp` | host, port, encryption, username, password |
| SendGrid | `sendgrid` | apiKey |
| Mailgun | `mailgun` | apiKey, domain, region |
| Amazon SES | `ses` | accessKeyId, secretAccessKey, region |
| Postmark | `postmark` | serverToken |
| Resend | `resend` | apiKey |

### Email Settings Structure

The email configuration is stored in the `site_settings` table under the key `email`:

```json
{
  "enabled": true,
  "provider": "sendgrid",
  "fromName": "My Website",
  "fromEmail": "noreply@example.com",
  "replyToEmail": "support@example.com",
  "credentials": { "apiKey": "SG.xxxxx..." },
  "rateLimitPerHour": 500,
  "testMode": false,
  "testRecipient": ""
}
```

### Test Mode

When test mode is enabled, all outgoing transactional emails are redirected to the configured test recipient instead of the actual recipients. This is useful for staging environments.

### Email Templates

Navigate to **Settings > Email Templates** in the sidebar (`/email-templates`). The template management system provides:

- Create, edit, duplicate, and delete templates
- Preview templates (HTML and plain text)
- Send test emails to verify rendering
- Reset templates to defaults
- Categorize templates by purpose
- Activate/deactivate individual templates

### Sender Identity Configuration

| Field | Description |
|-------|-------------|
| From Name | Displayed in the recipient's inbox (e.g., "My Website") |
| From Email | Must be verified with your email provider (e.g., noreply@example.com) |
| Reply-To Email | Where replies are directed (optional, defaults to From Email) |

### Rate Limiting

Configure the maximum emails sent per hour. Check your provider's limits:

| Provider | Free Tier Limit |
|----------|----------------|
| SendGrid | 100/day |
| Mailgun | 300/day |
| Amazon SES (sandbox) | 200/day |
| Postmark | 100/month |
| Resend | 100/day |

---

## 9. Integration Administration

### Stripe (Payments + Tax)

**Configuration methods:**

1. **Environment variables**: Set `STRIPE_SECRET_KEY` in `.env` for the integration service
2. **Admin Dashboard**: Navigate to **Settings > Payments** (`/settings/payments`) to configure via the UI

The integration service at `services/integration-service/src/modules/stripe/stripe.module.ts` uses a factory pattern: when `STRIPE_SECRET_KEY` is set, it creates a Stripe gateway; otherwise, it injects a `StubPaymentGateway` for local development.

**Payment settings (stored in `site_settings` under key `payments`):**

```json
{
  "provider": "stripe",
  "enabled": false,
  "mode": "test",
  "testPublishableKey": "pk_test_...",
  "testSecretKey": "sk_test_...",
  "testWebhookSecret": "whsec_...",
  "livePublishableKey": "pk_live_...",
  "liveSecretKey": "sk_live_...",
  "liveWebhookSecret": "whsec_...",
  "currency": "USD",
  "paymentMethods": ["card"],
  "captureMethod": "automatic"
}
```

Sensitive fields (`testSecretKey`, `testWebhookSecret`, `liveSecretKey`, `liveWebhookSecret`) are masked in API responses.

**Webhook endpoint**: `POST /api/v1/webhooks/stripe` on the integration service (port 3003). It handles:

- `payment_intent.succeeded` -- confirm order
- `payment_intent.payment_failed` -- flag failed payment
- `charge.refunded` -- process refund

### Google Analytics 4

**Configuration**: Set `GA4_MEASUREMENT_ID` and `GA4_API_SECRET` in `.env`, or configure via **Settings > Analytics** in the Admin Dashboard.

The analytics module (`services/integration-service/src/modules/analytics/analytics.module.ts`) uses a `StubAnalyticsProvider` when credentials are not set.

**Analytics settings (stored in `site_settings` under key `analytics`):**

```json
{
  "provider": "ga4",
  "measurementId": "G-XXXXXXXX",
  "enabled": false,
  "trackingConfig": {
    "anonymizeIp": true,
    "trackPageViews": true,
    "trackEcommerce": true,
    "trackCourseProgress": true,
    "cookieConsent": true
  }
}
```

### Salesforce

**Configuration**: Navigate to **Settings > System** (`/settings/system`) in the Admin Dashboard.

Supports two authentication methods:

1. **JWT Bearer Flow** (recommended for server-to-server): Requires Client ID, Username, and Private Key (PEM)
2. **OAuth Client Credentials**: Requires Client ID and Client Secret

The CRM module (`services/integration-service/src/modules/salesforce/salesforce.module.ts`) uses a `StubCRMConnector` when credentials are not set.

**Setup steps:**

1. Create a Connected App in Salesforce Setup
2. Enable OAuth with appropriate scopes
3. For JWT: upload your certificate to the Connected App, pre-authorize for your integration user's profile
4. For OAuth: enable Client Credentials Flow
5. Configure the credentials in the Admin Dashboard under Settings > System > Salesforce Integration

### Webhook Idempotency

The `processed_events` table tracks processed webhook event IDs to prevent duplicate processing. Each record stores the event ID, source (e.g., `stripe`, `salesforce`), and processing timestamp.

---

## 10. Media & Storage

### Storage Architecture

Media files are stored in S3-compatible object storage (MinIO for local development, AWS S3 for production). The media service is implemented in `services/content-service/src/modules/media/media.service.ts`.

### Image Processing Pipeline

When an image is uploaded, the system automatically:

1. Stores the **original** file at `media/{uuid}/original.{ext}`
2. Generates **three responsive variants** (WebP format, quality 80):
   - Thumbnail: 150x150px -- `media/{uuid}/thumbnail.webp`
   - Medium: 800px wide -- `media/{uuid}/medium.webp`
   - Large: 1920px wide -- `media/{uuid}/large.webp`
3. Generates a **full-size WebP** conversion (quality 85): `media/{uuid}/full.webp`
4. Extracts **dimensions** metadata from the original image

Image processing uses the **sharp** library. Non-image files are stored without variant generation.

### Bucket Configuration

The `minio-init` container in `docker/docker-compose.yml` automatically creates two buckets on startup:

| Bucket | Purpose | Public Access |
|--------|---------|---------------|
| `Agora-media` | Media files (images, documents, videos) | Download (anonymous read) |
| `Agora-labels` | Shipping labels | Private |

### MinIO Console

Access the MinIO web UI at http://localhost:9001 with default credentials:

- **Username**: minioadmin
- **Password**: minioadmin

### S3 Configuration for Production

When switching to AWS S3, update your `.env`:

```env
S3_ENDPOINT=               # Leave empty for AWS S3 (remove MinIO endpoint)
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
S3_BUCKET_MEDIA=your-media-bucket
S3_BUCKET_LABELS=your-labels-bucket
S3_REGION=us-east-1
```

The media service automatically switches between MinIO (direct URLs) and AWS S3 (presigned URLs) based on whether `S3_ENDPOINT` is set.

### CDN Considerations

For production, serve media through a CDN:

- **AWS**: CloudFront distribution with the S3 media bucket as origin
- **Cloudflare**: R2 bucket with Cloudflare CDN (zero egress fees)
- **Azure**: Azure CDN with Blob Storage origin

Set long cache headers for immutable assets:

```
Cache-Control: public, max-age=31536000, immutable
```

---

## 11. Search Administration

### Elasticsearch Configuration

Elasticsearch 8.12 runs as a single-node cluster in development with security disabled:

```yaml
# docker/docker-compose.yml
environment:
  - discovery.type=single-node
  - xpack.security.enabled=false
  - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
```

### Feature Backend Toggle

The system supports two search backends, configurable via **Settings > System** in the Admin Dashboard:

| Backend | Key | Description |
|---------|-----|-------------|
| Elasticsearch | `elasticsearch` | Full-text search with relevance scoring |
| PostgreSQL | `database` | PostgreSQL full-text search (no external dependency) |

### Index Management

```bash
# Check cluster health
curl -s http://localhost:9200/_cluster/health?pretty

# List all indices
curl -s http://localhost:9200/_cat/indices?v

# Check index mapping
curl -s http://localhost:9200/products/_mapping?pretty

# Delete an index (will be recreated by the service on restart)
curl -X DELETE http://localhost:9200/products

# Force merge for read optimization
curl -X POST "http://localhost:9200/products/_forcemerge?max_num_segments=1"
```

### Reindexing

To reindex data from the database:

1. Stop the affected service
2. Delete the Elasticsearch index
3. Restart the service -- it will re-sync from the database on startup

```bash
curl -X DELETE http://localhost:9200/products
pm2 restart commerce-service
```

### Production Configuration

For production, adjust JVM heap size based on available memory (typically 50% of available RAM, up to 32 GB):

```yaml
environment:
  - "ES_JAVA_OPTS=-Xms4g -Xmx4g"
  - xpack.security.enabled=true
```

---

## 12. Cache Management

### Redis Configuration

Redis 7 runs with AOF (Append Only File) persistence enabled:

```yaml
# docker/docker-compose.yml
command: redis-server --appendonly yes
```

### Feature Backend Toggle

The cache backend is configurable via **Settings > System**:

| Backend | Key | Description |
|---------|-----|-------------|
| Redis | `redis` | Distributed cache with persistence |
| In-Memory | `memory` | LRU cache (no external dependency, not shared across instances) |

### What Redis Stores

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `refresh:{uuid}` | JWT refresh tokens | 7 days (604,800 seconds) |
| Session data | User sessions | Configurable |
| Cache entries | Database query cache | Varies by query |

### Cache Operations

```bash
# Connect to Redis CLI
docker exec -it Agora-redis redis-cli

# Check memory usage
INFO memory

# List all keys matching a pattern
KEYS refresh:*

# Check TTL of a key
TTL refresh:some-uuid

# Flush all data (WARNING: invalidates all sessions and refresh tokens)
FLUSHALL

# Monitor real-time commands
MONITOR
```

### Redis Commander

Access the web UI at http://localhost:8081 (requires debug profile). Browse keys, view values, and manage data visually.

### Production Redis Configuration

For production, add these to your `redis.conf`:

```
# RDB snapshots
save 900 1
save 300 10
save 60 10000

# AOF
appendonly yes
appendfsync everysec

# Memory limit
maxmemory 2gb
maxmemory-policy allkeys-lru

# Security
requirepass YOUR_REDIS_PASSWORD
```

---

## 13. Message Queue

### Kafka Configuration

Kafka 7.6.0 (Confluent Platform) runs in KRaft mode (no ZooKeeper) with a single broker for development:

```yaml
# docker/docker-compose.yml
environment:
  KAFKA_NODE_ID: 1
  KAFKA_PROCESS_ROLES: broker,controller
  KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:29093
  KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:29093
  KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
  KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
  CLUSTER_ID: "Agora-cms-local-cluster"
```

### Feature Backend Toggle

The queue backend is configurable via **Settings > System**:

| Backend | Key | Description |
|---------|-----|-------------|
| Kafka | `kafka` | Distributed message broker |
| PostgreSQL Polling | `database` | Database-backed queue (no external dependency) |

### Event Types

All event types are defined in `packages/shared/src/events/event-types.ts`:

**Content Events:**
- `page.created`, `page.updated`, `page.published`, `page.unpublished`, `page.deleted`

**Commerce Events:**
- `product.created`, `product.updated`, `product.deleted`
- `cart.updated`, `cart.abandoned`
- `checkout.started`
- `order.created`, `order.confirmed`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.refunded`
- `inventory.updated`, `inventory.low`, `inventory.reserved`

**Integration Events:**
- `payment.succeeded`, `payment.failed`
- `contact.synced`, `lead.created`

**User Events:**
- `user.registered`, `user.logged_in`, `form.submitted`

### Topic Management

```bash
# List all topics
docker exec Agora-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Create a topic
docker exec Agora-kafka kafka-topics --bootstrap-server localhost:9092 \
  --create --topic ORDER_CREATED --partitions 3 --replication-factor 1

# Describe a topic
docker exec Agora-kafka kafka-topics --bootstrap-server localhost:9092 \
  --describe --topic ORDER_CREATED

# Check consumer group lag
docker exec Agora-kafka kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group Agora-cms-group

# Increase partitions
docker exec Agora-kafka kafka-topics --bootstrap-server localhost:9092 \
  --alter --topic ORDER_CREATED --partitions 12
```

### Kafka UI

Access at http://localhost:8080 (requires debug profile). Provides:

- Topic listing with partition counts and message counts
- Consumer group monitoring with lag metrics
- Message browsing and search
- Topic configuration management

---

## 14. Security Hardening

### JWT Configuration

JWT tokens are used for authentication. Configuration is in `services/content-service/src/modules/auth/auth.module.ts`:

```typescript
JwtModule.registerAsync({
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
    signOptions: {
      expiresIn: configService.get<string>('JWT_EXPIRATION', '15m'),
    },
  }),
})
```

**JWT payload structure** (from `packages/shared/src/types/user.ts`):

```typescript
interface JwtPayload {
  sub: string;    // User ID
  email: string;
  role: UserRole;
  iat: number;    // Issued at
  exp: number;    // Expiration
}
```

**Refresh tokens** are stored in Redis with a 7-day TTL. Token rotation is enforced: each refresh token can only be used once, and a new pair is issued.

### Password Hashing

- Algorithm: **bcrypt**
- Salt rounds: **12** (defined as `BCRYPT_ROUNDS` in `auth.service.ts`)

### Account Lockout

- Threshold: **5 failed attempts** (`MAX_FAILED_LOGINS`)
- Duration: **30 minutes** (`LOCKOUT_MINUTES`)
- The `failedLogins` counter is stored on the `User` model and reset on successful login
- Admins can manually unlock via `POST /api/v1/users/:id/unlock`

### CORS Configuration

CORS is enforced at two levels:

1. **Kong API Gateway** (primary): Global plugin in `docker/kong/kong.yml`
2. **NestJS services** (fallback): Each service reads `CORS_ORIGINS` from the environment

```typescript
// services/content-service/src/main.ts
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3100',
    'http://localhost:3200',
    'http://localhost:3300',
  ],
  credentials: true,
});
```

### Rate Limiting via Kong

Global: 300 requests/minute per IP. See [Section 5](#5-kong-api-gateway) for per-route recommendations.

### Input Validation

All NestJS services use global `ValidationPipe` with strict settings:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // Strip unknown properties
    forbidNonWhitelisted: true, // Reject unknown properties
    transform: true,            // Auto-transform types
  }),
);
```

### Security Headers (Nginx)

Add these headers in your Nginx configuration:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### Sensitive Field Masking

The settings service (`services/content-service/src/modules/settings/settings.service.ts`) automatically masks sensitive fields before returning them to the client. Payment secret keys and webhook secrets are masked as `sk_test••••last4`. When updating settings, masked values are detected and the original value is preserved.

### Secrets Management

| Platform | Solution |
|----------|----------|
| Development | `.env` file (git-ignored) |
| AWS | Secrets Manager or SSM Parameter Store |
| Azure | Key Vault |
| VPS | Encrypted `.env` with `chmod 600` |
| Kubernetes | Kubernetes Secrets (encrypted at rest) |

### OWASP Checklist

- [x] Input validation on all API endpoints (class-validator DTOs)
- [x] Parameterized queries via Prisma ORM (SQL injection prevention)
- [x] CSRF protection via SameSite cookies and CORS
- [x] Rate limiting on authentication endpoints
- [x] Account lockout mechanism
- [x] Password hashing with bcrypt (12 rounds)
- [x] JWT with short-lived access tokens and refresh token rotation
- [x] File upload validation (MIME type checking in media service)
- [x] Audit logging for administrative actions (`audit_logs` table)
- [x] Sensitive field masking in API responses
- [ ] Regular dependency vulnerability scanning (`pnpm audit`)
- [ ] Penetration testing (recommended annually)

---

## 15. Monitoring & Health Checks

### Health Endpoints

Every backend service provides health endpoints:

```
GET /health       -> { "status": "ok", "uptime": 12345.67 }
GET /health/ready -> { "status": "ok", "database": "connected", "redis": "connected" }
GET /health/live  -> { "status": "ok" }
```

Use `/health/ready` for load balancer health checks and `/health/live` for container liveness probes.

### Service Health Dashboard

The Admin Dashboard includes a Service Health panel at **Settings > System** (`/settings/system`). It checks connectivity to:

- Content Service (port 3001)
- Commerce Service (port 3002)
- Course Service (port 3005)

Each service shows online/offline status and response time in milliseconds.

### Automated Health Check Script

```bash
#!/usr/bin/env bash
SERVICES=(
  "content-service:3001"
  "commerce-service:3002"
  "integration-service:3003"
  "shipping-gateway:3004"
  "course-service:3005"
)

for svc in "${SERVICES[@]}"; do
  name="${svc%%:*}"
  port="${svc##*:}"
  status=$(curl -sf "http://localhost:${port}/health" | jq -r '.status' 2>/dev/null || echo "DOWN")
  echo "${name}: ${status}"
done
```

### Logging

All NestJS services are configured with full log levels:

```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['log', 'error', 'warn', 'debug', 'verbose'],
});
```

PM2 logs are written to `/var/log/Agora/`:

```bash
# View logs for a specific service
pm2 logs content-service --lines 100

# View error logs only
pm2 logs --err --lines 500

# View Docker container logs
docker compose logs --tail=100 -f postgres
```

### Swagger API Documentation

Each service exposes Swagger (OpenAPI) documentation:

| Service | Swagger URL |
|---------|------------|
| Content Service | http://localhost:3001/docs |
| Commerce Service | http://localhost:3002/docs |
| Integration Service | http://localhost:3003/api/docs |
| Shipping Gateway | http://localhost:3004/api/docs |
| Course Service | http://localhost:3005/api |

### Audit Logging

Administrative actions are recorded in the `audit_logs` table:

| Field | Description |
|-------|-------------|
| `userId` | User who performed the action |
| `action` | Action type (e.g., `page.publish`, `order.refund`) |
| `resourceType` | Entity type (e.g., `page`, `order`) |
| `resourceId` | Entity ID |
| `details` | JSON payload with additional context |
| `ipAddress` | Client IP address |
| `result` | `success` or `failure` |
| `createdAt` | Timestamp |

### Alerting Recommendations

| Alert | Condition | Severity |
|-------|-----------|----------|
| Service Down | Health check fails for 2 minutes | Critical |
| High CPU | CPU > 80% for 5 minutes | Warning |
| High Memory | Memory > 85% for 5 minutes | Warning |
| Disk Space | Disk usage > 90% | Critical |
| Slow Response | P95 latency > 2 seconds | Warning |
| Error Rate | 5xx errors > 1% of requests | Critical |
| Database Connections | Active connections > 80% of max | Warning |
| Kafka Consumer Lag | Lag > 10000 messages | Warning |
| Account Lockouts | More than 10 lockouts per hour | Warning |

---

## 16. Backup & Disaster Recovery

### Database Backups

**Automated daily backup script** (`scripts/backup-db.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/Agora-cms/backups/database"
S3_BUCKET="s3://Agora-cms-backups/database"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# For Docker-based PostgreSQL
docker exec Agora-postgres pg_dump -U Agora Agora_cms \
  --format=custom --compress=9 \
  > "${BACKUP_DIR}/Agora_cms_${TIMESTAMP}.dump"

# For direct PostgreSQL
# PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d Agora_cms \
#   --format=custom --compress=9 -f "${BACKUP_DIR}/Agora_cms_${TIMESTAMP}.dump"

# Optional: Upload to S3
# aws s3 cp "${BACKUP_DIR}/Agora_cms_${TIMESTAMP}.dump" \
#   "${S3_BUCKET}/Agora_cms_${TIMESTAMP}.dump" --storage-class STANDARD_IA

# Clean local backups older than retention period
find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: Agora_cms_${TIMESTAMP}.dump"
```

**Restore from backup:**

```bash
# Custom format restore
docker exec -i Agora-postgres pg_restore -U Agora -d Agora_cms \
  < /opt/Agora-cms/backups/database/Agora_cms_TIMESTAMP.dump

# SQL format restore
gunzip -c backup.sql.gz | docker exec -i Agora-postgres psql -U Agora Agora_cms
```

### Media Backups

Enable S3 bucket versioning to protect against accidental deletion:

```bash
# AWS S3
aws s3api put-bucket-versioning \
  --bucket Agora-cms-media-prod \
  --versioning-configuration Status=Enabled

# MinIO
mc versioning enable local/Agora-media
```

For cross-region redundancy, enable S3 Cross-Region Replication.

### Redis Persistence

Redis is configured with AOF persistence by default. For production, also enable RDB snapshots:

```
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

### Elasticsearch Snapshots

```bash
# Register snapshot repository
curl -X PUT "http://localhost:9200/_snapshot/Agora_backup" \
  -H 'Content-Type: application/json' -d '{
    "type": "fs",
    "settings": { "location": "/backups/elasticsearch" }
  }'

# Create snapshot
curl -X PUT "http://localhost:9200/_snapshot/Agora_backup/snapshot_$(date +%Y%m%d)?wait_for_completion=true"

# Restore snapshot
curl -X POST "http://localhost:9200/_snapshot/Agora_backup/snapshot_20260213/_restore"
```

### Configuration Backups

Back up these critical configuration files:

- `.env` (environment variables)
- `docker/kong/kong.yml` (API gateway config)
- `ecosystem.config.js` (PM2 process config)
- Nginx site configurations
- SSL certificates

### Disaster Recovery Plan

| Component | RTO | RPO | Strategy |
|-----------|-----|-----|----------|
| Database | 1 hour | 5 minutes | Multi-AZ RDS with automated backups |
| Redis | 15 minutes | 1 minute | ElastiCache Multi-AZ with AOF |
| Elasticsearch | 2 hours | 24 hours | Daily snapshots to S3 |
| Media Files | 0 | 0 | S3 Cross-Region Replication + versioning |
| Application | 15 minutes | N/A | Container images in registry, auto-recovery |

### Cron Jobs

```cron
# Database backup daily at 2 AM
0 2 * * * /opt/Agora-cms/scripts/backup-db.sh >> /var/log/Agora/backup.log 2>&1

# SSL certificate renewal
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"

# Clean old logs weekly
0 4 * * 0 find /var/log/Agora -name "*.log" -mtime +30 -delete

# Docker image prune monthly
0 5 1 * * docker system prune -af --volumes >> /var/log/Agora/docker-prune.log 2>&1
```

---

## 17. Scaling

### Horizontal Scaling by Service

**PM2 Cluster Mode (VPS):**

```bash
# Scale at runtime
pm2 scale content-service 4
pm2 scale storefront 4
pm2 scale commerce-service 4
```

Or adjust `instances` in `ecosystem.config.js`:

| Service | Recommended Instances | Reason |
|---------|----------------------|--------|
| content-service | 2-4 | Handles pages, media, auth, settings |
| commerce-service | 2-4 | Handles products, orders, cart |
| integration-service | 1 | Low traffic, webhook processing |
| shipping-gateway | 1 | On-demand rate calculations |
| course-service | 1-2 | LMS traffic |
| storefront | 2-4 | Customer-facing, highest traffic |
| page-builder | 1 | Internal tool, low traffic |
| admin-dashboard | 1 | Internal tool, low traffic |

**Docker / ECS:**

```bash
# ECS
aws ecs update-service --cluster Agora-cms --service content-service --desired-count 4

# Docker Compose
docker compose up -d --scale content-service=4
```

### Database Read Replicas

```bash
# AWS RDS
aws rds create-db-instance-read-replica \
  --db-instance-identifier Agora-cms-db-read-1 \
  --source-db-instance-identifier Agora-cms-db

# Azure
az postgres flexible-server replica create \
  --resource-group Agora-cms-prod \
  --name Agora-cms-db-read-1 \
  --source-server Agora-cms-db
```

Configure Prisma with separate read/write connections:

```typescript
const writeClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const readClient = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_READ_URL } } });
```

### Redis Clustering

For high-throughput environments:

```bash
aws elasticache create-replication-group \
  --replication-group-id Agora-redis-cluster \
  --num-node-groups 3 \
  --replicas-per-node-group 1
```

### Kafka Partitions

Increase partitions for high-throughput topics:

```bash
docker exec Agora-kafka kafka-topics --bootstrap-server localhost:9092 \
  --alter --topic ORDER_CREATED --partitions 12
```

### CDN for Static Assets

- Next.js static assets (`/_next/static/`) should be served via CDN with immutable cache headers
- Media files from S3/MinIO should be served via CloudFront or Cloudflare CDN

### Caching Strategy

| Layer | Strategy | TTL | Implementation |
|-------|----------|-----|----------------|
| CDN | Static assets, media | 1 year | CloudFront / Cloudflare |
| API Gateway | GET responses | 5-60s | Kong proxy-cache plugin |
| Application | Database query results | 60-300s | Redis cache |
| Application | Session/refresh tokens | 15min/7d | Redis |
| Database | Connection pooling | N/A | Prisma connection pool |

---

## 18. SSL/TLS & Domain Setup

### Let's Encrypt (VPS)

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx \
  -d yourdomain.com -d www.yourdomain.com \
  -d admin.yourdomain.com -d builder.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

### Nginx Reverse Proxy Configuration

```nginx
# Upstream definitions
upstream api_gateway {
    server 127.0.0.1:8000;
    keepalive 32;
}
upstream storefront {
    server 127.0.0.1:3200;
    keepalive 32;
}
upstream admin_dashboard {
    server 127.0.0.1:3300;
    keepalive 16;
}
upstream page_builder {
    server 127.0.0.1:3100;
    keepalive 16;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com admin.yourdomain.com builder.yourdomain.com;
    return 301 https://$host$request_uri;
}

# Storefront (main domain)
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # API proxy via Kong
    location /api/ {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 120s;
        client_max_body_size 100M;
    }

    # Static assets with long cache
    location /_next/static/ {
        proxy_pass http://storefront;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Everything else -> Storefront
    location / {
        proxy_pass http://storefront;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Admin Dashboard
server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Optional: Restrict by IP
    # allow 203.0.113.0/24;
    # deny all;

    location /api/ {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }

    location /_next/static/ {
        proxy_pass http://admin_dashboard;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://admin_dashboard;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Page Builder
server {
    listen 443 ssl http2;
    server_name builder.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    location /api/ {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }

    location /_next/static/ {
        proxy_pass http://page_builder;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://page_builder;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable and test:

```bash
sudo ln -sf /etc/nginx/sites-available/Agora-cms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### DNS Configuration

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 600 |
| A | www | YOUR_SERVER_IP | 600 |
| A | admin | YOUR_SERVER_IP | 600 |
| A | builder | YOUR_SERVER_IP | 600 |
| CNAME | api | yourdomain.com | 600 |

### Database SSL

Append `?sslmode=require` to `DATABASE_URL` for encrypted database connections:

```
DATABASE_URL=postgresql://user:pass@host:5432/Agora_cms?sslmode=require
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

> **WARNING:** Do not expose ports 3001-3005, 5432, 6379, 9092, 9200 directly. All API traffic should flow through Nginx to Kong.

---

## 19. Maintenance

### Regular Task Schedule

| Task | Frequency | Command/Action |
|------|-----------|---------------|
| Update Node.js dependencies | Monthly | `pnpm update` |
| Security audit | Weekly | `pnpm audit` |
| Rotate JWT secret | Quarterly | Update `JWT_SECRET`, redeploy all services |
| Rotate database password | Quarterly | Update in secrets manager and services |
| Rotate S3/MinIO keys | Quarterly | Generate new keys, update configuration |
| Prune Docker images | Monthly | `docker system prune -af` |
| Database VACUUM | Weekly | `VACUUM (VERBOSE, ANALYZE);` |
| Database REINDEX | Monthly | `REINDEX DATABASE Agora_cms;` |
| Elasticsearch optimization | Monthly | `POST /_forcemerge?max_num_segments=1` |
| SSL certificate renewal | Auto (Let's Encrypt) | Verify `certbot renew --dry-run` |
| Review audit logs | Weekly | Check `audit_logs` table |
| Backup verification | Monthly | Restore a backup to a test environment |
| Load testing | Quarterly | Run load tests against staging |

### Update Procedure

**1. Preparation:**

```bash
cd /opt/Agora-cms
git fetch origin
git log --oneline HEAD..origin/main    # Review changes
./scripts/backup-db.sh                 # Create database backup
```

**2. Stage the update:**

```bash
git checkout main
git pull origin main
pnpm install --frozen-lockfile
pnpm --filter @Agora-cms/database exec prisma generate
pnpm --filter @Agora-cms/database exec prisma migrate deploy
pnpm build
```

**3. Deploy (zero-downtime with PM2):**

```bash
pm2 reload ecosystem.config.js
```

**4. Verify:**

```bash
pm2 status
./scripts/health-check.sh
pm2 logs --lines 50
```

### Rollback Strategy

**PM2 rollback:**

```bash
git checkout <previous-commit-hash>
pnpm install --frozen-lockfile
pnpm --filter @Agora-cms/database exec prisma generate
pnpm build
pm2 reload ecosystem.config.js
```

**Database migration rollback:**

> **WARNING:** Prisma does not support automatic down-migrations in production. Always test migrations in staging first.

If a migration must be reverted:

1. Write a manual SQL script to reverse the migration
2. Apply the SQL directly to the database
3. Remove the migration record:

```sql
DELETE FROM _prisma_migrations WHERE migration_name = '20260213000000_migration_name';
```

**Docker/ECS rollback:**

```bash
aws ecs update-service --cluster Agora-cms --service content-service \
  --task-definition Agora-content-service:PREVIOUS_REVISION
```

### Rotating Secrets

When rotating `JWT_SECRET`:

1. Update the secret in your secrets manager or `.env`
2. Redeploy all backend services simultaneously
3. All active sessions will be invalidated (users must re-authenticate)
4. Refresh tokens in Redis will still contain user IDs, but JWT validation will fail, forcing re-login

---

## 20. Troubleshooting

### Common Issues

**Port conflicts:**

```bash
# Linux/macOS
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Prisma client out of sync:**

If you see `Unknown field` or `The table does not exist` errors:

```bash
pnpm --filter @Agora-cms/database exec prisma generate
```

If schema changes have been made but not migrated:

```bash
# Development
pnpm --filter @Agora-cms/database exec prisma migrate dev

# Production
pnpm --filter @Agora-cms/database exec prisma migrate deploy
```

**Docker containers unhealthy:**

```bash
# Check logs
docker compose logs postgres
docker compose logs elasticsearch
docker compose logs kafka

# Restart a specific service
docker compose restart kafka

# Full reset (WARNING: destroys all volumes and data)
docker compose down -v
docker compose up -d
```

Common Docker issues:

- **Elasticsearch**: Insufficient virtual memory. Fix: `sudo sysctl -w vm.max_map_count=262144` (add to `/etc/sysctl.conf` for persistence)
- **Kafka**: Port already in use. Stop conflicting services.
- **PostgreSQL**: Volume permissions. Run `docker compose down -v` and recreate.

**Kafka connection issues:**

```bash
# Verify Kafka is running and list topics
docker exec Agora-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Check consumer group lag
docker exec Agora-kafka kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group Agora-cms-group
```

**Elasticsearch issues:**

```bash
# Check cluster health
curl -s http://localhost:9200/_cluster/health?pretty

# List indices
curl -s http://localhost:9200/_cat/indices?v

# Delete and let the service recreate an index
curl -X DELETE http://localhost:9200/products
pm2 restart commerce-service
```

**Memory issues:**

```bash
# Check system memory
free -h

# Check PM2 process memory
pm2 monit

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" pm2 restart content-service

# Check Docker container memory
docker stats
```

**File upload failures:**

- Check S3/MinIO connectivity: `curl http://localhost:9000/minio/health/live`
- Verify bucket exists: Check MinIO Console at http://localhost:9001
- Check Nginx `client_max_body_size` is set to at least `100M`
- Verify `S3_ENDPOINT`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` in `.env`

**Authentication failures:**

- Verify `JWT_SECRET` matches across all services
- Check token expiration with `JWT_EXPIRATION` setting
- Check if the user account is locked (`lockedUntil` field)
- Check if the user is deactivated (`isActive` field)
- Verify CORS origins include the requesting domain

**CORS errors:**

- Check `CORS_ORIGINS` environment variable includes the requesting domain
- Check Kong CORS plugin configuration in `docker/kong/kong.yml`
- Ensure both levels (Kong and NestJS) allow the origin

### Diagnostic Commands

```bash
# PM2 process status
pm2 status
pm2 monit

# PM2 logs
pm2 logs content-service --lines 100
pm2 logs --err --lines 500

# Docker health
docker compose ps
docker stats
docker compose logs --tail=50 -f

# Database connectivity
docker exec Agora-postgres pg_isready -U Agora

# Redis connectivity
docker exec Agora-redis redis-cli ping

# Elasticsearch health
curl http://localhost:9200/_cluster/health

# Kafka topics
docker exec Agora-kafka kafka-topics --bootstrap-server localhost:9092 --list

# MinIO health
curl http://localhost:9000/minio/health/live

# Kong gateway status
curl http://localhost:8001/status
```

### CI/CD Pipeline

The CI pipeline is defined in `.github/workflows/ci.yml` and runs on every push and PR to `main`:

1. **Lint & Type Check**: Installs dependencies, generates Prisma client, runs `pnpm lint` and `pnpm build`
2. **Unit Tests**: Runs `pnpm test` (depends on lint passing)
3. **Integration Tests**: Runs `pnpm test:integration` with PostgreSQL 16 and Redis 7 service containers

The pipeline uses Node.js 22, pnpm 10, and `--frozen-lockfile` for reproducible installs.

---

## Appendix: Admin Dashboard Feature Map

The Admin Dashboard at http://localhost:3300 provides management interfaces for all system features:

| Section | Pages | Description |
|---------|-------|-------------|
| **Dashboard** | `/` | Stats overview, moderation queue, quick actions |
| **Content** | `/pages`, `/articles`, `/article-categories`, `/article-tags`, `/comments`, `/reviews`, `/media`, `/forms`, `/files`, `/navigation`, `/redirects` | Page management, blog, comments, reviews, media library, forms, gated files, navigation menus, URL redirects |
| **Commerce** | `/products`, `/categories`, `/product-tags`, `/orders`, `/coupons`, `/users`, `/product-feeds` | Product catalog, categories, orders, coupons, customers, product feeds |
| **Events** | `/events`, `/event-categories`, `/event-tags`, `/venues`, `/check-in`, `/session-scanner`, `/exhibitor-scanner` | Event management, venues, QR check-in, badge scanning |
| **Learning** | `/courses`, `/course-sections`, `/enrollments`, `/grading` | Course management, sections, enrollments, quiz grading |
| **Settings** | `/settings/general`, `/settings/site-status`, `/settings/appearance`, `/settings/blog`, `/settings/seo`, `/settings/analytics`, `/settings/payments`, `/settings/shipping`, `/settings/tax`, `/settings/email`, `/email-templates`, `/settings/system` | Site configuration, appearance, SEO, analytics, payments, shipping, tax, email, system |

### Settings Categories

Settings are stored in the `site_settings` table as key-value pairs:

| Key | Description | Access Level |
|-----|-------------|-------------|
| `general` | Site name, URL, logo, favicon, language, timezone, currency, formatting | admin+ |
| `theme` | Colors, typography, layout, button styles | admin+ |
| `seo` | Title template, meta descriptions, robots.txt, sitemap, structured data, social media | admin+ |
| `analytics` | GA4 measurement ID, tracking configuration | admin+ |
| `payments` | Stripe keys, payment methods, capture method (sensitive fields masked) | admin+ |
| `system` | Deployment mode, feature backends, Salesforce integration | admin+ |
| `email` | Email provider, credentials, sender identity, rate limits | admin+ |

Public settings (no authentication required) are available at `GET /api/v1/settings/public` and include only browser-safe fields (no secrets).

---

*Agora CMS Administration Guide v2.0 -- February 2026*
*For questions or support, contact your system administrator.*
