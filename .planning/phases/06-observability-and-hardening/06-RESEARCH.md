# Phase 6: Observability and Hardening - Research

**Researched:** 2026-02-11
**Domain:** Production observability, performance monitoring, load testing, CI/CD hardening
**Confidence:** MEDIUM-HIGH

## Summary

Phase 6 validates that the application is production-ready through comprehensive observability, performance optimization, and stress testing. Unlike previous phases that deliver user-facing features, this phase focuses on operational excellence: ensuring the system can be monitored, debugged, and scaled reliably.

The Cloudflare ecosystem provides native observability tools (Workers Observability, AI Gateway Analytics, D1 Metrics) that cover the three success criteria. The primary challenge is integration—stitching together platform-native metrics with application-level instrumentation to create a unified view of system health.

**Primary recommendation:** Leverage Cloudflare's native observability platform as the foundation, supplement with application-level metrics in D1 for business logic monitoring, implement CI/CD gates for bundle size and performance, and validate production readiness through load testing that exercises the D1 retry paths.

## Standard Stack

### Core Observability

| Library/Service | Version | Purpose | Why Standard |
|-----------------|---------|---------|--------------|
| Cloudflare Workers Observability | GA | Centralized logs, metrics, traces dashboard | Native platform integration, zero-config for Workers |
| Cloudflare AI Gateway Analytics | GA | AI request metrics, token usage, cache hits | Only observability layer for Workers AI inference |
| D1 Metrics API | GA | Database query latency, row counts, query efficiency | Native D1 performance monitoring |
| OpenTelemetry (optional) | v1.x | Traces export to external tools | Industry standard for distributed tracing |

### Performance Testing

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Lighthouse CI | v12+ | Automated performance audits in CI/CD | Every merge to main, mobile score gates |
| k6 | v0.53+ | Load testing HTTP endpoints | Stress testing generation pipeline, D1 write paths |
| wrangler deploy --dry-run | Latest | Bundle size measurement | Every build in CI, fail if >3MB (free) or >8MB (paid) |

### Error Tracking (Optional)

| Service | Integration | Purpose | When to Use |
|---------|-------------|---------|-------------|
| Sentry | @sentry/cloudflare | Structured error reporting, source maps | Production error tracking with stack traces |
| Cloudflare Notifications | Native | PagerDuty/webhook alerts | Critical threshold breaches (p99 latency, error rates) |

**Installation:**
```bash
# Performance testing
npm install --save-dev lighthouse @lhci/cli k6

# Error tracking (optional)
npm install @sentry/cloudflare

# OpenTelemetry export (optional)
npm install @opentelemetry/api @opentelemetry/sdk-trace-base
```

## Architecture Patterns

### Pattern 1: Unified Observability Dashboard

**What:** Single-pane view of AI Gateway cache hits, D1 query latencies, error rates, and generation success metrics.

**When to use:** Success Criterion 1 requires a "single dashboard" showing AI Gateway and D1 metrics together.

**Implementation approach:**
1. **Platform metrics (read-only):** Cloudflare dashboard shows Workers Observability, AI Gateway analytics, D1 metrics natively
2. **Application metrics (write):** Extend existing analytics.ts to log performance events (query latency, cache hit/miss, generation duration)
3. **Custom dashboard endpoint:** Build on existing `/api/analytics/dashboard` to query both platform metrics (via GraphQL API) and application events from D1

**Example:**
```typescript
// server/api/analytics/observability.get.ts
import { defineEventHandler } from 'h3'
import { useDrizzle } from '../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)

  // Query application-level metrics from D1
  const queryLatencies = await db
    .select({
      endpoint: sql`metadata->>'endpoint'`,
      avgLatency: avg(sql`CAST(metadata->>'latency_ms' AS INTEGER)`)
    })
    .from(schema.analyticsEvents)
    .where(eq(schema.analyticsEvents.eventType, 'query_performance'))
    .groupBy(sql`metadata->>'endpoint'`)

  // AI Gateway metrics (from Cloudflare GraphQL API)
  const aiGatewayStats = await fetchAIGatewayMetrics(event)

  // D1 query insights (from D1 API)
  const d1Insights = await fetchD1QueryInsights(event)

  return {
    queries: queryLatencies,
    aiGateway: aiGatewayStats,
    d1: d1Insights
  }
})
```

