---
phase: quick-2
plan: 01
subsystem: infra, ui
tags: [ci-cd, seo, nuxthub, blob-storage, github-actions]

# Dependency graph
requires:
  - phase: v1.1
    provides: "Deployed production app with all features"
provides:
  - "All source files reference https://remix-recipe.com"
  - "README reflects v1.1 SHIPPED status with 4 CI badges"
  - "Image components use NuxtHub blob API (/_hub/blob/{key})"
  - "Deploy/preview workflows use correct .output/public directory"
affects: [deployment, seo, images]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NuxtHub blob URL pattern: /_hub/blob/{imageKey}"

key-files:
  created: []
  modified:
    - nuxt.config.ts
    - README.md
    - app/components/FeaturedCarousel.vue
    - app/components/RecipeCard.vue
    - app/pages/history.vue
    - .github/workflows/deploy.yml
    - .github/workflows/preview.yml

key-decisions:
  - "Use /_hub/blob/{key} pattern for all image URLs instead of r2PublicUrl runtime config"
  - "Delete standalone lighthouse.yml since ci.yml already includes lighthouse job"

patterns-established:
  - "Image URL pattern: /_hub/blob/${imageKey} for NuxtHub blob storage access"

# Metrics
duration: 2min
completed: 2026-02-13
---

# Quick Task 2: Fix GitHub Issues #5-#8 Summary

**Replaced production URL with remix-recipe.com, fixed CI/CD output dirs, updated README to SHIPPED status with 4 badges, and unified image URLs to NuxtHub blob API**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-13T02:39:22Z
- **Completed:** 2026-02-13T02:41:14Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Replaced all recipe-remix-9fd.pages.dev references with remix-recipe.com across 9 source files
- Fixed deploy.yml and preview.yml to use .output/public instead of dist
- Deleted duplicate lighthouse.yml workflow
- Added CI Gates and Smoke Tests badges to README (4 total)
- Marked v1.1 as SHIPPED in README with completion date
- Unified all image URL construction to use /_hub/blob/{key} pattern
- Replaced "No image" text fallback with gradient placeholder in FeaturedCarousel
- Build passes successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace production URL and fix CI/CD workflows** - `f82215b` (fix)
2. **Task 2: Update README with shipped status, new URL, and CI badges** - `3a6d529` (docs)
3. **Task 3: Fix image URLs in FeaturedCarousel, RecipeCard, and history page** - `dd50835` (fix)

## Files Created/Modified
- `nuxt.config.ts` - Updated site.url and schemaOrg.identity.url to remix-recipe.com
- `app/pages/index.vue` - Updated ogImage, ogUrl, and canonical href
- `app/pages/favorites.vue` - Updated canonical href
- `app/pages/history.vue` - Updated canonical href and image src to /_hub/blob pattern
- `app/pages/pantry.vue` - Updated canonical href
- `app/pages/generate.vue` - Updated canonical href
- `app/pages/recipe/[slug].vue` - Updated siteUrl const
- `public/robots.txt` - Updated sitemap URL
- `.planning/STATE.md` - Updated production URL
- `.github/workflows/deploy.yml` - Changed dist to .output/public
- `.github/workflows/preview.yml` - Changed dist to .output/public
- `.github/workflows/lighthouse.yml` - DELETED (duplicate of ci.yml lighthouse job)
- `README.md` - Added 2 CI badges, marked v1.1 SHIPPED, updated production URL
- `app/components/FeaturedCarousel.vue` - Replaced r2PublicUrl with /_hub/blob, gradient fallback
- `app/components/RecipeCard.vue` - Replaced r2PublicUrl with /_hub/blob

## Decisions Made
- Used `/_hub/blob/{key}` pattern for all image URLs, matching the existing pattern in generate.vue, instead of relying on unset r2PublicUrl runtime config
- Deleted standalone lighthouse.yml since the lighthouse job already exists in ci.yml

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Steps
- Configure custom domain remix-recipe.com in Cloudflare/NuxtHub dashboard if not already done
- Consider planning v2.0 milestone

---
*Quick Task: 2*
*Completed: 2026-02-13*
