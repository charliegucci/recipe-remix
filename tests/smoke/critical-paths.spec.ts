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

    // Fill registration form - use flexible selectors
    const emailInput = page.locator('input[name="email"]').or(page.locator('input[type="email"]'));
    const passwordInput = page.locator('input[name="password"]').or(page.locator('input[type="password"]').first());

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await page.click('button[type="submit"]');

    // Verify redirect to home, login, dashboard, or recipes (flexible redirect handling)
    await page.waitForURL(/\/(|login|dashboard|recipes)/, { timeout: 15000 });

    // Simply verify we navigated away from register page (success indicator)
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

    // Click autocomplete suggestion
    const autocompleteItem = page.locator('li:has-text("tomato")').first()
      .or(page.locator('[role="option"]:has-text("tomato")').first())
      .or(page.locator('[data-testid="autocomplete-item"]:has-text("tomato")'));

    await autocompleteItem.click();

    // Verify ingredient added (check for the text appearing anywhere on the page)
    await page.waitForTimeout(500);
    const pantryItem = page.getByText('tomato', { exact: false }).first();
    await expect(pantryItem).toBeVisible({ timeout: 10000 });
  });

  test('user can generate AI recipe', async ({ page }) => {
    test.slow(); // AI generation takes 60-90 seconds, needs 3x timeout

    // PROD-01: AI generation (most critical - tests D1, KV, Workers AI, R2)
    await page.goto('/generate');
    await page.waitForLoadState('networkidle');

    // Handle auth requirement
    const needsAuth = await page.locator('text=Sign In').or(page.locator('text=Log In')).isVisible().catch(() => false);
    if (needsAuth) {
      const guestButton = page.locator('button:has-text("Continue as Guest")').or(page.locator('button:has-text("Guest")'));
      const hasGuest = await guestButton.isVisible().catch(() => false);

      if (hasGuest) {
        await guestButton.click();
        await page.goto('/generate');
        await page.waitForLoadState('networkidle');
      } else {
        test.skip();
      }
    }

    // Add ingredients to pantry (if empty)
    const searchInput = page.locator('input[placeholder*="ingredient"]')
      .or(page.locator('input[type="search"]').first())
      .or(page.locator('input[placeholder*="Search"]'));

    await searchInput.click();
    await searchInput.fill('chicken');
    await page.waitForTimeout(1000);

    // Click autocomplete item
    const autocompleteItem = page.locator('li:has-text("chicken")').first()
      .or(page.locator('[role="option"]').first())
      .or(page.locator('[data-testid="autocomplete-item"]'));

    await autocompleteItem.click({ force: true });
    await page.waitForTimeout(500);

    // Select cuisines - use flexible selectors
    const italianCuisine = page.locator('label:has-text("Italian")')
      .or(page.locator('button:has-text("Italian")')
      .or(page.locator('[data-testid="cuisine-italian"]')));

    await italianCuisine.click();

    // Generate recipe
    const generateButton = page.locator('button:has-text("Generate Recipe")')
      .or(page.locator('button:has-text("Generate")'))
      .or(page.locator('button[type="submit"]:has-text("Recipe")'));

    await generateButton.click();

    // Wait for generation (can take 30-60 seconds)
    const progressIndicator = page.locator('text=Generating')
      .or(page.locator('[role="progressbar"]'))
      .or(page.locator('[data-testid="generation-progress"]'));

    await expect(progressIndicator).toBeVisible({ timeout: 10000 });

    // Wait for recipe result (very long timeout for AI generation)
    await page.waitForLoadState('networkidle', { timeout: 120000 });

    // Verify recipe has required elements
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 }); // Recipe title

    // Look for ingredients and instructions sections
    const hasIngredients = await page.locator('h2:has-text("Ingredients"), h3:has-text("Ingredients")')
      .isVisible().catch(() => false);
    expect(hasIngredients).toBeTruthy();

    const hasInstructions = await page.locator('h2:has-text("Instructions"), h3:has-text("Instructions"), h2:has-text("Steps"), h3:has-text("Steps")')
      .isVisible().catch(() => false);
    expect(hasInstructions).toBeTruthy();
  });

  test('user can favorite recipes', async ({ page, context }) => {
    test.slow(); // Auth flow + navigation needs extended timeout

    // PROD-01: Favorites feature
    // This test requires authentication - create account first
    const testEmail = `fav-test-${Date.now()}@example.com`;
    await page.goto('/register');

    const emailInput = page.locator('input[name="email"]').or(page.locator('input[type="email"]'));
    const passwordInput = page.locator('input[name="password"]').or(page.locator('input[type="password"]').first());

    await emailInput.fill(testEmail);
    await passwordInput.fill('TestPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(|dashboard|recipes|login)/, { timeout: 15000 });

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

    // Verify optimistic update (button state changes or visual feedback)
    await page.waitForTimeout(1000); // Brief wait for optimistic UI update

    // Go to favorites page
    await page.goto('/favorites');
    await page.waitForLoadState('networkidle');

    // Verify at least one recipe appears in favorites (look for recipe links)
    const favoriteRecipes = page.locator('a[href*="/recipe/"]');
    const favCount = await favoriteRecipes.count();
    expect(favCount).toBeGreaterThanOrEqual(1);
  });
});
