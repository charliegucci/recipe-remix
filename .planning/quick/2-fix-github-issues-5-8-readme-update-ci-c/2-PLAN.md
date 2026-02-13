---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - nuxt.config.ts
  - app/pages/index.vue
  - app/pages/favorites.vue
  - app/pages/history.vue
  - app/pages/pantry.vue
  - app/pages/generate.vue
  - app/pages/recipe/[slug].vue
  - public/robots.txt
  - README.md
  - .planning/STATE.md
  - .github/workflows/lighthouse.yml
  - .github/workflows/deploy.yml
  - app/components/FeaturedCarousel.vue
  - app/components/RecipeCard.vue
autonomous: true
must_haves:
  truths:
    - "All source files reference https://remix-recipe.com instead of the old pages.dev URL"
    - "README reflects v1.1 SHIPPED status with all CI badges"
    - "No duplicate Lighthouse workflow exists"
    - "Hero slider and recipe cards show images via NuxtHub blob API"
    - "Deploy workflow uses correct NuxtHub output directory"
  artifacts:
    - path: "nuxt.config.ts"
      provides: "Updated site.url and schemaOrg.identity.url"
      contains: "remix-recipe.com"
    - path: "README.md"
      provides: "Updated status, URL, and CI badges"
      contains: "SHIPPED"
    - path: "app/components/FeaturedCarousel.vue"
      provides: "Fixed image URL using NuxtHub blob API"
      contains: "_hub/blob/"
  key_links:
    - from: "app/components/FeaturedCarousel.vue"
      to: "NuxtHub blob storage"
      via: "/_hub/blob/{imageKey} URL pattern"
      pattern: "_hub/blob/"
    - from: "app/components/RecipeCard.vue"
      to: "NuxtHub blob storage"
      via: "/_hub/blob/{imageKey} URL pattern"
      pattern: "_hub/blob/"
---

<objective>
Fix GitHub issues #5-#8: update README with shipped status and CI badges, remove duplicate Lighthouse workflow, fix deploy output dir, replace all production URL references with https://remix-recipe.com, and fix hero slider/recipe card image URLs to use NuxtHub blob API.

Purpose: Clean up post-v1.1 issues so CI/CD works correctly, URLs point to the custom domain, and images render properly.
Output: All source files updated, duplicate workflow removed, README polished.
</objective>

