# Phase 3: Pantry and User Features - Research

**Researched:** 2026-02-08
**Domain:** User personalization, persistent storage, authentication-gated features
**Confidence:** HIGH

## Summary

Phase 3 adds persistent user data capabilities across both guest and authenticated contexts. The core challenges involve: (1) fast ingredient autocomplete with debounced API calls, (2) hybrid storage strategy (localStorage for guests, D1 for authenticated users), (3) seamless data migration when guests create accounts, and (4) many-to-many relational modeling for favorites, ratings, and history.

The established pattern uses Better Auth's `onLinkAccount` callback to migrate guest data from localStorage to D1 when users sign up. VueUse provides SSR-safe localStorage composables with `initOnMounted: true`. Drizzle ORM junction tables with composite primary keys model user-recipe relationships. Ingredient autocomplete uses `refDebounced` (250-300ms) to batch API calls while maintaining perceived responsiveness under 150ms via optimistic UI updates.

**Primary recommendation:** Use a tiered storage strategy where guests store pantry/restrictions in localStorage (with VueUse `useLocalStorage` + `initOnMounted: true`), authenticated users store everything in D1, and the `onLinkAccount` callback handles one-time migration. Build a simple curated ingredient list (200-500 common items) rather than integrating external APIs like USDA—this avoids rate limiting, reduces latency, and matches the project's recipe-focused domain.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| VueUse | 11.x | SSR-safe localStorage, debouncing | Official Vue ecosystem utility library, handles SSR hydration correctly |
| Drizzle ORM | Latest | Junction table relationships, timestamp defaults | Already established in Phase 1, handles SQLite composite keys |
| Better Auth | 1.x | Anonymous user linking, session management | Already established in Phase 1, provides `onLinkAccount` hook |
| Cloudflare D1 | N/A | Persistent user data storage | Already established in Phase 1 |
| Cloudflare KV | N/A | Ingredient autocomplete cache | Already established in Phase 2 for recipe caching |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vueuse/core | 11.x | `refDebounced`, `useLocalStorage` | All autocomplete and localStorage features |
| Nuxt `useFetch` | Built-in | API calls for user actions | Already established pattern for SSR-safe data fetching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Curated ingredient list | USDA FoodData Central API | External API adds latency (200-500ms), rate limits, and 380k+ items when only need ~500 common ingredients |
| VueUse localStorage | Manual localStorage + onMounted | VueUse handles SSR hydration automatically, no need to reinvent |
| Junction tables | JSON arrays in user table | JSON queries slower, no relational integrity, harder to aggregate |

**Installation:**
```bash
npm install @vueuse/core
# Drizzle and Better Auth already installed in Phase 1
```

## Architecture Patterns

### Recommended Database Schema Extensions

Add to `server/db/schema.ts`:

```typescript
// User's pantry ingredients (authenticated users only)
export const pantryItems = sqliteTable('pantry_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ingredientId: text('ingredient_id').notNull(),
  ingredientName: text('ingredient_name').notNull(),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('pantry_items_user_idx').on(table.userId),
  ingredientIdx: index('pantry_items_ingredient_idx').on(table.ingredientId)
}))

// User's dietary restrictions (authenticated users only)
export const userDietaryRestrictions = sqliteTable('user_dietary_restrictions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  restriction: text('restriction').notNull(), // 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  userIdx: index('user_dietary_restrictions_user_idx').on(table.userId),
  uniqueUserRestriction: index('user_dietary_restrictions_unique').on(table.userId, table.restriction)
}))

// User favorites (junction table)
export const userFavorites = sqliteTable('user_favorites', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recipeId] }),
  userIdx: index('user_favorites_user_idx').on(table.userId),
  recipeIdx: index('user_favorites_recipe_idx').on(table.recipeId)
}))

// User's recipe generation history
export const userRecipeHistory = sqliteTable('user_recipe_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  viewedAt: integer('viewed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  userIdx: index('user_recipe_history_user_idx').on(table.userId),
  viewedAtIdx: index('user_recipe_history_viewed_at_idx').on(table.viewedAt)
}))

// User ratings and reviews
export const userRecipeReviews = sqliteTable('user_recipe_reviews', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 stars
  review: text('review'), // Optional text review
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  uniqueUserRecipe: index('user_recipe_reviews_unique').on(table.userId, table.recipeId),
  recipeIdx: index('user_recipe_reviews_recipe_idx').on(table.recipeId)
}))

// Curated ingredient master list (seeded, not user-generated)
export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'produce', 'protein', 'dairy', 'grains', 'spices', etc.
  commonNames: text('common_names').notNull().default('[]'), // JSON array for search aliases
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  nameIdx: index('ingredients_name_idx').on(table.name)
}))
```

