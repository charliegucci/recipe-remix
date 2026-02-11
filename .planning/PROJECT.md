# Recipe Remix Engine

## What This Is

A full-stack web app that generates creative AI fusion recipes from ingredients you already have. Users input their pantry, dietary restrictions, and cuisine preferences, and the app creates unexpected cross-cuisine mashups — validated for food safety and explained with culinary reasoning. Built on Nuxt 4 + Cloudflare edge infrastructure.

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

### Active

(None — define in next milestone via `/gsd:new-milestone`)

### Out of Scope

- Photo scanning of fridge/ingredients — deferred to v2
- Voice input — deferred to v2
- Advanced nutritional diets (keto, macro targets, medical diets) — basic categories sufficient
- Monetization/payments — figure out later
- Native mobile apps — web-first, responsive design
- Flavor-compatibility scoring with confidence indicators — future
- Nutritional information display — not implemented in v1
- Social sharing / trending recipes — future

## Context

**Shipped v1.0 MVP** with 9,767 LOC (TypeScript/Vue/JS/CSS) across 160 files.

**Tech stack:** Nuxt 4 (compat layer) + NuxtHub + Cloudflare D1/R2/KV + Drizzle ORM + Better Auth + Tailwind v4 + Workers AI (Llama 3.1 70B + flux-1-schnell).

**Database:** 27 curated recipes across 5 cuisines, 305 canonical ingredients, 8 D1 tables (auth + recipes + pantry + analytics).

**Architecture highlights:**
- KV read-through caching with tiered TTLs (5min/1hr/24hr)
- Fire-and-forget analytics + reliable fallback endpoints
- SSR-safe localStorage patterns with VueUse
- Multi-layer AI validation pipeline (ingredients, dietary, food safety)
- Optimistic UI for user interactions

**Known tech debt (7 items, non-blocking):**
- NuxtImg broken on Cloudflare Pages (using native lazy loading)
- Workers fire-and-forget may not complete (standalone endpoint fallback)
- Ingredient substitutions are session-local only
- k6 load test not automated in CI

## Constraints

- **Tech Stack**: Nuxt 4 + Cloudflare ecosystem (Workers, D1, KV, R2) — validated in v1.0
- **Auth**: Better Auth with email/password + anonymous — working well
- **Quality Bar**: Production-ready with CI gates (bundle size 3MB, Lighthouse 90+)
- **Platform**: Web app with mobile-responsive design (not native apps)
- **AI Models**: Workers AI (Llama 3.1 70B for text, flux-1-schnell for images)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid recipe approach (DB + AI) | Pure AI risks hallucination; pure DB limits creativity | Good — curated DB for browsing, AI for generation |
| Nuxt 4 + Cloudflare stack | User preference for this ecosystem | Good — edge performance, integrated AI |
| Optional accounts | Lower barrier to entry, features unlock with signup | Good — anonymous auth works well |
| Defer photo/voice input to v2 | Focus core experience first | Good — v1 shipped faster |
| Basic dietary categories only | Keeps v1 scope manageable | Good — 5 restriction types sufficient |
| Better Auth for authentication | Supports D1, email/password, anonymous users | Good — seamless integration |
| Llama 3.1 70B for recipe generation | Balance of capability and cost | Good — ~90% first-pass parse success |
| Post-generation validation | Allows AI creativity, catches violations explicitly | Good — clear error messages |
| Fire-and-forget analytics | Never blocks user operations | Good — resilient telemetry |
| Session-local substitutions | Avoids recipe "forks" in DB | Revisit — users may want persistent swaps |

---
*Last updated: 2026-02-11 after v1.0 milestone*
