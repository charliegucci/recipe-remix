# Requirements: Recipe Remix Engine

**Defined:** 2026-02-18
**Core Value:** Users can make delicious, creative meals from ingredients they already have

## v1.3 Requirements

Requirements for v1.3 UX/UI Polish. Each maps to roadmap phases.

### Recipe Images

- [x] **IMG-01**: All 27 seeded recipes have AI-generated food photos stored in R2
- [x] **IMG-02**: Recipe cards on the browse page (/recipes) display real recipe images
- [x] **IMG-03**: Hero slider displays actual recipe images (not placeholders)
- [x] **IMG-04**: Graceful fallback when image is missing or fails to load

### Pantry UX

- [x] **PNTR-01**: Each ingredient in My Pantry displays a thumbnail image
- [x] **PNTR-02**: Ingredient search results show thumbnail images alongside names

### Generation UX

- [ ] **GENX-01**: Multi-step progress animation during recipe generation (Crafting recipe → Validating ingredients → Generating photo)
- [ ] **GENX-02**: Each progress step has distinct visual transition/animation
- [ ] **GENX-03**: Progress steps show estimated time remaining per step

### Ingredient Highlighting

- [ ] **INGR-01**: After generation, ingredients not in user's pantry are visually distinguished (color/badge)
- [ ] **INGR-02**: User can tap a missing ingredient to see substitution options
- [ ] **INGR-03**: AI suggests substitute ingredients based on user's pantry contents
- [ ] **INGR-04**: User can manually pick a replacement from their pantry items

### Favorites

- [ ] **FAV-01**: Recipe detail page has a clear save/remove favorite CTA (heart/bookmark)
- [ ] **FAV-02**: Favorites page lists all saved recipes with recipe cards
- [ ] **FAV-03**: User can remove a recipe from favorites on the Favorites page
- [ ] **FAV-04**: Favorite state persists across sessions (synced with server for logged-in users)

## Future Requirements

### Deferred from v1.3

- **NUTR-01**: Display nutritional information per recipe
- **SOCIAL-01**: Share recipes with other users
- **TREND-01**: Trending/popular recipes section

## Out of Scope

| Feature | Reason |
|---------|--------|
| Photo scanning of fridge | Deferred to v2 — complex ML pipeline |
| Voice input | Deferred to v2 — not core UX |
| Persistent substitution history | Session-local substitutions sufficient for v1.3 |
| Recipe collections/folders | Beyond favorites — future feature |
| Nutritional information | Not part of UX polish scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMG-01 | Phase 14 | Complete |
| IMG-02 | Phase 14 | Complete |
| IMG-03 | Phase 14 | Complete |
| IMG-04 | Phase 14 | Complete |
| PNTR-01 | Phase 15 | Complete |
| PNTR-02 | Phase 15 | Complete |
| GENX-01 | Phase 16 | Pending |
| GENX-02 | Phase 16 | Pending |
| GENX-03 | Phase 16 | Pending |
| INGR-01 | Phase 17 | Pending |
| INGR-02 | Phase 17 | Pending |
| INGR-03 | Phase 17 | Pending |
| INGR-04 | Phase 17 | Pending |
| FAV-01 | Phase 18 | Pending |
| FAV-02 | Phase 18 | Pending |
| FAV-03 | Phase 18 | Pending |
| FAV-04 | Phase 18 | Pending |

**Coverage:**
- v1.3 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 — traceability mapped to phases 14-18*
