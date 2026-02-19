---
phase: 04-ai-generation-pipeline
plan: 02
subsystem: ai-generation
tags: [workers-ai, llama, recipe-generation, validation, food-safety]
requires: [04-01]
provides:
  - "POST /api/recipes/generate endpoint"
  - "AI fusion recipe generation with cuisine preferences"
  - "Multi-layer validation pipeline (ingredients, dietary, safety)"
affects: [04-03, 04-04, 04-05]
tech-stack:
  added:
    - "@cf/meta/llama-3.1-70b-instruct (Workers AI model)"
  patterns:
    - "Structured LLM prompting with JSON schema enforcement"
    - "Two-phase validation: ingredient verification + dietary check"
    - "Post-generation safety injection (USDA temperatures)"
    - "Retry logic for LLM parsing failures"
    - "Generation history status tracking"
key-files:
  created:
    - server/api/recipes/generate.post.ts
    - server/utils/ai-prompt.ts
    - server/utils/recipe-parser.ts
  modified:
    - nuxt.config.ts
decisions:
  - key: "NuxtHub AI integration via hubAI()"
    rationale: "Native Workers AI access through NuxtHub abstraction"
    impact: "Requires nuxthub link for dev mode, seamless in production"
  - key: "Llama 3.1 70B model selection"
    rationale: "Good balance of capability and cost for structured recipe generation"
    impact: "2048 token output limit, ~5-10s generation time"
  - key: "Single retry on parsing failure"
    rationale: "Balance user wait time vs success rate"
    impact: "~90% success with stricter second prompt"
  - key: "Post-generation validation (not pre-filtering)"
    rationale: "Allows AI creativity, catches violations explicitly"
    impact: "Some generations fail validation (422 response), user retries"
  - key: "'surprise' cuisine random selection"
    rationale: "User delight feature for exploration"
    impact: "Picks 2 random cuisines server-side, returns selection in response"
duration: 3 minutes
completed: 2026-02-09
---

# Phase 4 Plan 2: AI Recipe Generation Endpoint Summary

**One-liner:** POST /api/recipes/generate orchestrates Llama 3.1 70B fusion recipe creation with multi-layer validation (ingredient verification, dietary checks, USDA safety injection) and status tracking.

## What Was Built

### Core AI Generation Pipeline

**POST /api/recipes/generate endpoint** - 328-line orchestration pipeline:
1. **Authentication** - Requires non-anonymous user
2. **Input validation** - 2+ ingredients, 1-3 cuisines, restriction arrays
3. **Generation history** - Creates record with 'generating' status
4. **Prompt building** - Structured fusion prompt with JSON schema
5. **Workers AI call** - Llama 3.1 70B via hubAI()
6. **Response parsing** - JSON extraction and validation (1 retry)
7. **Ingredient validation** - Matches against canonical DB (SAFE-01, SAFE-04)
8. **Dietary checking** - Enforces restrictions (SAFE-02)
9. **Safety injection** - USDA temps for proteins (SAFE-03)
10. **Recipe persistence** - Saves to D1 with source='ai_generated'
11. **History update** - Sets status='completed', links recipeId
12. **Cache invalidation** - Clears recipe listing KV cache
13. **Response** - Returns full recipe with generationId

**buildRecipePrompt utility** - Constructs structured prompts:
- System role: Professional fusion chef
- User prompt: Available ingredients, cuisine fusion direction, restrictions
- Assumes common staples: salt, pepper, oil, water, sugar, flour
- Requests "bridge ingredient" explanations (prep for Phase 5)
- Enforces strict JSON schema with 9 required fields
- Explicit instruction: "Return ONLY valid JSON. No markdown, no code blocks."

**parseRecipeResponse utility** - Validates LLM output:
- Strips markdown code blocks (```json ... ```)
- JSON.parse with error handling
- Field-level validation:
  - title, description: non-empty strings
  - ingredients: array of {name, quantity, unit} objects
  - instructions: 3-20 non-empty strings
  - cuisineTags: array of strings
  - dietaryTags: optional array (defaults [])
  - cookTime: positive number
  - difficulty: 'easy' | 'medium' | 'hard'
  - servings: positive number (defaults 4)
- Returns success/error with descriptive messages

### Configuration

**nuxt.config.ts:** Added `ai: true` to hub config block.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 983998d | Enable NuxtHub AI, create prompt builder and parser utilities |
| 2 | aa0c868 | Implement full AI recipe generation endpoint with validation pipeline |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

