# Roadmap: Recipe Remix Engine

**Created:** 2026-02-04
**Depth:** standard (6 phases)
**Total Requirements:** 33

---

## Milestone: v1.0

---

### Phase 1: Foundation ✓

**Status:** Complete (2026-02-05)

**Goal:** A logged-in (or anonymous) user can reach the app on any device and the backend data layer, auth, and image storage are fully operational underneath them.

**Requirements:**
- USER-01, USER-02, USER-03
- INFR-01

**Plans:** 4 plans (all complete)

Plans:
- [x] 01-01-PLAN.md — Project scaffolding with Nuxt 4, NuxtHub, Tailwind CSS
- [x] 01-02-PLAN.md — Database schema with Drizzle ORM (users, sessions, accounts)
- [x] 01-03-PLAN.md — Better Auth configuration (email/password + anonymous)
- [x] 01-04-PLAN.md — Auth UI and responsive layout with verification

**Success Criteria:** All verified ✓
1. A new visitor can load the app on a mobile phone, a tablet, and a desktop browser without any layout breakage or horizontal scroll.
2. A user can create an account with an email and password, close the browser entirely, reopen it, and still be logged in.
3. A user can browse and use the core app without ever creating an account; account-gated features are clearly indicated but do not block the experience.

---

### Phase 2: Core Read Path

**Goal:** A user can browse and read fully structured recipes sourced from the curated database, with images, served quickly from the edge.

**Requirements:**
- DISP-01, DISP-02, DISP-03, DISP-04, DISP-05
- GEN-03, GEN-06

**Plans:** 6 plans

Plans:
- [ ] 02-01-PLAN.md — Recipe database schema and seed data
- [ ] 02-02-PLAN.md — Recipe API routes with KV caching
- [ ] 02-03-PLAN.md — RecipeCard and skeleton components
- [ ] 02-04-PLAN.md — Interactive ingredient and step components
- [ ] 02-05-PLAN.md — Home page with carousel and category sections
- [ ] 02-06-PLAN.md — Recipe detail page with verification

**Success Criteria:**
1. A user can open a recipe detail page and see the title, description, a full ingredient list with quantities and units, ordered step-by-step instructions, estimated cooking time, and difficulty level — all rendered on first paint with no loading spinner for the text content.
2. A user can navigate to any recipe by its URL at any time in the future and see the exact same recipe they saw before (stable identity via persistent IDs).
3. Repeat visits to the same recipe page complete in under 200 ms at the edge because the KV read-through cache is serving the response.

---

### Phase 3: Pantry and User Features

**Goal:** A user can build and maintain a personal pantry of ingredients with dietary guardrails, and an authenticated user can save, track, and annotate recipes they enjoy.

**Requirements:**
- INGR-01, INGR-02, INGR-03, INGR-04, INGR-05
- USER-04, USER-05, USER-06, USER-07

**Success Criteria:**
1. A user types a partial ingredient name and sees a ranked autocomplete dropdown within 150 ms; selecting an item adds it to the pantry instantly, and removing it requires one tap.
2. A user sets dietary restrictions (e.g., gluten-free), closes the app, reopens it days later, and finds the same restrictions still active without re-entering them.
3. A logged-in user can star a recipe, navigate away, return later, and find it in a dedicated Favorites list; they can also view every recipe they have previously generated in chronological order.
4. A logged-in user can leave a star rating and a written note on any recipe, and both persist across sessions.

---

### Phase 4: AI Generation Pipeline

**Goal:** A user can trigger the generation of a novel AI fusion recipe from their pantry, watch it appear, and trust that every ingredient and food-safety detail in the output has been validated before it reaches them.

**Requirements:**
- GEN-01, GEN-02
- SAFE-01, SAFE-02, SAFE-03, SAFE-04
- DISP-06, DISP-08
- INFR-02, INFR-03

**Success Criteria:**
1. A user with a populated pantry taps "Generate Recipe," sees a live status indicator, and a fully rendered recipe — including an image — appears on screen without a page reload; the entire pipeline completes reliably even if the user navigates away and returns.
2. Every ingredient in every AI-generated recipe resolves against the canonical ingredient database; any recipe containing an unresolvable ingredient is automatically rejected and the user is informed, never shown a hallucinated ingredient.
3. A recipe flagged as containing meat, poultry, fish, or eggs displays the correct USDA safe internal temperature for the relevant protein, and any recipe that fails the post-generation dietary-restriction check is blocked from reaching the user.
4. Every AI-generated recipe displays an "AI-generated" badge and an associated image; stock images appear for curated recipes. The app does not crash or show a blank page under any generation failure — errors surface as clear, actionable messages.
5. An analytics dashboard (or equivalent data stream) captures recipe generation events, success/failure counts, and user interaction with generated recipes from the moment the pipeline is live.

