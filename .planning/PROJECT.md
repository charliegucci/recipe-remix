# Recipe Remix Engine

## What This Is

A web app (mobile-responsive) that generates creative fusion recipes from ingredients you already have. Unlike traditional recipe apps that show you what to cook and send you shopping, Recipe Remix works backwards — you input what's in your fridge, your dietary restrictions, and cuisine preferences, and it creates unexpected fusion recipes combining real recipes with AI-generated culinary mashups.

## Core Value

Users can make delicious, creative meals from ingredients they already have — no shopping required, no "missing 3 ingredients" frustration.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Input ingredients via search/autocomplete
- [ ] Save persistent "My Pantry" list
- [ ] Set dietary restrictions (vegetarian, vegan, gluten-free, dairy-free, nut-free)
- [ ] Select cuisine preferences
- [ ] Generate AI fusion recipes from ingredients
- [ ] Match ingredients to existing recipe database
- [ ] Cross-cuisine combinations (Thai-Italian, Mexican-Japanese mashups)
- [ ] Technique remixing across cuisines
- [ ] Flavor profile matching using culinary science
- [ ] Display step-by-step cooking instructions
- [ ] Show recipe images
- [ ] Display nutritional information
- [ ] Show cooking time and difficulty level
- [ ] Optional user accounts
- [ ] Save favorite recipes (requires account)
- [ ] View cooking history (requires account)
- [ ] Rate and review recipes (requires account)
- [ ] Mobile-responsive design
- [ ] Production-ready error handling
- [ ] Analytics

### Out of Scope

- Photo scanning of fridge/ingredients — deferred to v2
- Voice input — deferred to v2
- Advanced nutritional diets (keto, macro targets, medical diets) — basic categories sufficient for v1
- Monetization/payments — figure out later
- Native mobile apps — web-first, responsive design

## Context

**Target users:** Home cooks who want to use what they have, adventurous foodies seeking creative fusion ideas, budget-conscious cooks avoiding food waste and unnecessary grocery trips.

**Recipe generation approach:** Hybrid model combining:
1. Existing recipe database (source TBD via research — could be API like Spoonacular/Edamam or curated database)
2. AI-generated fusion recipes that combine cross-cultural techniques, ingredient mashups, and flavor science

**The "remix" differentiator:** Not just finding recipes that match ingredients, but generating creative unexpected combinations — Korean-Mexican rice bowls, French techniques on Asian ingredients, flavor profile matching that creates balanced novel dishes.

## Constraints

- **Tech Stack**: Nuxt 4 + Cloudflare ecosystem (Workers, D1, KV, R2, Workflow) — strong preference, open to adjustments if blockers emerge
- **Auth**: Research needed for best auth solution with this Cloudflare stack
- **Quality Bar**: Production-ready v1 — handles real traffic, proper error handling, analytics
- **Platform**: Web app with mobile-responsive design (not native apps)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid recipe approach (DB + AI) | Pure AI risks hallucination; pure DB limits creativity | — Pending |
| Nuxt 4 + Cloudflare stack | User preference for this ecosystem | — Pending |
| Optional accounts | Lower barrier to entry, features unlock with signup | — Pending |
| Defer photo/voice input to v2 | Focus core experience first | — Pending |
| Basic dietary categories only | Keeps v1 scope manageable | — Pending |

---
*Last updated: 2026-02-04 after initialization*
