---
phase: 17-ingredient-highlighting
plan: 02
subsystem: ui
tags: [vue, composables, pantry, substitution, ai, dialog]

# Dependency graph
requires:
  - phase: 17-01
    provides: isInPantryByName helper, pantry highlighting in IngredientChecklist
  - phase: 15-pantry-ux
    provides: usePantry composable with pantry state
provides:
  - Pantry-aware substitute API that biases AI toward user's pantry items
  - fromPantry boolean flag in AI substitution responses
  - Two-mode SubstitutionDialog: AI Suggest (pantry-biased) + manual Pick from Pantry
affects: [recipe-detail, 18-favorites-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pass pantryItems string array to API for AI context injection via prompt engineering
    - fromPantry flag in AI JSON response to distinguish pantry vs general substitutions
    - Two-tab dialog with segmented control (AI Suggest default, Pick from Pantry manual)
    - Manual pantry pick emits same accept event shape as AI result (updatedInstructions empty)

key-files:
  created: []
  modified:
    - server/api/recipes/[id]/substitute.post.ts
    - server/utils/substitution-prompt.ts
    - server/utils/substitution-parser.ts
    - app/components/SubstitutionDialog.vue

key-decisions:
  - "Pass pantryItems to API as optional string array — API validates as array but does not require it, full backward compatibility"
  - "fromPantry defaults to false in parser when field missing from AI response — graceful handling of older/non-pantry calls"
  - "Manual pantry pick emits empty updatedInstructions — existing [slug].vue handler already skips instruction replacement when array is empty"
  - "Pick from Pantry tab: case-insensitive filter on item name, no fuzzy matching needed for a typically short list"

patterns-established:
  - "Pantry context injection: pass pantryItems to buildSubstitutionPrompt for AI bias; parse fromPantry from response for UI differentiation"
  - "Two-mode dialog pattern: tabs/segmented control with AI auto-mode and manual-pick mode sharing same emit shape"

requirements-completed: [INGR-03, INGR-04]

# Metrics
duration: ~3min
completed: 2026-02-19
---

# Phase 17 Plan 02: Pantry-Aware Substitution Summary

**Two-mode SubstitutionDialog with pantry-biased AI suggestions and direct pantry-pick option, backed by an enhanced substitute API that accepts pantry context and returns fromPantry flag**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T09:41:10Z
- **Completed:** 2026-02-19T09:43:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Substitute API (`substitute.post.ts`) now accepts optional `pantryItems` array and passes it to the prompt builder
- `buildSubstitutionPrompt` adds a pantry context section to the AI prompt when `pantryItems` is provided, with strong preference instructions
- `parseSubstitutionResponse` extracts `fromPantry` boolean from AI response, defaults to `false` if missing
- `ParsedSubstitution` interface includes optional `fromPantry?: boolean` field
- `SubstitutionDialog` redesigned with a segmented tab control (AI Suggest / Pick from Pantry)
- AI Suggest tab: passes all pantry item names to the API; shows green "From your pantry!" badge when `fromPantry: true`; shows "Not in your pantry" note when `fromPantry: false`
- Pick from Pantry tab: scrollable list of all pantry items, filterable by name, each tap immediately emits `accept` with manual substitution shape (no AI call)
- Empty pantry state in Pick from Pantry tab links user to /pantry page
- Full backward compatibility: all changes are additive; calling without `pantryItems` works exactly as before

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance substitute API and prompt to accept pantry context** - `2a0e8cc` (feat)
2. **Task 2: Add manual pantry-pick and pantry-aware AI mode to SubstitutionDialog** - `1708889` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `server/api/recipes/[id]/substitute.post.ts` - Added optional `pantryItems?: string[]` to `SubstituteRequest`, destructured and passed to `buildSubstitutionPrompt`
- `server/utils/substitution-prompt.ts` - Added `pantryItems?` param, pantry context section in prompt, `fromPantry` field in JSON output spec with requirement
- `server/utils/substitution-parser.ts` - Added `fromPantry?: boolean` to `ParsedSubstitution`, parse from AI response with `false` default
- `app/components/SubstitutionDialog.vue` - Full redesign: segmented tab control, AI Suggest tab with pantry context and fromPantry badge/note, Pick from Pantry tab with search filter and tappable item rows

## Decisions Made

- Optional `pantryItems` array: validated as array type but no required validation — it's optional context, not a required input
- `fromPantry` defaults to `false` in parser when field is absent — graceful handling for calls without pantry context
- Manual pick emits empty `updatedInstructions` — `[slug].vue` `handleSubstitutionAccepted` already checks `result.updatedInstructions.length > 0` before replacing, no changes needed to the recipe detail handler
- Segmented control (not a full tab component) — simple two-button layout with active/inactive styling, no additional dependencies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript typecheck shows 1 pre-existing error in `generate.post.ts` (AnalyticsEventType mismatch) — confirmed pre-existing from 17-01, not introduced by this plan. Build (`npx nuxi build`) passes successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 17 complete (both plans done)
- Phase 18 (Favorites Polish) can proceed independently — no dependencies on substitution dialog

---
*Phase: 17-ingredient-highlighting*
*Completed: 2026-02-19*

## Self-Check: PASSED

- FOUND: server/api/recipes/[id]/substitute.post.ts
- FOUND: server/utils/substitution-prompt.ts
- FOUND: server/utils/substitution-parser.ts
- FOUND: app/components/SubstitutionDialog.vue
- FOUND: .planning/phases/17-ingredient-highlighting/17-02-SUMMARY.md
- FOUND: commit 2a0e8cc (feat(17-02): enhance substitute API and prompt to accept pantry context)
- FOUND: commit 1708889 (feat(17-02): add two-mode SubstitutionDialog with AI suggest and manual pantry pick)