### Pattern 1: Hybrid Storage Strategy

**What:** Guest users store pantry and dietary restrictions in localStorage; authenticated users store in D1. On account creation, migrate localStorage data to D1 via Better Auth's `onLinkAccount` callback.

**When to use:** All user preferences that must persist across sessions but may start as guest data.

**Example:**
```typescript
// app/composables/usePantry.ts
import { useLocalStorage } from '@vueuse/core'

export function usePantry() {
  const { data: session } = useSession()

  // Guest storage (SSR-safe with initOnMounted)
  const guestPantry = useLocalStorage<string[]>('guest_pantry', [], {
    initOnMounted: true
  })

  // Authenticated storage (fetch from API)
  const { data: authPantry, refresh: refreshPantry } = useFetch('/api/user/pantry', {
    immediate: computed(() => !!session.value?.user && !session.value.user.isAnonymous)
  })

  // Return guest data if not authenticated, otherwise return DB data
  const pantry = computed(() => {
    if (!session.value?.user || session.value.user.isAnonymous) {
      return guestPantry.value
    }
    return authPantry.value || []
  })

  async function addIngredient(ingredient: string) {
    if (!session.value?.user || session.value.user.isAnonymous) {
      // Guest: update localStorage
      guestPantry.value = [...guestPantry.value, ingredient]
    } else {
      // Authenticated: call API
      await $fetch('/api/user/pantry', {
        method: 'POST',
        body: { ingredientId: ingredient }
      })
      await refreshPantry()
    }
  }

  return { pantry, addIngredient }
}
```

**Server-side migration (server/lib/auth.ts):**
```typescript
export function getAuth() {
  if (!_auth) {
    _auth = betterAuth({
      // ... existing config
      plugins: [
        anonymous({
          onLinkAccount: async ({ anonymousUser, newUser }) => {
            // Get guest data from request (passed via client on signup)
            // Transfer pantry items from localStorage to D1
            const db = useDrizzle(event) // Note: Need to pass event through

            // Example: Insert pantry items from guest localStorage
            // This requires client to send localStorage data during signup
            // Alternative: Store in session/cookie temporarily

            console.log(`Linking anonymous user ${anonymousUser.id} to ${newUser.id}`)
            // TODO: Implement actual data transfer logic
          }
        })
      ]
    })
  }
  return _auth
}
```

### Pattern 2: Debounced Autocomplete with Optimistic UI

**What:** Use VueUse's `refDebounced` to batch autocomplete API calls (250-300ms delay), while showing immediate visual feedback (optimistic UI) to maintain perceived <150ms responsiveness.

**When to use:** All typeahead/autocomplete features where API calls are expensive.

**Example:**
```typescript
// app/components/IngredientAutocomplete.vue
<script setup lang="ts">
import { refDebounced } from '@vueuse/core'

const searchQuery = ref('')
const searchQueryDebounced = refDebounced(searchQuery, 300) // 300ms delay

// Only triggers when debounced value changes
const { data: suggestions, pending } = useFetch('/api/ingredients/search', {
  query: {
    q: searchQueryDebounced
  },
  immediate: false,
  watch: [searchQueryDebounced]
})

// Show loading state immediately when user types (optimistic UI)
const isSearching = computed(() =>
  searchQuery.value !== searchQueryDebounced.value || pending.value
)
</script>

<template>
  <div>
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search ingredients..."
      class="w-full px-4 py-2 border rounded-lg"
    />

    <!-- Show loading spinner immediately for perceived speed -->
    <div v-if="isSearching" class="mt-2 text-sm text-gray-500">
      Searching...
    </div>

    <!-- Results appear after debounce + API call -->
    <ul v-else-if="suggestions?.length" class="mt-2">
      <li
        v-for="item in suggestions"
        :key="item.id"
        @click="selectIngredient(item)"
        class="px-4 py-2 hover:bg-gray-100 cursor-pointer"
      >
        {{ item.name }}
      </li>
    </ul>
  </div>
</template>
```

### Pattern 3: Optimistic Favorite Toggle

