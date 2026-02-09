---
phase: 04-ai-generation-pipeline
plan: 01
subsystem: ai-validation
tags: [database, validation, food-safety, dietary-restrictions, drizzle, d1]
requires: [03-01, 03-02]
provides:
  - analytics_events table for event tracking
  - generation_history table for AI generation status
  - validateIngredients utility with 3-tier matching
  - injectSafetyTemps utility with USDA temperatures
  - checkDietaryRestrictions utility for post-generation validation
affects: [04-02, 04-03, 04-04, 04-05, 04-06]
tech-stack:
  added: []
  patterns:
    - USDA food safety temperature injection
    - Post-generation dietary restriction validation
    - Module-level ingredient caching with TTL
key-files:
  created:
    - server/db/schema.ts (extended)
    - server/database/migrations/0004_ai_generation_tables.sql
    - server/utils/ingredient-validation.ts
    - server/utils/food-safety.ts
    - server/utils/dietary-check.ts
  modified:
    - server/database/migrations/meta/_journal.json
decisions:
  - title: Module-level ingredient cache with 5-minute TTL
    rationale: 305 ingredients fit in memory, reduces DB queries for validation
    alternatives: Per-request DB query (slower), longer TTL (stale data risk)
  - title: Substring matching both directions for ingredients
    rationale: Handles variations like "chicken" vs "chicken breast" consistently with Phase 3 pantry matching
    alternatives: Exact match only (too strict), fuzzy matching (complexity)
  - title: Post-generation dietary check (not pre-filtering)
    rationale: Allows AI flexibility, catches violations after generation with explicit user warning
    alternatives: Pre-filter ingredients (limits AI creativity), ignore violations (unsafe)
  - title: Temperature injection via instruction modification
    rationale: Non-invasive addition to existing steps, preserves AI-generated recipe structure
    alternatives: Separate safety section (redundant), pre-generation prompting (less reliable)
duration: 4 minutes
completed: 2026-02-09
---

# Phase 04 Plan 01: Database Schema and Safety Utilities Summary

**One-liner:** Database tables for analytics/generation tracking, ingredient validation with 3-tier matching, USDA food safety temps, and dietary restriction checking.

## Overview

Created the foundational database schema extensions and server-side validation utilities required by the AI generation pipeline. Established two new tables (analytics_events, generation_history) and three safety/validation modules (ingredient validation, food safety, dietary checking). All downstream plans in Phase 4 depend on these artifacts.

## What Was Built

### Database Schema (INFR-01)

**analyticsEvents table:**
- Tracks user interactions: recipe_generated, recipe_generation_failed, recipe_viewed, recipe_favorited
- Fields: id, eventType, userId, recipeId, metadata (JSON), createdAt
- Indexes: eventType, createdAt for efficient querying
- Nullable foreign keys (userId, recipeId) for anonymous events

**generationHistory table:**
- Tracks AI recipe generation lifecycle: pending → generating → validating → completed/failed
- Fields: id, userId, recipeId, inputIngredients (JSON), cuisinePreferences (JSON), status, errorMessage, createdAt, completedAt
- Indexes: userId+createdAt composite, status for filtering
- Cascade delete on userId (user account deletion cleans up generation history)

**Migration:** 0004_ai_generation_tables.sql with CREATE TABLE and CREATE INDEX statements

### Ingredient Validation (SAFE-01, SAFE-04)

**validateIngredients function:**
- 3-tier matching logic:
  1. Exact match (case-insensitive) on canonical ingredient name
  2. Substring match both directions (e.g., "chicken breast" matches "chicken", "chicken" matches "chicken breast")
  3. commonNames JSON array matching for aliases
- Returns: `{ valid, resolved, unresolved }`
- Module-level cache with 5-minute TTL to reduce DB queries
- Loads all 305 ingredients once per validation call (fits in memory)

**Integration:** Accepts Database instance as parameter (request-scoped pattern)

### Food Safety (SAFE-03)

**PROTEIN_SAFETY_MAP:**
- USDA safe minimum internal temperatures for all protein categories:
  - Red meat (beef/pork/lamb/veal): 145°F (63°C) + 3 min rest
  - Ground meat: 160°F (71°C)
  - Poultry (chicken/turkey/duck): 165°F (74°C)
  - Ground poultry: 165°F (74°C)
  - Seafood (fish/shrimp/crab/lobster): 145°F (63°C)
  - Eggs: 160°F (71°C)

**injectSafetyTemps function:**
- Scans ingredients for protein keywords (sorted by length descending for "ground beef" before "beef")
- Finds relevant cooking step (mentions protein or contains cooking verbs: cook, bake, grill, etc.)
- Appends safety note: "Safety Note: {Protein} should reach an internal temperature of {temp_F} ({temp_C}) [and rest for {time}] for food safety."
- Returns modified instructions array with safety notes injected

### Dietary Restrictions (SAFE-02)

