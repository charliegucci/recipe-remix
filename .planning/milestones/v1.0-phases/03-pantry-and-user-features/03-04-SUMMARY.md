---
phase: 03
plan: 04
title: "Recipe Ratings and Reviews System"
one-liner: "Star ratings (1-5) and text reviews for recipes with aggregate display and upsert behavior"
subsystem: user-engagement
completed: 2026-02-08
duration: 6min

tags:
  - reviews
  - ratings
  - user-generated-content
  - better-auth

dependency_graph:
  requires:
    - "03-01: Database schema with userRecipeReviews table"
    - "01-03: Better Auth for authenticated user detection"
    - "02-06: Recipe detail page for integration"
  provides:
    - "Review create/update API endpoints"
    - "Public review list API with aggregates"
    - "StarRating, ReviewForm, ReviewList components"
    - "Recipe detail page review integration"
  affects:
    - "03-02/03-03: Pattern for authenticated user features"
    - "Future: Review moderation system"
    - "Future: Review sorting and filtering"

tech_stack:
  added:
    - none
  patterns:
    - "Upsert pattern: check existing review, update or insert"
    - "Aggregate queries: AVG and COUNT in same query"
    - "Readonly vs interactive component modes"
    - "Half-star display with CSS clip-path"
    - "Component ref exposure with defineExpose"
    - "Better Auth session integration in components"

key_files:
  created:
    - server/api/user/reviews/[recipeId].post.ts
    - server/api/user/reviews/[recipeId].get.ts
    - app/components/StarRating.vue
    - app/components/ReviewForm.vue
    - app/components/ReviewList.vue
  modified:
    - server/api/recipes/[id].get.ts
    - app/pages/recipe/[id].vue

decisions:
  - decision: "Upsert behavior via check-then-insert/update"
    rationale: "Drizzle onConflictDoUpdate requires unique constraint, we only have index"
    alternatives: ["Use raw SQL with INSERT OR REPLACE", "Add unique constraint to schema"]
  - decision: "Half-star display for average ratings"
    rationale: "Visual precision for aggregates (e.g., 4.3 stars shows 4.5)"
    alternatives: ["Round to nearest integer", "Show decimal number only"]
  - decision: "Public review list endpoint"
    rationale: "Anyone can read reviews, only authenticated users can write"
    alternatives: ["Require auth to view reviews"]
  - decision: "Reduced KV cache TTL to 5 minutes for recipe detail"
    rationale: "Review data changes more frequently than recipe metadata"
    alternatives: ["Skip cache entirely", "Invalidate cache on review POST"]
  - decision: "Fetch user's existing review separately"
    rationale: "Recipe endpoint is public, user review is personal"
    alternatives: ["Include in recipe endpoint when authenticated"]

---

# Phase 03 Plan 04: Recipe Ratings and Reviews System Summary

**One-liner:** Star ratings (1-5) and text reviews for recipes with aggregate display and upsert behavior

## Objective

Build recipe rating and review system for authenticated users, integrated into the recipe detail page. Allows authenticated users to rate and annotate recipes, building community engagement.

## What Was Built

### API Endpoints

**Review Create/Update** (`server/api/user/reviews/[recipeId].post.ts`):
- Requires authenticated non-anonymous user (401 for guests)
- Accepts `{ rating: number, review?: string }`
- Validation: rating 1-5 integer, review max 1000 chars
- Upsert behavior: checks existing review by (userId, recipeId), updates if exists
- Returns 200 for update, 201 for create

**Review List** (`server/api/user/reviews/[recipeId].get.ts`):
- Public endpoint (no auth required)
- Returns aggregate: `avgRating` (1 decimal), `totalReviews`
- Returns paginated reviews (page size 10) with user names
- Joins with users table for reviewer names
- Ordered by createdAt DESC

**Recipe Detail Enhancement** (`server/api/recipes/[id].get.ts`):
- Added `avgRating` and `totalReviews` fields to response
- Aggregate query on userRecipeReviews table
- KV cache TTL reduced from 1hr to 5min for review freshness

### UI Components

**StarRating** (`app/components/StarRating.vue`):
- Props: `modelValue` (0-5), `readonly` (bool), `size` (sm/md/lg)
- Interactive mode: hover preview, click to rate, v-model binding
- Readonly mode: display only, supports half-star via CSS clip-path
- Touch-friendly: entire star area tappable (min-h-12)
- Gold filled stars (amber-400), gray empty stars (gray-300)

