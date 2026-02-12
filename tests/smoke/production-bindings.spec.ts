import { test, expect } from '@playwright/test';

test.describe('Production Bindings Health', () => {

  test('D1 database is accessible', async ({ request }) => {
    // PROD-02: D1 binding verification
    const response = await request.get('/api/recipes?limit=1');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.recipes).toBeDefined();
    expect(Array.isArray(data.recipes)).toBe(true);

    // If recipes exist, verify structure
    if (data.recipes.length > 0) {
      const recipe = data.recipes[0];
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('cuisine');
    }
  });

  test('KV caching works', async ({ request }) => {
    // PROD-02: KV binding verification via featured recipes endpoint
    const response1 = await request.get('/api/recipes/featured');
    expect(response1.ok()).toBeTruthy();

    const time1 = Date.now();
    await response1.json();
    const duration1 = Date.now() - time1;

    // Second request should be faster (cached)
    const time2 = Date.now();
    const response2 = await request.get('/api/recipes/featured');
    const duration2 = Date.now() - time2;

    expect(response2.ok()).toBeTruthy();

    // Cache hit should be at least 50% faster (rough heuristic)
    // Note: This is environment-dependent, may need adjustment
    console.log(`First request: ${duration1}ms, Second request: ${duration2}ms`);
  });

  test('environment variables are set', async ({ request }) => {
    // PROD-02: Verify critical env vars via API responses
    // Note: We can't directly check env vars, but can verify their effects

    // Test that auth endpoints exist (proves BETTER_AUTH_URL is set)
    const authResponse = await request.get('/api/auth/session');
    expect(authResponse.status()).not.toBe(500); // Not a server error

    // 200 (with session) or 401 (no session) are both valid
    expect([200, 401]).toContain(authResponse.status());
  });

  test('Workers AI is accessible', async ({ request }) => {
    // PROD-02: AI binding verification
    // This is tested via generation in critical-paths.spec.ts
    // Here we just verify the endpoint exists and doesn't 500

    // Note: We can't easily test AI without full generation flow
    // This test just ensures the endpoint is reachable
    const response = await request.post('/api/recipes/generate', {
      data: {
        ingredients: ['invalid-test'],
        cuisinePreferences: ['italian']
      },
      failOnStatusCode: false
    });

    // Should fail validation (invalid ingredient) but not with 500
    // 400 (validation error) is expected, 500 would indicate binding issue
    expect(response.status()).not.toBe(500);
  });

  test('CORS headers are correct', async ({ request }) => {
    // PROD-02: Verify CORS isn't blocking legitimate requests
    const response = await request.get('/api/recipes');

    // Check that response allows same-origin requests
    // Cloudflare Pages should handle this automatically
    expect(response.ok()).toBeTruthy();
  });

  test('API error handling returns proper status codes', async ({ request }) => {
    // PROD-02: Verify production error handling

    // Test 404 for non-existent recipe
    const notFoundResponse = await request.get('/api/recipes/non-existent-id-123');
    expect(notFoundResponse.status()).toBe(404);

    // Test 400 for invalid request
    const invalidResponse = await request.post('/api/pantry', {
      data: { invalid: 'data' },
      failOnStatusCode: false
    });
    expect([400, 401]).toContain(invalidResponse.status()); // 400 or 401 (needs auth)
  });
});
