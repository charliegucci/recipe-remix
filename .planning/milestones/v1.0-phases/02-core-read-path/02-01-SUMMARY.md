---
phase: 02-core-read-path
plan: 01
subsystem: data-layer
tags:
  - drizzle-orm
  - sqlite
  - database-schema
  - seed-data
  - recipes
requires:
  - 01-02 (Drizzle schema foundation)
  - 01-03 (NuxtHub database integration)
provides:
  - recipe-database-schema
  - recipe-seed-data
  - category-indexing
affects:
  - 02-02 (Recipe API will query these tables)
  - 02-03 (Home page will display seeded recipes)
  - 03-XX (Pantry matching will use ingredient JSON structure)
tech-stack:
  added: []
  patterns:
    - Server API route for database seeding
    - JSON fields for structured data (ingredients, instructions, tags)
    - Junction table with index for efficient category filtering
key-files:
  created:
    - server/db/schema.ts
    - server/database/migrations/0001_fantastic_newton_destine.sql
    - server/api/_seed.post.ts
  modified:
    - package.json
key-decisions:
  - decision: Store ingredients as JSON array with name/quantity/unit structure
    rationale: Enables future pantry-to-recipe matching (GEN-03 prerequisite) while maintaining queryability
    commit: d03d743
  - decision: Use server API route pattern for seeding instead of standalone script
    rationale: hubDatabase() only available in NuxtHub request handlers, not module scope
    commit: 27cadd4
  - decision: Add recipeCategories junction table with index
    rationale: Efficient WHERE queries for category filtering without scanning all recipes
    commit: d03d743
  - decision: Use crypto.randomUUID() for stable recipe IDs
    rationale: Ensures recipe URLs remain stable across re-seeds and deployments
    commit: 27cadd4
duration: 269s
completed: 2026-02-05
---

# Phase 02 Plan 01: Recipe Database Schema and Seed Data Summary

Recipe database schema and seed data created with 27 curated recipes across 5 cuisines, structured JSON ingredients for future pantry matching, and indexed category filtering.

## Performance

- **Duration:** 4 minutes 29 seconds
- **Tasks completed:** 2/2
- **Commits:** 2
- **Files created:** 3
- **Files modified:** 1

## What We Accomplished

### Task 1: Recipe Schema Extension
Extended Drizzle schema with `recipes` and `recipeCategories` tables:

**Recipes table:**
- Core fields: id (UUID), title, description
- Content fields: ingredients (JSON), instructions (JSON)
- Metadata: cuisineTags (JSON), dietaryTags (JSON), cookTime, difficulty
- Media: imageKey (R2 reference, nullable for now)
- Flags: source (curated/ai_generated), featured (boolean)
- Audit: createdAt timestamp

**RecipeCategories junction table:**
- Efficient category filtering via indexed `category` field
- Foreign key cascade delete maintains referential integrity
- Supports recipes in multiple categories if needed in future

**Migration generated:** `0001_fantastic_newton_destine.sql` with CREATE TABLE and CREATE INDEX statements.

### Task 2: Curated Recipe Seed Data
Created 27 realistic recipes across 5 cuisine categories:

**Distribution:**
- Italian: 5 recipes (Spaghetti Carbonara, Margherita Pizza, Chicken Parmigiana, Tiramisu, Risotto alla Milanese)
- Mexican: 5 recipes (Tacos al Pastor, Chicken Enchiladas, Guacamole, Churros, Pozole)
- Asian: 6 recipes (Pad Thai, Chicken Teriyaki, California Roll, Pho, Kung Pao Chicken, Miso Soup)
- American: 6 recipes (Classic Cheeseburger, Mac and Cheese, BBQ Ribs, Apple Pie, Clam Chowder, Buffalo Wings)
- Mediterranean: 5 recipes (Greek Salad, Hummus, Falafel, Shakshuka, Lamb Gyros)

**Featured recipes:** 5 total (1 per category) for home page curation.

**Seed mechanism:** Server API route `/api/_seed` called via `npm run db:seed` script. This pattern works with NuxtHub's request-scoped database access.

**Data quality:**
- Realistic ingredient lists with quantities and units
- 4-8 instruction steps per recipe
- Cook times ranging from 15-400 minutes
- Difficulty levels (easy/medium/hard) distributed naturally
- Cuisine and dietary tags for filtering

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add recipe tables to Drizzle schema | `d03d743` | schema.ts, 0001_fantastic_newton_destine.sql, meta files |
| 2 | Create recipe seed script with curated data | `27cadd4` | _seed.post.ts, package.json |

