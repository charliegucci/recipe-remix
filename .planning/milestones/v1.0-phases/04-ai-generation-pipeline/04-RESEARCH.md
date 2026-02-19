# Phase 4 Research: AI Generation Pipeline

## 1. Text Generation (Recipe Creation via LLM)

### Approach: Workers AI Text Generation
- **Recommended Model:** `@cf/meta/llama-3.1-70b-instruct` or similar large instruction-following model on Workers AI
- Workers AI provides text-generation models directly accessible from Cloudflare Workers/NuxtHub
- Structured JSON output can be enforced via prompt engineering + JSON schema in prompt
- Alternative: Anthropic Claude API via external fetch for higher quality structured output

### Structured Output Strategy
- Define a strict JSON schema for recipe output (title, description, cuisines, ingredients[], steps[], cookTime, difficulty, servings)
- Each ingredient must include: name, quantity, unit, category
- Use JSON mode / structured output where supported, or parse + validate JSON from LLM response
- Validation layer: Parse JSON, validate against schema, reject malformed responses

### Prompt Engineering for Fusion Recipes
- System prompt as culinary expert persona with cross-cuisine knowledge
- Include user's pantry ingredients, dietary restrictions, and cuisine preferences in prompt
- Request "bridge ingredients" and technique explanations for fusion combinations
- Constrain output to only use provided ingredients (+ common pantry staples)

## 2. Image Generation

### Workers AI Text-to-Image Models
- **@cf/leonardo/phoenix-1.0** — Good prompt adherence, ~5s generation at 1024x1024
- **@cf/leonardo/lucid-origin** — Photorealistic, ~4.4s at 1024x1024
- **@cf/black-forest-labs/flux-1-schnell** — Ultra-fast, good quality
- **@cf/stabilityai/stable-diffusion-xl-base-1.0** — Stable Diffusion XL

### Recommendation
- Use `@cf/black-forest-labs/flux-1-schnell` for speed (primary)
- Fallback to `@cf/stabilityai/stable-diffusion-xl-base-1.0`
- Generate food photography style prompts from recipe title + key ingredients
- Store generated images in R2, reference by recipe ID

### Image Prompt Strategy
- Template: "Professional food photography of {recipe_title}, featuring {key_ingredients}, {cuisine_style} cuisine, beautifully plated, overhead shot, warm lighting, high quality"
- Negative prompt: "text, watermark, blurry, low quality, cartoon"

## 3. Ingredient Validation (SAFE-01, SAFE-04)

### Strategy: Match Against Canonical Database
- Existing `ingredientMaster` table has ~305 items with categories and common names
- For each AI-generated ingredient, attempt to match against canonical DB
- Matching approach:
  1. Exact match on name (case-insensitive)
  2. Substring match (both directions — "chicken breast" matches "chicken")
  3. Common names array match (JSON field with aliases)
- If any ingredient cannot be resolved → reject entire recipe, inform user
- This is already partially built in Phase 3's pantry matching (03-05)

### Implementation
- Server-side validation function: `validateIngredients(ingredients[])`
- Returns: `{ valid: boolean, resolvedIngredients: [], unresolved: [] }`
- Resolved ingredients get linked to canonical IDs for consistency

## 4. Food Safety (SAFE-02, SAFE-03)

### USDA Safe Internal Temperatures
Static lookup table (hardcoded, source: USDA FSIS):

| Food Category | Temperature (°F) | Temperature (°C) |
|---|---|---|
| Beef, pork, veal, lamb (steaks, chops, roasts) | 145 + 3 min rest | 63 |
| Ground meats (beef, pork, veal, lamb) | 160 | 71 |
| Poultry (all: chicken, turkey, duck) | 165 | 74 |
| Ground poultry | 165 | 74 |
| Fish & shellfish | 145 | 63 |
| Eggs | 160 (for dishes) | 71 |
| Leftovers & casseroles | 165 | 74 |
| Ham (fresh or smoked, uncooked) | 145 + 3 min rest | 63 |
| Ham (fully cooked, reheat) | 165 (or 140 if repackaged) | 74/60 |

