# Summary: 06-03 — CI Gates and Load Test Script

## One-Liner
Created GitHub Actions CI workflow with bundle size and Lighthouse gates, plus a k6 load test for generation writes.

## What Was Done
- Created `.github/workflows/ci.yml` with two jobs:
  - **Bundle Size Check**: `wrangler deploy --dry-run`, gzip size extraction, fails if >3MB
  - **Lighthouse CI**: builds Nuxt, runs `@lhci/cli autorun` with mobile config
- Created `lighthouserc.js` with mobile throttling targeting:
  - Performance score >= 0.9
  - LCP < 2500ms, CLS < 0.1, TBT < 300ms
  - Tests `/` and `/recipes` routes
- Created `loadtest/generation-stress.js` (k6 script):
  - Ramps to 50 VUs over staged intervals
  - Exercises POST `/api/recipes/generate` with randomized ingredients/cuisines
  - Custom metrics: successful_generations, failed_generations
  - Summary output with DB verification query

## Files Changed
- `.github/workflows/ci.yml` (created)
- `lighthouserc.js` (created)
- `loadtest/generation-stress.js` (created)

## Must-Haves Verification
- [x] CI workflow blocks PRs exceeding 3MB bundle
- [x] Lighthouse config asserts mobile perf >= 90
- [x] Load test script exercises generation write path