### Pattern 2: Alert Thresholds with Cloudflare Notifications

**What:** Automated alerts when p99 query latency exceeds threshold or error rate spikes.

**When to use:** Success Criterion 1 requires alerts for queries exceeding p99 threshold.

**Implementation approach:**
1. **Platform-level alerts:** Configure Cloudflare Notifications for Workers error rates, D1 query failures
2. **Application-level monitoring:** Log query latency to analytics_events, aggregate in dashboard
3. **Alerting logic:** Cron trigger (scheduled Worker) queries dashboard data, triggers alert if thresholds exceeded

**Example:**
```typescript
// Configure Cloudflare Notifications (via dashboard or API)
// Trigger: D1 query latency p99 > 500ms
// Action: Webhook to PagerDuty or Slack

// Application-level performance logging
export async function executeMonitoredQuery<T>(
  db: Database,
  queryFn: (db: Database) => Promise<T>,
  endpoint: string
): Promise<T> {
  const startTime = performance.now()

  try {
    const result = await queryFn(db)
    const latency = performance.now() - startTime

    // Fire-and-forget analytics logging
    void logAnalyticsEvent(db, {
      eventType: 'query_performance',
      metadata: { endpoint, latency_ms: latency, success: true }
    })

    return result
  } catch (error) {
    const latency = performance.now() - startTime

    void logAnalyticsEvent(db, {
      eventType: 'query_performance',
      metadata: { endpoint, latency_ms: latency, success: false, error: error.message }
    })

    throw error
  }
}
```

### Pattern 3: D1 Write Retry with Exponential Backoff

**What:** Automatic retry logic for D1 transient write failures with exponential backoff.

**When to use:** Success Criterion 2 requires proof that D1 write failures retry successfully without data loss.

**Implementation approach:**
1. **Retry wrapper utility:** Wrap all D1 write operations in retry logic
2. **Exponential backoff:** Start at 100ms, double on each retry, max 5 attempts
3. **Idempotency:** Ensure writes are idempotent (upsert, not insert) to handle replay
4. **Monitoring:** Log retry attempts to analytics for observability

**Example:**
```typescript
// server/utils/d1-retry.ts
interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
}

export async function retryD1Write<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 5,
    initialDelayMs = 100,
    maxDelayMs = 3200
  } = options

  let lastError: Error
  let delayMs = initialDelayMs

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Check if error is retryable
      const isRetryable = error.message?.includes('overloaded') ||
                          error.message?.includes('timeout') ||
                          error.message?.includes('SQLITE_BUSY')

      if (!isRetryable || attempt === maxAttempts) {
        throw error
      }

      // Log retry attempt
      console.warn(`D1 write failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms`)

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs))
      delayMs = Math.min(delayMs * 2, maxDelayMs)
    }
  }

  throw lastError
}

// Usage in recipe generation
await retryD1Write(() =>
  db.insert(schema.recipes).values(newRecipe)
)
```

### Pattern 4: Bundle Size Gates in CI

**What:** CI check that blocks merges if Worker bundle exceeds size limit.

**When to use:** Success Criterion 2 requires bundle size check preventing >3MB gzip merges.

**Implementation approach:**
1. **GitHub Actions workflow:** Run `wrangler deploy --dry-run` on every PR
2. **Size extraction:** Parse wrangler output to get compressed bundle size
3. **Threshold enforcement:** Fail build if size exceeds limit (3MB free, 8MB paid with headroom)
4. **Trend tracking:** Store size in artifact/comment for visibility

**Example:**
```yaml
# .github/workflows/bundle-check.yml
name: Bundle Size Check

on:
  pull_request:
    paths:
      - 'server/**'
      - 'app/**'
      - 'package.json'

jobs:
  check-bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build and check bundle size
        id: bundle-check
        run: |
          # Dry-run deploy to get bundle size
          output=$(npx wrangler deploy --dry-run 2>&1)

          # Extract size (example: "Total Upload: 2.5 MiB / gzip: 1.8 MiB")
          size_mb=$(echo "$output" | grep -oP 'gzip: \K[0-9.]+')

          echo "Bundle size: ${size_mb} MB"
          echo "size_mb=${size_mb}" >> $GITHUB_OUTPUT

          # Fail if exceeds threshold (3 MB for free plan)
          if (( $(echo "$size_mb > 3.0" | bc -l) )); then
            echo "❌ Bundle size ${size_mb} MB exceeds 3 MB limit"
            exit 1
          else
            echo "✅ Bundle size ${size_mb} MB is within limit"
          fi

      - name: Comment PR with bundle size
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📦 Worker bundle size: **${{ steps.bundle-check.outputs.size_mb }} MB** (limit: 3 MB)`
            })
