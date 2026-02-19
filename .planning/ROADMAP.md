# Roadmap: Recipe Remix Engine

**Created:** 2026-02-04

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-02-11) | [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Test on Production** — Phases 7-10 (shipped 2026-02-13) | [Archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 CI/CD, Branching & Production Polish** — Phases 11-13 (shipped 2026-02-18) | [Archive](milestones/v1.2-ROADMAP.md)
- 🚧 **v1.3 UX/UI Polish** — Phases 14-18 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-02-11</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-02-05
- [x] Phase 2: Core Read Path (6/6 plans) — completed 2026-02-06
- [x] Phase 3: Pantry and User Features (5/5 plans) — completed 2026-02-08
- [x] Phase 4: AI Generation Pipeline (6/6 plans) — completed 2026-02-10
- [x] Phase 5: Fusion Intelligence and Polish (4/4 summaries) — completed 2026-02-11
- [x] Phase 6: Observability and Hardening (4/4 summaries) — completed 2026-02-11

</details>

<details>
<summary>✅ v1.1 Test on Production (Phases 7-10) — SHIPPED 2026-02-13</summary>

- [x] Phase 7: Deployment + Production Validation (3/3 plans) — completed 2026-02-12
- [x] Phase 8: SEO + Sharing (2/2 plans) — completed 2026-02-13
- [x] Phase 9: UI/UX Polish (3/3 plans) — completed 2026-02-13
- [x] Phase 10: Performance Optimization (3/3 plans) — completed 2026-02-13

</details>

<details>
<summary>✅ v1.2 CI/CD, Branching & Production Polish (Phases 11-13) — SHIPPED 2026-02-18</summary>

- [x] Phase 11: CI/CD Pipeline (4/4 plans) — completed 2026-02-13
- [x] Phase 12: Branching & Production URL (2/2 plans) — completed 2026-02-13
- [x] Phase 13: Hero Slider Images (2/2 plans) — completed 2026-02-18

</details>

### 🚧 v1.3 UX/UI Polish (In Progress)

**Milestone Goal:** Polish the visual experience with real recipe images, engaging generation animations, smart ingredient highlighting with substitution, pantry thumbnails, and working favorites.

- [x] **Phase 14: Recipe Images** - Generate and display AI food photos for all 27 seeded recipes (completed 2026-02-18)
- [x] **Phase 15: Pantry UX** - Add ingredient thumbnail images to pantry list and search results (completed 2026-02-18)
- [x] **Phase 16: Generation UX** - Multi-step progress animation with transitions and time estimates (completed 2026-02-19)
- [ ] **Phase 17: Ingredient Highlighting** - Visual distinction and substitution flow for missing ingredients
- [ ] **Phase 18: Favorites Polish** - Functional save/remove CTA, favorites page, and session persistence

## Phase Details

### Phase 14: Recipe Images
**Goal**: Every seeded recipe has a real AI-generated food photo visible throughout the app
**Depends on**: Phase 13 (R2 blob storage + /api/images/ route established)
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04
**Success Criteria** (what must be TRUE):
  1. All 27 seeded recipes have an AI-generated food photo stored in R2 (no placeholder gradient)
  2. Recipe cards on /recipes display real recipe images instead of gradient fallbacks
  3. Hero slider shows actual recipe photos (no more placeholder images)
  4. When an image fails to load or is missing, a graceful gradient fallback renders (no broken img tags)
**Plans**: 2 plans

Plans:
- [ ] 14-01-PLAN.md — Create _seed-recipe-images endpoint for 22 non-featured recipes + null out imageKeys in seed data
- [ ] 14-02-PLAN.md — Audit and harden image display pipeline, human verify real photos in cards and hero slider

### Phase 15: Pantry UX
**Goal**: Ingredient list and search feel visual and tactile — each ingredient has a recognizable thumbnail
**Depends on**: Phase 14 (image infrastructure established)
**Requirements**: PNTR-01, PNTR-02
**Success Criteria** (what must be TRUE):
  1. Every ingredient in My Pantry displays a small thumbnail image next to its name
  2. Ingredient search results show a thumbnail image alongside each result before the user adds it
  3. Thumbnails load without breaking the pantry layout on mobile or desktop
**Plans**: 1 plan

Plans:
- [ ] 15-01-PLAN.md — Add emoji-based ingredient thumbnails to pantry list and search autocomplete

### Phase 16: Generation UX
**Goal**: Recipe generation feels alive and informative — users see exactly what's happening and how long it will take
**Depends on**: Phase 14 (generation pipeline complete)
**Requirements**: GENX-01, GENX-02, GENX-03
**Success Criteria** (what must be TRUE):
  1. During generation, users see at least three named steps (Crafting recipe, Validating ingredients, Generating photo) with the active step highlighted
  2. Each step transition has a distinct visual animation (not just a text change)
  3. Each active step shows an estimated time remaining (e.g., "~8s remaining")
**Plans**: 1 plan

Plans:
- [ ] 16-01-PLAN.md — Multi-step generation progress with per-step animations and countdown timers

### Phase 17: Ingredient Highlighting
**Goal**: After generation, users immediately know which ingredients they're missing and can swap them out without leaving the recipe
**Depends on**: Phase 16 (generation result page is the interaction surface)
**Requirements**: INGR-01, INGR-02, INGR-03, INGR-04
**Success Criteria** (what must be TRUE):
  1. Ingredients not in the user's pantry are visually distinguished from pantry ingredients (color or badge) on the recipe result page
  2. Tapping a missing ingredient reveals a substitution panel or popover
  3. The substitution panel shows AI-suggested replacements sourced from the user's actual pantry contents
  4. User can select a pantry item as a manual replacement, updating the ingredient display on the recipe
**Plans**: TBD

Plans:
- [ ] 17-01: Add missing-ingredient detection and visual highlighting to recipe result page
- [ ] 17-02: Build substitution panel with AI suggestions and manual pantry-pick selection

### Phase 18: Favorites Polish
**Goal**: Saving and revisiting favorite recipes works reliably — users can build a personal collection and manage it
**Depends on**: Phase 17 (recipe result page is complete)
**Requirements**: FAV-01, FAV-02, FAV-03, FAV-04
**Success Criteria** (what must be TRUE):
  1. Recipe detail page shows a clearly visible heart/bookmark CTA that toggles save/remove with optimistic UI feedback
  2. The Favorites page lists all saved recipes as recipe cards with titles and images
  3. User can remove a recipe from the Favorites page without navigating to the recipe detail
  4. Favorite state is the same whether the user refreshes or returns in a new session (server-synced for logged-in users)
**Plans**: TBD

Plans:
- [ ] 18-01: Add prominent favorite CTA to recipe detail and wire to existing favorites API with optimistic UI
- [ ] 18-02: Build Favorites page with recipe card grid and inline remove functionality

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-02-05 |
| 2. Core Read Path | v1.0 | 6/6 | Complete | 2026-02-06 |
| 3. Pantry and User Features | v1.0 | 5/5 | Complete | 2026-02-08 |
| 4. AI Generation Pipeline | v1.0 | 6/6 | Complete | 2026-02-10 |
| 5. Fusion Intelligence and Polish | v1.0 | 4/4 | Complete | 2026-02-11 |
| 6. Observability and Hardening | v1.0 | 4/4 | Complete | 2026-02-11 |
| 7. Deployment + Production Validation | v1.1 | 3/3 | Complete | 2026-02-12 |
| 8. SEO + Sharing | v1.1 | 2/2 | Complete | 2026-02-13 |
| 9. UI/UX Polish | v1.1 | 3/3 | Complete | 2026-02-13 |
| 10. Performance Optimization | v1.1 | 3/3 | Complete | 2026-02-13 |
| 11. CI/CD Pipeline | v1.2 | 4/4 | Complete | 2026-02-13 |
| 12. Branching & Production URL | v1.2 | 2/2 | Complete | 2026-02-13 |
| 13. Hero Slider Images | v1.2 | 2/2 | Complete | 2026-02-18 |
| 14. Recipe Images | 2/2 | Complete   | 2026-02-18 | - |
| 15. Pantry UX | 1/1 | Complete    | 2026-02-18 | - |
| 16. Generation UX | 1/1 | Complete   | 2026-02-19 | - |
| 17. Ingredient Highlighting | v1.3 | 0/2 | Not started | - |
| 18. Favorites Polish | v1.3 | 0/2 | Not started | - |

---
*Last updated: 2026-02-18 — v1.3 roadmap created*
