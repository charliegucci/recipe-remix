---
phase: 13-hero-slider-images
plan: 01
subsystem: api
tags: [r2, blob-storage, nuxt-hub, drizzle, seed, images]

# Dependency graph
requires:
  - phase: 13-hero-slider-images
    provides: phase scaffolding and plan definition
provides:
  - seed-images endpoint that downloads curated Unsplash images and uploads to R2 at recipes/featured/{id}.jpg
  - null imageKeys in seed data for featured recipes (blob paths set at runtime by _seed-images)
affects: [FeaturedCarousel.vue, hero slider, any code reading recipe imageKey]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fetch Unsplash image as ArrayBuffer, convert to Uint8Array, upload via hubBlob().put()"
    - "Title-to-URL map for matching featured recipes to their curated images"
    - "Graceful skip pattern: log warning, add to skipped list, continue loop"

key-files:
  created:
    - server/api/_seed-images.post.ts
  modified:
    - server/api/_seed.post.ts

key-decisions:
  - "Featured recipes use null imageKey in seed data; _seed-images is the authoritative source that populates real blob paths"
  - "R2 blob path pattern: recipes/featured/{recipeId}.jpg (UUID-based, not slug-based)"
  - "Image fetch failures are non-fatal: each recipe error is logged and recorded in response, other recipes continue"

patterns-established:
  - "Seed image upload: fetch URL -> ArrayBuffer -> Uint8Array -> hubBlob().put() with contentType: image/jpeg"
  - "KV cache invalidation after seed operations: hubKV().del('recipes:featured') in try/catch"

# Metrics
duration: 5min
completed: 2026-02-17
---

# Phase 13 Plan 01: Seed Images Endpoint Summary

**R2 seed-images endpoint that downloads 5 curated Unsplash food photos and stores them at `recipes/featured/{id}.jpg`, with null imageKeys in seed data pending upload**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-17T09:46:35Z
- **Completed:** 2026-02-17T09:51:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `_seed-images.post.ts` endpoint that fetches 5 curated Unsplash images and uploads to R2 via `hubBlob().put()`, updating D1 `imageKey` for each featured recipe
- Updated `_seed.post.ts` to set `imageKey: null` for all 5 featured recipes, removing hardcoded external Unsplash URLs
- Added KV cache invalidation (`recipes:featured`) so the carousel immediately picks up new imageKeys after upload

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seed-images endpoint that uploads curated food photos to R2** - `3dc54d4` (feat)
2. **Task 2: Update seed data to use blob paths for featured recipe imageKeys** - `271ac1e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `server/api/_seed-images.post.ts` - Endpoint that downloads curated Unsplash images and uploads to R2 blob storage, updates D1 imageKey, invalidates KV cache
- `server/api/_seed.post.ts` - Updated to set `imageKey: null` for 5 featured recipes; updated comment to reference _seed-images

## Decisions Made

- Featured recipes use `null` imageKey in seed data rather than hardcoded blob paths, because the actual blob path uses the recipe's runtime-generated UUID. The `_seed-images` endpoint is the authoritative source.
- R2 path uses `recipes/featured/{recipeId}.jpg` (UUID-based, matches how AI-generated images use `recipes/ai-generated/{id}.png`)
- Image fetch failures are non-fatal per recipe — each error is recorded in response, loop continues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing type errors exist in unrelated files (`user/favorites`, `user/pantry`, `food-safety.ts`, `image-generation.ts`) but are not introduced by this plan. The new `_seed-images.post.ts` file has zero type errors.

## User Setup Required

None - no external service configuration required. To use this endpoint after seeding: `POST /_seed` then `POST /_seed-images`.

## Next Phase Readiness

- `_seed-images` endpoint is ready to call after seeding
- Featured recipes will have null imageKey until `POST /_seed-images` is called
- Plan 02 can now update the FeaturedCarousel to handle null imageKeys (gradient fallback) and use blob paths for display

## Self-Check: PASSED

- FOUND: server/api/_seed-images.post.ts
- FOUND: server/api/_seed.post.ts
- FOUND: .planning/phases/13-hero-slider-images/13-01-SUMMARY.md
- FOUND commit 3dc54d4 (feat: add seed-images endpoint)
- FOUND commit 271ac1e (feat: update seed data null imageKeys)

---
*Phase: 13-hero-slider-images*
*Completed: 2026-02-17*
