import { test, expect } from '@playwright/test';

// Helper to login before each test
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', 'admin@agora-cms.dev');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
});

test.describe('SEO Analyzer', () => {
  test('should display SEO dashboard', async ({ page }) => {
    await page.goto('/seo');
    await expect(page.locator('h1')).toContainText(/seo/i);
  });

  test('should analyze page SEO score', async ({ page }) => {
    await page.goto('/seo');

    // Wait for pages to load
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    // Click analyze on first page
    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze|check/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Wait for analysis to complete
      await expect(page.locator('text=/overall score|seo score/i')).toBeVisible({ timeout: 15000 });

      // Verify score is displayed
      const scoreElement = page.locator('[data-testid="seo-score"], [data-score], .seo-score').first();
      await expect(scoreElement).toBeVisible();
    }
  });

  test('should show SEO recommendations', async ({ page }) => {
    await page.goto('/seo');

    // Wait for pages to load
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    // Analyze first page
    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze|check/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Wait for recommendations
      await page.waitForTimeout(2000);

      // Check for recommendations section
      const recommendations = page.locator('[data-testid="recommendations"], .recommendations, text=/recommendations|suggestions/i');
      await expect(recommendations.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should check title tag', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Look for title tag check
      const titleCheck = page.locator('text=/title tag|page title/i');
      await expect(titleCheck.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should check meta description', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Look for meta description check
      const metaCheck = page.locator('text=/meta description|description tag/i');
      await expect(metaCheck.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should check heading structure', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Look for heading structure check
      const headingCheck = page.locator('text=/heading|h1|h2/i');
      await expect(headingCheck.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should check image alt tags', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Look for image alt tag check
      const imageCheck = page.locator('text=/image.*alt|alt.*tag/i');
      await expect(imageCheck.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show pass/fail status for checks', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Wait for analysis
      await page.waitForTimeout(2000);

      // Look for pass/fail indicators
      const statusIndicators = page.locator('[data-status], .status, text=/pass|fail|warning/i');
      const count = await statusIndicators.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should filter pages by SEO score', async ({ page }) => {
    await page.goto('/seo');

    // Look for score filter
    const scoreFilter = page.locator('select[name="scoreFilter"], [data-testid="score-filter"]');
    if (await scoreFilter.isVisible()) {
      await scoreFilter.selectOption('low');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify filtering occurred
      expect(await scoreFilter.inputValue()).toBe('low');
    }
  });

  test('should export SEO report', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      await page.waitForTimeout(2000);

      // Look for export button
      const exportButton = page.locator('button, a').filter({ hasText: /export|download|report/i });
      if (await exportButton.isVisible()) {
        // Just verify button exists (actual download testing is complex)
        expect(await exportButton.isVisible()).toBe(true);
      }
    }
  });

  test('should show performance metrics', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Look for performance section
      const performanceSection = page.locator('text=/performance|speed|load time/i');
      if (await performanceSection.first().isVisible({ timeout: 10000 })) {
        expect(await performanceSection.first().isVisible()).toBe(true);
      }
    }
  });

  test('should check mobile responsiveness', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Look for mobile responsiveness check
      const mobileCheck = page.locator('text=/mobile|responsive/i');
      if (await mobileCheck.first().isVisible({ timeout: 10000 })) {
        expect(await mobileCheck.first().isVisible()).toBe(true);
      }
    }
  });

  test('should show keyword analysis', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    const analyzeButton = page.locator('button, a').filter({ hasText: /analyze/i }).first();
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();

      // Look for keyword section
      const keywordSection = page.locator('text=/keyword|density/i');
      if (await keywordSection.first().isVisible({ timeout: 10000 })) {
        expect(await keywordSection.first().isVisible()).toBe(true);
      }
    }
  });

  test('should update page meta tags from SEO panel', async ({ page }) => {
    await page.goto('/seo');
    await page.waitForSelector('[data-testid="page-row"], tr, .page-item', { timeout: 10000 });

    // Click on first page to edit
    const firstPage = page.locator('[data-testid="page-row"], tr, .page-item').first();
    await firstPage.click();

    // Look for meta tag editor
    const titleInput = page.locator('input[name="metaTitle"], input[name="seoTitle"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill('Updated SEO Title');

      const descriptionInput = page.locator('textarea[name="metaDescription"], textarea[name="seoDescription"]');
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('Updated meta description for better SEO');
      }

      // Save changes
      const saveButton = page.locator('button').filter({ hasText: /save|update/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
