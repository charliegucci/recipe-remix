# Project State: Recipe Remix Engine

## Current Position

- **Milestone:** v1.0
- **Phase:** 5 of 6 (Fusion Intelligence and Polish) - In Progress
- **Plan:** 2 of ? complete (05-02)
- **Status:** Phase 5 In Progress — Completed "Why This Works" Explanation
- **Last activity:** 2026-02-11 - Completed 05-02-PLAN.md ("Why This Works" Explanation)

**Progress:** [████████████████████] 23/? total plans (Phase 5: 2/?)

## Progress

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 1 | Foundation | 4/4 | Complete |
| 2 | Core Read Path | 6/6 | Complete |
| 3 | Pantry and User Features | 5/5 | Complete |
| 4 | AI Generation Pipeline | 6/6 | Complete |
| 5 | Fusion Intelligence and Polish | 2/? | In Progress |
| 6 | Observability and Hardening | 0/? | Pending |

## Phase 1 Deliverables

Foundation complete with:
- Nuxt 4 + NuxtHub + Cloudflare D1/R2/KV
- Tailwind CSS v4 with mobile-first responsive design
- Drizzle ORM with auth schema (users, sessions, accounts, verifications)
- Better Auth with email/password + anonymous user support
- Responsive app shell (header, layout, footer)
- Auth UI (login, register, guest flow)

All success criteria verified:
- USER-01: Sign up with email/password
- USER-02: Login persists across browser close (7-day session)
- USER-03: Guest access without blocking
- INFR-01: Responsive layout, no horizontal scroll at 320px

## Phase 2 Deliverables

Core Read Path complete with:
- Database schema for recipes, ingredients, steps, categories
- Recipe API with browse and detail endpoints
- RecipeCard and RecipeCardSkeleton components
- IngredientChecklist and StepCard interactive components
- Home page with FeaturedCarousel and infinite scroll category sections
- Recipe detail page with SSR data fetching

## Phase 3 Deliverables

Phase 3 complete with:
- Database schema extension (6 new tables for pantry and user features)
- Curated ingredient master list (~305 items with categories)
- Ingredient autocomplete with 300ms debounce
- Pantry management with hybrid storage (localStorage for guests, API for authenticated)
- Dietary restrictions toggle interface
- Favorites CRUD with optimistic UI and heart toggle button
- History tracking with fire-and-forget recording
- Recipe ratings and reviews (1-5 stars with text reviews)
- FavoriteButton integrated into RecipeCard
- Favorites and History pages with auth gates
- Pantry-to-recipe matching with >= 50% match threshold
- Automatic guest data migration on account creation

**Completed Plans:**
- 03-01: Database Schema Extension
- 03-02: Pantry UI
- 03-03: Favorites and Ratings UI
- 03-04: Recipe Ratings and Reviews System
- 03-05: Pantry Matching and Guest Migration

## Phase 4 Deliverables

Phase 4 complete (6/6 plans):
- Database schema extension (2 new tables: analytics_events, generation_history)
- Ingredient validation utility with 3-tier matching (exact, substring, commonNames)
- USDA food safety temperature injection for protein ingredients
- Dietary restriction checking for 5 restriction types (vegetarian, vegan, gluten-free, dairy-free, nut-free)
- Module-level ingredient caching with 5-minute TTL
- AI recipe generation endpoint (POST /api/recipes/generate)
- Workers AI integration via Llama 3.1 70B model
- Structured LLM prompting with JSON schema enforcement
- Multi-layer validation pipeline (ingredients, dietary, safety)
- Generation history tracking with status updates
- Image generation utility using flux-1-schnell text-to-image model
- Standalone image generation endpoint (POST /api/recipes/:id/image)
- Best-effort fire-and-forget image generation in generate pipeline
- R2 blob storage for AI-generated images
- Fire-and-forget analytics event logging utility
- Client-side event ingestion endpoint (POST /api/analytics/events)
- Analytics dashboard with generation and interaction metrics (GET /api/analytics/dashboard)
- KV-cached dashboard data with 5-minute TTL

**Completed Plans:**
- 04-01: Database Schema and Safety Utilities
- 04-02: AI Recipe Generation Endpoint
- 04-03: Image Generation Endpoint
- 04-04: Analytics Event Logging
- 04-05: Generation UI with Cuisine Picker and Progress Indicator
- 04-06: AI Badge, Image Display, and Analytics Integration

Additional Phase 4 deliverables (04-05, 04-06):
- Generation page (/generate) with ingredient selector and cuisine picker
- Progress indicator with polling for generation status
- Resume support for in-progress generations
- AI-generated badge (purple sparkle) on RecipeCard and recipe detail page
- Safety Note amber callout styling in recipe instructions (SAFE-03)
- Generate Image button for AI recipes missing images
- Fire-and-forget recipe view analytics
- Analytics event logging at all generation success/failure paths

## Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Nuxt 4 via compatibility layer | Nuxt 4 stable not yet released; use future.compatibilityVersion: 4 | 01-01 |
| Tailwind v4 with Vite plugin | Better Vite integration than PostCSS approach | 01-01 |
| Assets in app/ directory | Nuxt 4 structure places assets under app/ | 01-01 |
| Integer mode:timestamp for dates | SQLite has no native datetime; Drizzle handles conversion | 01-02 |
| Include verifications table | Prepares for future email verification | 01-02 |
| Request-scoped DB access pattern | Use useDrizzle(event) within handlers, never at module scope | 01-02 |
| Lazy auth initialization via getAuth() | D1 bindings only available within request handlers, not at module scope | 01-03 |
| Auth server in server/lib/, client in app/lib/ | Nuxt 4 separates client (app/) from server (server/) directories | 01-03 |
| Migrations in server/database/migrations | NuxtHub default path for automatic migration detection | 01-03 |
| window.location.href for post-auth redirects | navigateTo() doesn't trigger full reload, causing stale session cookie state | 01-04 |
| NUXT_PUBLIC_AUTH_URL env var for baseURL | Clean production configuration without hardcoded URLs | 01-04 |
| Native <img loading="lazy"> over NuxtImg | NuxtImg broken on Cloudflare Pages per research | 02-03 |
| Desktop-only hover overlays | Hover states don't work well on mobile touch devices | 02-03 |
| Tailwind animate-pulse for skeletons | Simpler than custom keyframes, recommended in research | 02-03 |
| localStorage keys scoped by recipe ID | Independent recipe state for multi-recipe workflows | 02-04 |
| SSR-safe localStorage pattern | ref({}) initialization, localStorage read in onMounted() | 02-04 |
| Entire StepCard tappable | Better mobile UX than checkbox-only interaction | 02-04 |
| Relative imports for server modules | Use ../../ instead of ~/ for server-side imports | 02-02 |
| Server-side JSON parsing | Parse SQLite JSON fields before returning from API | 02-02 |
| Tiered KV caching strategy | Different TTLs based on update frequency (5min/1hr/24hr) | 02-02 |
| Hand-rolled carousel | Custom carousel implementation without external library | 02-05 |
| Window scroll target | Use window as infinite scroll target for stacked sections | 02-05 |
| Auto-advance carousel | Auto-advance every 5 seconds with manual reset | 02-05 |
| Composite PK for junction tables | Natural composite key (userId, recipeId) with separate indexes | 03-01 |
| Curated ingredient list | ~305 items vs external API for faster autocomplete, no rate limits | 03-01 |
| Batch inserts for D1 | 50 items per batch to respect D1 row limits per statement | 03-01 |
| JSON for commonNames | TEXT field with default '[]' for ingredient search aliases | 03-01 |
| Hybrid storage for pantry/dietary | Guest users use localStorage, authenticated users use D1 via API | 03-02 |
| 300ms debounce for autocomplete | Reduces API calls while maintaining perceived responsiveness | 03-02 |
| Individual inserts for local D1 seed | Batch inserts fail in local D1 development environment | 03-02 |
| Upsert via check-then-insert/update | Drizzle onConflictDoUpdate requires unique constraint, we have index only | 03-04 |
| Half-star display for average ratings | Visual precision (4.3 shows as 4.5) using CSS clip-path | 03-04 |
| Public review list endpoint | Anyone can read reviews, only authenticated users can write | 03-04 |
| Reduced KV cache TTL for recipe detail | 5min instead of 1hr for review data freshness | 03-04 |
| Optimistic UI for favorite toggle | Instant feedback improves perceived performance | 03-03 |
| Client-only FavoriteButton rendering | Avoid SSR hydration mismatch with reactive state | 03-03 |
| Fire-and-forget history recording | View tracking is non-critical, shouldn't block navigation | 03-03 |
| Favorites use Set for O(1) lookup | isFavorite check called frequently in recipe lists | 03-03 |
| In-memory filtering for recipe matching | < 10k recipes fits in memory, simpler than complex SQL | 03-05 |
| Substring matching both directions | Handles ingredient variations (chicken vs chicken breast) | 03-05 |
| >= 50% match threshold | Balance between showing matches and filtering low-quality results | 03-05 |
| Client-side migration trigger | watchEffect detects anonymous -> authenticated transition | 03-05 |
| 500ms debounce for match fetching | Reduces API calls while user adds multiple ingredients | 03-05 |
| Match cache key via MD5 hash | Hash of ingredients+restrictions for efficient KV lookup | 03-05 |
| Module-level ingredient cache with 5-minute TTL | 305 ingredients fit in memory, reduces DB queries for validation | 04-01 |
| Substring matching both directions for ingredients | Handles variations like "chicken" vs "chicken breast" consistently with Phase 3 | 04-01 |
| Post-generation dietary check (not pre-filtering) | Allows AI flexibility, catches violations after generation with explicit user warning | 04-01 |
| Temperature injection via instruction modification | Non-invasive addition to existing steps, preserves AI-generated recipe structure | 04-01 |
| NuxtHub AI integration via hubAI() | Native Workers AI access through NuxtHub abstraction for seamless dev/prod | 04-02 |
| Llama 3.1 70B model selection | Good balance of capability and cost for structured recipe generation (2048 token limit) | 04-02 |
| Single retry on parsing failure | Balance user wait time vs success rate (~90% success with stricter second prompt) | 04-02 |
| 'surprise' cuisine random selection | Server-side picks 2 random cuisines for user delight and exploration | 04-02 |
| Standalone endpoint as primary path for image generation | Cloudflare Workers fire-and-forget promises may not complete after response sent | 04-03 |
| Best-effort fire-and-forget in generate pipeline | Attempt automatic image generation, but don't rely on it - frontend uses standalone endpoint as fallback | 04-03 |
| No regeneration if imageKey exists | Images are expensive to generate - avoid duplicates | 04-03 |
| flux-1-schnell model for image generation | Fast high-quality food photography generation | 04-03 |
| Fire-and-forget with void operator | Analytics must never block user-facing operations; use void to explicitly mark promise as intentionally ignored | 04-04 |
| Client event type whitelist | Only allow safe events from browser (viewed/favorited); server-side events (generated/failed) use direct utility calls | 04-04 |
| Try-catch wraps sync errors | Drizzle query builder construction can throw sync errors before promise chain starts; catch both sync and async failures | 04-04 |
| Dashboard requires auth but views don't | Anyone can log views (including guests), but only authenticated users should see aggregated analytics | 04-04 |
| 5-minute dashboard cache TTL | Dashboard data doesn't need real-time updates; 5 min balances freshness and performance | 04-04 |
| Graceful degradation for whyThisWorks | Defaults to empty string if missing or under 20 chars — no hard errors | 05-02 |
| Conditional AI content display | WhyThisWorks only shown for AI-generated recipes with non-null explanation | 05-02 |