```

### Pattern 5: Lighthouse CI for Performance Gates

**What:** Automated Lighthouse audits on every deploy, fail if mobile performance score <90.

**When to use:** Success Criterion 3 requires Lighthouse score ≥90 on mobile for recipe listing and detail pages.

**Implementation approach:**
1. **Lighthouse CI configuration:** Define URLs to audit (homepage, recipe detail, recipe list)
2. **Performance budgets:** Set thresholds for Core Web Vitals (LCP, FID, CLS)
3. **CI integration:** Run after deploy preview is ready, block merge if score drops
4. **Trend tracking:** Upload reports to Lighthouse CI server (optional) or GitHub artifacts

**Example:**
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      // Test against Cloudflare Pages preview deployment
      url: [
        'https://preview.recipe-remix.pages.dev/',
        'https://preview.recipe-remix.pages.dev/recipes',
        'https://preview.recipe-remix.pages.dev/recipes/test-recipe-id'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        // Mobile audit
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4
        }
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],

        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Resource optimization
        'uses-optimized-images': 'error',
        'modern-image-formats': 'warn',
        'uses-text-compression': 'error',
        'font-display': 'error'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
```

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
  deployment_status:

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Lighthouse CI
        run: npm install -g @lhci/cli

      - name: Run Lighthouse
        run: lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Pattern 6: Non-blocking Resource Loading

**What:** Async/defer loading for fonts, images, scripts to prevent render blocking.

**When to use:** Success Criterion 3 requires all images and fonts load non-blocking.

**Implementation approach:**
1. **Font loading:** Use `font-display: swap` in CSS, preload critical fonts
2. **Image optimization:** Native `loading="lazy"` for below-fold images, responsive srcset
3. **Script defer:** All non-critical JavaScript uses `defer` attribute
4. **Critical CSS:** Inline critical CSS in <head>, defer non-critical styles

**Example:**
```vue
<!-- app/app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
// Preload critical font
useHead({
  link: [
    {
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href: '/fonts/inter-variable.woff2',
      crossorigin: 'anonymous'
    }
  ]
})
</script>
```

```css
/* assets/css/main.css */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-variable.woff2') format('woff2');
  font-display: swap; /* Show fallback font immediately, swap when loaded */
  font-weight: 100 900;
}
```

```vue
<!-- components/RecipeCard.vue -->
<template>
  <div class="recipe-card">
    <img
      :src="recipe.imageUrl"
      :alt="recipe.title"
      loading="lazy"  <!-- Native lazy loading -->
      decoding="async" <!-- Async image decode -->
      width="400"      <!-- Explicit dimensions prevent layout shift -->
      height="300"
    />
  </div>
</template>
```

### Anti-Patterns to Avoid

- **Don't use synchronous font loading:** Blocks render until font loads, destroys LCP
- **Don't skip retry logic on D1 writes:** Transient errors are expected, silent failures are unacceptable
- **Don't rely solely on platform metrics:** Application-level business logic (e.g., generation success rate by cuisine) requires custom instrumentation
- **Don't test performance only on desktop:** Mobile networks are slower, CPU is weaker—test on mobile viewport with throttling
- **Don't ignore bundle size until it's too late:** Monitor from day one, split bundles proactively

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Load testing | Custom HTTP request scripts | k6, Artillery, Lighthouse CI | Production-grade HTTP/2 support, distributed load generation, built-in reporting |
| Error tracking | Custom error logging | Sentry, Cloudflare Notifications | Automatic source map resolution, error grouping, stack trace analysis |
| Performance budgets | Manual Lighthouse runs | Lighthouse CI | Automated regression detection, historical trending, CI/CD integration |
| Distributed tracing | Custom span instrumentation | OpenTelemetry | Industry standard, vendor-neutral, auto-instrumentation for common frameworks |
| Retry logic | setTimeout loops | Exponential backoff libraries | Jitter, max delay caps, retry budget tracking built-in |

