# Phase 10: Performance Optimization - Research

**Researched:** 2026-02-13
**Domain:** Web Performance, Bundle Optimization, Core Web Vitals
**Confidence:** HIGH

## Summary

Performance optimization for Nuxt 4 on Cloudflare Pages involves five key areas: bundle size reduction through tree-shaking and dependency auditing, image optimization with lazy loading and modern formats, route-level code splitting for heavy components, Lighthouse performance scoring, and Core Web Vitals monitoring. The project is already well-positioned with KV caching and R2 image storage in place.

Nuxt 4 provides built-in performance features including automatic code splitting, intelligent prefetching via NuxtLink, lazy component loading with the `Lazy` prefix, and lazy hydration with `hydrate-on-visible` attributes. Cloudflare Pages recently improved TTFB by up to 10X, bringing Lighthouse scores from ~78 to near-perfect 100. The challenge is balancing optimization efforts—lazy loading should target critical paths users interact with most, not every component prematurely.

**Primary recommendation:** Use `nuxi analyze` for bundle visualization, add `@nuxt/image` for automatic image optimization, implement lazy loading for below-fold components, establish Lighthouse CI in GitHub Actions for continuous monitoring, and refine edge caching with proper Cache-Control headers.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt 4 | 3.15.0+ (compat v4) | SSR framework with built-in perf features | Auto code splitting, prefetching, lazy hydration |
| @nuxt/image | ^1.x | Image optimization module | Drop-in img replacement, CDN support, format conversion |
| @nuxt/fonts | ^1.x | Font optimization | Self-hosts fonts, generates fallback metrics for CLS |
| vite-bundle-visualizer | (built-in) | Bundle analysis via `nuxi analyze` | Official Nuxt tool for identifying optimization targets |
| Lighthouse | Latest | Performance auditing | Google's standard for Core Web Vitals measurement |
| Lighthouse CI | ^0.14.x | Automated performance testing | CI/CD integration, regression prevention |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nuxt/scripts | ^1.x | Third-party script optimization | When adding analytics, chat widgets, or ads |
| NuxtHub (Cloudflare) | ^0.8.0 | Edge platform with KV/R2 | Already in use, provides caching infrastructure |
| Chrome DevTools | Built-in | Real-device Core Web Vitals | Local testing with actual network conditions |
| PageSpeed Insights | Web tool | Field + lab data | Real user experience metrics from CrUX dataset |
| WebPageTest | Web tool | Global testing locations | Testing international performance |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @nuxt/image | Native lazy loading only | @nuxt/image adds format conversion, resizing, CDN support |
| Lighthouse CI | Manual Lighthouse runs | CI automation prevents regressions, tracks history |
| vite-bundle-visualizer | webpack-bundle-analyzer | vite-bundle-visualizer is Nuxt 4's official tool |

**Installation:**
```bash
npm install @nuxt/image @nuxt/fonts @lhci/cli --save-dev
```

## Architecture Patterns

### Recommended Optimization Structure
```
Performance Optimization
├── Bundle Analysis          # Identify large chunks
│   ├── nuxi analyze        # Visualize bundle composition
│   └── Audit dependencies  # Remove unused packages
├── Image Optimization       # LCP improvement
│   ├── @nuxt/image setup   # Auto format conversion
│   ├── Lazy loading        # Below-fold images
│   └── Priority hints      # Hero images
├── Code Splitting           # Reduce initial load
│   ├── Lazy components     # Lazy prefix for heavy components
│   ├── Route-level splits  # Dynamic imports for pages
│   └── Lazy hydration      # hydrate-on-visible for below-fold
├── Edge Caching             # TTFB optimization
│   ├── Cache-Control       # HTTP headers for static assets
│   ├── KV cache            # API response caching (already in place)
│   └── R2 bucket caching   # Image CDN with Cloudflare
└── Monitoring               # Continuous tracking
    ├── Lighthouse CI       # Automated audits
    ├── Core Web Vitals     # LCP, INP, CLS tracking
    └── Bundle size checks  # Prevent regressions
```

