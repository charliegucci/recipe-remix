# Phase 2: Core Read Path - Research

**Researched:** 2026-02-05
**Domain:** Nuxt 4 SSR data fetching, recipe card UI, KV caching, infinite scroll, image serving from R2
**Confidence:** HIGH (core patterns verified against official docs; image caveat verified against GitHub issues)

## Summary

Phase 2 builds the recipe browsing and reading experience on top of the Phase 1 foundation. The domain spans three layers: server API routes that read from D1 and cache into KV, SSR page components that fetch data without double-fetching, and a UI layer of responsive recipe cards with skeleton loading states, infinite scroll, and interactive detail pages.

The existing codebase runs `@nuxthub/core@0.8.27`. This version still ships `hubDatabase()` as the standard database accessor. The v0.10 migration to `@nuxthub/db` has NOT happened yet and must not be attempted in this phase. Continue using the `useDrizzle(event)` helper already established in Phase 1. The `hubKV()` composable is the correct way to access the KV namespace for caching.

Nuxt 4 data fetching via `useFetch` and `useAsyncData` solves the SSR double-fetch problem automatically -- data fetched server-side transfers to the client via the payload. This is the mechanism that satisfies the success criterion of "all rendered on first paint with no loading spinner for the text content." Infinite scroll uses VueUse's `useInfiniteScroll` composable, which requires adding `@vueuse/core` to the project.

**Primary recommendation:** Build server API routes first (recipes list, single recipe), wire KV read-through caching, then build the SSR page components that call those routes. The UI layer (cards, skeletons, detail page interactivity) comes last and is purely client-side rendering concerns.

## Standard Stack

The established libraries/tools for this phase, all building on the Phase 1 foundation:

### Core (already installed)
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nuxt | ^3.15.0 (compat v4) | SSR framework, file-based routing, server API routes | The runtime for everything in this phase |
| @nuxthub/core | 0.8.27 | hubDatabase(), hubKV() composables for D1 and KV access | Already wired; do not upgrade to v0.10 in this phase |
| drizzle-orm | ^0.45.1 | Type-safe SQL queries against D1 | Already configured with schema and migrations |
| vue | ^3.5.0 | Component framework | Underlying everything |
| tailwindcss | ^4.1.18 | Responsive layout and skeleton animations | Already configured with vite plugin |

