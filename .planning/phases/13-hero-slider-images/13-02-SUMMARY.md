---
phase: 13-hero-slider-images
plan: 02
subsystem: ui
tags: [vue, blob, nuxtimg, fallback, carousel]

requires:
  - phase: 13-hero-slider-images/01
    provides: seed-images endpoint and null imageKeys for featured recipes
provides:
  - Polished hero slider with gradient fallback for missing/failed images
  - RecipeCard with consistent gradient fallback
  - Public blob image serving route /api/images/[...pathname]
affects: []

tech-stack:
  added: []
  patterns:
    - "Serve blob images via /api/images/ route using hubBlob().serve() — /_hub/blob/ requires auth"
    - "Use plain <img> tags for blob paths — NuxtImg routes through IPX which can't resolve blob storage"

key-files:
  created:
    - server/api/images/[...pathname].get.ts
  modified:
    - app/components/FeaturedCarousel.vue
    - app/components/RecipeCard.vue
    - app/pages/recipe/[slug].vue
    - app/pages/generate.vue
    - app/pages/history.vue

key-decisions:
  - "Created /api/images/ public route instead of /_hub/blob/ — NuxtHub blob GET routes require authorization"
  - "Replaced NuxtImg with plain img for blob paths — IPX image optimizer can't serve blob storage files"

patterns-established:
  - "Blob image serving: /api/images/{blobPath} using hubBlob().serve(event, pathname)"
  - "Gradient fallback: bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 with cookbook icon"

duration: ~15min
completed: 2026-02-17
---

# Plan 13-02: Hero Slider Fallback Summary

**Polished carousel and recipe card with gradient fallback, fixed blob serving via public /api/images/ route**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 7

## Accomplishments
- FeaturedCarousel gradient fallback shows recipe title label below cookbook icon
- RecipeCard replaced gray fallback with matching amber-to-red gradient + error handler
- Created public `/api/images/[...pathname]` endpoint to serve blob images (bypasses NuxtHub auth on `/_hub/blob/`)
- Replaced `<NuxtImg>` with `<img>` for all blob paths (IPX can't resolve blob storage)
- Updated all 5 files referencing `/_hub/blob/` to use `/api/images/`

## Task Commits

1. **Task 1: Harden FeaturedCarousel and RecipeCard image fallback** - `780c738` (feat)
2. **Task 2: Human verification** - approved by user
3. **Fix: Blob serving via public API route** - `b34a8ee` (fix)

## Files Created/Modified
- `server/api/images/[...pathname].get.ts` - Public blob image serving endpoint
- `app/components/FeaturedCarousel.vue` - Gradient fallback with title, plain img for blob
- `app/components/RecipeCard.vue` - Matching gradient fallback, error handler, plain img
- `app/pages/recipe/[slug].vue` - Updated blob path to /api/images/
- `app/pages/generate.vue` - Updated blob path to /api/images/
- `app/pages/history.vue` - Updated blob path to /api/images/

## Decisions Made
- `/_hub/blob/` routes require `requireNuxtHubAuthorization` — created `/api/images/` as a public alternative using `hubBlob().serve()`
- `<NuxtImg>` routes all src through IPX optimizer which can't serve blob paths — switched to plain `<img>` tags

## Deviations from Plan

### Auto-fixed Issues

**1. Blob serving path broken — /_hub/blob/ requires auth**
- **Found during:** Human verification (Task 2)
- **Issue:** `/_hub/blob/` routes include `requireNuxtHubAuthorization` — not accessible from frontend
- **Fix:** Created `server/api/images/[...pathname].get.ts` using `hubBlob().serve()`, updated all references
- **Files modified:** 7 files (1 created, 6 modified)
- **Verification:** User confirmed images load correctly
- **Committed in:** b34a8ee

**2. NuxtImg (IPX) can't resolve blob paths**
- **Found during:** Human verification (Task 2)
- **Issue:** `<NuxtImg>` routes src through IPX image optimizer which returns FILE_NOT_FOUND for blob paths
- **Fix:** Replaced `<NuxtImg>` with plain `<img>` tags for all blob image references
- **Verification:** User confirmed images display correctly
- **Committed in:** b34a8ee (same commit)

---

**Total deviations:** 2 auto-fixed (both blocking)
**Impact on plan:** Essential fixes — images were completely broken without these changes.

## Issues Encountered
- NuxtHub's `/_hub/blob/` GET handler requires authorization — not documented prominently
- `<NuxtImg>` (IPX provider) can't serve internal API routes — well-known limitation per nuxt-hub/core#521

## Next Phase Readiness
- Phase 13 complete — hero slider shows real food photos from R2
- All image fallback paths working with gradient placeholders

---
*Phase: 13-hero-slider-images*
*Completed: 2026-02-17*
