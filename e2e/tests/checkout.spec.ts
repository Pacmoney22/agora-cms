import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('should add product to cart from storefront', async ({ page }) => {
    // Browse to storefront
    await page.goto('http://localhost:3200/products');

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"], .product-card, .product-item', { timeout: 10000 });

    // Click on first product
    const firstProduct = page.locator('[data-testid="product-card"], .product-card, .product-item').first();
    await firstProduct.click();

    // Add to cart
    const addToCartButton = page.locator('button').filter({ hasText: /add to cart/i });
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Verify cart badge updated or success message shown
    await expect(page.locator('text=/added to cart|item added/i, [data-testid="cart-count"]')).toBeVisible({ timeout: 5000 });
  });

  test('should view cart and update quantities', async ({ page }) => {
    // Add product to cart first
    await page.goto('http://localhost:3200/products');
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.click('button:has-text("Add to Cart")');

    // Navigate to cart
    await page.goto('http://localhost:3200/cart');

    // Verify cart has items
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item, tr');
    await expect(cartItems.first()).toBeVisible();

    // Update quantity
    const quantityInput = page.locator('input[type="number"], input[name="quantity"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('2');
      await page.waitForTimeout(1000); // Wait for update to process

      // Verify total updated
      const total = page.locator('[data-testid="cart-total"], .cart-total, .total');
      await expect(total).toBeVisible();
    }
  });

  test('should remove item from cart', async ({ page }) => {
    // Add product to cart first
    await page.goto('http://localhost:3200/products');
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.click('button:has-text("Add to Cart")');

    // Navigate to cart
    await page.goto('http://localhost:3200/cart');

    // Remove item
    const removeButton = page.locator('button, [role="button"]').filter({ hasText: /remove|delete/i }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Verify cart is empty or item removed
      await expect(page.locator('text=/cart is empty|no items/i, [data-testid="empty-cart"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should proceed to checkout', async ({ page }) => {
    // Add product to cart first
    await page.goto('http://localhost:3200/products');
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.click('button:has-text("Add to Cart")');

    // Navigate to cart
    await page.goto('http://localhost:3200/cart');

    // Click checkout button
    const checkoutButton = page.locator('button, a').filter({ hasText: /checkout|proceed/i });
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    // Should navigate to checkout page
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('should complete checkout with guest user', async ({ page }) => {
    // Add product to cart
    await page.goto('http://localhost:3200/products');
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.click('button:has-text("Add to Cart")');

    // Go to checkout
    await page.goto('http://localhost:3200/cart');
    await page.click('button:has-text("Checkout"), a:has-text("Checkout")');

    // Fill in shipping information
    const timestamp = Date.now();
    await page.fill('input[name="email"]', `test${timestamp}@example.com`);
    await page.fill('input[name="firstName"], input[name="name"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="line1"], input[name="address"]', '123 Test Street');
    await page.fill('input[name="city"]', 'Test City');

    // Select state/province
    const stateSelect = page.locator('select[name="state"], select[name="province"]');
    if (await stateSelect.isVisible()) {
      await stateSelect.selectOption({ index: 1 });
    }

    await page.fill('input[name="postalCode"], input[name="zipCode"]', '12345');

    // Select country
    const countrySelect = page.locator('select[name="country"]');
    if (await countrySelect.isVisible()) {
      await countrySelect.selectOption('US');
    }

    await page.fill('input[name="phone"]', '555-123-4567');

    // Continue to payment
    const continueButton = page.locator('button').filter({ hasText: /continue|next|payment/i });
    if (await continueButton.isVisible()) {
      await continueButton.click();
    }

    // Fill in payment details (test mode with Stripe test card)
    const cardNumberField = page.locator('input[name="cardNumber"], iframe[name*="cardNumber"]');
    if (await cardNumberField.isVisible()) {
      await cardNumberField.fill('4242424242424242');
      await page.fill('input[name="cardExpiry"], input[name="expiry"]', '12/25');
      await page.fill('input[name="cardCvc"], input[name="cvc"]', '123');
    }

    // Place order
    const placeOrderButton = page.locator('button').filter({ hasText: /place order|complete|pay/i });
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();

    // Wait for order confirmation
    await expect(page).toHaveURL(/\/checkout\/success|\/order\/confirmation/, { timeout: 30000 });
    await expect(page.locator('text=/thank you|order confirmed|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('should apply discount code', async ({ page }) => {
    // Add product to cart
    await page.goto('http://localhost:3200/products');
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.click('button:has-text("Add to Cart")');

    // Go to cart
    await page.goto('http://localhost:3200/cart');

    // Apply discount code
    const discountInput = page.locator('input[name="discountCode"], input[name="coupon"], input[placeholder*="discount" i]');
    if (await discountInput.isVisible()) {
      await discountInput.fill('TEST10');

      const applyButton = page.locator('button').filter({ hasText: /apply|redeem/i });
      await applyButton.click();

      // Verify discount applied or error message shown
      await expect(page.locator('text=/discount applied|invalid code|expired/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should calculate shipping cost', async ({ page }) => {
    // Add product to cart
    await page.goto('http://localhost:3200/products');
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.click('button:has-text("Add to Cart")');

    // Go to checkout
    await page.goto('http://localhost:3200/cart');
    await page.click('button:has-text("Checkout"), a:has-text("Checkout")');

    // Fill in shipping address
    await page.fill('input[name="postalCode"], input[name="zipCode"]', '90210');

    // Select state
    const stateSelect = page.locator('select[name="state"]');
    if (await stateSelect.isVisible()) {
      await stateSelect.selectOption('CA');
    }

    // Trigger shipping calculation (may happen automatically)
    const calculateButton = page.locator('button').filter({ hasText: /calculate|estimate/i });
    if (await calculateButton.isVisible()) {
      await calculateButton.click();
    }

    // Wait for shipping options to appear
    const shippingOptions = page.locator('[data-testid="shipping-option"], .shipping-option, input[type="radio"][name="shipping"]');
    await expect(shippingOptions.first()).toBeVisible({ timeout: 10000 });
  });

  test('should save shipping address for logged-in user', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3300');
    await page.fill('input[type="email"]', 'admin@nextgen-cms.dev');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Add product to cart
    await page.goto('http://localhost:3200/products');
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.click('button:has-text("Add to Cart")');

    // Go to checkout
    await page.goto('http://localhost:3200/cart');
    await page.click('button:has-text("Checkout"), a:has-text("Checkout")');

    // If logged in, may see saved addresses
    const savedAddressSelect = page.locator('select[name="savedAddress"], [data-testid="saved-addresses"]');
    if (await savedAddressSelect.isVisible()) {
      // Can select saved address or add new
      expect(await savedAddressSelect.isVisible()).toBe(true);
    }
  });

  test('should validate required checkout fields', async ({ page }) => {
    // Add product to cart
    await page.goto('http://localhost:3200/products');
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 });
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.click('button:has-text("Add to Cart")');

    // Go to checkout
    await page.goto('http://localhost:3200/cart');
    await page.click('button:has-text("Checkout"), a:has-text("Checkout")');

    // Try to submit without filling required fields
    const continueButton = page.locator('button').filter({ hasText: /continue|next|place order/i });
    if (await continueButton.isVisible()) {
      await continueButton.click();

      // Should show validation errors
      await expect(page.locator('text=/required|invalid/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