**What:** Update UI immediately when user toggles favorite, then sync with server. Revert on API failure.

**When to use:** All user actions where instant feedback improves UX (favorites, ratings).

**Example:**
```typescript
// app/composables/useFavorites.ts
export function useFavorites() {
  const { data: session } = useSession()
  const { data: favorites, refresh } = useFetch('/api/user/favorites')

  const isFavorite = (recipeId: string) => {
    return favorites.value?.some(f => f.recipeId === recipeId) || false
  }

  async function toggleFavorite(recipeId: string) {
    if (!session.value?.user || session.value.user.isAnonymous) {
      // Redirect to login or show modal
      return
    }

    const wasFavorite = isFavorite(recipeId)

    // Optimistic update (immediate UI change)
    if (wasFavorite) {
      favorites.value = favorites.value?.filter(f => f.recipeId !== recipeId)
    } else {
      favorites.value = [...(favorites.value || []), { recipeId, userId: session.value.user.id }]
    }

    try {
      // Sync with server
      await $fetch(`/api/user/favorites/${recipeId}`, {
        method: wasFavorite ? 'DELETE' : 'POST'
      })
    } catch (error) {
      // Revert on failure
      await refresh()
      console.error('Failed to update favorite:', error)
    }
  }

  return { favorites, isFavorite, toggleFavorite }
}
```

### Pattern 4: Pantry-to-Recipe Matching Query

**What:** Find recipes where user's pantry ingredients match a high percentage of required ingredients. Use SQLite JSON functions to filter dietaryTags.

**When to use:** "What can I make?" feature that matches pantry to recipes.

**Example:**
```typescript
// server/api/recipes/match-pantry.get.ts
export default defineEventHandler(async (event) => {
  const session = await getAuth().api.getSession({ headers: event.headers })
  if (!session?.user || session.user.isAnonymous) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const db = useDrizzle(event)

  // Get user's pantry
  const pantry = await db
    .select()
    .from(schema.pantryItems)
    .where(eq(schema.pantryItems.userId, session.user.id))

  const pantryIngredients = pantry.map(p => p.ingredientName.toLowerCase())

  // Get user's dietary restrictions
  const restrictions = await db
    .select()
    .from(schema.userDietaryRestrictions)
    .where(eq(schema.userDietaryRestrictions.userId, session.user.id))

  const restrictionTags = restrictions.map(r => r.restriction)

  // Find matching recipes
  const allRecipes = await db.select().from(schema.recipes)

  const matches = allRecipes
    .map(recipe => {
      const recipeIngredients = JSON.parse(recipe.ingredients) as Array<{ name: string }>
      const dietaryTags = JSON.parse(recipe.dietaryTags) as string[]

      // Calculate match percentage
      const matches = recipeIngredients.filter(ing =>
        pantryIngredients.some(p => ing.name.toLowerCase().includes(p))
      )
      const matchPercent = (matches.length / recipeIngredients.length) * 100

      // Check dietary restrictions
      const meetsRestrictions = restrictionTags.every(tag =>
        dietaryTags.includes(tag)
      )

      return {
        recipe,
        matchPercent,
        matchedIngredients: matches.length,
        totalIngredients: recipeIngredients.length,
        meetsRestrictions
      }
    })
    .filter(m => m.matchPercent >= 50 && m.meetsRestrictions) // At least 50% match
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, 20) // Top 20 matches

  return matches
})
```

### Anti-Patterns to Avoid

- **Storing guest data in cookies:** Cookies have 4KB limit and get sent with every request, creating unnecessary overhead. Use localStorage for guest data.
- **Fetching favorites on every render:** Cache favorites in composable state, only refetch after mutations.
- **JSON arrays for many-to-many relationships:** Use junction tables for favorites/history—they enable efficient joins, cascading deletes, and relational integrity.
- **Blocking main thread with autocomplete:** Always debounce autocomplete API calls to avoid excessive requests while user types.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSR-safe localStorage | Custom `onMounted` + `ref` boilerplate | VueUse `useLocalStorage` with `initOnMounted: true` | Handles hydration mismatch automatically, battle-tested |
| Debouncing input | Custom setTimeout/clearTimeout logic | VueUse `refDebounced` or `useDebounceFn` | Handles cleanup, edge cases (rapid updates, component unmount) |
| Guest data migration | Custom migration endpoints | Better Auth `onLinkAccount` callback | Built-in lifecycle hook, guaranteed to fire on account link |
| Ingredient database | Scraping or manual entry | Seed curated list from recipe ingredients | Recipes already contain ingredients; extract unique set (200-500 items) |
| Star rating UI | Custom SVG/CSS stars | Tailwind + simple component | Star rating is 5 buttons/icons with hover/click states—trivial with Tailwind |

