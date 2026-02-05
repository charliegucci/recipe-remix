# Phase 2: Core Read Path - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Display fully structured recipes from a curated database. Users can browse and read recipes with title, description, ingredients, steps, cooking time, difficulty, and images — served quickly from the edge via KV caching. Recipe search, filtering by pantry, and AI generation belong in other phases.

</domain>

<decisions>
## Implementation Decisions

### Recipe Card Layout
- Image-forward cards — large hero image with title below (Pinterest/Instagram style)
- Rich metadata on each card: image, title, cooking time, difficulty, cuisine tags, brief description
- Hover preview interaction — shows quick info overlay or expanded view on desktop

### Recipe Detail Page
- Interactive checklist for ingredients — tappable checkboxes to mark off as user gathers them
- Card-per-step layout for cooking instructions — each step is its own card/section for focus
- Checkable steps — mark steps complete while cooking to track progress

### Navigation & Discovery
- Featured + categories structure — hero carousel at top with 3-5 featured recipes, then category sections below
- Infinite scroll for loading more recipes within sections
- Major region cuisine categories: Italian, Mexican, Asian, American, Mediterranean (broad categories, not granular)

### Loading & Empty States
- Skeleton cards while loading — gray placeholder cards matching layout for perceived performance
- Cross-promote on empty category — show recipes from other categories user might like
- Graceful image fallback — adjust layout to work without image if loading fails

### Claude's Discretion
- Grid density on desktop (2, 3, or 4 cards per row based on responsive design best practices)
- Recipe image placement on detail page (hero banner, sidebar, or inline — optimize for mobile/responsive)
- Error handling approach for network failures (retry logic, user messaging)
- Skeleton card animation details
- Exact spacing, typography, and visual polish

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned — open to standard approaches for recipe apps with the decisions above guiding implementation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-core-read-path*
*Context gathered: 2026-02-05*