**Key insight:** Observability and reliability are well-trodden paths. The Cloudflare ecosystem provides native tooling for 80% of requirements. Custom instrumentation should fill gaps (business metrics, application-specific alerts), not replace platform capabilities.

## Common Pitfalls

### Pitfall 1: Platform Metrics Silos

**What goes wrong:** Cloudflare dashboard shows Workers metrics, AI Gateway has separate analytics, D1 has its own insights—no unified view of "is generation working?"

**Why it happens:** Each Cloudflare service has independent observability, designed for platform teams not application developers.

**How to avoid:**
1. Build custom dashboard endpoint that aggregates platform metrics via GraphQL API
2. Log application events (generation_start, generation_success, generation_failed) to D1 analytics_events table
3. Correlate platform metrics (AI Gateway cache hit) with application events (recipe generated) using request IDs

**Warning signs:**
- Debugging a slow generation requires checking 3 different dashboards
- AI Gateway shows high cache hit rate but generation endpoint shows low success rate—no way to correlate

### Pitfall 2: Ignoring D1 Query Efficiency

**What goes wrong:** Query returns correct results but scans thousands of rows unnecessarily, burning through billing quota and slowing requests.

**Why it happens:** D1 returns `rows_read` and `rows_written` in query metadata, but application code doesn't check it.

**How to avoid:**
1. Log `meta.rows_read` and `meta.rows_written` for every query in analytics_events
2. Set alert thresholds: if rows_read > 1000 for a query that should scan <100, investigate
3. Use EXPLAIN QUERY PLAN to verify index usage before deploying queries

**Warning signs:**
- Query latency spikes under load despite adding indexes
- D1 billing shows high row-read count relative to request volume
- `rows_read` / `rows_returned` ratio (query efficiency) < 0.1

### Pitfall 3: Load Testing Without D1 Retry Validation

**What goes wrong:** Load test passes because requests complete, but D1 writes silently fail and data is lost.

**Why it happens:** Load testing tools (k6, Artillery) measure HTTP response codes, not database-level success. A 200 OK response can mask a failed retry that falls back to error handling.

**How to avoid:**
1. Load test generation endpoint specifically (write-heavy path)
2. Query database after test to verify row count matches request count
3. Inject D1 failures artificially (chaos engineering) to prove retry logic works
4. Check analytics_events for retry attempt logs during load test

**Warning signs:**
- Load test shows 100% success rate but generated recipe count is lower than request count
- No retry logs appear in analytics during load test (means retry path untested)

### Pitfall 4: Bundle Size Creeps Up Silently

**What goes wrong:** Developers add libraries incrementally (lodash, date-fns, UI components), bundle size exceeds 3MB months after launch, deployment starts failing.

**Why it happens:** No CI gate measuring bundle size, developers unaware of cumulative impact.

**How to avoid:**
1. Add `wrangler deploy --dry-run` to PR checks (see Pattern 4)
2. Fail build if bundle exceeds threshold (3MB free plan, 8MB with headroom on paid)
3. Comment on PR with size delta: "+120KB from previous build"
4. Use tree-shaking, dynamic imports for non-critical features

**Warning signs:**
- Build times increase steadily over months
- Lighthouse performance score drops despite no visible code changes
- Workers cold start time increases

### Pitfall 5: Testing Only Happy Paths

**What goes wrong:** Load tests and performance audits only test successful generation flows. Error paths (AI timeout, D1 overload, invalid input) are untested until production failure.

**Why it happens:** Happy path testing is easier—error injection requires deliberate failure simulation.

**How to avoid:**
1. Load test error paths: send invalid ingredients, trigger AI timeouts, inject D1 failures
2. Verify error responses are fast (<200ms) and don't leak stack traces
3. Check that error analytics events are logged correctly
4. Test retry exhaustion: what happens when all 5 D1 retry attempts fail?