<execution_context>
@/Users/wilsonesmundo/.claude/get-shit-done/workflows/execute-plan.md
@/Users/wilsonesmundo/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@README.md
@nuxt.config.ts
@.github/workflows/ci.yml
@.github/workflows/lighthouse.yml
@.github/workflows/deploy.yml
@.github/workflows/preview.yml
@.github/workflows/smoke-tests.yml
@app/components/FeaturedCarousel.vue
@app/components/RecipeCard.vue
@app/pages/index.vue
@app/pages/favorites.vue
@app/pages/history.vue
@app/pages/pantry.vue
@app/pages/generate.vue
@app/pages/recipe/[slug].vue
@public/robots.txt
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace production URL and fix CI/CD workflows</name>
  <files>
    nuxt.config.ts
    app/pages/index.vue
    app/pages/favorites.vue
    app/pages/history.vue
    app/pages/pantry.vue
    app/pages/generate.vue
    app/pages/recipe/[slug].vue
    public/robots.txt
    .planning/STATE.md
    .github/workflows/lighthouse.yml
    .github/workflows/deploy.yml
    .github/workflows/preview.yml
  </files>
  <action>
    **URL replacement (Issue #7):** In ALL source files listed below, replace `https://recipe-remix-9fd.pages.dev` with `https://remix-recipe.com`. Do NOT modify files under `.planning/phases/` — those are historical records.

    Files to update:
    - `nuxt.config.ts` — `site.url` (line 14) and `schemaOrg.identity.url` (line 26)
    - `app/pages/index.vue` — `ogImage` (line 29), `ogUrl` (line 31), canonical `href` (line 35)
    - `app/pages/favorites.vue` — canonical `href` (line 33)
    - `app/pages/history.vue` — canonical `href` (line 33)
    - `app/pages/pantry.vue` — canonical `href` (line 118)
    - `app/pages/generate.vue` — canonical `href` (line 255)
    - `app/pages/recipe/[slug].vue` — `siteUrl` const (line 49)
    - `public/robots.txt` — Sitemap URL (line 3)
    - `.planning/STATE.md` — Production URL line (line 28)

    **CI/CD fixes (Issue #6):**
    1. DELETE `.github/workflows/lighthouse.yml` entirely — it duplicates the lighthouse job already in `ci.yml`
    2. In `.github/workflows/deploy.yml` line 30: change `dist` to `.output/public` (NuxtHub/Nitro outputs to `.output/public`, not `dist`)
    3. In `.github/workflows/preview.yml` line 35: change `dist` to `.output/public` for the same reason
  </action>
  <verify>
    Run: `grep -r "recipe-remix-9fd.pages.dev" nuxt.config.ts app/ public/ README.md .planning/STATE.md` — should return NO matches (README will be updated in Task 2).
    Run: `test ! -f .github/workflows/lighthouse.yml && echo "DELETED"` — should print DELETED.
    Run: `grep ".output/public" .github/workflows/deploy.yml .github/workflows/preview.yml` — should show both files reference correct output dir.
  </verify>
  <done>
    All source files use https://remix-recipe.com. Duplicate lighthouse.yml deleted. Deploy workflows use .output/public.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update README with shipped status, new URL, and CI badges</name>
  <files>README.md</files>
  <action>
    **Issue #5 — README updates:**

    1. **CI badges (lines 3-4):** Add badges for ci.yml and smoke-tests.yml AFTER the existing deploy/preview badges. The existing badges use `charliegucci/recipe-remix` as the repo path. Add:
       ```
       [![CI Gates](https://github.com/charliegucci/recipe-remix/actions/workflows/ci.yml/badge.svg)](https://github.com/charliegucci/recipe-remix/actions/workflows/ci.yml)
       [![Smoke Tests](https://github.com/charliegucci/recipe-remix/actions/workflows/smoke-tests.yml/badge.svg)](https://github.com/charliegucci/recipe-remix/actions/workflows/smoke-tests.yml)
       ```

    2. **Production URL (line 43):** Change `https://recipe-remix-9fd.pages.dev` to `https://remix-recipe.com`

    3. **v1.1 status (lines 38-41):** Update the "Live Status" section:
       - Change line 39 from: `- **Current milestone:** v1.1 – **Test on Production**`
         To: `- **Current milestone:** v1.1 – **Test on Production** — SHIPPED (2026-02-13)`
       - Change line 40 from the "Goal: Deploy to Cloudflare..." description
         To: `  - Deployed to Cloudflare Pages via NuxtHub with all features validated, UX polished, SEO optimized, and Lighthouse 90+ achieved.`

    4. **Project Status section (lines 303-313):** Update the v1.1 entry:
       - Change `**v1.1 – Test on Production (in progress)**` to `**v1.1 – Test on Production** (shipped 2026-02-13)`
       - Replace the bullet list of goals with a summary: `  - 4 phases completed (deployment, bug fixes, SEO, performance)`  followed by `  - 10,768 LOC across 10 phases, 40 plans`
  </action>
  <verify>
    Run: `grep -c "badge.svg" README.md` — should return 4 (deploy, preview, ci, smoke-tests).
    Run: `grep "SHIPPED" README.md` — should find the v1.1 shipped status.
    Run: `grep "remix-recipe.com" README.md` — should find the production URL.
    Run: `grep "recipe-remix-9fd" README.md` — should return NO matches.
  </verify>
  <done>
    README has 4 CI badges, v1.1 marked as SHIPPED, production URL is https://remix-recipe.com.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix image URLs in FeaturedCarousel, RecipeCard, and history page</name>
  <files>
    app/components/FeaturedCarousel.vue
    app/components/RecipeCard.vue
    app/pages/history.vue
  </files>
  <action>
    **Issue #8 — Fix image URL construction:**

    The `r2PublicUrl` runtime config is not set, causing images to fall back to a placeholder URL that doesn't work. NuxtHub blob storage is accessed via `/_hub/blob/{key}`. The generate page already uses this pattern correctly (line 23: `/_hub/blob/${generatedRecipe.imageKey}`). Apply the same pattern to all other components.

    **FeaturedCarousel.vue:**
    - Replace the `getImageUrl` function (lines 18-23) with:
      ```ts
      const getImageUrl = (imageKey: string | null) => {
        if (!imageKey) return null
        if (imageKey.startsWith('http')) return imageKey
        return `/_hub/blob/${imageKey}`
      }
      ```
    - Remove the `runtimeConfig` line (line 14: `const runtimeConfig = useRuntimeConfig()`) since it's no longer needed.
    - Replace the "No image" fallback div (lines 85-89) with a styled gradient placeholder:
      ```html
      <div
        v-else
        class="w-full h-full bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 flex items-center justify-center"
      >
        <svg class="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      </div>
      ```

    **RecipeCard.vue:**
    - Replace the `imageUrl` computed (lines 19-26) with:
      ```ts
      const imageUrl = computed(() => {
        if (!props.recipe.imageKey) return null
        if (props.recipe.imageKey.startsWith('http')) return props.recipe.imageKey
        return `/_hub/blob/${props.recipe.imageKey}`
      })
      ```
    - Remove the `runtimeConfig` line (line 18: `const runtimeConfig = useRuntimeConfig()`) since it's no longer needed.

    **history.vue:**
    - Find the image `src` binding that uses `r2PublicUrl` (line 112) and replace with the same pattern:
      ```
      :src="recipe.imageKey.startsWith('http') ? recipe.imageKey : `/_hub/blob/${recipe.imageKey}`"
      ```
  </action>
  <verify>
    Run: `grep -r "r2PublicUrl\|pub-placeholder" app/` — should return NO matches.
    Run: `grep -c "_hub/blob/" app/components/FeaturedCarousel.vue app/components/RecipeCard.vue app/pages/history.vue app/pages/generate.vue` — all 4 files should have at least 1 match.
    Run: `npm run build` — build should succeed without errors.
  </verify>
  <done>
    All image components use `/_hub/blob/{key}` pattern. No references to r2PublicUrl or placeholder URL remain. Fallback shows a warm gradient instead of "No image" text.
  </done>
</task>

</tasks>

<verification>
1. `grep -r "recipe-remix-9fd.pages.dev" nuxt.config.ts app/ public/ README.md .planning/STATE.md` returns nothing
2. `grep -r "r2PublicUrl\|pub-placeholder" app/` returns nothing
3. `test ! -f .github/workflows/lighthouse.yml` succeeds
4. `grep -c "badge.svg" README.md` returns 4
5. `npm run build` succeeds
</verification>

<success_criteria>
- All source files reference https://remix-recipe.com (not the old pages.dev URL)
- README shows v1.1 as SHIPPED with 4 CI status badges
- Duplicate lighthouse.yml workflow is deleted
- Deploy/preview workflows reference .output/public
- All image components use /_hub/blob/{key} pattern with no r2PublicUrl references
- FeaturedCarousel fallback shows gradient instead of "No image" text
- Build passes
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-github-issues-5-8-readme-update-ci-c/2-SUMMARY.md`
</output>