### Pattern 1: Lazy Component Loading
**What:** Delay loading component JavaScript until needed
**When to use:** Below-fold content, conditionally rendered components, heavy libraries
**Example:**
```vue
<template>
  <div>
    <!-- Loads immediately (above fold) -->
    <RecipeCard :recipe="recipe" />

    <!-- Loads when visible (below fold) -->
    <LazyReviewList :recipe-id="recipe.id" />

    <!-- Loads only when condition met -->
    <LazySubstitutionDialog v-if="showDialog" />
  </div>
</template>
```
Source: [Nuxt Components Documentation](https://nuxt.com/docs/4.x/directory-structure/app/components)

### Pattern 2: Image Optimization with @nuxt/image
**What:** Replace native img tags with NuxtImg for automatic optimization
**When to use:** All images, especially hero images (LCP) and card images
**Example:**
```vue
<template>
  <!-- Before: Native img with manual lazy loading -->
  <img
    :src="imageUrl"
    :alt="recipe.title"
    loading="lazy"
    decoding="async"
  />

  <!-- After: NuxtImg with automatic optimization -->
  <NuxtImg
    :src="imageUrl"
    :alt="recipe.title"
    loading="lazy"
    format="webp"
    sizes="sm:100vw md:50vw lg:400px"
    :fetch-priority="isHero ? 'high' : 'low'"
  />
</template>
```
Source: [Nuxt Image Documentation](https://image.nuxt.com/)

### Pattern 3: Lazy Hydration for Below-Fold Components
**What:** Defer interactive JavaScript for non-critical components
**When to use:** Components visible only after scroll, SEO content that doesn't need interactivity immediately
**Example:**
```vue
<template>
  <!-- Hydrates when scrolled into viewport -->
  <LazyReviewList
    :recipe-id="recipe.id"
    hydrate-on-visible
  />

  <!-- Hydrates when browser idle -->
  <LazyWhyThisWorks
    :recipe="recipe"
    hydrate-on-idle
  />
</template>
```
Source: [Nuxt Performance Best Practices](https://nuxt.com/docs/4.x/guide/best-practices/performance)

### Pattern 4: Bundle Analysis and Dependency Auditing
**What:** Visualize bundle composition to identify optimization targets
**When to use:** Before optimization, after adding dependencies, before major releases
**Example:**
```bash
# Analyze production bundle
npx nuxi analyze

# Opens browser with interactive bundle visualization
# Large blocks = optimization opportunities

# Audit dependencies
npm ls --depth=0
# Remove unused packages from package.json
```
Source: [Nuxi Analyze Command](https://nuxt.com/docs/4.x/api/commands/analyze)

### Pattern 5: Route-Level Code Splitting
**What:** Split heavy routes into separate chunks with dynamic imports
**When to use:** Admin pages, generation flow, analytics dashboards
**Example:**
```typescript
// pages/admin/observability.vue - Heavy analytics page
// Nuxt automatically code-splits by route
// Additional optimization: lazy-load chart components

<template>
  <div>
    <h1>Observability Dashboard</h1>
    <!-- Heavy chart library loaded only when needed -->
    <LazyAnalyticsChart :data="stats" />
  </div>
</template>
```
Source: [Nuxt Code Splitting](https://nuxt.com/docs/4.x/guide/best-practices/performance)

### Pattern 6: Edge Caching with Cache-Control Headers
**What:** Set HTTP cache headers for static assets and API responses
**When to use:** Static images on R2, recipe data that changes infrequently
**Example:**
```typescript
// server/api/recipes/[idOrSlug].get.ts
export default defineEventHandler(async (event) => {
  // KV caching already in place
  const recipe = await getCachedRecipe(slug)

  // Add HTTP cache headers for CDN
  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
  })

  return recipe
})

// R2 image response
// Set cache headers on R2 bucket objects
// Cache-Control: public, max-age=31536000, immutable
```
Source: [Cloudflare R2 Caching](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/)

### Pattern 7: Lighthouse CI for Continuous Monitoring
**What:** Automate Lighthouse audits on every PR
**When to use:** CI/CD pipeline for performance regression detection
**Example:**
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/recipe/chocolate-chip-cookies'],
      numberOfRuns: 3
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', {minScore: 0.95}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}]
      }
    }
  }
}
```
Source: [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)

### Anti-Patterns to Avoid

- **Premature optimization:** Don't lazy-load everything—focus on critical paths users interact with most. Lazy loading every component adds complexity without meaningful gains.
- **Over-reliance on lab data:** Perfect Lighthouse scores don't guarantee good real-world Core Web Vitals. Test with real devices and monitor field data from Search Console.
- **Third-party script overload:** Each analytics tag, chat widget, or social embed competes for bandwidth and delays INP. Audit scripts and use @nuxt/scripts to defer non-critical ones.
- **Ignoring image optimization:** Images are the #1 cause of poor LCP. Using native img without modern formats (WebP, AVIF), sizing attributes, or lazy loading kills performance.
- **Cache invalidation neglect:** Aggressive caching without proper invalidation strategy leads to stale content. Use stale-while-revalidate and versioned cache keys.
- **Plugin overuse:** Every Nuxt plugin runs on initialization. Implement functionality as composables or utility functions when possible.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image optimization | Custom resize/format conversion | @nuxt/image with IPX or CDN provider | Handles srcset, modern formats, lazy loading, CDN integration |
| Bundle analysis | Manual webpack stats parsing | nuxi analyze (vite-bundle-visualizer) | Official tool, interactive visualization, chunk mapping |
| Performance monitoring | Custom Lighthouse scripts | Lighthouse CI | Automated runs, GitHub integration, historical tracking, budget enforcement |
| Font optimization | Manual font subsetting/hosting | @nuxt/fonts | Auto self-hosting, fallback metrics, CLS prevention |
| Third-party scripts | Raw script tags | @nuxt/scripts | SSR support, loading strategies, INP protection |
| Cache invalidation | Custom cache busting | Nuxt's built-in asset hashing | Automatic file fingerprinting, CDN-friendly |

**Key insight:** Modern web performance involves many edge cases—format negotiation (WebP vs AVIF vs fallback), responsive image sizing (srcset generation), layout shift prevention (font fallback metrics), and cache coherence. These problems are solved once by specialized tools; custom implementations inevitably miss cases and require ongoing maintenance.

## Common Pitfalls

### Pitfall 1: Optimizing Without Measuring
**What goes wrong:** Developers apply optimizations blindly (lazy-loading all components, aggressive tree-shaking) without measuring actual impact on Core Web Vitals.
**Why it happens:** Performance anxiety leads to premature optimization. Focus on file size instead of user-perceived performance.
**How to avoid:** Measure first with Lighthouse and Chrome DevTools. Identify bottlenecks (slow LCP image, render-blocking JS). Optimize targeted areas. Measure again to confirm improvement.
**Warning signs:** Bundle size decreases but Lighthouse score unchanged. Implementing complex lazy-loading with no FCP/LCP improvement.

### Pitfall 2: Lazy Loading Above-the-Fold Content
**What goes wrong:** Applying `loading="lazy"` or `Lazy` prefix to hero images or critical components delays LCP, making performance worse.
**Why it happens:** Misunderstanding of lazy loading—"lazy = faster" assumption. Not considering viewport visibility.
**How to avoid:** Only lazy-load below-fold content. Hero images should have `loading="eager"` and `fetch-priority="high"`. Critical components load immediately.
**Warning signs:** LCP regression after adding lazy loading. Hero image loads slowly despite small file size.

### Pitfall 3: Ignoring Real User Data
**What goes wrong:** Site achieves perfect Lighthouse scores (100/100) but fails Core Web Vitals in Search Console because lab tests use fast desktop conditions.
**Why it happens:** Lab tests simulate ideal conditions (fast CPU, reliable network). Real users have slow mobile devices, throttled connections.
**How to avoid:** Monitor field data from PageSpeed Insights (CrUX dataset) and Search Console. Test with throttled mobile devices in Chrome DevTools.
**Warning signs:** 75th percentile field metrics much worse than lab metrics. High INP in field, low in lab.

### Pitfall 4: Cache-Control Header Conflicts
**What goes wrong:** Setting conflicting cache headers causes CDN to bypass caching or cache for wrong duration.
**Why it happens:** Multiple layers (Nuxt, Nitro, Cloudflare) can set headers. Misunderstanding of `max-age` vs `s-maxage`.
**How to avoid:** Use `setResponseHeaders()` explicitly. Understand hierarchy: `s-maxage` (CDN) overrides `max-age` (browser). Test with `curl -I` to verify headers.
**Warning signs:** TTFB remains high despite caching. CDN `X-Cache: MISS` on every request.

### Pitfall 5: Tree-Shaking Doesn't Work with Auto-Imports
**What goes wrong:** Unused auto-imported components still appear in bundle despite not being used in templates.
**Why it happens:** Nuxt's auto-import scans components directory. Tree-shaking relies on static analysis; unused imports aren't eliminated if they're auto-registered.
**How to avoid:** Run `nuxi analyze` to identify unused components. Move rarely-used components to separate directory and use explicit imports. Disable auto-import for large component libraries.
**Warning signs:** Bundle includes components never rendered. `nuxi analyze` shows large chunks for unused features.

### Pitfall 6: Third-Party Script Bloat
**What goes wrong:** Adding analytics, chat widgets, ad networks, and social embeds causes INP to skyrocket (>500ms).
**Why it happens:** Each script competes for main thread. Third-party scripts often load synchronously and execute on page load.
**How to avoid:** Use @nuxt/scripts with deferred loading strategies (`trigger: 'manual'`, `trigger: 'idle'`). Audit necessity—do you need 5 analytics tools?
**Warning signs:** INP regression after adding scripts. Lighthouse flags third-party blocking time.

### Pitfall 7: Image Format Confusion
**What goes wrong:** Serving AVIF images to browsers that don't support them, causing broken images or falling back to large PNGs.
**Why it happens:** Assuming universal format support. Not testing across browsers (Safari, older Chrome).
**How to avoid:** Use @nuxt/image which handles format negotiation automatically. Provide fallback formats via `<picture>` element.
**Warning signs:** Images load in Chrome but fail in Safari. Network tab shows multiple image format requests.

## Code Examples

Verified patterns from official sources:

### Bundle Analysis Workflow
```bash
# 1. Build production bundle
npm run build

# 2. Analyze bundle composition
npx nuxi analyze

# 3. Identify large chunks
# Look for:
# - Large vendor chunks (>100KB)
# - Unused dependencies
# - Duplicated code across chunks

# 4. Audit dependencies
npm ls --depth=0

# 5. Remove unused packages
# Check package.json for packages not imported in codebase
npm uninstall unused-package

# 6. Re-analyze to confirm size reduction
npx nuxi analyze
```
Source: [Nuxt Performance Best Practices](https://nuxt.com/docs/4.x/guide/best-practices/performance)

### Image Optimization Configuration
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/image'],

  image: {
    // Use Cloudflare Images for R2 optimization
    provider: 'cloudflare',
    cloudflare: {
      baseURL: process.env.R2_PUBLIC_URL
    },

    // Define responsive sizes
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280
    },

    // Default image quality
    quality: 80,

    // Modern formats with fallback
    formats: ['webp', 'avif']
  }
})
```
Source: [Nuxt Image Configuration](https://image.nuxt.com/)

### Lazy Component Implementation
```vue
<script setup lang="ts">
// RecipeCard.vue - Immediately loaded (above fold)
const props = defineProps<{ recipe: Recipe }>()
</script>

<template>
  <div class="recipe-card">
    <!-- Hero image: eager loading, high priority -->
    <NuxtImg
      :src="recipe.imageKey"
      :alt="recipe.title"
      loading="eager"
      fetch-priority="high"
      format="webp"
      sizes="sm:100vw md:50vw lg:400px"
    />

    <!-- Reviews: lazy-loaded, hydrates when visible -->
    <LazyReviewList
      :recipe-id="recipe.id"
      hydrate-on-visible
    />

    <!-- Substitution dialog: lazy-loaded, only when opened -->
    <LazySubstitutionDialog
      v-if="showDialog"
      @close="showDialog = false"
    />
  </div>
</template>
```
Source: [Nuxt Component Lazy Loading](https://nuxt.com/docs/4.x/directory-structure/app/components)

### Cache-Control Headers for API Responses
```typescript
// server/api/recipes/[idOrSlug].get.ts
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'idOrSlug')
  const cacheKey = `recipe:${slug}`

  // 1. Check KV cache (already implemented)
  const kv = hubKV()
  const cached = await kv.getItem(cacheKey)
  if (cached) {
    // 2. Add HTTP cache headers for CDN edge caching
    setResponseHeaders(event, {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'CDN-Cache-Control': 'max-age=86400'
    })
    return cached
  }

  // 3. Fetch from D1
  const db = useDrizzle(event)
  const recipe = await db.query.recipes.findFirst({
    where: eq(schema.recipes.slug, slug)
  })

  // 4. Cache in KV with 1 hour TTL
  await kv.setItem(cacheKey, recipe, { ttl: 3600 })

  // 5. Set cache headers
  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
  })

  return recipe
})
```
Source: [Cloudflare Cache Documentation](https://developers.cloudflare.com/cache/)

### Lighthouse CI Configuration
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      // URLs to audit
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/recipe/chocolate-chip-cookies',
        'http://localhost:3000/generate'
      ],
      // Run multiple times to reduce variance
      numberOfRuns: 3,
      // Start dev server
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'ready in'
    },

    assert: {
      preset: 'lighthouse:recommended',

      assertions: {
        // Performance score must be 95+
        'categories:performance': ['error', {minScore: 0.95}],

        // Core Web Vitals thresholds
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
        'interaction-to-next-paint': ['error', {maxNumericValue: 200}],

        // Bundle size budgets
        'total-byte-weight': ['warn', {maxNumericValue: 512000}],
        'uses-optimized-images': 'error',
        'modern-image-formats': 'error',
        'unused-javascript': 'warn'
      }
    },

    upload: {
      target: 'temporary-public-storage'
    }
  }
}
```
Source: [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)

### Font Optimization with @nuxt/fonts
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/fonts'],

  fonts: {
    // Automatically detects and optimizes fonts
    // Generates fallback metrics to prevent CLS
    experimental: {
      processCSSVariables: true
    }
  }
})

// assets/css/main.css
@font-face {
  font-family: 'Inter';
  /* @nuxt/fonts will:
     1. Download font files
     2. Self-host in public/_fonts/
     3. Generate fallback metrics
     4. Add size-adjust, ascent-override for CLS prevention
  */
  src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
}
```
Source: [Nuxt Fonts Documentation](https://nuxt.com/modules/fonts)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| First Input Delay (FID) | Interaction to Next Paint (INP) | March 2024 | INP measures full interaction latency, not just input delay |
| Manual lazy loading | Native browser `loading="lazy"` | March 2022 (universal support) | No JavaScript needed, better performance |
| Separate lazy-load libraries (lazysizes) | @nuxt/image + native lazy loading | Nuxt 3+ (2023) | Framework integration, automatic optimization |
| Webpack Bundle Analyzer | vite-bundle-visualizer | Nuxt 4 (Vite-based) | Faster builds, better tree-shaking |
| Google Fonts CDN | Self-hosted with @nuxt/fonts | Nuxt 3.8+ (2024) | No external requests, CLS prevention, privacy |
| Manual image formats | Automatic WebP/AVIF with fallback | 2023+ (wide browser support) | 30-50% file size reduction |
| Lighthouse manual runs | Lighthouse CI automation | Ongoing standard | Regression prevention, historical tracking |
| NuxtHub Admin | Cloudflare Pages direct deployment | 2025 (sunset) | Direct control, faster TTFB |

**Deprecated/outdated:**
- **lazysizes library:** Replaced by native `loading="lazy"` + @nuxt/image
- **FID metric:** Replaced by INP as Core Web Vital (March 2024)
- **Google Fonts CDN:** Use @nuxt/fonts for self-hosted optimization
- **Webpack-based analysis:** Use `nuxi analyze` with vite-bundle-visualizer for Nuxt 4

## Open Questions

1. **R2 Image CDN Integration with @nuxt/image**
   - What we know: Project uses R2 for image storage with custom imageUrl computed property
   - What's unclear: Whether @nuxt/image supports Cloudflare R2 directly or requires custom provider configuration
   - Recommendation: Test @nuxt/image with `provider: 'cloudflare'` and `baseURL` pointing to R2 public URL. May need custom provider if R2 bucket doesn't support image transformations.

2. **Lighthouse CI in Cloudflare Pages Environment**
   - What we know: Lighthouse CI typically runs in GitHub Actions with preview builds
   - What's unclear: How to run Lighthouse against Cloudflare Pages preview deployments (dynamic URLs)
   - Recommendation: Use Cloudflare Pages deployment webhook to trigger Lighthouse CI with preview URL. Store results in Temporary Public Storage or GitHub Pages.

3. **Tree-Shaking Effectiveness with Nuxt Auto-Imports**
   - What we know: Nuxt auto-imports components from `~/components`, some reports suggest tree-shaking doesn't eliminate unused ones
   - What's unclear: Whether Nuxt 4's updated auto-import properly tree-shakes or if manual imports are needed for large component sets
   - Recommendation: Run `nuxi analyze` to verify. If unused components appear in bundle, consider disabling auto-import for specific directories with explicit imports.

4. **Third-Party Script Performance Impact**
   - What we know: Project may add analytics, monitoring, or marketing scripts
   - What's unclear: Which third-party scripts are planned and their INP impact
   - Recommendation: Audit current scripts, use @nuxt/scripts module when adding new ones, defer non-critical scripts with `trigger: 'idle'`.

5. **Cache Invalidation Strategy for Recipe Updates**
   - What we know: KV cache uses TTL-based expiration (3600s-86400s depending on endpoint)
   - What's unclear: How to invalidate cache when recipe is edited or deleted
   - Recommendation: Implement versioned cache keys (`recipe:${slug}:v${updatedAt.getTime()}`) or manual invalidation on update endpoints.

## Sources

### Primary (HIGH confidence)
- [Nuxt 4 Performance Best Practices](https://nuxt.com/docs/4.x/guide/best-practices/performance) - Official Nuxt documentation
- [Nuxt Image Documentation](https://image.nuxt.com/) - Official @nuxt/image module docs
- [Nuxi Analyze Command](https://nuxt.com/docs/4.x/api/commands/analyze) - Official bundle analysis tool
- [Cloudflare R2 Cache Documentation](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/) - Edge caching strategies
- [Core Web Vitals Thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) - Official Google standards
- [Lighthouse CI GitHub](https://github.com/GoogleChrome/lighthouse-ci) - Official automation tooling

### Secondary (MEDIUM confidence)
- [Nuxt 4 Performance Optimization Guide (MasteringNuxt)](https://masteringnuxt.com/blog/nuxt-4-performance-optimization-complete-guide-to-faster-apps-in-2026) - Community guide with verified techniques
- [Cloudflare Pages TTFB Improvements](https://blog.cloudflare.com/how-we-decreased-pages-latency/) - Official Cloudflare blog post
- [Core Web Vitals 2026 Guide (Sky SEO)](https://skyseodigital.com/core-web-vitals-optimization-complete-guide-for-2026/) - Updated threshold reference
- [Lazy Hydration in Nuxt (Vue School)](https://vueschool.io/articles/vuejs-tutorials/lazy-hydration-and-server-components-in-nuxt-vue-js-3-performance/) - Educational resource
- [Build Analysis in Nuxt DevTools (DeepWiki)](https://deepwiki.com/nuxt/devtools/4.4-build-analysis) - DevTools documentation

### Tertiary (LOW confidence)
- [Performance Anti-Patterns (WodeXWeb)](https://wodexweb.com/website-speed-optimization-google-rank/) - General web performance advice, needs validation
- [Bundle Optimization Strategies (Cutting the Fat - Medium)](https://medium.com/@roshannavale7/cutting-the-fat-bundle-size-optimization-and-lazy-loading-strategies-for-modern-web-apps-f9b67dcec523) - Community patterns, not Nuxt-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Nuxt documentation, verified module ecosystem
- Architecture patterns: HIGH - Extracted from official docs and real-world implementations
- Pitfalls: MEDIUM - Based on community experience and search console data (39% Core Web Vitals pass rate)
- R2 integration: MEDIUM - Cloudflare docs available but @nuxt/image R2 provider unclear
- Lighthouse CI setup: MEDIUM - Standard tool but Cloudflare Pages integration needs testing

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (30 days - stable domain, frameworks evolve slowly)

**Current project state:**
- Bundle size: ~2.35 MB total, 686 kB gzipped (175 KB largest client chunk)
- KV caching: Already implemented with tiered TTLs (300s-86400s)
- Image handling: Custom R2 URLs with native lazy loading
- No Lighthouse CI or bundle analysis in place
- No @nuxt/image or @nuxt/fonts modules installed