---

### Phase 5: Fusion Intelligence and Polish

**Goal:** Every AI-generated recipe comes with a human-readable explanation of why its cross-cuisine combination works, users can swap out ingredients they do not have, and serving sizes scale with one tap.

**Requirements:**
- GEN-04, GEN-05
- DISP-07

**Success Criteria:**
1. Every AI-generated recipe card surfaces a "why this works" explanation that identifies at least one bridge ingredient or technique connecting the constituent cuisines; the explanation reads as a coherent sentence, not a list of keywords.
2. A user who does not have one of the listed ingredients can request a substitution inline; the updated recipe renders with the swap reflected in both the ingredient list and the step-by-step instructions, and the "why this works" explanation remains accurate for the modified recipe.
3. A user can change the serving count on any recipe and watch all ingredient quantities and unit conversions update in real time without a full page reload.

---

### Phase 6: Observability and Hardening

**Goal:** The production system is monitored end-to-end, proven to handle real traffic without data loss or latency regression, and ready for public launch.

**Requirements:**
- (No new v1 requirements; this phase validates and stress-tests the requirements delivered in Phases 1--5.)

**Success Criteria:**
1. AI Gateway cache-hit rates and D1 query latencies are visible in a single dashboard; any query exceeding a defined p99 threshold triggers an alert.
2. A load test against the generation write path confirms that D1 transient-write failures are retried successfully and no recipe is silently lost, and the bundle size check in CI blocks any merge that would exceed the 3 MB gzip limit.
3. All image and font resources load non-blocking; a Lighthouse performance audit on the recipe listing and detail pages scores at or above 90 on a mobile device.

---

## Traceability

| Requirement | Phase | Description |
|-------------|-------|-------------|
| INGR-01 | 3 | User can search for ingredients with autocomplete |
| INGR-02 | 3 | User can add ingredients to persistent pantry |
| INGR-03 | 3 | User can remove ingredients from pantry |
| INGR-04 | 3 | User can set dietary restrictions |
| INGR-05 | 3 | Dietary restrictions persist across sessions |
| GEN-01 | 4 | User can generate AI fusion recipes from pantry ingredients |
| GEN-02 | 4 | User can select cuisine preferences for fusion direction |
| GEN-03 | 2 | System matches pantry to existing recipe database |
| GEN-04 | 5 | Generated recipes include "why this works" explanation |
| GEN-05 | 5 | User can request ingredient substitution after generation |
| GEN-06 | 2 | Generated recipes are persisted with stable IDs |
| DISP-01 | 2 | Recipes display title and description |
| DISP-02 | 2 | Recipes display ingredient list with quantities and units |
| DISP-03 | 2 | Recipes display step-by-step instructions |
| DISP-04 | 2 | Recipes display estimated cooking time |
| DISP-05 | 2 | Recipes display difficulty level |
| DISP-06 | 4 | Recipes display AI-generated or stock images |
| DISP-07 | 5 | User can scale serving size |
| DISP-08 | 4 | AI-generated recipes display "AI-generated" badge |
| USER-01 | 1 | User can sign up with email/password |
| USER-02 | 1 | User can log in and stay logged in across sessions |
| USER-03 | 1 | User can use the app without an account |
| USER-04 | 3 | User can save recipes to favorites |
| USER-05 | 3 | User can view cooking history |
| USER-06 | 3 | User can rate recipes |
| USER-07 | 3 | User can leave notes/reviews on recipes |
| SAFE-01 | 4 | System validates ingredients against canonical database before AI generation |
| SAFE-02 | 4 | System performs code-level dietary restriction check after generation |
| SAFE-03 | 4 | System injects safe internal temperatures for meat/poultry/fish/eggs |
| SAFE-04 | 4 | System rejects AI recipes that fail validation |
| INFR-01 | 1 | Mobile-responsive design |
| INFR-02 | 4 | Production-ready error handling |
| INFR-03 | 4 | Analytics integration |

**Coverage:** 33/33 requirements mapped (100%)
