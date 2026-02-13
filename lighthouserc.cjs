module.exports = {
  ci: {
    collect: {
      url: [
        'https://remix-recipe.com/',
        'https://remix-recipe.com/recipe/thai-italian-pasta'
      ],
      numberOfRuns: 1
    },
    assert: {
      assertions: {
        // Performance score must be 80+ (remote URL adds network latency vs local)
        'categories:performance': ['warn', { minScore: 0.8 }],

        // Core Web Vitals
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 500 }],

        // Accessibility
        'categories:accessibility': ['warn', { minScore: 0.9 }],

        // Best practices
        'categories:best-practices': ['warn', { minScore: 0.9 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
