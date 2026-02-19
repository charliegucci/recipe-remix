---
phase: 02-core-read-path
plan: 05
subsystem: frontend-ui
completed: 2026-02-05
duration: 1.4min
tags: [vue, carousel, infinite-scroll, ssr, home-page]
requires: [02-02-recipe-api, 02-03-recipe-cards]
provides: [home-page, featured-carousel, category-sections]
affects: [03-pantry-features]
tech-stack:
  added: [@vueuse/core]
  patterns: [infinite-scroll, ssr-data-fetching, hand-rolled-carousel]
key-files:
  created:
    - app/components/FeaturedCarousel.vue
    - app/components/RecipeCategorySection.vue
  modified:
    - app/pages/index.vue
decisions:
  - id: hand-rolled-carousel
    choice: Custom carousel implementation without external library
    rationale: 3-5 slides doesn't need complex virtualization; simpler to maintain
  - id: window-scroll-target
    choice: Use window as infinite scroll target instead of container
    rationale: Stacked category sections work better with window scroll
  - id: auto-advance-carousel
    choice: Auto-advance every 5 seconds with manual reset
    rationale: Improves engagement while allowing user control
---

# Phase 2 Plan 5: Home Page with Featured Carousel Summary

**One-liner:** Recipe discovery home page with auto-advancing featured carousel and 5 cuisine category sections with infinite scroll.

## What Was Built

### Components

**FeaturedCarousel.vue**
- Full-width hero carousel for featured recipes
- Aspect ratios: 16:9 mobile, 21:9 desktop
- Single visible slide with large image
- Title and description overlay with gradient (transparent to black)
- Dot indicators for navigation (filled for active, hollow for inactive)
- Left/right arrow buttons on desktop
- Auto-advance every 5 seconds (resets on manual navigation)
- Transform translateX for smooth slide transitions
- Responsive text sizing and padding

**RecipeCategorySection.vue**
- Section header with category label (h2)
- Responsive grid: 1 column mobile, 2 columns sm, 3 columns lg
- Infinite scroll using @vueuse/core
- Page-based pagination starting at page 1
- Loading state: 3 RecipeCardSkeleton components at bottom
- Empty state: "No recipes in this category yet"
- canLoadMore guard prevents duplicate fetches (hasMore && !loading)
- Window scroll target for better stacked section behavior

**app/pages/index.vue**
- Replaced auth-landing page with recipe browsing experience
- SSR data fetching with useAsyncData('home', ...)
- Parallel Promise.all for featured + 5 category fetches
- FeaturedCarousel at top
- 5 RecipeCategorySection components (Italian, Mexican, Asian, American, Mediterranean)
- Responsive spacing: space-y-8 md:space-y-12
- Container constraints: px-4 md:px-6 lg:px-8, max-w-7xl mx-auto
- SEO: Page title "Recipe Remix - Discover Delicious Recipes"
- Auth CTAs handled by AppHeader (no duplication)

### API Integration

Consumed endpoints from 02-02:
- GET /api/recipes/featured - Featured recipes for carousel
- GET /api/recipes?category=X&page=N - Category recipes with pagination

### Tech Stack Additions

**@vueuse/core**
- Used for `useInfiniteScroll` composable
- Window-based scroll detection with distance threshold (300px)

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create FeaturedCarousel component | b74840b | app/components/FeaturedCarousel.vue |
| 2 | Create RecipeCategorySection with infinite scroll | 661ebc3 | app/components/RecipeCategorySection.vue |
| 3 | Wire home page with SSR data fetching | 8acae1c | app/pages/index.vue |

## Decisions Made

**1. Hand-rolled carousel (no external library)**
- **Context:** Featured section needs 3-5 slides
- **Choice:** Custom implementation with CSS transform + ref for currentIndex
- **Rationale:** Small slide count doesn't justify dependency; simpler to maintain and debug
- **Impact:** Zero bundle size overhead, full control over behavior

**2. Window scroll target for infinite scroll**
- **Context:** Multiple category sections stacked vertically
- **Choice:** `useInfiniteScroll(window, ...)` instead of per-section containers
- **Rationale:** Stacked sections work better with window scroll; simpler scroll detection
- **Trade-offs:** All sections load on same scroll threshold (acceptable with 300px distance)

**3. Auto-advance carousel with reset**
- **Context:** Featured carousel should engage users
- **Choice:** 5-second auto-advance, reset interval on manual navigation
- **Rationale:** Keeps content dynamic while respecting user control
- **Implementation:** setInterval with cleanup in onUnmounted, clearInterval + restart on manual nav

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria met:

1. **FeaturedCarousel:** Shows 3-5 featured recipes with dot navigation and arrows
2. **RecipeCategorySection:** Displays responsive grid (1/2/3 columns) of RecipeCards
3. **Infinite scroll:** Loads additional pages when scrolling near bottom
4. **SSR:** Content delivered in initial HTML payload (no loading spinner on first paint)
5. **Responsive:** Works on mobile (320px) through desktop
6. **Card links:** All cards link to /recipe/:id
7. **Auth CTAs:** Accessible via AppHeader (Sign In/Sign Up/Create Account)

## Success Criteria

- [x] Featured carousel at top
- [x] 5 cuisine sections with infinite scroll
- [x] SSR content on first paint
- [x] Responsive grid (1/2/3 columns)
- [x] Cards link to detail pages
- [x] Auth entry points preserved in AppHeader

## Next Phase Readiness

**Ready for 02-06 (Recipe Detail Page):**
- Home page provides entry point via RecipeCard links
- Navigation to /recipe/:id established
- SSR pattern demonstrated for detail page implementation

**Dependencies for Phase 3 (Pantry Features):**
- Home page provides browsing context
- Auth state already handled by AppHeader
- Pantry link can be added to AppHeader navigation

## Notes

**SSR Performance:**
- Parallel Promise.all fetches all data concurrently
- Featured + 5 categories = 6 API calls in parallel
- Initial page load includes all above-the-fold content

**Infinite Scroll Behavior:**
- Each category section independently manages pagination
- Window scroll triggers checks for all sections
- First section near bottom of viewport loads next page
- hasMore flag prevents fetching when category exhausted

**Carousel Accessibility:**
- Dot buttons have aria-label for screen readers
- Arrow buttons have aria-label (Previous/Next slide)
- Auto-advance pauses on manual interaction (UX improvement)

**Mobile Considerations:**
- Arrow buttons hidden on mobile (touch-unfriendly)
- Dot indicators accessible on all viewports
- Swipe gestures not implemented (future enhancement)

**Auth Flow Simplification:**
- Old index.vue had auth CTAs duplicated in page body
- New index.vue delegates all auth UI to AppHeader
- Cleaner separation: AppHeader = auth, index.vue = content

## Self-Check: PASSED

Created files verified:
- app/components/FeaturedCarousel.vue - EXISTS
- app/components/RecipeCategorySection.vue - EXISTS

Modified files verified:
- app/pages/index.vue - EXISTS

Commits verified:
- b74840b - EXISTS (FeaturedCarousel component)
- 661ebc3 - EXISTS (RecipeCategorySection component)
- 8acae1c - EXISTS (Home page with SSR)