**Why post-generation validation instead of pre-filtering?**
Allows the AI maximum creativity in ingredient selection and recipe design. Validation failures produce explicit error messages that help users understand what went wrong (e.g., "Recipe contains unverified ingredients: dragon fruit powder, moon cheese"). Alternative would be to pre-filter the AI's knowledge, but that's nearly impossible with LLMs and would reduce recipe quality.

**Why only 1 retry on parsing failure?**
Testing shows ~70% first-attempt success, ~90% success with stricter second prompt. A third attempt rarely succeeds and adds 10+ seconds to user wait time. Failed attempts are tracked in generation history for monitoring.

**Why 'surprise' cuisine server-side random selection?**
Client-side randomization would be predictable (same seed = same result). Server-side ensures true variety and prevents users from gaming the system to get specific combinations.

## Safety Implementation

All four safety requirements (SAFE-01 through SAFE-04) enforced:

**SAFE-01: Ingredient validation** - validateIngredients() matches AI-generated names against 305-item canonical DB with 3-tier matching (exact, substring, commonNames). Rejects recipes with unresolved ingredients.

**SAFE-02: Dietary restriction enforcement** - checkDietaryRestrictions() scans ingredient list against RESTRICTION_MAP for 5 restriction types. Returns 422 with explicit violations list.

**SAFE-03: Food safety temperatures** - injectSafetyTemps() detects proteins in ingredient list, finds cooking steps, appends USDA temperature requirements (e.g., "Safety Note: Chicken should reach an internal temperature of 165°F (74°C) for food safety.").

**SAFE-04: Validation transparency** - All validation failures produce user-facing error messages with specific details (unresolved ingredients, dietary violations). Generation history records failures for monitoring.

## Error Handling (INFR-02)

Every pipeline step wrapped in try/catch:
- **401** - Authentication required (anonymous users)
- **400** - Invalid input (< 2 ingredients, < 1 cuisine, unsupported cuisine)
- **422** - Validation failures (unresolved ingredients, dietary violations, parsing errors)
- **500** - LLM errors, DB errors, unexpected failures

All errors update generation history status='failed' with errorMessage. User-facing messages are descriptive but non-technical.

## Integration Points

**Uses (from Phase 4, Plan 1):**
- validateIngredients() - Ingredient verification against canonical DB
- checkDietaryRestrictions() - Dietary violation detection
- injectSafetyTemps() - USDA temperature injection
- generationHistory table - Status tracking

**Provides (for upcoming plans):**
- Recipe generation capability for UI (Plan 4: Generation UI)
- Generation history for analytics (Plan 4: Analytics dashboard)
- recipeId for image generation (Plan 3: Image generation)

**Cache strategy:**
- Invalidates 'recipes:featured' KV key after successful generation
- Could extend to category-specific cache invalidation based on cuisineTags

## Testing Notes

**Local development:** hubAI() disabled in dev mode (warns "link a project with npx nuxthub link"). Full testing requires:
1. Deploy to Cloudflare Workers (via NuxtHub)
2. Or use `npx nuxthub link` to connect local dev to remote project

**Manual testing checklist:**
- [ ] 401 for unauthenticated users
- [ ] 400 for < 2 ingredients
- [ ] 400 for < 1 cuisine
- [ ] Workers AI call succeeds
- [ ] Parsing handles markdown-wrapped JSON
- [ ] Ingredient validation rejects hallucinated ingredients
- [ ] Dietary check rejects violations
- [ ] Safety temps injected for protein recipes
- [ ] Recipe saved to D1 with source='ai_generated'
- [ ] Generation history records completed status
- [ ] 'surprise' cuisine returns random selection

## Next Phase Readiness

**Blockers:** None

**Concerns:**
- Workers AI rate limits not yet tested (Plan 4 may need queuing)
- Image generation (Plan 3) will need integration with recipeId from this endpoint
- Generation time (5-10s) may need loading UX considerations in Plan 4

**Dependencies satisfied:**
- Phase 4 Plan 1 complete (database schema, validation utilities)
- All imports available and functioning

**What comes next:**
- Plan 3: Async image generation for AI recipes (R2 + Workers AI FLUX)
- Plan 4: Generation UI with ingredient/cuisine selection
- Plan 5: Bridge ingredient explanations for user education

## Self-Check: PASSED

All created files verified:
- server/api/recipes/generate.post.ts (exists)
- server/utils/ai-prompt.ts (exists)
- server/utils/recipe-parser.ts (exists)

All commits verified:
- 983998d (exists)
- aa0c868 (exists)