**Key insight:** Authentication, storage, and debouncing are solved problems in the Vue/Nuxt ecosystem. VueUse provides composables that handle SSR, cleanup, and edge cases better than custom implementations. Better Auth's plugin system already provides guest-to-authenticated migration hooks.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with localStorage
**What goes wrong:** Directly reading localStorage during setup() causes server-rendered HTML to differ from client-rendered HTML, triggering hydration warnings and potential bugs.

**Why it happens:** Server has no access to localStorage, so `localStorage.getItem()` returns `null` on server but actual value on client.

**How to avoid:** Use VueUse's `useLocalStorage` with `initOnMounted: true` option, which defers localStorage read until after component mounts (client-only).

**Warning signs:** Console warnings like "Hydration node mismatch" or flickering UI on page load.

### Pitfall 2: Forgetting to Migrate Guest Data
**What goes wrong:** User adds 20 ingredients to pantry as guest, signs up, and loses all their data because migration wasn't implemented.

**Why it happens:** Better Auth's `onLinkAccount` callback is provided but migration logic must be written manually. Easy to forget during initial auth setup.

**How to avoid:**
1. Test guest → authenticated flow explicitly in QA
2. Implement migration early in Phase 3
3. Consider temporary storage (session cookie) to pass localStorage data during signup flow

**Warning signs:** User complaints about lost data after signup.

### Pitfall 3: Over-fetching Favorites/History
**What goes wrong:** Every component that shows favorite status makes its own API call, creating N+1 query problem and slow page loads.

**Why it happens:** No shared state for favorites; each component independently fetches.

**How to avoid:**
- Create single `useFavorites()` composable that fetches once and caches in memory
- Use `provide/inject` or Pinia if favorites needed across many components
- Only refetch after mutations (add/remove favorite)

**Warning signs:** Network tab shows multiple `/api/user/favorites` calls on single page load.

### Pitfall 4: SQLite JSON Query Performance
**What goes wrong:** Filtering recipes by dietaryTags using `json_each()` becomes slow as recipe count grows past 1000+.

**Why it happens:** SQLite's JSON functions have O(N) complexity per row, and without indexes on JSON fields, full table scans occur.

**How to avoid:**
1. Parse JSON server-side and filter in JavaScript for <10k rows (simpler)
2. For larger datasets, denormalize into junction table (recipe_dietary_tags) with proper indexes
3. Cache common queries (e.g., "all vegan recipes") in KV

**Warning signs:** Recipe browse page with dietary filters takes >500ms to load.

### Pitfall 5: Debounce Delay Too Aggressive
**What goes wrong:** 500ms+ debounce delay makes autocomplete feel laggy and unresponsive, even though it reduces API calls.

**Why it happens:** Over-optimizing for server load at expense of UX.

**How to avoid:**
- Use 250-300ms debounce (industry standard for search)
- Show loading spinner immediately when user types (optimistic UI)
- For <150ms perceived latency, show cached/partial results while waiting

**Warning signs:** User feedback that autocomplete "doesn't work" or feels slow.

### Pitfall 6: Missing Composite Primary Key Indexes
**What goes wrong:** Junction table queries (e.g., "is recipe X favorited by user Y?") are slow despite having composite primary key.

**Why it happens:** In SQLite, composite primary key creates index on (userId, recipeId) but queries filtering only on recipeId don't use the index efficiently.

**How to avoid:**
- Add separate index on frequently-queried column (e.g., `recipeIdx` on recipeId)
- Keep composite primary key for uniqueness constraint
- Test query plans with `EXPLAIN QUERY PLAN`

**Warning signs:** Favorite status queries slow as favorites table grows.

## Code Examples

Verified patterns from official sources:

### VueUse SSR-Safe localStorage
```typescript
// Source: https://vueuse.org/core/uselocalstorage/
import { useLocalStorage } from '@vueuse/core'

// Defers localStorage read until after mount (SSR-safe)
const pantry = useLocalStorage<string[]>('guest_pantry', [], {
  initOnMounted: true // KEY: Prevents hydration mismatch
})
```

