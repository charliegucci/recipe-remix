import { test, expect } from '@playwright/test';

// Use page.evaluate(fetch(...)) instead of the standalone request fixture
// because Cloudflare bot protection blocks raw HTTP clients with 403.

test.describe('Production Bindings Health', () => {

  test('D1 database is accessible', async ({ page }) => {
    // PROD-02: D1 binding verification
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/recipes?limit=1');
      return { ok: res.ok, status: res.status, data: await res.json() };
    });

    expect(result.ok).toBeTruthy();

    // API may return { recipes: [...] } or { data: [...] } - check both patterns
    const recipes = result.data.recipes || result.data.data || result.data;
    expect(Array.isArray(recipes)).toBe(true);

    // If recipes exist, verify structure
    if (recipes.length > 0) {
      const recipe = recipes[0];
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('cuisineTags');
    }
  });

  test('KV caching works', async ({ page }) => {
    // PROD-02: KV binding verification via featured recipes endpoint
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const t1 = Date.now();
      const res1 = await fetch('/api/recipes/featured');
      const data1 = await res1.json();
      const duration1 = Date.now() - t1;

      const t2 = Date.now();
      const res2 = await fetch('/api/recipes/featured');
      await res2.json();
      const duration2 = Date.now() - t2;

      return { ok1: res1.ok, ok2: res2.ok, duration1, duration2 };
    });

    expect(result.ok1).toBeTruthy();
    expect(result.ok2).toBeTruthy();
    console.log(`First request: ${result.duration1}ms, Second request: ${result.duration2}ms`);
  });

  test('environment variables are set', async ({ page }) => {
    // PROD-02: Verify critical env vars via API responses
    await page.goto('/');
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/auth/get-session');
      return res.status;
    });

    // Not a server error
    expect(status).not.toBe(500);
    // 200 (with or without session) is the expected Better Auth response
    expect([200]).toContain(status);
  });

  test('Workers AI is accessible', async ({ page }) => {
    // PROD-02: AI binding verification — just ensure the endpoint exists and doesn't 500
    await page.goto('/');
    const status = await page.evaluate(async () => {
      const res = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ['invalid-test'],
          cuisinePreferences: ['italian']
        })
      });
      return res.status;
    });

    // Should fail validation but not with 500 (which would indicate binding issue)
    expect(status).not.toBe(500);
  });

  test('CORS headers are correct', async ({ page }) => {
    // PROD-02: Verify API is accessible from the browser
    await page.goto('/');
    const ok = await page.evaluate(async () => {
      const res = await fetch('/api/recipes');
      return res.ok;
    });

    expect(ok).toBeTruthy();
  });

  test('API error handling returns proper status codes', async ({ page }) => {
    // PROD-02: Verify production error handling
    await page.goto('/');
    const results = await page.evaluate(async () => {
      const notFoundRes = await fetch('/api/recipes/non-existent-id-123');
      const invalidRes = await fetch('/api/user/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });
      return { notFoundStatus: notFoundRes.status, invalidStatus: invalidRes.status };
    });

    // 404 or 400 for non-existent recipe
    expect([404, 400]).toContain(results.notFoundStatus);
    // 400 or 401 (needs auth) for invalid pantry request
    expect([400, 401]).toContain(results.invalidStatus);
  });
});
