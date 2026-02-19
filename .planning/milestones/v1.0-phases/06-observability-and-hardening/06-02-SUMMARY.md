# Summary: 06-02 — Non-blocking Resources and CLS Prevention

## One-Liner
Added async image decoding and fetch priority hints to prevent render-blocking and layout shift.

## What Was Done
- Added `decoding="async"` to `RecipeCard.vue` image element for off-main-thread decoding
- Added `decoding="async"` to `FeaturedCarousel.vue` image element
- Added dynamic `fetchpriority` to carousel: `"high"` for active slide, `"low"` for others
- Verified: no custom fonts (Tailwind system font stack — inherently non-blocking)
- Verified: CLS prevented by existing `aspect-[4/3]` and `aspect-[16/9]` containers

## Files Changed
- `app/components/RecipeCard.vue` (modified — added `decoding="async"`)
- `app/components/FeaturedCarousel.vue` (modified — added `decoding="async"` + `fetchpriority`)

## Must-Haves Verification
- [x] All images use async decoding
- [x] No render-blocking font or image resources
- [x] CLS mitigated by aspect-ratio containers