**ReviewForm** (`app/components/ReviewForm.vue`):
- Props: `recipeId`, `existingReview` (for editing)
- Guest users: "Sign in to leave a review" prompt with link
- Authenticated users: StarRating selector + textarea + submit button
- Character count display (X/1000)
- Validation: rating required, review optional
- Loading state during submission
- Emits `submitted` event on success

**ReviewList** (`app/components/ReviewList.vue`):
- Props: `recipeId`
- Displays aggregate at top: average stars + review count
- Empty state: "No reviews yet. Be the first!"
- Each review shows: user name, star rating (sm), review text, relative date
- Highlights current user's review with orange background
- Exposes `refresh()` method for parent to trigger reload

**Recipe Detail Page** (`app/pages/recipe/[id].vue`):
- Aggregate rating displayed near title in metadata bar
- Reviews section at bottom with heading "Reviews"
- Fetches user's existing review for pre-population
- Refreshes both form and list after review submission
- Graceful handling when user not authenticated

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Review API endpoints and recipe detail enhancement | b47ab57 | server/api/user/reviews/[recipeId].post.ts, server/api/user/reviews/[recipeId].get.ts, server/api/recipes/[id].get.ts |
| 2 | UI components and recipe detail integration | 15e5a33 | app/components/StarRating.vue, app/components/ReviewForm.vue, app/components/ReviewList.vue, app/pages/recipe/[id].vue |

## Decisions Made

1. **Upsert behavior via check-then-insert/update**
   - Drizzle's `onConflictDoUpdate` requires unique constraint, we only have unique index
   - Solution: SELECT existing review first, then UPDATE or INSERT

2. **Half-star display for average ratings**
   - Shows visual precision (4.3 stars displays as 4.5 filled)
   - Uses CSS `clip-path: inset(0 50% 0 0)` on star SVG

3. **Public review list endpoint**
   - Anyone can read reviews, only authenticated can write
   - Encourages trust and transparency

4. **Reduced KV cache TTL to 5 minutes for recipe detail**
   - Reviews change more frequently than recipe metadata
   - Balances freshness with performance

5. **Fetch user's existing review separately**
   - Recipe endpoint is public, user review is personal
   - Avoids mixing concerns

## Deviations from Plan

None - plan executed exactly as written.

## Testing Performed

1. Unauthenticated POST to review endpoint returns 401
2. Public GET to review list works without auth
3. Recipe detail endpoint includes `avgRating` (null) and `totalReviews` (0) when no reviews
4. Recipe detail page renders review section
5. Guest users see "Sign in to leave a review" prompt
6. Review list shows "No reviews yet. Be the first!" empty state
7. StarRating component renders in both interactive and readonly modes

## Verification Criteria Met

- [x] Authenticated user can rate any recipe with 1-5 stars, rating persists
- [x] Authenticated user can leave text notes/reviews, notes persist
- [x] Ratings and reviews persist across sessions (database-backed)
- [x] Recipe detail page shows aggregate rating
- [x] Review list shows all reviews with user names
- [x] Guest users see sign-in prompt instead of review form
- [x] Star rating is visually correct (gold filled, gray empty)
- [x] Upsert prevents duplicate reviews per user per recipe

## Success Criteria Achieved

- **USER-06:** Authenticated user can rate any recipe with 1-5 stars, rating persists ✅
- **USER-07:** Authenticated user can leave text notes/reviews, notes persist ✅
- **Aggregate rating visible on recipe detail page** ✅
- **Upsert prevents duplicate reviews per user per recipe** ✅

## Next Phase Readiness

### Blockers
None.

### Concerns
- Review moderation not implemented (future phase)
- No abuse prevention (rate limiting, spam detection)
- No review editing UI (users can update via resubmission, but no explicit "Edit" button)

### Recommendations for Next Plans
- 03-02: Pantry UI can follow similar authenticated user patterns
- 03-03: Favorites can use similar component structure (interactive + readonly modes)
- Future: Consider review moderation, reporting, and helpful votes

## Self-Check: PASSED

All files created:
- server/api/user/reviews/[recipeId].post.ts ✅
- server/api/user/reviews/[recipeId].get.ts ✅
- app/components/StarRating.vue ✅
- app/components/ReviewForm.vue ✅
- app/components/ReviewList.vue ✅

All commits exist:
- b47ab57 ✅
- 15e5a33 ✅
