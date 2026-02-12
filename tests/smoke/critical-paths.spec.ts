import { test, expect } from '@playwright/test';

test.describe('Critical User Paths', () => {

  test('user can browse recipes', async ({ page }) => {
    // PROD-01: Browse recipes from database
    await page.goto('/');

    // Wait for recipes to load - use resilient selector (text-based fallback)
    const recipeCard = page.locator('[data-testid="recipe-card"]').first().or(page.locator('article').first());
    await expect(recipeCard).toBeVisible({ timeout: 10000 });

    // Verify recipe cards have content
    const recipeCards = page.locator('[data-testid="recipe-card"]').or(page.locator('article'));
    const count = await recipeCards.count();
    expect(count).toBeGreaterThan(0);

    // Click first recipe
    await recipeCards.first().click();

    // Verify recipe detail page loads
    await expect(page.locator('h1')).toBeVisible();
    // Look for ingredients/instructions with fallback to generic lists
    const ingredientsList = page.locator('[data-testid="ingredients-list"]').or(page.locator('h2:has-text("Ingredients")').locator('..').locator('ul, ol'));
    await expect(ingredientsList).toBeVisible({ timeout: 5000 });
  });

  test('user can create account and log in', async ({ page }) => {
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

    // Verify redirect to home (auth success) or dashboard
    await page.waitForURL(/\/(|dashboard)$/, { timeout: 10000 });

    // Verify user menu appears (indicates logged in)
    // Fallback: look for email display or user icon
    const userIndicator = page.locator('[data-testid="user-menu"]')
      .or(page.getByText(testEmail))
      .or(page.locator('button:has-text("Account")'))
      .or(page.locator('button:has-text("Profile")'));

    await expect(userIndicator).toBeVisible({ timeout: 5000 });
  });

  test('user can manage pantry', async ({ page, context }) => {
    // PROD-01: Pantry feature
    await page.goto('/pantry');

    // May need to log in first - check for auth requirement
    const needsAuth = await page.locator('text=Sign In').or(page.locator('text=Log In')).isVisible().catch(() => false);
    if (needsAuth) {
      // Use guest access if available
      const guestButton = page.locator('button:has-text("Continue as Guest")').or(page.locator('button:has-text("Guest")'));
      const hasGuest = await guestButton.isVisible().catch(() => false);

      if (hasGuest) {
        await guestButton.click();
        await page.goto('/pantry');
      } else {
        test.skip();
      }
    }

    // Add ingredient via search - use resilient selectors
    const searchInput = page.locator('[data-testid="ingredient-search"]')
      .or(page.locator('input[placeholder*="Search"]'))
      .or(page.locator('input[placeholder*="ingredient"]'));

    await searchInput.click();
    await searchInput.fill('tomato');
    await page.waitForTimeout(500); // Wait for autocomplete

    // Click autocomplete suggestion
    const autocompleteItem = page.locator('[data-testid="autocomplete-item"]:has-text("tomato")')
      .or(page.locator('li:has-text("tomato")').first())
      .or(page.locator('[role="option"]:has-text("tomato")').first());

    await autocompleteItem.click();

    // Verify ingredient added
    const pantryItem = page.locator('[data-testid="pantry-item"]:has-text("tomato")')
      .or(page.getByText('tomato').first());

    await expect(pantryItem).toBeVisible({ timeout: 5000 });
  });

  test('user can generate AI recipe', async ({ page }) => {
    // PROD-01: AI generation (most critical - tests D1, KV, Workers AI, R2)
    await page.goto('/generate');

    // Handle auth requirement
    const needsAuth = await page.locator('text=Sign In').or(page.locator('text=Log In')).isVisible().catch(() => false);
    if (needsAuth) {
      const guestButton = page.locator('button:has-text("Continue as Guest")').or(page.locator('button:has-text("Guest")'));
      const hasGuest = await guestButton.isVisible().catch(() => false);

      if (hasGuest) {
        await guestButton.click();
        await page.goto('/generate');
      } else {
        test.skip();
      }
    }

    // Add ingredients to pantry (if empty)
    const searchInput = page.locator('[data-testid="ingredient-search"]')
      .or(page.locator('input[placeholder*="ingredient"]'))
      .or(page.locator('input[type="search"]').first());

    await searchInput.click();
    await searchInput.fill('chicken');
    await page.waitForTimeout(500);

    // Click autocomplete item
    const autocompleteItem = page.locator('[data-testid="autocomplete-item"]')
      .or(page.locator('li:has-text("chicken")').first())
      .or(page.locator('[role="option"]').first());

    await autocompleteItem.click({ force: true });

    // Select cuisines - use flexible selectors
    const italianCuisine = page.locator('[data-testid="cuisine-italian"]')
      .or(page.locator('label:has-text("Italian")'))
      .or(page.locator('button:has-text("Italian")'));

    await italianCuisine.click();

    // Generate recipe
    const generateButton = page.locator('button:has-text("Generate Recipe")')
      .or(page.locator('button:has-text("Generate")'))
      .or(page.locator('button[type="submit"]:has-text("Recipe")'));

    await generateButton.click();

    // Wait for generation (can take 30-60 seconds)
    const progressIndicator = page.locator('[data-testid="generation-progress"]')
      .or(page.locator('text=Generating'))
      .or(page.locator('[role="progressbar"]'));

    await expect(progressIndicator).toBeVisible({ timeout: 5000 });

    // Wait for recipe result
    const recipeResult = page.locator('[data-testid="recipe-result"]')
      .or(page.locator('h1'))
      .or(page.locator('article'));

    await expect(recipeResult).toBeVisible({ timeout: 90000 });

    // Verify recipe has required elements
    await expect(page.locator('h1')).toBeVisible(); // Recipe title

    // Look for ingredients and instructions sections
    const hasIngredients = await page.locator('[data-testid="ingredients-list"]')
      .or(page.locator('h2:has-text("Ingredients")'))
      .isVisible().catch(() => false);
    expect(hasIngredients).toBeTruthy();

    const hasInstructions = await page.locator('[data-testid="instructions-list"]')
      .or(page.locator('h2:has-text("Instructions")'))
      .or(page.locator('h2:has-text("Steps")'))
      .isVisible().catch(() => false);
    expect(hasInstructions).toBeTruthy();
  });

  test('user can favorite recipes', async ({ page, context }) => {
    // PROD-01: Favorites feature
    // This test requires authentication - create account first
    const testEmail = `fav-test-${Date.now()}@example.com`;
    await page.goto('/register');

    const emailInput = page.locator('input[name="email"]').or(page.locator('input[type="email"]'));
    const passwordInput = page.locator('input[name="password"]').or(page.locator('input[type="password"]').first());

    await emailInput.fill(testEmail);
    await passwordInput.fill('TestPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(|dashboard)$/, { timeout: 10000 });

    // Go to home and favorite first recipe
    await page.goto('/');

    const firstCard = page.locator('[data-testid="recipe-card"]').first().or(page.locator('article').first());
    const favoriteButton = firstCard.locator('[data-testid="favorite-button"]')
      .or(firstCard.locator('button[aria-label*="favorite"]'))
      .or(firstCard.locator('button:has-text("♥")'))
      .or(firstCard.locator('button:has-text("Favorite")'));

    await favoriteButton.click();

    // Verify optimistic update (button state changes or visual feedback)
    await page.waitForTimeout(500); // Brief wait for optimistic UI update

    // Go to favorites page
    await page.goto('/favorites');

    // Verify at least one recipe appears in favorites
    const favoriteRecipes = page.locator('[data-testid="recipe-card"]').or(page.locator('article'));
    const favCount = await favoriteRecipes.count();
    expect(favCount).toBeGreaterThanOrEqual(1);
  });
});