### New (must be installed in Phase 2)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vueuse/core | latest | `useInfiniteScroll` composable for category section pagination | The standard Vue composable library; no Nuxt-specific infinite scroll module has comparable adoption or maintenance |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @vueuse/core useInfiniteScroll | nuxt-infinite-scroll-module or TanStack Query | VueUse is framework-standard, actively maintained, zero extra bundle for a single composable. TanStack adds significant bundle weight for one feature. The third-party Nuxt modules are low-maintenance. |
| Plain `<img>` with loading="lazy" | @nuxt/image (NuxtImg component) | NuxtImg has confirmed broken optimization on Cloudflare Pages (GitHub issues #1061, #1588). Image props (format, height, width, fit) silently do not apply in production. Use standard `<img>` tags with native lazy loading and serve from R2 public bucket directly. |
| animate-pulse (built-in) | Custom shimmer keyframe animation | animate-pulse is sufficient and ships zero extra CSS. A shimmer effect requires a custom keyframe definition in main.css. Recommend animate-pulse for v1; upgrade to shimmer only if visual polish is explicitly called out. |

**Installation:**
```bash
npm install @vueuse/core
```

## Architecture Patterns

### Recommended File Structure for Phase 2

All new files slot into the existing structure established in Phase 1:

```
server/
  api/
    auth/[...all].ts          # Phase 1 -- do not touch
    recipes/
      index.get.ts            # GET /api/recipes -- paginated list by category
      [id].get.ts             # GET /api/recipes/:id -- single recipe detail
  db/
    schema.ts                 # ADD: recipes table, recipe_ingredients, categories
  database/
    migrations/
      0001_*.sql              # Drizzle-generated: recipes schema
app/
  pages/
    index.vue                 # REPLACE: home page with featured carousel + categories
    recipe/
      [id].vue                # NEW: recipe detail page
  components/
    RecipeCard.vue            # NEW: image-forward card with metadata
    RecipeCardSkeleton.vue    # NEW: placeholder card matching RecipeCard layout
    RecipeCategorySection.vue # NEW: section header + card grid + infinite scroll trigger
    IngredientChecklist.vue   # NEW: interactive checkbox list for ingredients
    StepCard.vue              # NEW: single cooking step with completion checkbox
    FeaturedCarousel.vue      # NEW: hero carousel for 3-5 featured recipes
  assets/
    css/main.css              # ADD: skeleton shimmer keyframes if shimmer chosen over pulse
```

### Pattern 1: KV Read-Through Cache in Server API Routes

**What:** Every server API route checks KV first. On a miss, it queries D1 via Drizzle, writes the result to KV with a TTL, and returns the data. This is the pattern that delivers sub-200ms repeat visits.

**When to use:** All recipe read endpoints. Do NOT apply to auth routes or any endpoint that returns user-specific data that changes on every request.

**Two valid approaches, pick one per route:**

**Approach A: Manual KV read-through (more control, recommended for single-recipe lookups)**
```typescript
// server/api/recipes/[id].get.ts
// Source: NuxtHub KV docs (hub.nuxt.com/docs/features/kv) + ARCHITECTURE.md read-path pattern
import { useDrizzle, schema } from '~/server/utils/drizzle'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const kv = hubKV()

  // 1. Check KV cache
  const cacheKey = `recipe:${id}`
  const cached = await kv.getItem(cacheKey)
  if (cached) {
    return cached // KV returns parsed JSON automatically
  }

  // 2. Miss -- query D1
  const db = useDrizzle(event)
  const recipe = await db.select().from(schema.recipes).where(
    eq(schema.recipes.id, id)
  ).get()

  if (!recipe) {
    throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
  }

  // 3. Write back to KV with 1-hour TTL
  await kv.setItem(cacheKey, recipe, { ttl: 3600 })

  return recipe
})
```

**Approach B: cachedEventHandler (less code, built into Nitro, recommended for list endpoints)**
```typescript
// server/api/recipes/index.get.ts
// Source: NuxtHub cache docs (hub.nuxt.com/docs/features/cache)
// cachedEventHandler wraps the entire handler; Nitro manages KV automatically.
// Stale-while-revalidate is ON by default.

import { cachedEventHandler } from 'h3'

export default cachedEventHandler(async (event) => {
  const category = getQuery(event).category as string | undefined
  const page = Number(getQuery(event).page) || 1

  const db = useDrizzle(event)
  // ... query D1 ...
  return recipes
}, {
  maxAge: 300, // 5 minutes -- list pages change as new recipes are added
  getKey: (event) => {
    const { category, page } = getQuery(event)
    return `recipes-list:${category || 'all'}:${page || 1}`
  }
})
```

**Decision rule:** Use Approach A when you need to inspect the cached value or handle 404s. Use Approach B when the entire response is the cache payload and you want Nitro to manage invalidation automatically.

### Pattern 2: SSR Data Fetching in Page Components

**What:** `useFetch` or `useAsyncData` in `<script setup>` blocks. Data is fetched server-side during SSR and serialized into the HTML payload. The client hydrates from the payload without re-fetching. This is how "no loading spinner for the text content" is achieved.

**When to use:** Every page that displays recipe data. Never use `$fetch` directly in setup for data that must appear on first paint.

```vue
<!-- app/pages/recipe/[id].vue -->
<!-- Source: Nuxt 4 data fetching docs (nuxt.com/docs/4.x/getting-started/data-fetching) -->
<script setup lang="ts">
const route = useRoute()

// useFetch key is the URL -- Nuxt deduplicates automatically
const { data: recipe, error, status } = await useFetch(`/api/recipes/${route.params.id}`)

// Guard: if the API returned 404, Nuxt sets error automatically
if (error.value) {
  throw error.value // triggers Nuxt error page
}
</script>
```

**For the home page (parallel fetches for featured + categories):**
```vue
<!-- app/pages/index.vue -->
<script setup lang="ts">
// useAsyncData with Promise.all for parallel fetching
const { data } = await useAsyncData('home', () =>
  Promise.all([
    $fetch('/api/recipes/featured'),       // 3-5 featured recipes
    $fetch('/api/recipes?category=italian&page=1'),
    $fetch('/api/recipes?category=mexican&page=1'),
    $fetch('/api/recipes?category=asian&page=1'),
    $fetch('/api/recipes?category=american&page=1'),
    $fetch('/api/recipes?category=mediterranean&page=1'),
  ])
)

const [featured, italian, mexican, asian, american, mediterranean] = data.value
</script>
```

### Pattern 3: Responsive Recipe Card Grid

**What:** CSS Grid with mobile-first breakpoints. Single column on mobile, 2 on tablet, 3 on desktop. NOT masonry/Pinterest-column layout -- that requires equal-height cards to look right in a standard grid, which is achievable with CSS Grid and `items-stretch`.

**When to use:** All recipe listing contexts (category sections, search results, favorites).

**Grid density recommendation (Claude's Discretion item):** 3 columns on desktop (`lg:grid-cols-3`). 4 columns (`lg:grid-cols-4`) makes cards too small for the image-forward layout the user locked in. 2 columns wastes desktop space. 3 is the sweet spot for image-forward recipe cards.

```vue
<!-- RecipeCard grid wrapper -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  <RecipeCard v-for="recipe in recipes" :key="recipe.id" :recipe="recipe" />
</div>
```

### Pattern 4: Infinite Scroll Within Category Sections

**What:** Each category section loads its first page server-side (via SSR). When the user scrolls near the bottom of that section, `useInfiniteScroll` triggers a client-side `$fetch` to load page 2, 3, etc. and appends to the reactive list.

**When to use:** Category sections on the home page. NOT the featured carousel (that is a fixed set).

```vue
<!-- app/components/RecipeCategorySection.vue -->
<!-- Source: VueUse docs (vueuse.org/core/useinfinitescroll/) -->
<script setup lang="ts">
import { useInfiniteScroll } from '@vueuse/core'

const props = defineProps<{
  category: string
  initialRecipes: Recipe[]
}>()

const recipes = ref(props.initialRecipes)
const page = ref(1)
const hasMore = ref(true)
const sectionEl = useTemplateRef('sectionEl')

useInfiniteScroll(
  sectionEl,
  async () => {
    if (!hasMore.value) return
    page.value++
    const more = await $fetch(`/api/recipes?category=${props.category}&page=${page.value}`)
    if (more.length === 0) {
      hasMore.value = false
    } else {
      recipes.value.push(...more)
    }
  },
  { distance: 200, canLoadMore: () => hasMore.value }
)
</script>
```

**Key note:** `useInfiniteScroll` targets a specific element, not the window. Each category section is its own scroll container OR you use `window` as the target and trigger based on proximity to each section's bottom. The section-element approach is simpler and avoids interference between sections.

### Pattern 5: Interactive Ingredient Checklist and Step Cards

**What:** Client-side state only. Checkboxes backed by `localStorage` keyed on recipe ID so progress survives page reloads and app-switching (a critical mobile requirement per PITFALLS.md).

**When to use:** Recipe detail page only.

```vue
<!-- app/components/IngredientChecklist.vue -->
<script setup lang="ts">
const props = defineProps<{
  recipeId: string
  ingredients: Array<{ name: string; quantity: string; unit: string }>
}>()

// Persist checked state to localStorage
const storageKey = `recipe:${props.recipeId}:ingredients-checked`
const checked = ref<Record<number, boolean>>(
  JSON.parse(localStorage?.getItem(storageKey) || '{}')
)

watch(checked, (val) => {
  localStorage?.setItem(storageKey, JSON.stringify(val))
}, { deep: true })

function toggle(index: number) {
  checked.value[index] = !checked.value[index]
}
</script>
```

**SSR safety note:** `localStorage` is not available during SSR. Guard all localStorage access with a check or use `onMounted` for the initial read. The `checked` ref should initialize as empty on the server and hydrate from localStorage on the client.

### Anti-Patterns to Avoid

- **Using `$fetch` directly in `<script setup>` for page data.** This causes client-only fetching, meaning a loading spinner on first paint. Use `useFetch` or `useAsyncData` instead.
- **Using `nuxt/image` (NuxtImg) for recipe images.** Confirmed broken on Cloudflare Pages -- optimization props silently fail in production. Use native `<img>` with `loading="lazy"` and R2 public bucket URLs.
- **Caching user-specific data in KV with long TTLs.** Favorites, ratings, pantry are per-user. Either do not cache them, or key them with the user ID and use very short TTLs.
- **Querying D1 with full-table scans.** Every recipe list query must use indexed WHERE clauses. The `category` column needs an index.
- **Upgrading @nuxthub/core to v0.10+.** This removes `hubDatabase()` and breaks the auth setup from Phase 1. Stay on 0.8.x.

## Don't Hand-Roll

Problems that look simple but have existing solutions or documented edge cases:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Infinite scroll detection | Custom scroll event listener with debounce | `useInfiniteScroll` from `@vueuse/core` | Handles edge cases: resize events, nested scroll containers, initial load when content is shorter than viewport, cleanup on unmount |
| SSR-safe data fetching with deduplication | Manual fetch + payload serialization | `useFetch` / `useAsyncData` | Nuxt's built-in composables handle payload transfer, hydration deduplication, and error propagation. Hand-rolling this is how you get double-fetches and hydration mismatches |
| Image optimization/resizing on Cloudflare | Custom Worker image proxy | Cloudflare Image Transformations via `/cdn-cgi/image/` URL params | Resizing, format conversion, and quality reduction are all handled by Cloudflare's edge. No Worker code needed. But note: do NOT use `nuxt/image` module -- call the `/cdn-cgi/image/` URLs directly if transformation is needed |
| Skeleton card animation | Custom CSS keyframe animation | Tailwind `animate-pulse` utility | Ships zero extra CSS. Covers the shimmer use case adequately. Only add a custom shimmer keyframe if animate-pulse is explicitly rejected during polish |

**Key insight:** The read path is fundamentally a data-fetching and rendering problem. The infrastructure (KV caching, SSR payload, lazy image loading) handles the hard parts. Custom code should be limited to layout and interactivity logic.

## Common Pitfalls

### Pitfall 1: NuxtImg Silently Fails on Cloudflare Pages
**What goes wrong:** Developer adds `nuxt/image` module and uses `<NuxtImg>` component. Works perfectly in local dev. In production on Cloudflare Pages, images render at original size with no format conversion, no resizing, no quality reduction.
**Why it happens:** Confirmed in nuxt/image GitHub issues #1061 and #1588. The Cloudflare Pages environment does not properly invoke the image transformation pipeline that NuxtImg depends on.
**How to avoid:** Do not install `@nuxt/image`. Serve recipe images as plain `<img src="https://[r2-public-domain]/recipes/[id].webp" loading="lazy">`. If image transformation is needed (resize for thumbnails), use Cloudflare Image Transformations URL syntax directly: `https://[domain]/cdn-cgi/image/width=400,format=webp/recipes/[id].jpg`.
**Warning signs:** Images look fine locally but are full-size in production. Network tab shows original file size.

### Pitfall 2: localStorage Unavailable During SSR
**What goes wrong:** Component reads `localStorage` at the top level of `<script setup>`. Server-side render crashes with "localStorage is not defined."
**Why it happens:** Nuxt runs `<script setup>` on both server and client. The server (Cloudflare Worker) has no `localStorage`.
**How to avoid:** Initialize interactive state (ingredient checks, step completions) as empty on the server. Hydrate from `localStorage` inside `onMounted()`. Use a pattern like: `const checked = ref({})` then `onMounted(() => { checked.value = JSON.parse(localStorage.getItem(key) || '{}') })`.
**Warning signs:** Works in browser dev mode but crashes on first SSR render or during `nuxt generate`.

### Pitfall 3: KV Eventual Consistency on Freshly Written Data
**What goes wrong:** A recipe is created (written to D1 and cached to KV). Another request arrives within seconds and reads stale KV data (or a negative cache entry) before propagation completes.
**Why it happens:** KV is eventually consistent -- writes propagate globally within ~60 seconds. Per PITFALLS.md and the ARCHITECTURE.md KV consistency caveat.
**How to avoid:** For the Core Read Path, this is not a concern because all recipes are pre-seeded (not freshly generated). The seeding happens during database setup, not at runtime. When AI generation is added in a later phase, the post-generation response must return the recipe directly from D1, not rely on a KV read.
**Warning signs:** Recipe appears in D1 but `/api/recipes/:id` returns 404 for a few seconds after creation.

### Pitfall 4: Missing Database Index on Category Column
**What goes wrong:** Listing recipes by category does a full table scan. Works fine with 50 seeded recipes. Becomes visibly slow at 1000+ recipes and burns D1 `rows_read` budget on the free tier.
**Why it happens:** Drizzle generates the table but does not automatically create indexes for columns used in WHERE clauses.
**How to avoid:** Add an index on the `cuisine_tags` or `category` column in the schema migration. If cuisine categories are stored as a JSON array, create a junction table (`recipe_categories`) with an index on `category_id` for efficient filtering. Do not rely on `json_extract()` in WHERE clauses for listing queries.
**Warning signs:** D1 query meta shows `rows_read` equal to total table size for category list queries.

### Pitfall 5: Infinite Scroll Fires Immediately on Page Load
**What goes wrong:** The first page of recipes is shorter than the viewport. `useInfiniteScroll` detects available space and immediately fires `onLoadMore`, fetching page 2 before the user has seen page 1.
**Why it happens:** The `distance` threshold is measured from the scroll position, not from user interaction.
**How to avoid:** Set `canLoadMore` to return `false` until the first page has fully rendered (use a `mounted` flag or check that `recipes.length > 0`). Alternatively, set a generous `distance` value (200px+) so it does not fire until the user is actively scrolling.
**Warning signs:** Network tab shows page 2 fetch firing immediately on navigation.

### Pitfall 6: Image Hero Banner Breaks on Mobile Without Fallback
**What goes wrong:** Recipe detail page uses a large hero image that either takes too long to load or fails entirely on slow mobile networks, leaving a blank space above the fold.
**Why it happens:** No fallback state is defined for the image container.
**How to avoid:** Per the user's locked decision -- "Graceful image fallback -- adjust layout to work without image if loading fails." Wrap the hero image in a container with a fixed background color (matching the skeleton). Use the `onerror` event or a CSS `object-fit: cover` container that collapses gracefully. The layout must not shift when the image loads or fails.
**Warning signs:** Layout jumps or shifts when image loads. Blank white space on image failure.

## Code Examples

Verified patterns from official sources, adapted to the existing codebase conventions:

### Drizzle Schema Addition: Recipes Table
```typescript
// server/db/schema.ts -- ADD after existing auth tables
// Source: Drizzle ORM docs + ARCHITECTURE.md schema design
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),                          // stable UUID -- satisfies "stable identity via persistent IDs"
  title: text('title').notNull(),
  description: text('description'),
  ingredients: text('ingredients').notNull(),           // JSON: [{ name, quantity, unit }]
  instructions: text('instructions').notNull(),         // JSON: [string] -- ordered steps
  cuisineTags: text('cuisine_tags').default('[]'),      // JSON: ["italian", "mexican"]
  dietaryTags: text('dietary_tags').default('[]'),      // JSON: ["vegetarian", "gluten-free"]
  cookTime: integer('cook_time'),                       // minutes
  difficulty: text('difficulty'),                       // "easy" | "medium" | "hard"
  imageKey: text('image_key'),                          // R2 object key (nullable)
  source: text('source').notNull().default('curated'),  // "curated" | "ai_generated"
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// Junction table for efficient category filtering (avoids json_extract in WHERE)
export const recipeCategories = sqliteTable('recipe_categories', {
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),  // "italian" | "mexican" | "asian" | "american" | "mediterranean"
})
```

### Server API Route: Single Recipe with KV Cache
```typescript
// server/api/recipes/[id].get.ts
// Source: Nuxt 4 server docs + NuxtHub KV docs + ARCHITECTURE.md read-path pattern
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const kv = hubKV()
  const cacheKey = `recipe:${id}`

  // KV read-through
  const cached = await kv.getItem(cacheKey)
  if (cached) return cached

  // D1 query
  const db = useDrizzle(event)
  const recipe = await db.select().from(schema.recipes)
    .where(eq(schema.recipes.id, id))
    .get()

  if (!recipe) {
    throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
  }

  // Parse JSON fields (stored as text in SQLite)
  const enriched = {
    ...recipe,
    ingredients: JSON.parse(recipe.ingredients),
    instructions: JSON.parse(recipe.instructions),
    cuisineTags: JSON.parse(recipe.cuisineTags || '[]'),
    dietaryTags: JSON.parse(recipe.dietaryTags || '[]'),
  }

  // Cache for 1 hour
  await kv.setItem(cacheKey, enriched, { ttl: 3600 })

  return enriched
})
```

### Server API Route: Recipe List by Category (Paginated)
```typescript
// server/api/recipes/index.get.ts
// Source: Nuxt 4 server docs + Drizzle ORM
import { eq, and } from 'drizzle-orm'

const PAGE_SIZE = 12 // 3 columns x 4 rows per page load

export default defineEventHandler(async (event) => {
  const { category, page } = getQuery(event)
  const pageNum = Number(page) || 1
  const offset = (pageNum - 1) * PAGE_SIZE

  const kv = hubKV()
  const cacheKey = `recipes:list:${category || 'all'}:${pageNum}`

  const cached = await kv.getItem(cacheKey)
  if (cached) return cached

  const db = useDrizzle(event)

  let query = db.select().from(schema.recipes)
    .orderBy(schema.recipes.createdAt)
    .limit(PAGE_SIZE)
    .offset(offset)

  // If category filter, join through recipeCategories
  if (category) {
    query = db.select().from(schema.recipes)
      .innerJoin(
        schema.recipeCategories,
        eq(schema.recipes.id, schema.recipeCategories.recipeId)
      )
      .where(eq(schema.recipeCategories.category, category))
      .orderBy(schema.recipes.createdAt)
      .limit(PAGE_SIZE)
      .offset(offset)
  }

  const recipes = await query

  // Parse JSON fields on each recipe
  const enriched = recipes.map(r => ({
    ...r,
    ingredients: JSON.parse(r.ingredients),
    instructions: JSON.parse(r.instructions),
    cuisineTags: JSON.parse(r.cuisineTags || '[]'),
    dietaryTags: JSON.parse(r.dietaryTags || '[]'),
  }))

  // Cache for 5 minutes
  await kv.setItem(cacheKey, enriched, { ttl: 300 })

  return enriched
})
```

### Server API Route: Featured Recipes
```typescript
// server/api/recipes/featured.get.ts
// Returns 3-5 curated recipes for the hero carousel.
// These are manually curated (flagged in a "featured" column or hardcoded IDs).
// Cache aggressively -- featured set changes rarely.

export default defineEventHandler(async (event) => {
  const kv = hubKV()
  const cached = await kv.getItem('recipes:featured')
  if (cached) return cached

  const db = useDrizzle(event)
  const featured = await db.select().from(schema.recipes)
    .where(eq(schema.recipes.featured, true))
    .limit(5)

  const enriched = featured.map(r => ({
    ...r,
    ingredients: JSON.parse(r.ingredients),
    cuisineTags: JSON.parse(r.cuisineTags || '[]'),
  }))

  // Cache for 24 hours -- featured set is editorially curated
  await kv.setItem('recipes:featured', enriched, { ttl: 86400 })

  return enriched
})
```

### Recipe Card Component Structure
```vue
<!-- app/components/RecipeCard.vue -->
<!-- Image-forward card per user's locked decision -->
<template>
  <NuxtLink :to="`/recipe/${recipe.id}`"
    class="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
  >
    <!-- Image container: fixed aspect ratio, handles missing image gracefully -->
    <div class="relative aspect-[4/3] bg-gray-200 overflow-hidden">
      <img
        v-if="recipe.imageKey"
        :src="imageUrl"
        :alt="recipe.title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <!-- Fallback: category-colored placeholder -->
      <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No image
      </div>
      <!-- Hover overlay (desktop only) -->
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-end p-3">
        <span class="text-white text-sm font-medium">View Recipe</span>
      </div>
    </div>

    <!-- Card body -->
    <div class="p-3 md:p-4">
      <h3 class="font-semibold text-gray-900 line-clamp-2">{{ recipe.title }}</h3>
      <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ recipe.description }}</p>

      <!-- Metadata row -->
      <div class="flex flex-wrap items-center gap-2 mt-2">
        <span class="text-xs text-gray-500">{{ recipe.cookTime }} min</span>
        <span class="text-gray-300">|</span>
        <span :class="difficultyClass" class="text-xs font-medium">{{ recipe.difficulty }}</span>
        <span class="text-gray-300">|</span>
        <!-- First cuisine tag only to keep the row compact -->
        <span class="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
          {{ recipe.cuisineTags[0] }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  recipe: {
    id: string
    title: string
    description: string
    cookTime: number
    difficulty: string
    cuisineTags: string[]
    imageKey: string | null
  }
}>()

// R2 public bucket URL -- configure via environment variable
const R2_PUBLIC_URL = 'https://images.reciperemix.com' // replace with actual R2 public domain

const imageUrl = computed(() =>
  props.recipe.imageKey ? `${R2_PUBLIC_URL}/${props.recipe.imageKey}` : null
)

const difficultyClass = computed(() => ({
  easy: 'text-green-600',
  medium: 'text-yellow-600',
  hard: 'text-red-600',
})[props.recipe.difficulty] || 'text-gray-600')
</script>
```

### Skeleton Card Component
```vue
<!-- app/components/RecipeCardSkeleton.vue -->
<!-- Matches the exact layout of RecipeCard so there is no layout shift on hydration -->
<template>
  <div class="bg-white rounded-xl shadow-sm overflow-hidden">
    <!-- Image placeholder -->
    <div class="aspect-[4/3] bg-gray-200 animate-pulse" />
    <!-- Body placeholder -->
    <div class="p-3 md:p-4 space-y-3">
      <div class="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
      <div class="h-3 bg-gray-200 animate-pulse rounded w-full" />
      <div class="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
      <!-- Metadata row placeholder -->
      <div class="flex gap-2 pt-1">
        <div class="h-3 bg-gray-200 animate-pulse rounded w-12" />
        <div class="h-3 bg-gray-200 animate-pulse rounded w-12" />
        <div class="h-3 bg-gray-200 animate-pulse rounded w-16" />
      </div>
    </div>
  </div>
</template>
```

### Recipe Detail Page: Image Placement Recommendation
**Claude's Discretion item:** Hero banner (full-width image above the fold) is the recommended placement. Reasons:
- Mobile-first: on a narrow screen, a hero banner is the only placement that gives the image enough space to be impactful without competing with text.
- It matches the image-forward card layout the user locked in -- the same visual language carries through from list to detail.
- Sidebar placement only works on desktop and creates an asymmetric layout that is harder to make responsive.
- Inline placement fragments the reading flow.

Hero image should use `aspect-[16/9]` or `aspect-[4/3]` with `object-cover` so it works at any width without distortion.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| hubDatabase() raw SQL | Drizzle ORM typed queries via useDrizzle() | Phase 1 established | Type safety on all queries; schema is the single source of truth |
| nuxt/image for optimization | Plain `<img>` + Cloudflare Image Transformations URLs | 2025 (known issue) | No module dependency; transformations happen at the URL level |
| Full-page skeleton loading | Per-component skeletons + SSR payload | Nuxt 4 default | SSR delivers text content on first paint; skeletons only needed for images and lazy-loaded sections |
| Custom infinite scroll | @vueuse/core useInfiniteScroll | Stable since 2024 | Handles all edge cases including nested scroll containers |

**Deprecated/outdated:**
- `hubDatabase()` raw SQL: Still works on 0.8.x but will be removed in v0.10. Do not add NEW raw SQL. Use Drizzle.
- `nuxt/image` on Cloudflare Pages: Confirmed broken. Do not use.
- NuxtHub Admin dashboard: Sunset December 31, 2025. Already passed. Use Cloudflare Pages Git CI.

## Open Questions

1. **Recipe image hosting -- is the R2 public bucket already configured?**
   - What we know: `wrangler.jsonc` defines an `IMAGES` binding for `recipe-remix-images` bucket. Phase 1 ARCHITECTURE.md recommends a public bucket on a custom domain.
   - What's unclear: Whether the bucket has been made public and whether a custom domain (e.g., `images.reciperemix.com`) has been configured in the Cloudflare dashboard. This is a dashboard action, not a code action.
   - Recommendation: The planner should include a task to verify/configure the R2 public bucket. If not configured, recipe images will not be accessible. Use a placeholder fallback in the UI until confirmed.

2. **Recipe seed data -- does a curated recipe dataset exist?**
   - What we know: The schema design assumes recipes are seeded. The Phase 2 success criteria say "all rendered on first paint" -- this requires data to exist.
   - What's unclear: Whether a seed script or dataset has been prepared. The ingredients table was planned for seeding in Phase 1 but no seed file exists in the codebase.
   - Recommendation: The planner must include a task to create seed data (at minimum 20-30 recipes across 5 categories with a "featured" flag on 3-5). This is a prerequisite for any UI work.

3. **Carousel library vs. hand-rolled carousel for featured recipes**
   - What we know: The user locked in "hero carousel at top with 3-5 featured recipes."
   - What's unclear: Whether to use a lightweight carousel library or hand-roll with CSS transforms.
   - Recommendation: Hand-roll a simple carousel. With only 3-5 slides, the implementation is trivial (CSS flexbox + translate + dot indicators). Adding a carousel library for 3-5 items is over-engineering. A touch-swipe handler on mobile can be added with a simple pointer event listener.

## Sources

### Primary (HIGH confidence)
- Nuxt 4 data fetching docs: https://nuxt.com/docs/4.x/getting-started/data-fetching -- verified useFetch, useAsyncData behavior
- Nuxt 4 server directory structure: https://nuxt.com/docs/4.x/directory-structure/server -- verified file naming conventions, defineEventHandler, getRouterParam
- NuxtHub KV docs: https://hub.nuxt.com/docs/features/kv -- verified hubKV(), setItem/getItem/removeItem with TTL
- NuxtHub cache docs: https://hub.nuxt.com/docs/features/cache + https://hub.nuxt.com/docs/cache/usage -- verified cachedEventHandler pattern
- NuxtHub database query docs: https://hub.nuxt.com/docs/database/query -- verified Drizzle ORM patterns
- VueUse useInfiniteScroll docs: https://vueuse.org/core/useinfinitescroll/ -- verified API signature, canLoadMore, distance options
- Cloudflare Image Transformations: https://image.nuxt.com/providers/cloudflare -- verified /cdn-cgi/image/ URL pattern
- Tailwind CSS animation docs: https://tailwindcss.com/docs/animation -- verified animate-pulse utility
- @nuxthub/core package.json: version 0.8.27 confirmed installed -- hubDatabase() is current

### Secondary (MEDIUM confidence)
- NuxtHub v0.9 to v0.10 migration guide: https://hub.nuxt.com/docs/getting-started/migration -- hubDatabase() removal timeline confirmed; relevant because staying on 0.8.x
- Tailwind grid docs: https://tailwindcss.com/docs/grid-template-columns -- grid-cols-N responsive pattern verified
- Nuxt Image Cloudflare provider: https://image.nuxt.com/providers/cloudflare -- setup docs; but known broken per issues below

### Tertiary (LOW confidence -- GitHub issues, community reports)
- nuxt/image issue #1061: "No image processing occurs after deployment (Cloudflare Pages)" -- confirms NuxtImg broken in production
- nuxt/image issue #1588: "NuxtImg optimization props not applied when deploying using with Cloudflare" -- corroborates #1061
- Multiple community reports of useInfiniteScroll firing too eagerly without canLoadMore -- informs Pitfall 5

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified against official docs; version confirmed in node_modules
- Architecture (API routes, KV caching, SSR fetching): HIGH -- patterns come directly from Nuxt 4 and NuxtHub official documentation
- UI patterns (grid, cards, skeletons): HIGH -- Tailwind utilities verified; component structure follows Phase 1 conventions
- Pitfalls: HIGH for #1 (NuxtImg), #2 (localStorage SSR), #4 (missing index); MEDIUM for #3 (KV consistency), #5 (infinite scroll timing)
- Image hosting: MEDIUM -- R2 bucket is configured in wrangler.jsonc but public access status is unverified

**Research date:** 2026-02-05
**Valid until:** 2026-03-07 (30 days -- all core libraries are stable; the only fast-moving item is @nuxthub/core minor versions, which do not break hubDatabase() until v0.10)
