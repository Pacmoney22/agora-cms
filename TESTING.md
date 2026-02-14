# Testing Guide

Comprehensive testing guide for NextGen CMS.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [CI/CD](#cicd)

## Overview

NextGen CMS uses a comprehensive testing strategy with three types of tests:

1. **Unit Tests** - Test individual functions and services in isolation
2. **Integration Tests** - Test API endpoints and service interactions
3. **E2E Tests** - Test complete user workflows in the browser

## Test Types

### Unit Tests

**Purpose**: Test individual functions, services, and utilities in isolation.

**Framework**: Jest

**Location**: `services/*/test/unit/*.spec.ts`

**Example**:
```typescript
describe('AuthService', () => {
  it('should hash password on register', async () => {
    // Test implementation
  });
});
```

### Integration Tests

**Purpose**: Test API endpoints and database interactions with real dependencies.

**Framework**: Jest + Supertest

**Location**: `services/*/test/integration/*.integration.spec.ts`

**Example**:
```typescript
describe('Pages API (Integration)', () => {
  it('/api/v1/pages (GET) - list pages', () => {
    return request(app.getHttpServer())
      .get('/api/v1/pages')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

### E2E Tests

**Purpose**: Test complete user workflows in a real browser.

**Framework**: Playwright

**Location**: `e2e/tests/*.spec.ts`

**Example**:
```typescript
test('should login with valid credentials', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', 'admin@nextgen-cms.dev');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
});
```

## Installation

### Install Playwright (E2E Tests)

```bash
# Install Playwright package
pnpm add -D -w @playwright/test

# Install browsers
npx playwright install
```

### Install Test Dependencies

Test dependencies are already included in each service's `package.json`:

- `jest` - Test framework
- `ts-jest` - TypeScript support for Jest
- `@nestjs/testing` - NestJS testing utilities
- `supertest` - HTTP assertion library
- `@types/jest` - TypeScript definitions

## Running Tests

### All Tests

```bash
# Run all unit and integration tests
pnpm test

# Run with coverage
pnpm test:cov

# Run integration tests only
pnpm test:integration
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests in UI mode
pnpm test:e2e:ui

# Run E2E tests in headed mode (see browser)
pnpm test:e2e:headed

# Run E2E tests in debug mode
pnpm test:e2e:debug
```

### Service-Specific Tests

```bash
# Content service tests
pnpm --filter @nextgen-cms/content-service test
pnpm --filter @nextgen-cms/content-service test:cov
pnpm --filter @nextgen-cms/content-service test:integration

# Commerce service tests
pnpm --filter @nextgen-cms/commerce-service test
pnpm --filter @nextgen-cms/commerce-service test:cov
```

### Watch Mode

```bash
# Run tests in watch mode
pnpm --filter @nextgen-cms/content-service test:watch
```

## Test Structure

### Content Service

```
services/content-service/
├── test/
│   ├── unit/
│   │   ├── auth.service.spec.ts
│   │   └── seo-analyzer.service.spec.ts
│   └── integration/
│       ├── setup.ts
│       └── pages.integration.spec.ts
├── jest.config.ts
└── jest.integration.config.ts
```

### Commerce Service

```
services/commerce-service/
├── test/
│   ├── unit/
│   └── integration/
│       ├── setup.ts
│       ├── products.integration.spec.ts
│       ├── cart.integration.spec.ts
│       └── orders.integration.spec.ts
├── jest.config.ts
└── jest.integration.config.ts
```

### E2E Tests

```
e2e/
├── tests/
│   ├── auth.spec.ts
│   ├── page-builder.spec.ts
│   ├── product.spec.ts
│   ├── checkout.spec.ts
│   └── seo.spec.ts
└── playwright.config.ts
```

## Writing Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'PRISMA',
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should hash password on register', async () => {
    const hashSpy = jest.spyOn(bcrypt, 'hash');
    await service.register('test@example.com', 'Test User', 'password123');
    expect(hashSpy).toHaveBeenCalledWith('password123', 12);
  });
});
```

### Integration Test Example

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Pages API (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Get auth token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@nextgen-cms.dev', password: 'Password123!' });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return list of pages', () => {
    return request(app.getHttpServer())
      .get('/api/v1/pages')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@nextgen-cms.dev');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## Coverage

### Coverage Thresholds

All services enforce 80% coverage thresholds:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### View Coverage Report

```bash
# Run tests with coverage
pnpm test:cov

# Open coverage report in browser
open services/content-service/coverage/lcov-report/index.html
```

### Coverage Exclusions

The following are excluded from coverage:

- `*.spec.ts` - Test files
- `*.module.ts` - Module files
- `main.ts` - Application entry point

## CI/CD

### GitHub Actions

Tests run automatically on:

- Pull requests to `main` branch
- Pushes to `main` branch

### CI Configuration

See `.github/workflows/ci.yml`:

```yaml
- name: Run Unit Tests
  run: pnpm test:cov

- name: Run Integration Tests
  run: pnpm test:integration
  env:
    DATABASE_URL: postgresql://nextgen:test@localhost:5432/nextgen_test
    REDIS_URL: redis://localhost:6379

- name: Run E2E Tests
  run: pnpm test:e2e
```

## Best Practices

### Unit Tests

1. **Mock Dependencies**: Always mock external dependencies (database, Redis, HTTP clients)
2. **Test One Thing**: Each test should verify a single behavior
3. **Clear Names**: Test names should describe what is being tested
4. **AAA Pattern**: Arrange, Act, Assert structure

### Integration Tests

1. **Use Test Database**: Use a separate test database
2. **Clean Up**: Clean up test data after each test
3. **Real Dependencies**: Use real database and Redis connections
4. **Test Edge Cases**: Test validation, errors, and edge cases

### E2E Tests

1. **Data-TestId**: Use `data-testid` attributes for reliable selectors
2. **Wait Properly**: Use `await expect()` instead of hard waits
3. **Independent Tests**: Each test should be independent
4. **Authentication**: Use `beforeEach` for login when needed
5. **Clean Up**: Delete test data created during tests

## Debugging

### Debug Unit/Integration Tests

```bash
# Run specific test file
pnpm --filter @nextgen-cms/content-service test -- auth.service.spec.ts

# Run with verbose output
pnpm --filter @nextgen-cms/content-service test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Debug E2E Tests

```bash
# Run in debug mode
pnpm test:e2e:debug

# Run in headed mode
pnpm test:e2e:headed

# View test report
npx playwright show-report

# Generate tests by recording
npx playwright codegen http://localhost:3300
```

## Troubleshooting

### Common Issues

**Issue**: Tests timeout

**Solution**: Increase timeout in test or jest config:
```typescript
test('long running test', async () => {
  // ...
}, 30000); // 30 second timeout
```

**Issue**: Database connection errors

**Solution**: Ensure test database is running and migrations are applied:
```bash
DATABASE_URL=postgresql://localhost:5432/nextgen_test pnpm db:migrate
```

**Issue**: Redis connection errors

**Solution**: Ensure Redis is running:
```bash
redis-cli ping
```

**Issue**: E2E tests fail to start

**Solution**: Install browsers:
```bash
npx playwright install
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