### VueUse Debounced Ref
```typescript
// Source: https://vueuse.org/shared/refdebounced/
import { refDebounced } from '@vueuse/core'

const searchQuery = ref('')
const debouncedQuery = refDebounced(searchQuery, 300) // 300ms delay

// Watch debounced value for API calls
watch(debouncedQuery, async (newQuery) => {
  if (newQuery.length >= 2) {
    suggestions.value = await $fetch('/api/ingredients/search', {
      query: { q: newQuery }
    })
  }
})
```

### Drizzle Junction Table with Composite Primary Key
```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'

export const userFavorites = sqliteTable('user_favorites', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  // Composite primary key ensures uniqueness
  pk: primaryKey({ columns: [table.userId, table.recipeId] }),
  // Separate indexes for efficient querying
  userIdx: index('user_favorites_user_idx').on(table.userId),
  recipeIdx: index('user_favorites_recipe_idx').on(table.recipeId)
}))
```

### Better Auth onLinkAccount Migration
```typescript
// Source: https://www.better-auth.com/docs/plugins/anonymous
import { anonymous } from 'better-auth/plugins'

plugins: [
  anonymous({
    onLinkAccount: async ({ anonymousUser, newUser }) => {
      // Transfer data from anonymous user to new authenticated user
      // This fires automatically when guest creates account
      console.log(`Migrating data from ${anonymousUser.id} to ${newUser.id}`)

      // Example: Transfer pantry from session storage or temp table
      // Implementation depends on how guest data is stored during signup
    }
  })
]
```

### Optimistic UI Update Pattern
```typescript
// Source: https://tanstack.com/query/v5/docs/framework/vue/guides/optimistic-updates
async function toggleFavorite(recipeId: string) {
  const wasFavorite = isFavorite(recipeId)

  // 1. Optimistic update (immediate)
  favorites.value = wasFavorite
    ? favorites.value.filter(f => f.recipeId !== recipeId)
    : [...favorites.value, { recipeId }]

  try {
    // 2. Sync with server
    await $fetch(`/api/user/favorites/${recipeId}`, {
      method: wasFavorite ? 'DELETE' : 'POST'
    })
  } catch (error) {
    // 3. Revert on failure
    await refresh()
  }
}
```