### Implementation Strategy
- Create a `PROTEIN_SAFETY_MAP` constant mapping protein categories to temperatures
- Post-generation step: scan ingredients for proteins, inject safety note into relevant cooking steps
- Tag ingredients with `requiresSafeTemp: true` flag during validation

### Dietary Restriction Check (SAFE-02)
- After generation, cross-check all ingredients against user's dietary restrictions
- Map: vegetarian → reject meat/poultry/fish, vegan → reject all animal products, gluten-free → reject wheat/barley/rye, etc.
- If violation found → reject recipe, generate new one or inform user
- Use existing dietary restriction categories from Phase 3

## 5. Analytics (INFR-03)

### Approach: Simple Event Logging
- Log to D1 table: `analytics_events`
- Events: `recipe_generated`, `recipe_generation_failed`, `recipe_viewed`, `recipe_favorited`
- Fields: eventType, userId (nullable), recipeId, metadata (JSON), createdAt
- Server-side only — no client-side analytics SDK needed for v1
- Query via simple API endpoint for dashboard data

## 6. Error Handling (INFR-02)

### Generation Failure Modes
1. LLM API timeout → retry once, then show "generation failed, try again" message
2. JSON parse failure → retry with stricter prompt, then fail gracefully
3. Ingredient validation failure → show which ingredients couldn't be verified
4. Dietary restriction violation → show which restriction was violated
5. Image generation failure → show recipe without image, mark as "image pending"
6. Rate limiting → queue/throttle, show position in queue

### UX Pattern
- Generation takes 10-30s → show animated progress indicator with status steps
- Steps: "Crafting your fusion recipe..." → "Validating ingredients..." → "Generating image..." → "Done!"
- If user navigates away → recipe persists in DB, accessible from history
- All failures show clear, user-friendly messages (not technical errors)

## 7. Cuisine Preferences (GEN-02)

### UI Design
- Multi-select cuisine picker: Italian, Mexican, Japanese, Thai, Indian, Chinese, Korean, French, Mediterranean, Middle Eastern, American, Ethiopian
- Allow selecting 2+ cuisines for fusion direction
- Pass selected cuisines to prompt as fusion targets
- "Surprise me" option for random fusion

## 8. Architecture Decision: Generation Pipeline

### Recommended Flow
```
User taps "Generate"
  → POST /api/recipes/generate
    → Build prompt (pantry + restrictions + cuisines)
    → Call Workers AI text generation
    → Parse JSON response
    → Validate ingredients against DB (SAFE-01)
    → Check dietary restrictions (SAFE-02)
    → Inject food safety temps (SAFE-03)
    → If validation fails (SAFE-04) → retry or reject
    → Save recipe to D1 (with isAiGenerated flag)
    → Trigger image generation (async)
    → Return recipe to client
  → Client renders recipe with "AI-generated" badge (DISP-08)
  → Image arrives async → update recipe display
```

### Why Not Cloudflare Workflows?
- Workflows add complexity for a pipeline that completes in ~15-30s
- Simple sequential API endpoint is sufficient for v1
- If generation needs to survive disconnects → save intermediate state to D1
- Revisit Workflows in Phase 6 if reliability requires it

## 9. Existing Codebase Integration Points

- `server/database/schema.ts` — recipes table already has structure for AI recipes
- `server/api/recipes/` — existing CRUD patterns to follow
- `app/composables/` — existing patterns for data fetching
- `server/utils/drizzle.ts` — request-scoped DB access pattern
- `server/utils/cache.ts` — KV caching utilities
- Ingredient master table — validation source
- Dietary restrictions composable — client-side restriction data

## 10. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM hallucinating non-existent ingredients | Strict validation against canonical DB, reject on failure |
| Generation taking too long (>30s) | Timeout at 30s, show error, suggest retry |
| Image generation quality inconsistent | Use best available model, cache good prompts |
| Workers AI rate limits | Implement retry with backoff, consider fallback provider |
| Cost of AI calls | Cache generated recipes, avoid re-generation |
| Dietary restriction bypass in generation | Server-side post-generation check, never trust LLM alone |

---
*Research completed: 2026-02-09*