**Warning signs:**
- Production error rate spikes during first real traffic surge
- Error logs show stack traces or database connection strings (security issue)
- Retry logic never triggers in staging tests (means it's untested)

## Code Examples

Verified patterns from official sources and existing codebase:

### D1 Query Performance Monitoring

```typescript
// server/utils/monitored-query.ts
import type { Database } from './drizzle'
import { logAnalyticsEvent } from './analytics'

export async function executeMonitoredQuery<T>(
  db: Database,
  queryFn: (db: Database) => Promise<T>,
  endpoint: string
): Promise<T> {
  const startTime = performance.now()
  let rowsRead = 0
  let success = true

  try {
    // Execute query
    const result = await queryFn(db)

    // Extract D1 metadata if available
    // Note: Drizzle ORM doesn't expose raw D1 meta,
    // would need to use hubDatabase().prepare() directly for row counts
    const latencyMs = Math.round(performance.now() - startTime)

    // Fire-and-forget performance logging
    void logAnalyticsEvent(db, {
      eventType: 'query_performance',
      metadata: {
        endpoint,
        latency_ms: latencyMs,
        rows_read: rowsRead,
        success: true
      }
    })

    return result
  } catch (error) {
    success = false
    const latencyMs = Math.round(performance.now() - startTime)

    void logAnalyticsEvent(db, {
      eventType: 'query_performance',
      metadata: {
        endpoint,
        latency_ms: latencyMs,
        success: false,
        error: error.message
      }
    })

    throw error
  }
}

// Usage in API route
export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)

  const recipes = await executeMonitoredQuery(
    db,
    (db) => db.select().from(schema.recipes).limit(20),
    'GET /api/recipes'
  )

  return recipes
})
```

### Cloudflare AI Gateway Metrics Query

```typescript
// server/api/analytics/ai-gateway.get.ts
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  // Query AI Gateway analytics via GraphQL API
  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${accountId}" }) {
          aiGatewayRequestsAdaptive(
            filter: { datetime_geq: "2024-01-01T00:00:00Z" }
          ) {
            count
            quantiles {
              cacheHitRateP50
              cacheHitRateP99
              latencyP50
              latencyP99
            }
          }
        }
      }
    }
  `

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })

  const data = await response.json()

  return {
    totalRequests: data.data.viewer.accounts[0].aiGatewayRequestsAdaptive.count,
    cacheHitRate: data.data.viewer.accounts[0].aiGatewayRequestsAdaptive.quantiles.cacheHitRateP50,
    latencyP99: data.data.viewer.accounts[0].aiGatewayRequestsAdaptive.quantiles.latencyP99
  }
})
```
*Source: [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)*

### Load Test with k6

```javascript
// loadtest/generation-stress.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const retryRate = new Rate('retries')

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 for 5 minutes
    { duration: '2m', target: 100 },  // Spike to 100 users
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p95<5000', 'p99<10000'], // 95% under 5s, 99% under 10s
    errors: ['rate<0.05'],  // Error rate < 5%
    retries: ['rate<0.2'],  // Retry rate < 20%
  }
}

export default function() {
  const payload = JSON.stringify({
    ingredients: ['chicken', 'rice', 'soy sauce', 'ginger'],
    cuisines: ['Japanese', 'Thai'],
    restrictions: []
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `better-auth.session_token=${__ENV.AUTH_TOKEN}`
    }
  }

  const res = http.post(
    'https://recipe-remix.pages.dev/api/recipes/generate',
    payload,
    params
  )

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has recipe ID': (r) => JSON.parse(r.body).recipeId !== undefined,
    'completed under 30s': (r) => r.timings.duration < 30000
  })

  errorRate.add(!success)

  // Check for retry indicators in response
  if (res.headers['X-Retry-Count']) {
    retryRate.add(1)
  }

  sleep(1) // Think time between requests
}
```

*Source: [k6 Load Testing Guide](https://k6.io/docs/)*

### Lighthouse CI Assertion Configuration

```javascript
// lighthouserc.js (extended configuration)
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/recipes',
        'http://localhost:3000/recipes/test-id'
      ],
      numberOfRuns: 3
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Resource optimization
        'uses-webp-images': 'warn',
        'uses-text-compression': 'error',
        'uses-long-cache-ttl': 'warn',

        // Font loading
        'font-display': 'error',

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
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Lighthouse runs | Lighthouse CI in every PR | 2022+ | Catches performance regressions before merge |
| Custom retry logic | Exponential backoff with jitter | 2020+ | Prevents thundering herd on retry storms |
| Platform-specific metrics | OpenTelemetry standard | 2021+ | Vendor-neutral observability, easier migration |
| Single-provider monitoring | AI Gateway multi-provider | 2024 | Cache across providers, automatic failover |
| NuxtHub Admin deployment | Cloudflare Pages Git integration | 2025 (NuxtHub sunset) | Standard CI/CD, no vendor lock-in |