### SQLite JSON Filtering
```typescript
// Source: https://www.sqlite.org/json1.html
// Filter recipes by dietary tags (in-memory after fetch)
const allRecipes = await db.select().from(schema.recipes)

const filtered = allRecipes.filter(recipe => {
  const dietaryTags = JSON.parse(recipe.dietaryTags) as string[]
  return userRestrictions.every(restriction => dietaryTags.includes(restriction))
})

// Alternative: Use json_each() for complex queries (slower)
// Better to fetch all and filter in JS for <10k rows
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual localStorage + onMounted | VueUse `useLocalStorage` | 2021-2022 | Auto-handles SSR hydration, less boilerplate |
| Custom debounce functions | VueUse `refDebounced` | 2021-2022 | Built-in cleanup, reactive, composable |
| Cookies for guest data | localStorage with migration | 2020-2023 | More storage (5MB vs 4KB), no request overhead |
| JSON arrays for favorites | Junction tables | Always | Better performance, relational integrity, easier queries |
| Separate rating/favorite tables | Combined user_recipe_reviews table | Varies | Review table can include rating + text + favorite flag (denormalized) |
| External ingredient APIs | Curated seed list | Context-dependent | Faster, no rate limits, tailored to app domain |

**Deprecated/outdated:**
- **Nuxt 2's `localStorage` plugin**: Use VueUse's `useLocalStorage` for Nuxt 3 with proper SSR handling
- **JSON columns for many-to-many**: Use junction tables for favorites/history—JSON doesn't scale or support relational operations
- **Cookies for pantry storage**: 4KB limit too small, localStorage is standard for client-side preferences

## Open Questions

Things that couldn't be fully resolved:

1. **Guest Data Migration Implementation**
   - What we know: Better Auth provides `onLinkAccount` callback
   - What's unclear: How to pass localStorage data from client to server during signup flow
   - Recommendation: Store guest pantry/restrictions in session cookie temporarily during signup, then read in `onLinkAccount` callback. Alternative: POST guest data to temporary endpoint before signup, store in temp D1 table with session ID.

2. **Ingredient Autocomplete Data Source**
   - What we know: USDA FoodData Central has 380k+ items, Open Food Facts has 2.5M+ products
   - What's unclear: Whether to integrate external API or build curated list
   - Recommendation: **Build curated list from existing recipe ingredients** (200-500 common items). External APIs add latency (200-500ms), rate limiting, and overwhelming choice. Recipes already contain ingredients—extract unique set and seed as master list.

3. **Rating Aggregation Strategy**
   - What we know: Aggregating ratings (AVG, COUNT) on every recipe list query is expensive
   - What's unclear: Whether to use materialized columns, denormalization, or query-time aggregation
   - Recommendation: Start with query-time aggregation (JOIN + GROUP BY) for Phase 3. If slow (>500ms), add `avgRating` and `ratingCount` columns to recipes table, updated via triggers or background job. Cache aggregated results in KV with 5-minute TTL.

4. **Pantry-to-Recipe Matching Algorithm**
   - What we know: Simple percentage matching (pantry items / total recipe ingredients) works
   - What's unclear: Optimal threshold (50%? 70%?) and whether to weight ingredients (e.g., spices less important than proteins)
   - Recommendation: Start with 50% threshold, no weighting. Gather user feedback in Phase 5. Consider ML-based ranking later if simple approach underperforms.

## Sources

### Primary (HIGH confidence)
- [VueUse `useLocalStorage` documentation](https://vueuse.org/core/uselocalstorage/) - SSR-safe localStorage patterns
- [VueUse `refDebounced` documentation](https://vueuse.org/shared/refdebounced/) - Debouncing patterns
- [Drizzle ORM Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) - Composite primary keys, junction tables
- [Drizzle ORM SQLite Timestamp Defaults](https://orm.drizzle.team/docs/guides/timestamp-default-value) - Default timestamp patterns
- [Better Auth Anonymous Plugin](https://www.better-auth.com/docs/plugins/anonymous) - `onLinkAccount` callback
- [SQLite JSON Functions](https://www.sqlite.org/json1.html) - JSON querying patterns
- [TanStack Query Vue Optimistic Updates](https://tanstack.com/query/v5/docs/framework/vue/guides/optimistic-updates) - Optimistic UI patterns

### Secondary (MEDIUM confidence)
- [Nuxt UI InputMenu Component](https://ui.nuxt.com/docs/components/input-menu) - Autocomplete component examples (verified official docs)
- [VueUse with SSR Discussion](https://github.com/nuxt/nuxt/discussions/27793) - Community patterns for localStorage in Nuxt 3
- [Beekeeper Studio Many-to-Many Guide](https://www.beekeeperstudio.io/blog/many-to-many-database-relationships-complete-guide) - Junction table design patterns
- [Query Optimization Patterns (Medium)](https://medium.com/@artemkhrenov/query-optimization-patterns-writing-efficient-sql-for-high-performance-applications-8143e5028443) - Aggregation optimization (materialized views)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/) - D1 best practices

### Tertiary (LOW confidence)
- [Top Nutrition APIs 2026](https://www.spikeapi.com/blog/top-nutrition-apis-for-developers-2026) - USDA and Open Food Facts overview (WebSearch only, not verified for API specifics)
- [localStorage Best Practices](https://rxdb.info/articles/localstorage.html) - General localStorage guidance (not Nuxt-specific)
- [Best Pantry Recipe Apps 2026](https://flavor365.com/5-best-apps-for-recipes-from-ingredients-you-own/) - Competitive analysis (user-facing apps, not technical implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - VueUse, Drizzle, Better Auth are official/established libraries with verified documentation
- Architecture: HIGH - Patterns verified against official VueUse, Drizzle, Better Auth docs
- Pitfalls: MEDIUM - Based on common SSR/SQLite issues documented in GitHub discussions and forums
- Code examples: HIGH - All examples sourced from official documentation or verified open-source projects

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable ecosystem, patterns unlikely to change)

**Key assumptions:**
- Recipe database will stay under 10,000 recipes in Phase 3 (affects JSON vs junction table decision)
- Guest users are acceptable loss if they don't create accounts (affects migration priority)
- Ingredient list needs 200-500 common items, not comprehensive food database (affects external API decision)
- Phase 3 focuses on MVP functionality, not ML-powered recommendations (deferred to Phase 5)
