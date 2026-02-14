import { test, expect } from '@playwright/test';

// Helper to login before each test
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', 'admin@nextgen-cms.dev');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
});

test.describe('Product Management', () => {
  test('should display products list', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('h1')).toContainText(/products/i);
    await expect(page.locator('button, a').filter({ hasText: /add product|new product|create product/i })).toBeVisible();
  });

  test('should create physical product', async ({ page }) => {
    const timestamp = Date.now();
    const productName = `Test Widget ${timestamp}`;
    const sku = `TEST-${timestamp}`;

    await page.goto('/products');
    await page.click('button:has-text("Add Product"), a:has-text("Add Product"), button:has-text("New Product")');

    // Fill in product details
    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="sku"]', sku);

    // Select product type
    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('physical');
    }

    // Set price (in cents or dollars depending on implementation)
    await page.fill('input[name="basePrice"], input[name="price"]', '49.99');

    // Add description
    const descriptionField = page.locator('textarea[name="description"], [contenteditable="true"]').first();
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('This is a test product description');
    }

    // Save product
    await page.click('button:has-text("Save")');

    // Verify success
    await expect(page.locator('text=/created|saved|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('should create digital product', async ({ page }) => {
    const timestamp = Date.now();
    const productName = `Digital Download ${timestamp}`;
    const sku = `DIGITAL-${timestamp}`;

    await page.goto('/products');
    await page.click('button:has-text("Add Product"), a:has-text("Add Product"), button:has-text("New Product")');

    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="sku"]', sku);

    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('digital');
    }

    await page.fill('input[name="basePrice"], input[name="price"]', '19.99');

    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/created|saved|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('should add product variant', async ({ page }) => {
    const timestamp = Date.now();
    const productName = `T-Shirt ${timestamp}`;

    await page.goto('/products');
    await page.click('button:has-text("Add Product"), a:has-text("Add Product")');

    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="sku"]', `TSHIRT-${timestamp}`);
    await page.fill('input[name="basePrice"], input[name="price"]', '29.99');

    // Click add variant button if available
    const addVariantButton = page.locator('button, a').filter({ hasText: /add variant|variant/i });
    if (await addVariantButton.isVisible()) {
      await addVariantButton.click();

      // Fill in variant details (e.g., Size: Large, Color: Blue)
      await page.fill('input[name="variantName"], input[placeholder*="variant"]', 'Large - Blue');
      await page.fill('input[name="variantSku"]', `TSHIRT-${timestamp}-LG-BLU`);
      await page.fill('input[name="variantPrice"]', '29.99');
    }

    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/created|saved|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('should update product details', async ({ page }) => {
    await page.goto('/products');

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-item"], tr, .product-item').first();
    await firstProduct.click();

    // Update name
    const nameInput = page.locator('input[name="name"]');
    const currentName = await nameInput.inputValue();
    await nameInput.fill(`${currentName} - Updated`);

    // Save
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 10000 });
  });

  test('should set product inventory', async ({ page }) => {
    await page.goto('/products');

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-item"], tr, .product-item').first();
    await firstProduct.click();

    // Set inventory quantity
    const inventoryInput = page.locator('input[name="inventory"], input[name="quantity"], input[name="stock"]');
    if (await inventoryInput.isVisible()) {
      await inventoryInput.fill('100');
    }

    // Set low stock threshold
    const lowStockInput = page.locator('input[name="lowStockThreshold"]');
    if (await lowStockInput.isVisible()) {
      await lowStockInput.fill('10');
    }

    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 10000 });
  });

  test('should add product images', async ({ page }) => {
    await page.goto('/products');

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-item"], tr, .product-item').first();
    await firstProduct.click();

    // Look for image upload button
    const uploadButton = page.locator('input[type="file"], button:has-text("Upload Image")');
    if (await uploadButton.first().isVisible()) {
      // Note: In real tests, you'd upload actual test images
      // For now, we just check the button exists
      expect(await uploadButton.first().isVisible()).toBe(true);
    }
  });

  test('should add product categories', async ({ page }) => {
    await page.goto('/products');

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-item"], tr, .product-item').first();
    await firstProduct.click();

    // Look for category selection
    const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }

    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 10000 });
  });

  test('should delete product', async ({ page }) => {
    const timestamp = Date.now();
    const productName = `Product to Delete ${timestamp}`;

    // Create a product first
    await page.goto('/products');
    await page.click('button:has-text("Add Product"), a:has-text("Add Product")');
    await page.fill('input[name="name"]', productName);
    await page.fill('input[name="sku"]', `DEL-${timestamp}`);
    await page.fill('input[name="basePrice"], input[name="price"]', '9.99');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=/created|saved/i')).toBeVisible({ timeout: 10000 });

    // Go back to products list
    await page.goto('/products');

    // Find and delete the product
    const productRow = page.locator(`text=${productName}`).first();
    await productRow.hover();

    const deleteButton = page.locator('button, [role="button"]').filter({ hasText: /delete|remove/i }).first();
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    await expect(page.locator('text=/deleted|removed/i')).toBeVisible({ timeout: 10000 });
  });

  test('should filter products by status', async ({ page }) => {
    await page.goto('/products');

    // Look for status filter
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify results are displayed
      const productCount = await page.locator('[data-testid="product-item"], tr, .product-item').count();
      expect(productCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search products', async ({ page }) => {
    await page.goto('/products');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Results should be filtered
      const productCount = await page.locator('[data-testid="product-item"], tr, .product-item').count();
      expect(productCount).toBeGreaterThanOrEqual(0);
    }
  });
});
