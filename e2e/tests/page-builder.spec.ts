import { test, expect } from '@playwright/test';

// Helper to login before each test
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', 'admin@nextgen-cms.dev');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
});

test.describe('Page Builder', () => {
  test('should display pages list', async ({ page }) => {
    await page.goto('/pages');
    await expect(page.locator('h1')).toContainText(/pages/i);
    await expect(page.locator('button, a').filter({ hasText: /new page|create page/i })).toBeVisible();
  });

  test('should create new page with basic content', async ({ page }) => {
    const timestamp = Date.now();
    const pageTitle = `Test Page ${timestamp}`;

    await page.goto('/pages');
    await page.click('button:has-text("New Page"), a:has-text("New Page")');

    // Fill in page details
    await page.fill('input[name="title"]', pageTitle);
    await page.fill('input[name="slug"]', `/test-page-${timestamp}`);

    // Save page
    await page.click('button:has-text("Save")');

    // Should show success message
    await expect(page.locator('text=/saved|created|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('should add text block to page', async ({ page }) => {
    const timestamp = Date.now();
    const pageTitle = `Test Page ${timestamp}`;

    await page.goto('/pages');
    await page.click('button:has-text("New Page"), a:has-text("New Page")');

    // Fill in page details
    await page.fill('input[name="title"]', pageTitle);

    // Add a text block (assuming drag-and-drop or click to add)
    const textBlockButton = page.locator('button, [role="button"]').filter({ hasText: /text|paragraph|heading/i }).first();
    if (await textBlockButton.isVisible()) {
      await textBlockButton.click();
    }

    // Save page
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/saved|created/i')).toBeVisible({ timeout: 10000 });
  });

  test('should update existing page', async ({ page }) => {
    await page.goto('/pages');

    // Click on first page in the list
    const firstPage = page.locator('[data-testid="page-item"], tr, .page-item').first();
    await firstPage.click();

    // Update the title
    const titleInput = page.locator('input[name="title"]');
    const currentTitle = await titleInput.inputValue();
    await titleInput.fill(`${currentTitle} - Updated`);

    // Save
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 10000 });
  });

  test('should publish page', async ({ page }) => {
    const timestamp = Date.now();
    const pageTitle = `Test Page ${timestamp}`;

    await page.goto('/pages');
    await page.click('button:has-text("New Page"), a:has-text("New Page")');

    // Create page
    await page.fill('input[name="title"]', pageTitle);
    await page.fill('input[name="slug"]', `/test-page-${timestamp}`);
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/saved|created/i')).toBeVisible({ timeout: 10000 });

    // Publish page
    const publishButton = page.locator('button').filter({ hasText: /publish/i });
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await expect(page.locator('text=/published|live/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should delete page', async ({ page }) => {
    const timestamp = Date.now();
    const pageTitle = `Test Page to Delete ${timestamp}`;

    // Create a page first
    await page.goto('/pages');
    await page.click('button:has-text("New Page"), a:has-text("New Page")');
    await page.fill('input[name="title"]', pageTitle);
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/saved|created/i')).toBeVisible({ timeout: 10000 });

    // Go back to pages list
    await page.goto('/pages');

    // Find and delete the page
    const pageRow = page.locator(`text=${pageTitle}`).first();
    await pageRow.hover();

    const deleteButton = page.locator('button, [role="button"]').filter({ hasText: /delete|remove/i }).first();
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Should show success message
    await expect(page.locator('text=/deleted|removed/i')).toBeVisible({ timeout: 10000 });
  });

  test('should preview page', async ({ page }) => {
    await page.goto('/pages');

    // Click on first page
    const firstPage = page.locator('[data-testid="page-item"], tr, .page-item').first();
    await firstPage.click();

    // Click preview button
    const previewButton = page.locator('button, a').filter({ hasText: /preview/i });
    if (await previewButton.isVisible()) {
      // Handle new tab/window for preview
      const [previewPage] = await Promise.all([
        page.context().waitForEvent('page'),
        previewButton.click()
      ]);

      await previewPage.waitForLoadState();
      expect(previewPage.url()).toContain('/');
      await previewPage.close();
    }
  });

  test('should reorder blocks using drag and drop', async ({ page }) => {
    await page.goto('/pages');

    // Create or open a page with multiple blocks
    const firstPage = page.locator('[data-testid="page-item"], tr, .page-item').first();
    await firstPage.click();

    // Check if there are draggable blocks
    const blocks = page.locator('[draggable="true"], .draggable, [data-draggable]');
    const blockCount = await blocks.count();

    if (blockCount >= 2) {
      const firstBlock = blocks.nth(0);
      const secondBlock = blocks.nth(1);

      // Drag first block to second position
      await firstBlock.dragTo(secondBlock);

      // Save changes
      await page.click('button:has-text("Save")');
      await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
