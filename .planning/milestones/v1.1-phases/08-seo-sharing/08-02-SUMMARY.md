---
phase: 08-seo-sharing
plan: 02
subsystem: seo
tags: [nuxt-sitemap, nuxt-schema-org, opengraph, json-ld, schema.org, seo]

# Dependency graph
requires:
  - phase: 08-01
    provides: Slug-based recipe URLs and legacy redirects
provides:
  - Dynamic sitemap.xml with all recipe URLs
  - OpenGraph meta tags for social sharing
  - Recipe JSON-LD structured data for search engines
  - Canonical URLs on all pages
  - robots.txt with sitemap reference
affects: [deployment, social-sharing, search-indexing]

# Tech tracking
tech-stack:
  added: [@nuxtjs/sitemap, nuxt-schema-org]
  patterns: [useServerSeoMeta for SSR meta tags, useSchemaOrg for JSON-LD, ISO 8601 duration formatting]

key-files:
  created:
    - server/api/__sitemap__/urls.ts
    - server/utils/duration-formatter.ts
    - app/utils/duration-formatter.ts
    - public/og-default.svg
    - public/robots.txt
  modified:
    - nuxt.config.ts
    - app/pages/recipe/[slug].vue
    - app/pages/index.vue
    - app/pages/favorites.vue
    - app/pages/pantry.vue
    - app/pages/generate.vue
    - app/pages/history.vue

key-decisions:
  - "Use useServerSeoMeta for server-only meta tag rendering (no client hydration overhead)"
  - "Recipe images use R2 URLs via /api/images/{key}, fallback to og-default.svg for recipes without images"
  - "User-specific pages (favorites, pantry, history, generate) set robots: noindex to prevent indexing of personalized content"
  - "Shared duration-formatter utility in both server/ and app/ for ISO 8601 conversion"
  - "Recipe structured data includes aggregate ratings when available"

patterns-established:
  - "useServerSeoMeta pattern: declare title, description, og:*, twitter:* in one call"
  - "Canonical URL pattern: useHead with link: [{ rel: 'canonical', href: fullUrl }]"
  - "JSON-LD Recipe schema: useSchemaOrg([defineRecipe(...)]) with full ingredient and instruction mapping"
  - "ISO 8601 duration: PT30M, PT1H30M format for cookTime/totalTime"

# Metrics
duration: 4min
completed: 2026-02-12
---

# Phase 8 Plan 2: SEO Meta Tags & Social Sharing Summary

**Dynamic sitemap with 28 recipes, OpenGraph rich previews for social sharing, and Recipe JSON-LD structured data for search discovery**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-12T20:45:47Z
- **Completed:** 2026-02-12T20:49:33Z
- **Tasks:** 2 (1 already completed in 08-01)
- **Files modified:** 13

## Accomplishments
- Dynamic sitemap.xml with all recipe URLs using slug-based paths
- Recipe pages include OpenGraph meta tags with title, description, and images for rich social sharing previews
- Recipe structured data (JSON-LD) with full ingredients, instructions, cook time, and aggregate ratings
- All pages have canonical URLs and appropriate meta tags
- User-specific pages set noindex directive to prevent search indexing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Nuxt SEO modules and configure sitemap** - `7b5466c` (feat) - Already completed in 08-01
2. **Task 2: Add SEO meta tags, OG sharing, Recipe JSON-LD, and canonical URLs** - `7b9c118` (feat)

## Files Created/Modified
- `server/api/__sitemap__/urls.ts` - Dynamic sitemap endpoint querying D1 for recipe slugs with priorities
- `server/utils/duration-formatter.ts` - ISO 8601 duration converter for structured data
- `app/utils/duration-formatter.ts` - Shared duration formatter for page components
- `public/og-default.svg` - Fallback OpenGraph image for recipes without images
- `public/robots.txt` - Sitemap reference and crawl directives
- `nuxt.config.ts` - Sitemap and schema-org module configuration
- `app/pages/recipe/[slug].vue` - Full SEO with useServerSeoMeta, canonical URL, Recipe JSON-LD
- `app/pages/index.vue` - Home page OpenGraph and canonical URL
- `app/pages/favorites.vue` - Basic SEO with noindex
- `app/pages/pantry.vue` - Basic SEO with noindex
- `app/pages/generate.vue` - Basic SEO with noindex
- `app/pages/history.vue` - Basic SEO with noindex

## Decisions Made

**useServerSeoMeta over useHead for meta tags**
- Server-only rendering eliminates client-side hydration overhead
- Better performance for SEO-only meta tags

**R2 image URLs via /api/images/{key} for og:image**
- Existing image infrastructure, no new modules needed
- Fallback to og-default.svg for recipes without images
- Simpler than nuxt-og-image module

**User-specific pages get noindex directive**
- Favorites, pantry, history, generate pages are personalized
- Prevents duplicate content issues and useless indexing

**Shared duration formatter in both server/ and app/**
- Server utility for sitemap generation
- App utility for page component imports (can't import from server/ in pages)
- Identical implementation for consistency

**Recipe JSON-LD includes aggregate ratings when available**
- Rich results eligibility in Google search
- Conditional inclusion prevents invalid empty rating objects

## Deviations from Plan

None - plan executed exactly as written. Task 1 files were already created in the 08-01 plan execution.

## Issues Encountered

None - all modules were already installed and configured from 08-01 plan. Build succeeded on first attempt.

## User Setup Required

None - no external service configuration required. SEO modules work with existing production URL.

## Next Phase Readiness

SEO foundation complete and production-ready:
- Sitemap discoverable at /sitemap.xml
- All recipe pages have complete OpenGraph and JSON-LD
- Social sharing will show rich previews
- Search engines can crawl and index structured recipe data

Ready for UI/UX polish phase (Phase 9).

## Self-Check

Let me verify the key artifacts:

**Created files:**
- server/api/__sitemap__/urls.ts: EXISTS
- server/utils/duration-formatter.ts: EXISTS
- app/utils/duration-formatter.ts: EXISTS
- public/og-default.svg: EXISTS
- public/robots.txt: EXISTS

**Commits:**
- 7b5466c: EXISTS (Task 1 - from 08-01)
- 7b9c118: EXISTS (Task 2)

**Self-Check: PASSED**

---
*Phase: 08-seo-sharing*
*Completed: 2026-02-12*