**RESTRICTION_MAP:**
- 5 dietary restrictions with excluded ingredient keywords:
  - **vegetarian:** Excludes meat, poultry, seafood, gelatin, meat stocks
  - **vegan:** All vegetarian exclusions + dairy, eggs, honey
  - **gluten-free:** Wheat, barley, rye, flour, pasta, bread, soy sauce (with exceptions for rice/almond flour, gluten-free pasta)
  - **dairy-free:** Milk, cream, butter, cheese, yogurt, whey, casein
  - **nut-free:** All tree nuts, peanuts, nut butters, nut flours

**checkDietaryRestrictions function:**
- Keyword-based matching against ingredient names
- Special cases: Allows "rice flour" for gluten-free, "gluten-free pasta" for gluten-free
- Returns: `{ passed, violations }` with array of `{ ingredient, restriction }` pairs
- Caller decides whether to flag, warn, or reject recipe

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Extend database schema with analytics and generation history tables | 0aa09ac | schema.ts, 0004_ai_generation_tables.sql, meta/_journal.json |
| 2 | Create ingredient validation utility | b3d36e9 | ingredient-validation.ts |
| 3 | Create food safety and dietary check utilities | ce46caa | food-safety.ts, dietary-check.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**Module-level ingredient cache with 5-minute TTL:**
- Reduces database queries for repeated validation calls
- 305 ingredients easily fit in memory (< 50KB)
- 5-minute expiry balances freshness vs performance
- Alternative considered: Per-request query (slower), longer TTL (stale data risk)

**Substring matching both directions:**
- Consistent with Phase 3 pantry matching logic (match-pantry.get.ts)
- Handles natural variations: "chicken" matches "chicken breast" and vice versa
- Alternative considered: Exact match only (too strict for AI-generated text)

**Post-generation dietary check (not pre-filtering):**
- Allows AI full creativity in recipe generation
- Violations flagged explicitly to user with option to regenerate
- More reliable than prompting AI to avoid specific ingredients
- Alternative considered: Pre-filter ingredients (limits variety), ignore (unsafe)

**Temperature injection via instruction modification:**
- Non-invasive: Appends safety notes to relevant cooking steps
- Preserves AI-generated recipe structure and flow
- Automatically targets the right step (protein mention or cooking verb)
- Alternative considered: Separate safety section (redundant), pre-generation prompting (less reliable)

## Testing Notes

**Verification completed:**
1. `npx drizzle-kit generate` succeeds with "No schema changes" (migration already applied)
2. Schema exports both `analyticsEvents` and `generationHistory` tables
3. `validateIngredients` exported from ingredient-validation.ts
4. `PROTEIN_SAFETY_MAP` and `injectSafetyTemps` exported from food-safety.ts
5. `RESTRICTION_MAP` and `checkDietaryRestrictions` exported from dietary-check.ts

**Coverage confirmed:**
- PROTEIN_SAFETY_MAP covers all USDA protein categories (red meat, ground meat, poultry, seafood, eggs)
- RESTRICTION_MAP covers all 5 dietary restrictions (vegetarian, vegan, gluten-free, dairy-free, nut-free)

**Integration readiness:**
- All utilities accept parameters (not request-scoped) for reusability
- ingredient-validation uses request-scoped DB pattern via parameter injection
- food-safety and dietary-check are pure functions (no DB dependency)

## Known Issues

None identified.

## Next Phase Readiness

**Ready for 04-02 (AI Generation API):**
- Database tables exist for storing generation history
- Ingredient validation ready to validate AI output against canonical DB
- Food safety injection ready to enhance AI instructions
- Dietary restriction check ready to flag violations post-generation

**Dependencies satisfied:**
- 03-01: Ingredient master table (ingredientMaster) with 305 items seeded
- 03-02: Pantry and dietary restriction patterns established

**Required for Phase 4 completion:**
- 04-02: AI generation API (OpenAI/Anthropic integration)
- 04-03: Recipe generation UI with ingredient input and cuisine selection
- 04-04: Generation status polling and result display
- 04-05: Analytics event recording integration
- 04-06: Error handling and retry logic for failed generations

## Success Criteria

- [x] Two new database tables (analyticsEvents, generationHistory) with migration
- [x] Ingredient validation resolves names against canonical DB with 3-tier matching
- [x] Food safety temperatures cover all USDA protein categories
- [x] Dietary restriction check covers vegetarian, vegan, gluten-free, dairy-free, nut-free
- [x] All utilities are pure functions (except DB read in validation) ready for pipeline integration

## Links

- **Plan:** `.planning/phases/04-ai-generation-pipeline/04-01-PLAN.md`
- **Migration:** `server/database/migrations/0004_ai_generation_tables.sql`
- **Schema:** `server/db/schema.ts` (lines 149-182)
- **Validation:** `server/utils/ingredient-validation.ts`
- **Food Safety:** `server/utils/food-safety.ts`
- **Dietary Check:** `server/utils/dietary-check.ts`

## Self-Check: PASSED

All created files verified:
- server/utils/ingredient-validation.ts
- server/utils/food-safety.ts
- server/utils/dietary-check.ts
- server/database/migrations/0004_ai_generation_tables.sql

All commits verified:
- 0aa09ac (Task 1: Database schema)
- b3d36e9 (Task 2: Ingredient validation)
- ce46caa (Task 3: Food safety and dietary check)
