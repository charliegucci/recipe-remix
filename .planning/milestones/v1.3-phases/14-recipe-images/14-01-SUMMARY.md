---
phase: 14-recipe-images
plan: 01
subsystem: api
tags: [workers-ai, flux-1-schnell, r2, blob-storage, d1, kv, seed, image-generation]

# Dependency graph
requires:
  - phase: 13-hero-slider-images
    provides: generateAndStoreImage utility, buildImagePrompt helper, hubBlob/hubAI/hubKV patterns
provides:
  - _seed-recipe-images endpoint generating AI images for 22 non-featured curated recipes
  - Curated blob path pattern: recipes/curated/{id}.png
  - Updated _seed.post.ts with all 27 recipes starting at imageKey null
affects: [14-02, phase-15, recipe-display-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline Workers AI call with curated blob path (recipes/curated/{id}.png) instead of importing generateAndStoreImage which hardcodes ai-generated path"
    - "Per-recipe KV invalidation (recipe:{id}) plus paginated list cache invalidation after bulk image generation"
    - "200ms rate limiting delay between sequential AI generation calls"

key-files:
  created:
    - server/api/_seed-recipe-images.post.ts
  modified:
    - server/api/_seed.post.ts

key-decisions:
  - "Inline hubAI().run call in _seed-recipe-images instead of importing generateAndStoreImage — avoids overriding ai-generated blob path with curated path"
  - "Curated recipe images stored at recipes/curated/{id}.png — distinct from featured (recipes/featured/{id}.jpg) and ai-generated (recipes/ai-generated/{id}.png)"
  - "All 27 seeded recipes now start with imageKey null — run POST /_seed then POST /_seed-images then POST /_seed-recipe-images to populate R2 fully"

patterns-established:
  - "Seed image endpoints: skip if imageKey already starts with 'recipes/' to avoid duplicate generation"
  - "KV cache invalidation in bulk seed endpoints: del per-recipe key + paginated list keys for all categories"

requirements-completed: [IMG-01]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 14 Plan 01: Recipe Images (Seed Endpoint) Summary

**flux-1-schnell AI image generation endpoint for 22 non-featured curated recipes, storing at recipes/curated/{id}.png in R2 with full KV cache invalidation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T10:56:33Z
- **Completed:** 2026-02-18T10:58:37Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `_seed-recipe-images.post.ts` endpoint that generates AI food photos for all 22 non-featured curated recipes via flux-1-schnell
- Stores images at `recipes/curated/{id}.png` in R2 blob storage and updates D1 imageKey for each recipe
- Updated `_seed.post.ts` so all 27 recipes now start with `imageKey: null` — eliminating all picsum placeholder URLs
- Three-step seeding workflow established: `POST /_seed` → `POST /_seed-images` (featured 5) → `POST /_seed-recipe-images` (non-featured 22)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create _seed-recipe-images endpoint** - `ac34ec8` (feat)
2. **Task 2: Null out non-featured imageKeys in seed data** - `682d1f3` (chore)

## Files Created/Modified

- `server/api/_seed-recipe-images.post.ts` - New endpoint: queries non-featured curated recipes, calls hubAI flux-1-schnell, uploads to recipes/curated/{id}.png, updates D1, invalidates KV caches
- `server/api/_seed.post.ts` - All 22 picsum placeholder URLs replaced with `imageKey: null`; comment updated to document 3-step workflow

## Decisions Made

- **Inline AI call instead of importing generateAndStoreImage:** The shared utility hardcodes `recipes/ai-generated/{id}.png` as the blob path. Since curated recipes need a distinct path (`recipes/curated/{id}.png`), the AI call and blob upload logic was inlined directly in the endpoint.
- **Distinct blob path for curated recipes:** `recipes/curated/{id}.png` (vs `recipes/featured/{id}.jpg` for featured and `recipes/ai-generated/{id}.png` for user-generated). Maintains clear provenance.
- **Skip logic:** Recipes with imageKey already starting with `recipes/` are skipped — safe to call the endpoint multiple times without duplicate generation.
- **KV invalidation scope:** Per-recipe cache (`recipe:{id}`) plus paginated list caches across all 5 categories and 4 pages — covers all recipe list views.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in `server/api/recipes/generate.post.ts` (unrelated to this plan — out of scope per deviation rules). No issues encountered during planned work.

## User Setup Required

After deploying to production, run the following endpoints in order:
1. `POST /_seed` — seeds all 27 recipes with `imageKey: null`
2. `POST /_seed-images` — generates AI images for the 5 featured recipes (`recipes/featured/{id}.jpg`)
3. `POST /_seed-recipe-images` — generates AI images for the 22 non-featured recipes (`recipes/curated/{id}.png`)

Note: Step 3 will take approximately 2-4 minutes (22 sequential AI calls at ~5-8s each with 200ms delays).

## Next Phase Readiness

- AI image generation infrastructure ready for all 27 curated recipes
- Plan 14-02 can now add recipe card image display and fallback handling
- R2 blob paths follow consistent `recipes/{type}/{id}.png` pattern

---
*Phase: 14-recipe-images*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: server/api/_seed-recipe-images.post.ts
- FOUND: server/api/_seed.post.ts (modified)
- FOUND: .planning/phases/14-recipe-images/14-01-SUMMARY.md
- FOUND commit: ac34ec8 (Task 1 - feat)
- FOUND commit: 682d1f3 (Task 2 - chore)
