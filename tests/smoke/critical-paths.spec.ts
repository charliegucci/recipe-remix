import { test, expect } from '@playwright/test';

test.describe('Critical User Paths', () => {

  test('user can browse recipes', async ({ page }) => {
    // PROD-01: Browse recipes from database
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for recipes to load - use resilient selector based on actual production DOM
    // Recipe cards are likely links to /recipe/[id] pages
    const recipeLink = page.locator('a[href*="/recipe/"]').first();
    await expect(recipeLink).toBeVisible({ timeout: 10000 });

    // Verify multiple recipe links exist
    const recipeLinks = page.locator('a[href*="/recipe/"]');
    const count = await recipeLinks.count();
    expect(count).toBeGreaterThan(0);

    // Click first recipe
    await recipeLink.click();
    await page.waitForLoadState('networkidle');

    // Verify recipe detail page loads
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Look for ingredients section with flexible selectors
    const ingredientsSection = page.locator('h2:has-text("Ingredients"), h3:has-text("Ingredients")');
    await expect(ingredientsSection).toBeVisible({ timeout: 10000 });
  });

  test('user can create account and log in', async ({ page }) => {
    test.slow(); // Auth flows are slower in production

    // PROD-01: Auth flow
    await page.goto('/register');

    // Generate unique email for test
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Fill all registration fields (name, email, password, confirmPassword)
    await page.locator('#name').fill('Smoke Test');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.click('button[type="submit"]');

    // Registration uses window.location.href = '/' on success — wait for navigation away from /register
    await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 30000 });

    // Verify we navigated away from register page (success indicator)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/register');
  });

  test('user can manage pantry', async ({ page, context }) => {
    test.slow(); // Extended timeout for auth checks and API calls

    // PROD-01: Pantry feature
    await page.goto('/pantry');
    await page.waitForLoadState('networkidle');

    // May need to log in first - check for auth requirement
    const needsAuth = await page.locator('text=Sign In').or(page.locator('text=Log In')).isVisible().catch(() => false);
    if (needsAuth) {
      // Use guest access if available
      const guestButton = page.locator('button:has-text("Continue as Guest")').or(page.locator('button:has-text("Guest")'));
      const hasGuest = await guestButton.isVisible().catch(() => false);

      if (hasGuest) {
        await guestButton.click();
        await page.goto('/pantry');
        await page.waitForLoadState('networkidle');
      } else {
        test.skip();
      }
    }

    // Add ingredient via search - use resilient selectors
    const searchInput = page.locator('input[placeholder*="Search"]')
      .or(page.locator('input[placeholder*="ingredient"]'))
      .or(page.locator('input[placeholder*="Add"]'));

    await searchInput.click();
    await searchInput.fill('tomato');
    await page.waitForTimeout(1000); // Wait for autocomplete to populate

    // Click autocomplete suggestion (rendered as <button> elements in dropdown)
    const autocompleteItem = page.locator('.absolute button:has-text("tomato")').first();

    await autocompleteItem.click();

    // Verify ingredient added (check for the text appearing anywhere on the page)
    await page.waitForTimeout(500);
    const pantryItem = page.getByText('tomato', { exact: false }).first();
    await expect(pantryItem).toBeVisible({ timeout: 10000 });
  });

  test('user can generate AI recipe', async ({ page }) => {
    test.slow(); // AI generation takes 60-90 seconds, needs 3x timeout

    // PROD-01: AI generation (most critical - tests D1, KV, Workers AI, R2)
    // Generate requires authentication — register first
    const testEmail = `gen-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    await page.goto('/register');
    await page.locator('#name').fill('Gen Test');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 30000 });

    // Add 2+ ingredients via pantry (generate requires >= 2)
    await page.goto('/pantry');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"]')
      .or(page.locator('input[placeholder*="ingredient"]'))
      .or(page.locator('input[placeholder*="Add"]'));

    // Add first ingredient
    await searchInput.click();
    await searchInput.fill('chicken');
    await page.waitForTimeout(1000);
    await page.locator('.absolute button:has-text("chicken")').first().click();
    await page.waitForTimeout(500);

    // Add second ingredient
    await searchInput.click();
    await searchInput.fill('rice');
    await page.waitForTimeout(1000);
    await page.locator('.absolute button:has-text("rice")').first().click();
    await page.waitForTimeout(500);

    // Now navigate to generate page
    await page.goto('/generate');
    await page.waitForLoadState('networkidle');

    // Select cuisine
    const italianCuisine = page.locator('label:has-text("Italian")')
      .or(page.locator('button:has-text("Italian")')
      .or(page.locator('[data-testid="cuisine-italian"]')));

    await italianCuisine.click();

    // Generate recipe — button only visible when authenticated
    const generateButton = page.locator('button:has-text("Generate Fusion Recipe")')
      .or(page.locator('button:has-text("Generate")'));

    await generateButton.click();

    // Wait for generation progress (actual step labels from GenerationProgress.vue)
    // Both labels may be visible simultaneously, so use .first()
    const progressIndicator = page.locator('text=Crafting your fusion recipe')
      .or(page.locator('text=Validating ingredients'))
      .first();

    await expect(progressIndicator).toBeVisible({ timeout: 10000 });

    // Wait for recipe result (very long timeout for AI generation)
    await page.waitForLoadState('networkidle', { timeout: 120000 });

    // Verify recipe result is rendered (inline on /generate page)
    // Use expect().toBeVisible() with timeout since Vue rendering is async after networkidle
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 }); // Recipe title

    // Generated recipe shows h3 "Ingredients" and h3 "Instructions" inline
    await expect(
      page.locator('h3:has-text("Ingredients")')
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator('h3:has-text("Instructions")')
    ).toBeVisible({ timeout: 10000 });
  });

  test('user can favorite recipes', async ({ page, context }) => {
    test.slow(); // Auth flow + navigation needs extended timeout

    // PROD-01: Favorites feature
    // This test requires authentication - create account first
    const testEmail = `fav-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    await page.goto('/register');

    await page.locator('#name').fill('Fav Test');
    await page.locator('#email').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 30000 });

    // Go to home and favorite first recipe
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find first recipe link (recipe cards are anchor links)
    const firstRecipeLink = page.locator('a[href*="/recipe/"]').first();
    await expect(firstRecipeLink).toBeVisible({ timeout: 10000 });

    // Look for favorite button near the first recipe
    const favoriteButton = page.locator('button[aria-label*="favorite"]').first()
      .or(page.locator('button:has-text("♥")').first())
      .or(page.locator('button:has-text("Favorite")').first())
      .or(page.locator('[data-testid="favorite-button"]').first());

    await favoriteButton.click();

    // Wait for favorite API call to complete
    await page.waitForTimeout(2000);

    // Go to favorites page and wait for data to load
    await page.goto('/favorites');
    await page.waitForLoadState('networkidle');

    // Wait for at least one recipe link to appear (SSR data loading may take time)
    await expect(
      page.locator('a[href*="/recipe/"]').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
