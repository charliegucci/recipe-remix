module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/recipe/thai-italian-pasta'
      ],
      numberOfRuns: 3,
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Previewing Nuxt app',
      startServerReadyTimeout: 60000
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance score must be 95+
        'categories:performance': ['error', { minScore: 0.95 }],

        // Core Web Vitals (2026 thresholds)
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

        // INP replaced FID — Lighthouse uses TBT as proxy
        'total-blocking-time': ['error', { maxNumericValue: 200 }],

        // Image optimization checks
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'unused-javascript': 'warn',
        'uses-responsive-images': 'warn',

        // Relax some rules that are less relevant for SPAs
        'unsized-images': 'warn',
        'offscreen-images': 'off'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
