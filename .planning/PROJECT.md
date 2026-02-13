# Recipe Remix Engine

## What This Is

A full-stack web app that generates creative AI fusion recipes from ingredients you already have. Users input their pantry, dietary restrictions, and cuisine preferences, and the app creates unexpected cross-cuisine mashups — validated for food safety and explained with culinary reasoning. Live at recipe-remix-9fd.pages.dev, built on Nuxt 4 + Cloudflare edge infrastructure with full SEO, polished UX, and performance optimization.

## Core Value

Users can make delicious, creative meals from ingredients they already have — no shopping required, no "missing 3 ingredients" frustration.

## Requirements

### Validated

- Input ingredients via search/autocomplete — v1.0
- Save persistent "My Pantry" list — v1.0
- Set dietary restrictions (vegetarian, vegan, gluten-free, dairy-free, nut-free) — v1.0
- Select cuisine preferences — v1.0
- Generate AI fusion recipes from ingredients — v1.0
- Match ingredients to existing recipe database — v1.0
- Cross-cuisine combinations (Thai-Italian, Mexican-Japanese mashups) — v1.0
- Technique remixing across cuisines — v1.0
- "Why this works" culinary explanations — v1.0
- Display step-by-step cooking instructions — v1.0
- Show AI-generated recipe images — v1.0
- Show cooking time and difficulty level — v1.0
- Scale serving sizes with fraction display — v1.0
- Ingredient substitution with AI suggestions — v1.0
- Optional user accounts (email/password + anonymous) — v1.0
- Save favorite recipes (requires account) — v1.0
- View cooking history (requires account) — v1.0
- Rate and review recipes (requires account) — v1.0
- Mobile-responsive design — v1.0
- Production-ready error handling with D1 retry — v1.0
- Analytics and observability dashboard — v1.0
- Food safety validation (ingredient verification, dietary checks, USDA temperatures) — v1.0
- Production deployment to Cloudflare Pages with all bindings functional — v1.1
- CI/CD with automated production and preview deployments — v1.1
- Smoke tests covering critical user paths — v1.1
- SEO-friendly shareable recipe URLs with slugs — v1.1
- Dynamic meta tags, OG sharing, Recipe JSON-LD schema — v1.1
- Sitemap.xml and canonical URLs — v1.1
- Skeleton loaders and user-friendly error states — v1.1
- Generation progress with time estimates — v1.1
- Page transitions and micro-animations — v1.1
- Mobile touch targets (44px) and responsive UI polish — v1.1
- Image optimization with @nuxt/image (WebP, lazy/eager loading) — v1.1
- Lazy components with hydration directives — v1.1
- CDN edge caching with Cache-Control headers — v1.1
- Lighthouse CI with 95+ performance budget — v1.1

### Active

(No active milestone — ready for v2.0 planning)

### Out of Scope

- Photo scanning of fridge/ingredients — deferred to v2
- Voice input — deferred to v2
- Advanced nutritional diets (keto, macro targets, medical diets) — basic categories sufficient
- Monetization/payments — figure out later
- Native mobile apps — web-first, responsive design
- Flavor-compatibility scoring with confidence indicators — future
- Nutritional information display — not implemented yet
- Trending recipes / social features — future
- Real-time collaboration — not needed for recipe generation
- Multi-language support — English-only for now

## Context

**Shipped v1.1 Test on Production** with 10,768 LOC (TypeScript/Vue/JS/CSS).
**Production URL:** https://recipe-remix-9fd.pages.dev

**Tech stack:** Nuxt 4 (compat layer) + NuxtHub + Cloudflare D1/R2/KV + Drizzle ORM + Better Auth + Tailwind v4 + Workers AI (Llama 3.1 70B + flux-1-schnell) + @nuxt/image.

**Database:** 27 curated recipes across 5 cuisines, 305 canonical ingredients, 14 D1 tables.

**Infrastructure:**
- Cloudflare Pages CI with Git integration (NuxtHub Admin sunset)
- GitHub Actions for production/preview deploys and Lighthouse CI
- CDN edge caching on recipe endpoints (s-maxage with stale-while-revalidate)
- Smoke tests (11 tests) covering critical paths and production bindings

**Architecture highlights:**
- KV read-through caching with tiered TTLs (5min/1hr/24hr)
- Lazy components with hydration directives (hydrate-on-visible/idle)
- @nuxt/image with WebP, responsive sizes, lazy/eager loading strategy
- SSR-safe localStorage patterns with VueUse
- Multi-layer AI validation pipeline (ingredients, dietary, food safety)
- Optimistic UI for user interactions
- SEO: slugs, meta tags, OG images, Recipe JSON-LD, sitemap, canonicals

**Known tech debt (reduced from 7 to 4):**
- ~~NuxtImg broken on Cloudflare Pages~~ — Fixed in v1.1 with IPX provider
- Workers fire-and-forget may not complete (standalone endpoint fallback)
- Ingredient substitutions are session-local only
- k6 load test not automated in CI

## Constraints

- **Tech Stack**: Nuxt 4 + Cloudflare ecosystem (Workers, D1, KV, R2) — validated across 2 milestones
- **Auth**: Better Auth with email/password + anonymous — working well
- **Quality Bar**: Lighthouse CI enforces 95+ performance, LCP ≤2.5s, CLS ≤0.1
- **Platform**: Web app with mobile-responsive design (not native apps)
- **AI Models**: Workers AI (Llama 3.1 70B for text, flux-1-schnell for images)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid recipe approach (DB + AI) | Pure AI risks hallucination; pure DB limits creativity | Good — curated DB for browsing, AI for generation |
| Nuxt 4 + Cloudflare stack | User preference for this ecosystem | Good — edge performance, integrated AI |
| Optional accounts | Lower barrier to entry, features unlock with signup | Good — anonymous auth works well |
| Defer photo/voice input to v2 | Focus core experience first | Good — v1 shipped faster |
| Better Auth for authentication | Supports D1, email/password, anonymous users | Good — seamless integration |
| Llama 3.1 70B for recipe generation | Balance of capability and cost | Good — ~90% first-pass parse success |
| Post-generation validation | Allows AI creativity, catches violations explicitly | Good — clear error messages |
| Fire-and-forget analytics | Never blocks user operations | Good — resilient telemetry |
| Session-local substitutions | Avoids recipe "forks" in DB | Revisit — users may want persistent swaps |
| Cloudflare Pages CI over NuxtHub Admin | NuxtHub Admin sunset Dec 2025 | Good — reliable, standard CI/CD |
| IPX provider for @nuxt/image | R2 serves raw images, no transformation API | Good — WebP conversion works |
| Lazy hydration for below-fold components | Reduce initial JS payload on heavy pages | Good — 6 components deferred |
| CDN edge caching with tiered TTLs | Different endpoints need different freshness | Good — 1hr for detail, 5min for browse |
| Lighthouse CI on PRs only | Save CI minutes, run when code is ready for review | Good — automated performance gate |

---
*Last updated: 2026-02-13 after v1.1 milestone completed*