## Files Created

1. **server/database/migrations/0001_fantastic_newton_destine.sql**
   - CREATE TABLE recipes (13 columns)
   - CREATE TABLE recipe_categories (3 columns, 1 foreign key)
   - CREATE INDEX recipe_categories_category_idx

2. **server/api/_seed.post.ts**
   - POST endpoint for database seeding
   - 27 curated recipes with realistic content
   - Deletes existing data before seeding (idempotent)
   - Returns stats on completion

3. **server/database/migrations/meta/0001_snapshot.json**
   - Drizzle Kit snapshot metadata

## Files Modified

1. **server/db/schema.ts**
   - Added `recipes` table export
   - Added `recipeCategories` table export with index
   - Added `index` import from drizzle-orm/sqlite-core

2. **package.json**
   - Added `db:seed` npm script

## Decisions Made

### 1. JSON Structure for Ingredients
**Decision:** Store ingredients as JSON array with `{name, quantity, unit}` structure.

**Rationale:**
- Enables future pantry-to-recipe matching (GEN-03) by querying ingredient names
- Maintains structured data without additional tables
- SQLite JSON functions allow querying within JSON fields
- Simpler than normalized ingredient/recipe_ingredient tables for MVP

**Impact:** Phase 3 pantry matching can query `json_each(ingredients)` to find recipes by ingredient name.

### 2. Server API Route for Seeding
**Decision:** Use `/api/_seed.post.ts` route instead of standalone Node script.

**Rationale:**
- `hubDatabase()` only available within NuxtHub request handlers
- Standalone scripts can't access D1 bindings without complex workarounds
- API route pattern works naturally with dev server
- Consistent with NuxtHub's request-scoped architecture

**Alternative considered:** NuxtHub CLI seed command (not available yet in NuxtHub 0.8.0).

### 3. RecipeCategories Junction Table
**Decision:** Create separate `recipe_categories` table instead of array field.

**Rationale:**
- Efficient WHERE queries with indexed `category` column
- Avoids JSON_EXTRACT for every category filter
- Supports future multi-category recipes naturally
- Standard relational pattern for many-to-many

**Trade-off:** Slight complexity vs. cuisineTags JSON array, but performance benefit for primary use case (browsing by category).

### 4. Stable UUIDs for Recipe Identity
**Decision:** Use `crypto.randomUUID()` for recipe IDs instead of auto-increment.

**Rationale:**
- Recipe URLs remain stable across re-seeds
- No ID conflicts when merging curated + AI-generated recipes
- Distributed ID generation (if needed for multi-source recipes)
- Better for public-facing URLs

## Deviations from Plan

None - plan executed exactly as written. The server API route approach was anticipated in the context notes.

## Issues Encountered

None. Both tasks completed successfully on first attempt.

## Next Phase Readiness

**Ready for 02-02 (Recipe API endpoints):**
- ✅ Database schema exists with proper types
- ✅ Migration generated and ready for deployment
- ✅ 27+ recipes seeded for development and testing
- ✅ Featured flag available for home page curation
- ✅ Category index ready for efficient filtering
- ✅ Ingredient JSON structure ready for future pantry matching

**Blockers:** None.

**Recommendations for 02-02:**
- Query pattern: `SELECT * FROM recipes JOIN recipe_categories ON recipes.id = recipe_categories.recipe_id WHERE category = ?`
- Featured recipes: `SELECT * FROM recipes WHERE featured = 1`
- Parse JSON fields with `JSON.parse()` in API handlers before returning to client

## Self-Check: PASSED

**Files created verification:**
- ✅ server/db/schema.ts exists
- ✅ server/database/migrations/0001_fantastic_newton_destine.sql exists
- ✅ server/api/_seed.post.ts exists

**Commits verification:**
- ✅ d03d743 exists in git log
- ✅ 27cadd4 exists in git log

**Database verification:**
- ✅ 27 recipes in database
- ✅ 5 featured recipes
- ✅ 27 category entries
- ✅ Categories distributed correctly (Italian: 5, Mexican: 5, Asian: 6, American: 6, Mediterranean: 5)
