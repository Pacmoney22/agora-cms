# E2E Tests

End-to-end tests for Agora CMS using Playwright.

## Installation

First, install Playwright:

```bash
pnpm add -D -w @playwright/test
```

Then install the browsers:

```bash
npx playwright install
```

## Running Tests

### Run all E2E tests

```bash
pnpm test:e2e
```

### Run tests in UI mode (interactive)

```bash
pnpm test:e2e:ui
```

### Run tests in headed mode (see the browser)

```bash
pnpm test:e2e:headed
```

### Run tests in debug mode

```bash
pnpm test:e2e:debug
```

### Run specific test file

```bash
npx playwright test tests/auth.spec.ts
```

### Run tests in specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
```

## Test Structure

```
e2e/
├── playwright.config.ts    # Playwright configuration
├── tests/
│   ├── auth.spec.ts        # Authentication flow tests
│   ├── page-builder.spec.ts # Page builder tests
│   ├── product.spec.ts     # Product management tests
│   ├── checkout.spec.ts    # Checkout flow tests
│   └── seo.spec.ts        # SEO analyzer tests
└── README.md
```

## Test Coverage

### Authentication (auth.spec.ts)
- Display login page
- Validation errors for empty form
- Invalid credentials error
- Successful login
- Persist authentication across reloads
- Logout functionality
- User registration

### Page Builder (page-builder.spec.ts)
- Display pages list
- Create new page
- Add text blocks to page
- Update existing page
- Publish page
- Delete page
- Preview page
- Reorder blocks with drag and drop

### Product Management (product.spec.ts)
- Display products list
- Create physical product
- Create digital product
- Add product variants
- Update product details
- Set product inventory
- Add product images
- Add product categories
- Delete product
- Filter products by status
- Search products

### Checkout Flow (checkout.spec.ts)
- Add product to cart from storefront
- View cart and update quantities
- Remove item from cart
- Proceed to checkout
- Complete checkout as guest
- Apply discount code
- Calculate shipping cost
- Save shipping address for logged-in user
- Validate required checkout fields

### SEO Analyzer (seo.spec.ts)
- Display SEO dashboard
- Analyze page SEO score
- Show SEO recommendations
- Check title tag
- Check meta description
- Check heading structure
- Check image alt tags
- Show pass/fail status for checks
- Filter pages by SEO score
- Export SEO report
- Show performance metrics
- Check mobile responsiveness
- Show keyword analysis
- Update page meta tags from SEO panel

## Prerequisites

Before running E2E tests, ensure:

1. Database is running and migrated
2. Redis is running
3. All services are built: `pnpm build`
4. Development server can start: `pnpm dev`

The Playwright config will automatically start the dev server before running tests.

## CI/CD Integration

E2E tests run automatically in CI on pull requests. See `.github/workflows/ci.yml` for configuration.

## Debugging

### View test report

After test runs, view the HTML report:

```bash
npx playwright show-report
```

### Record tests

Generate tests by recording your actions:

```bash
npx playwright codegen http://localhost:3300
```

### View traces

If a test fails, view the trace:

```bash
npx playwright show-trace trace.zip
```

## Environment Variables

E2E tests use the following environment variables (configured in `playwright.config.ts`):

- `BASE_URL`: Base URL for the application (default: http://localhost:3300)
- `CI`: Set to `true` in CI environment for different retry/worker settings

## Best Practices

1. **Selectors**: Use `data-testid` attributes for reliable element selection
2. **Waits**: Use `await expect()` instead of hard-coded waits
3. **Isolation**: Each test should be independent and clean up after itself
4. **Authentication**: Use `beforeEach` hook to login for tests that require auth
5. **Assertions**: Be specific with assertions to get clear error messages