**Deprecated/outdated:**
- **NuxtHub Admin:** Being sunset December 31, 2025 - use Cloudflare Pages direct deployment
- **Manual wrangler deployments for CI:** GitHub Actions with cloudflare/wrangler-action is standard
- **Custom session caching:** KV sessions now standard pattern in Better Auth docs
- **Manual D1 read retry:** D1 auto-retries read-only queries (2 attempts) since 2025

## Open Questions

1. **D1 p99 latency baseline**
   - What we know: D1 metrics API exposes query latency percentiles
   - What's unclear: What's acceptable p99 for this workload? (Recipe detail: <100ms? Recipe list: <200ms?)
   - Recommendation: Establish baseline during load testing, set alerts at 2x baseline

2. **AI Gateway cache effectiveness**
   - What we know: AI Gateway caches identical prompts, shows cache hit rate in analytics
   - What's unclear: Are recipe generation prompts cacheable in practice? (User-specific pantry makes each prompt unique)
   - Recommendation: Log cache hit/miss in analytics, measure over first 1000 generations

3. **Load test target RPS**
   - What we know: D1 single-writer throughput ~200 writes/sec, Workers AI rate limit 300 req/min
   - What's unclear: What's realistic target traffic for v1 launch? (10 generations/min? 100?)
   - Recommendation: Start conservative (10 RPS sustained), increase until failure, set production limit at 50% of failure threshold

4. **Error budget for observability**
   - What we know: Cloudflare docs say "handful of D1 errors every several hours is expected"
   - What's unclear: What error rate is acceptable for user-facing operations? (1%? 0.1%?)
   - Recommendation: Target <0.5% error rate on generation endpoint, <0.1% on read paths

## Sources

### Primary (HIGH confidence)
- [Cloudflare Workers Observability](https://developers.cloudflare.com/workers/observability/) - Logs, metrics, traces
- [Cloudflare AI Gateway Analytics](https://developers.cloudflare.com/ai-gateway/observability/analytics/) - Token usage, cache hits, cost tracking
- [Cloudflare D1 Metrics](https://developers.cloudflare.com/d1/observability/metrics-analytics/) - Query latency, row counts, efficiency
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) - Bundle size, CPU time, memory caps
- [D1 Debug Guide](https://developers.cloudflare.com/d1/observability/debug-d1/) - Query insights, retry behavior
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci) - Automated performance gates
- [k6 Load Testing](https://k6.io/docs/) - HTTP load testing for APIs

### Secondary (MEDIUM confidence)
- [Cloudflare Workers Tracing (Beta)](https://blog.cloudflare.com/workers-tracing-now-in-open-beta/) - OpenTelemetry export
- [Sentry Cloudflare Integration](https://docs.sentry.io/platforms/javascript/guides/cloudflare/) - Error tracking setup
- [Cloudflare Notifications](https://developers.cloudflare.com/notifications/get-started/configure-pagerduty/) - PagerDuty alerting
- [GitHub Actions for Wrangler](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) - CI/CD deployment
- [Drizzle ORM Performance](https://orm.drizzle.team/docs/perf-queries) - Prepared statements, query optimization
- [SQLite Query Optimization](https://www.sqlite.org/optoverview.html) - Index strategies, EXPLAIN QUERY PLAN

### Tertiary (LOW confidence, marked for validation)
- Community reports of D1 throughput limits (~200 writes/sec) - needs benchmarking validation
- Workers AI rate limit enforcement variability - monitor in production

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools are GA and well-documented
- Architecture patterns: MEDIUM-HIGH - Patterns proven in Cloudflare ecosystem, need project-specific tuning
- Load testing approach: MEDIUM - k6/Artillery are standard, but D1-specific retry validation is untested
- Performance budgets: HIGH - Lighthouse CI is industry standard, Cloudflare limits well-documented

**Research date:** 2026-02-11
**Valid until:** 60 days (platform features stable, monitor for AI Gateway/D1 updates)
