---
phase: 18-favorites-polish
plan: 01
subsystem: ui
tags: [vue, nuxt, favorites, heart-cta, optimistic-ui]

# Dependency graph
requires:
  - phase: 13-favorites
    provides: useFavorites composable with optimistic toggle and server sync
provides:
  - FavoriteButton size prop (sm/lg variants)
  - Prominent Save/Saved CTA on recipe detail page metadata bar
affects: [favorites-polish, recipe-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ClientOnly wrapper for client-auth-dependent components on SSR pages
    - FavoriteButton size prop for context-appropriate rendering (card overlay vs detail page)

key-files:
  created: []
  modified:
    - app/components/FavoriteButton.vue
    - app/pages/recipe/[slug].vue

key-decisions:
  - "FavoriteButton lg variant uses two conditional <button> elements (v-if/v-else on sizeVariant) to keep sm template unchanged and avoid class complexity"
  - "ClientOnly wraps FavoriteButton on detail page — auth state (requiresAuth) is client-only, SSR would render wrong state"
  - "ml-auto on FavoriteButton in flex-wrap row pushes button right when other badges are present"

patterns-established:
  - "Pattern: Wrap auth-reactive components in <ClientOnly> on server-rendered detail pages"

requirements-completed: [FAV-01, FAV-04]

# Metrics
duration: 1min
completed: 2026-02-19
---

# Phase 18 Plan 01: Favorites Polish Summary

**FavoriteButton enhanced with sm/lg size variants; recipe detail page now has a right-aligned Save/Saved heart CTA with optimistic toggle in the metadata bar**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-19T09:54:51Z
- **Completed:** 2026-02-19T09:56:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- FavoriteButton receives optional `size` prop (`'sm'` default unchanged, `'lg'` for detail page)
- `lg` variant renders a pill button with `w-6 h-6` heart icon + "Save"/"Saved" text label, `px-4 py-2.5` padding, `border` styling
- `lg` favorited state: `bg-red-50 border-red-200 text-red-600` for strong visual reinforcement
- `lg` hover state: `hover:border-red-200 hover:text-red-500` subtle red preview
- Scale animation: `transition-all duration-200 motion-safe:active:scale-95`
- Recipe detail page metadata bar now includes `<ClientOnly><FavoriteButton :recipe-id="recipeId" size="lg" /></ClientOnly>` with `ml-auto` right-alignment
- Anonymous users clicking the heart are redirected to `/login` (existing auth gate preserved)
- Build passes cleanly (`npx nuxi build` successful)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add size variant to FavoriteButton and place prominent CTA on recipe detail page** - `bf483d7` (feat)

**Plan metadata:** _(TBD — created after this summary)_

## Files Created/Modified
- `app/components/FavoriteButton.vue` - Added `size` prop, `sm` variant unchanged, new `lg` variant with text label + larger icon + state-based coloring
- `app/pages/recipe/[slug].vue` - Added `<ClientOnly><FavoriteButton :recipe-id="recipeId" size="lg" class="ml-auto" /></ClientOnly>` in metadata badges flex row

## Decisions Made
- Two-element template (v-if/v-else on `sizeVariant`) keeps `sm` template byte-for-byte identical to original, avoiding accidental regressions on RecipeCard usage
- `ClientOnly` wrapper on detail page: `requiresAuth` is computed from client-only auth state; without it SSR would render the button in the wrong auth state
- `ml-auto` right-aligns the CTA within the flex-wrap row, regardless of how many cuisine/dietary tags are present

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript typecheck reports two pre-existing errors in `GenerationProgress.vue` and `generate.post.ts` (unrelated to this plan's changes). These are out-of-scope pre-existing issues — deferred per scope boundary rules. Build still succeeds.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- FAV-01 and FAV-04 requirements satisfied: Save CTA is clearly visible on detail page, toggles optimistically, persists via existing server API
- Phase 18 Plan 02 (favorites page improvements) can proceed — `favorites.vue` has uncommitted enhancements (inline remove + TransitionGroup animation) ready for that plan
- Pre-existing TypeScript errors in GenerationProgress.vue and generate.post.ts should be addressed in a future cleanup plan

## Self-Check: PASSED

- FOUND: app/components/FavoriteButton.vue
- FOUND: app/pages/recipe/[slug].vue
- FOUND: .planning/phases/18-favorites-polish/18-01-SUMMARY.md
- FOUND: commit bf483d7 (feat(18-01): add size variant to FavoriteButton and prominent CTA on recipe detail)
- FOUND: commit 8eccfd5 (docs(18-01): complete FavoriteButton size variants + recipe detail heart CTA plan)

---
*Phase: 18-favorites-polish*
*Completed: 2026-02-19*