## Patterns Established

| Pattern | Description | Phase |
|---------|-------------|-------|
| Request-scoped D1 | hubDatabase() only callable within request handlers | 01-02 |
| Lazy initialization | Use getAuth() getter instead of module-scope auth instance | 01-03 |
| Nuxt 4 directory structure | Client code in app/, server code in server/ | 01-03 |
| Post-auth redirect | Use window.location.href not navigateTo() for session cookies | 01-04 |
| Mobile-first responsive | Unprefixed Tailwind classes for mobile, sm:/md:/lg: for larger screens | 01-04 |
| Image-forward card design | Pinterest/Instagram style with large hero images | 02-03 |
| Skeleton loading states | Match component dimensions exactly to prevent layout shift | 02-03 |
| SSR-safe localStorage | Initialize reactive state as empty, populate from localStorage only in onMounted() hook | 02-04 |
| Recipe-scoped state keys | Use pattern `recipe:${recipeId}:${feature}` for localStorage keys | 02-04 |
| Touch-friendly components | min-h-12 tap targets, entire card clickable, visual feedback on interaction | 02-04 |
| KV read-through cache | Check KV first, query D1 on miss, cache result with TTL | 02-02 |
| Infinite scroll pattern | @vueuse/core useInfiniteScroll with window target and canLoadMore guard | 02-05 |
| SSR parallel fetching | Promise.all for concurrent data fetching in useAsyncData | 02-05 |
| Junction table pattern | Composite PK + separate indexes on frequently-queried columns | 03-01 |
| Seed endpoint pattern | Check existing count, skip if seeded, batch inserts, return stats | 03-01 |
| Hybrid storage pattern | Guest/localStorage, auth/API - unified interface via composable | 03-02 |
| Debounced autocomplete | VueUse refDebounced with loading state for query ahead of debounce | 03-02 |
| Readonly vs interactive component modes | Components support both display-only and editable modes via props | 03-04 |
| Component ref exposure | Use defineExpose to expose methods (refresh) to parent components | 03-04 |
| Aggregate queries in single call | Combine AVG and COUNT in one query for efficiency | 03-04 |
| Optimistic UI pattern | Immediate state update, API call, revert on error | 03-03 |
| Client-only component guards | Use mounted ref to prevent SSR hydration mismatch | 03-03 |
| Set-based state management | O(1) lookups for frequently-checked state (isFavorite) | 03-03 |
| In-memory recipe filtering | Fetch all records and filter in JS for < 10k rows | 03-05 |
| Session transition detection | watchEffect on session.user.isAnonymous for state changes | 03-05 |
| Automatic data migration | Client detects auth transition, calls migration endpoint, clears localStorage | 03-05 |
| Match caching with hash keys | MD5 hash of query params for deterministic cache keys | 03-05 |
| Graceful parser degradation | Optional LLM fields default to safe values instead of erroring | 05-02 |

## Concerns

(None)

## Session Continuity

- **Last session:** 2026-02-11
- **Stopped at:** Completed 05-02-PLAN.md ("Why This Works" Explanation)
- **Resume file:** None

---
*Last updated: 2026-02-11*
