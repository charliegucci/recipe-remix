# Phase 08: SEO + Sharing - Research

**Researched:** 2026-02-12
**Domain:** Nuxt 4 SEO, URL slugs, structured data, sitemaps, social sharing
**Confidence:** HIGH

## Summary

Phase 8 implements comprehensive SEO and social sharing capabilities for Recipe Remix. The phase consists of six interconnected requirements: adding SEO-friendly URL slugs, dynamic meta tags, OpenGraph images, sitemap generation, Recipe structured data, and canonical URLs.

Nuxt 4 provides excellent native SEO support through `useHead`, `useSeoMeta`, and `useServerSeoMeta` composables. The Nuxt SEO ecosystem offers three mature, actively-maintained modules that integrate seamlessly with Nuxt 4 and Cloudflare Pages: `@nuxtjs/sitemap` for sitemap generation, `nuxt-schema-org` for JSON-LD structured data, and `nuxt-og-image` (with recent Cloudflare support added February 2026).

The primary technical challenge is adding URL slugs to existing recipes with numeric IDs while maintaining backward compatibility. This requires database schema changes, slug generation, and implementing redirect logic from old ID-based URLs to new slug-based URLs.

**Primary recommendation:** Use Nuxt 4 native composables for meta tags, install the three Nuxt SEO modules for automation, add a `slug` column to the recipes table with unique constraint, and implement route rules for 301 redirects from old URLs to new slug-based URLs.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt 4 native | 3.15.0+ | `useHead`, `useSeoMeta`, `useServerSeoMeta` for meta tags | Built-in, type-safe, XSS-safe, official recommendation |
| @nuxtjs/sitemap | 7.6.0 | Auto-generate sitemap.xml from database | Official Nuxt module, 100k+ weekly downloads, actively maintained |
| nuxt-schema-org | Latest | JSON-LD structured data with type-safe helpers | Official Nuxt SEO ecosystem, supports 30+ schema types including Recipe |
| nuxt-og-image | Latest | OpenGraph image generation | Official Nuxt SEO ecosystem, Cloudflare support added Feb 2026 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| slugify | 1.6.6+ | Convert recipe titles to URL-friendly slugs | Standard slug generation, supports 40+ languages, 3M+ weekly downloads |
| iso8601-duration | 1.3.0+ | Convert minutes to ISO 8601 duration format (PT1H30M) | Required for Recipe schema cookTime/prepTime fields |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @nuxtjs/sitemap | Manual XML generation | Module automates dynamic routes, caching, multi-sitemap support |
| nuxt-schema-org | Manual JSON-LD | Module provides type safety, follows Google guidelines, auto-injects script tags |
| slugify | url-slug or custom regex | slugify is more feature-rich, better language support, widely tested |
| nuxt-og-image | Use existing R2 images | Can use R2 images via og:image meta tag, skip module for simpler approach |

**Installation:**
```bash
# Add Nuxt SEO modules
npx nuxi@latest module add sitemap
npx nuxi@latest module add schema-org
npx nuxi@latest module add og-image

# Add slug generation and duration utilities
npm install slugify iso8601-duration
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── api/
│   ├── __sitemap__/
│   │   └── urls.ts              # Dynamic sitemap endpoint (queries D1 for recipes)
│   └── recipes/
│       └── [idOrSlug].ts        # Unified API handler (supports both ID and slug)
├── routes/
│   └── _redirects.ts            # 301 redirects from /recipe/123 → /recipe/slug
└── utils/
    ├── slug-generator.ts        # Centralized slug generation with deduplication
    └── duration-formatter.ts    # Minutes → ISO 8601 duration (PT1H30M)

app/pages/
└── recipe/
    └── [slug].vue               # Recipe detail page (handles slug, uses meta composables)

server/db/
└── migrations/
    ├── 0008_add_slug_column.sql
    └── 0009_add_unique_slug_index.sql  # Separate migration after slug generation
```

### Pattern 1: Database Schema Migration for Slugs
**What:** Add `slug` column to recipes table with unique constraint, generate slugs from titles
**When to use:** Migrating from numeric IDs to SEO-friendly slugs on existing data
**Example:**
```typescript
// Migration 1: Add slug column (nullable initially)
// server/db/migrations/0008_add_slug_column.sql
ALTER TABLE recipes ADD COLUMN slug TEXT;

// Migration 2: Generate slugs for existing recipes (run as script or API endpoint)
// server/utils/generate-slugs.ts
import slugify from 'slugify'

export async function generateSlugsForExistingRecipes(db: any) {
  const recipes = await db.select().from(recipes)
  const slugCounts = new Map<string, number>()

  for (const recipe of recipes) {
    let slug = slugify(recipe.title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g })

    // Handle duplicates by appending number
    if (slugCounts.has(slug)) {
      const count = slugCounts.get(slug)! + 1
      slugCounts.set(slug, count)
      slug = `${slug}-${count}`
    } else {
      slugCounts.set(slug, 1)
    }

    await db.update(recipes).set({ slug }).where(eq(recipes.id, recipe.id))
  }
}

// Migration 3: Add unique constraint after slugs are populated
// server/db/migrations/0009_add_unique_slug_index.sql
CREATE UNIQUE INDEX recipes_slug_idx ON recipes(slug);
ALTER TABLE recipes ALTER COLUMN slug SET NOT NULL;
```

### Pattern 2: Dynamic Route with ID and Slug Support
**What:** Support both `/recipe/123` (legacy) and `/recipe/thai-italian-pasta` (new) URLs
**When to use:** During migration period to maintain backward compatibility
**Example:**
```typescript
// server/api/recipes/[idOrSlug].ts
export default defineEventHandler(async (event) => {
  const idOrSlug = getRouterParam(event, 'idOrSlug')
  const db = useDrizzle(event)

  // Try slug first, fallback to ID
  let recipe = await db.select().from(recipes).where(eq(recipes.slug, idOrSlug)).get()

  if (!recipe && /^\d+$/.test(idOrSlug)) {
    // If slug lookup fails and param is numeric, try ID lookup
    recipe = await db.select().from(recipes).where(eq(recipes.id, idOrSlug)).get()

    if (recipe) {
      // Redirect to slug-based URL (301 Moved Permanently)
      return sendRedirect(event, `/recipe/${recipe.slug}`, 301)
    }
  }

  if (!recipe) {
    throw createError({ statusCode: 404, statusMessage: 'Recipe not found' })
  }

  return recipe
})
```

### Pattern 3: SEO Meta Tags with useSeoMeta
**What:** Set dynamic meta tags for title, description, OpenGraph using `useServerSeoMeta`
**When to use:** Every page that needs SEO meta tags (recipe detail, index, etc.)
**Example:**
```typescript
// app/pages/recipe/[slug].vue
// Source: https://nuxt.com/docs/4.x/api/composables/use-server-seo-meta
const recipe = await useFetch<Recipe>(`/api/recipes/${slug}`)

// Server-only (no client reactivity, better performance)
useServerSeoMeta({
  title: `${recipe.value.title} | Recipe Remix`,
  description: recipe.value.description || `Delicious ${recipe.value.cuisineTags.join(' & ')} fusion recipe`,
  ogTitle: recipe.value.title,
  ogDescription: recipe.value.description || `Try this ${recipe.value.difficulty} fusion recipe`,
  ogImage: recipe.value.imageKey ? `https://recipe-remix-9fd.pages.dev/api/images/${recipe.value.imageKey}` : undefined,
  ogType: 'website',
  ogUrl: `https://recipe-remix-9fd.pages.dev/recipe/${slug}`,
  twitterCard: 'summary_large_image'
})

// Canonical URL (prevents duplicate content)
useHead({
  link: [
    { rel: 'canonical', href: `https://recipe-remix-9fd.pages.dev/recipe/${slug}` }
  ]
})
```

### Pattern 4: Recipe Structured Data with nuxt-schema-org
**What:** Add JSON-LD Recipe schema for rich search results (star ratings, cook time, etc.)
**When to use:** Recipe detail pages to enable Google rich snippets
**Example:**
```typescript
// app/pages/recipe/[slug].vue
// Source: https://nuxtseo.com/docs/schema-org/api/use-schema-org
import { useSchemaOrg, defineRecipe } from '#imports'
import { toSeconds } from 'iso8601-duration'

// Helper: Convert minutes to ISO 8601 duration (e.g., 90 → "PT1H30M")
function minutesToISO8601(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  let duration = 'PT'
  if (hours > 0) duration += `${hours}H`
  if (mins > 0) duration += `${mins}M`
  return duration
}

useSchemaOrg([
  defineRecipe({
    name: recipe.value.title,
    description: recipe.value.description,
    image: recipe.value.imageKey ? `https://recipe-remix-9fd.pages.dev/api/images/${recipe.value.imageKey}` : undefined,
    author: {
      '@type': 'Organization',
      name: 'Recipe Remix'
    },
    datePublished: recipe.value.createdAt.toISOString(),
    prepTime: recipe.value.cookTime ? minutesToISO8601(Math.floor(recipe.value.cookTime * 0.3)) : undefined, // Estimate 30% prep
    cookTime: recipe.value.cookTime ? minutesToISO8601(recipe.value.cookTime) : undefined,
    totalTime: recipe.value.cookTime ? minutesToISO8601(Math.floor(recipe.value.cookTime * 1.3)) : undefined,
    recipeYield: `${recipe.value.servings} servings`,
    recipeCategory: recipe.value.cuisineTags[0] || 'Fusion',
    recipeCuisine: recipe.value.cuisineTags.join(', '),
    recipeIngredient: recipe.value.ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`),
    recipeInstructions: recipe.value.instructions.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: step
    })),
    keywords: [...recipe.value.cuisineTags, ...recipe.value.dietaryTags, recipe.value.difficulty].filter(Boolean).join(', '),
    aggregateRating: recipe.value.avgRating ? {
      '@type': 'AggregateRating',
      ratingValue: recipe.value.avgRating,
      reviewCount: recipe.value.totalReviews
    } : undefined
  })
])
```

### Pattern 5: Dynamic Sitemap from Database
**What:** Auto-generate sitemap.xml with all recipe URLs from D1 database
**When to use:** Required for search engine discovery of all pages
**Example:**
```typescript
// nuxt.config.ts
// Source: https://nuxtseo.com/docs/sitemap/api/config
export default defineNuxtConfig({
  modules: ['@nuxtjs/sitemap', 'nuxt-schema-org'],

  sitemap: {
    hostname: 'https://recipe-remix-9fd.pages.dev',
    sources: [
      '/api/__sitemap__/urls'  // Dynamic endpoint for recipe URLs
    ]
  },

  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Recipe Remix',
      url: 'https://recipe-remix-9fd.pages.dev',
      logo: 'https://recipe-remix-9fd.pages.dev/logo.png'
    }
  }
})

// server/api/__sitemap__/urls.ts
// Source: https://nuxtseo.com/docs/sitemap/api/config
import { defineSitemapEventHandler } from '#imports'
import { asSitemapUrl } from '#sitemap'

export default defineSitemapEventHandler(async (event) => {
  const db = useDrizzle(event)

  // Fetch all recipes with slugs
  const allRecipes = await db.select({
    slug: recipes.slug,
    createdAt: recipes.createdAt,
    featured: recipes.featured
  }).from(recipes)

  return allRecipes.map(recipe =>
    asSitemapUrl({
      loc: `/recipe/${recipe.slug}`,
      lastmod: recipe.createdAt.toISOString(),
      changefreq: 'weekly',
      priority: recipe.featured ? 0.9 : 0.7
    })
  )
})
```

### Pattern 6: 301 Redirects with Route Rules
**What:** Redirect old numeric URLs to new slug URLs with 301 status
**When to use:** After slug migration to preserve SEO value from old links
**Example:**
```typescript
// nuxt.config.ts
// Source: https://nuxtseo.com/learn-seo/nuxt/controlling-crawlers/redirects
export default defineNuxtConfig({
  routeRules: {
    // Handled by server middleware for database lookup
    // See server/middleware/legacy-redirects.ts
  }
})

// server/middleware/legacy-redirects.ts
// Source: https://medium.com/@alex-marusych/use-redirects-in-nuxt-3-the-right-way-873062efed3b
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Match /recipe/123 pattern (numeric ID)
  const match = url.pathname.match(/^\/recipe\/(\d+)$/)
  if (!match) return // Not a legacy URL

  const recipeId = match[1]
  const db = useDrizzle(event)

  const recipe = await db.select({ slug: recipes.slug }).from(recipes).where(eq(recipes.id, recipeId)).get()

  if (recipe) {
    // 301 Moved Permanently (passes SEO value)
    return sendRedirect(event, `/recipe/${recipe.slug}`, 301)
  }
})
```

### Anti-Patterns to Avoid
- **Reactive meta tags in production:** Use `useServerSeoMeta` instead of `useSeoMeta` for non-reactive pages (better performance, robots only scan initial load)
- **Duplicate meta tags:** Ensure only one canonical URL, title, and description per page
- **Missing canonical URLs:** Every page needs `<link rel="canonical">` to prevent duplicate content penalties
- **Long slugs:** Keep slugs 2-6 words, remove stop words (and, or, of, the, etc.)
- **Including dates in slugs:** Avoid `/recipe/2026-02-thai-pasta` (makes content look outdated)
- **Non-unique slugs:** Must have unique constraint on slug column or search engines penalize
- **Client-side redirects:** Use server-side 301 redirects for SEO value, not client `navigateTo`
- **Missing structured data:** Recipe pages without JSON-LD won't get rich snippets in search results

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sitemap generation | Custom XML builder with manual URL collection | @nuxtjs/sitemap module | Module handles dynamic routes, caching, multi-sitemap, URL encoding, SWR cache, i18n support |
| Structured data | Manual JSON-LD string concatenation | nuxt-schema-org module | Type-safe helpers, follows Google guidelines, auto-injects script tags, validates schema |
| Slug generation | Custom regex for title → slug | slugify library | Handles 40+ languages, special characters, unicode normalization, edge cases tested by 3M users/week |
| ISO 8601 duration | Custom time formatting | iso8601-duration library | Correct format (PT1H30M), handles edge cases, parse/serialize support |
| Meta tag management | Manual `<meta>` tags in head | useServerSeoMeta composable | Type-safe, XSS-safe, SSR-optimized, prevents typos (name vs property) |
| OpenGraph images | Custom image generation API | nuxt-og-image module (or existing R2 images) | Auto-generates OG images with templates, Cloudflare support, fallback options |

**Key insight:** SEO tooling has matured significantly. The Nuxt SEO ecosystem provides battle-tested modules that handle edge cases, follow Google's latest guidelines, and integrate seamlessly with Nuxt 4 SSR. Building custom solutions risks missing critical requirements (e.g., ISO 8601 format, canonical URLs, proper redirect status codes) and introduces maintenance burden.

## Common Pitfalls

### Pitfall 1: Duplicate Slugs from Similar Recipe Titles
**What goes wrong:** Generating slugs from titles like "Thai Pasta" and "Thai Pasta Fusion" both produce "thai-pasta" slug, causing unique constraint violations
**Why it happens:** Multiple recipes with similar names, or slug generation removes too many words
**How to avoid:**
- Implement deduplication strategy during slug generation (append `-2`, `-3`, etc.)
- Check for existing slugs in database before inserting
- Generate slugs in batch migration with Map to track counts
**Warning signs:** Database errors on slug insert/update, 500 errors on recipe creation

### Pitfall 2: Forgetting to Separate Schema Migration from Index Creation
**What goes wrong:** Adding unique index to slug column fails if existing recipes have NULL or duplicate slugs
**Why it happens:** Drizzle/SQLite generates single migration that adds column AND unique constraint, but data needs transformation between steps
**How to avoid:**
- Migration 1: Add slug column (nullable, no constraint)
- Script/endpoint: Generate slugs for all existing recipes
- Migration 2: Add unique constraint after data is populated
**Warning signs:** Migration failure with "UNIQUE constraint failed", "NOT NULL constraint failed"

### Pitfall 3: Missing 301 Redirects for Old URLs
**What goes wrong:** Old /recipe/123 links (from bookmarks, external sites, Google index) return 404 after slug migration, losing SEO value
**Why it happens:** Changing URLs without redirect strategy, assuming ID-based routes will be automatically handled
**How to avoid:**
- Keep ID-based API endpoint functional during transition
- Implement server middleware to detect numeric IDs and 301 redirect to slug URLs
- Use 301 (not 302) to transfer SEO link equity
- Keep redirects active for minimum 1 year
**Warning signs:** 404 errors in logs for /recipe/[numeric], Google Search Console shows 404 errors, traffic drops

### Pitfall 4: Wrong OpenGraph Image Dimensions
**What goes wrong:** OG images too small (< 600x315) show as tiny thumbnails on social media, too large (> 5MB) fail to load
**Why it happens:** Using arbitrary image sizes or not optimizing for social sharing
**How to avoid:**
- Use 1200x630 pixels (1.91:1 aspect ratio) — universal standard for all platforms
- Keep file size under 5MB (ideally under 1MB)
- Use JPG or PNG format (no transparency, no animations)
- Test with Facebook Sharing Debugger, Twitter Card Validator
**Warning signs:** Social shares show wrong image or no image, tiny thumbnails

### Pitfall 5: Incorrect ISO 8601 Duration Format
**What goes wrong:** Recipe schema uses "90 minutes" instead of "PT1H30M", failing Google's structured data validation
**Why it happens:** Not knowing ISO 8601 format requirement, using human-readable strings
**How to avoid:**
- Use iso8601-duration library or create helper function
- Format: `PT` prefix, then hours (`1H`), then minutes (`30M`)
- Validate with Google Rich Results Test tool
**Warning signs:** Schema validation errors in Search Console, recipe rich snippets not appearing

### Pitfall 6: Duplicate Content from Missing Canonical URLs
**What goes wrong:** Search engines index both /recipe/123 and /recipe/thai-pasta as separate pages, diluting SEO value and potentially penalizing as duplicate content
**Why it happens:** Supporting both URL patterns without canonical tags, or forgetting self-referencing canonicals
**How to avoid:**
- Always set `<link rel="canonical">` on every page
- Use absolute URLs including protocol (https://)
- Point canonical to slug-based URL (the "true" version)
- Include self-referencing canonical even on canonical version
**Warning signs:** Google Search Console duplicate content warnings, multiple URLs for same recipe in search results

### Pitfall 7: Server Middleware Blocking Sitemap Crawlers
**What goes wrong:** Cloudflare security settings or custom middleware blocks search engine bots from accessing sitemap.xml or recipe pages
**Why it happens:** Overly aggressive bot protection, missing user-agent allowlist
**How to avoid:**
- Whitelist common search engine user agents (Googlebot, Bingbot)
- Test sitemap.xml accessibility from external tools
- Enable Cloudflare Crawler Hints for fresh content
- Check robots.txt doesn't block /sitemap.xml
**Warning signs:** Search Console shows "Sitemap could not be fetched", low crawl rate

### Pitfall 8: Reactive Meta Tags in Production
**What goes wrong:** Using `useSeoMeta` instead of `useServerSeoMeta` causes unnecessary client-side hydration, performance overhead, and inconsistent rendering
**Why it happens:** Not understanding difference between composables, copy-pasting from examples
**How to avoid:**
- Use `useServerSeoMeta` for static pages (recipe detail, blog posts)
- Use `useSeoMeta` only when meta tags must react to client state
- Search engine bots only see initial SSR render, not client updates
**Warning signs:** Hydration mismatches, larger bundle size, meta tags missing in view-source

## Code Examples

Verified patterns from official sources:

### Slug Generation with Deduplication
```typescript
// Source: https://www.npmjs.com/package/slugify + custom deduplication
import slugify from 'slugify'

export function generateUniqueSlug(title: string, existingSlugs: Set<string>): string {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  })

  let slug = baseSlug
  let counter = 2

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  existingSlugs.add(slug)
  return slug
}
```

### Minutes to ISO 8601 Duration
```typescript
// Source: https://developers.google.com/search/docs/appearance/structured-data/recipe
export function minutesToISO8601(minutes: number): string {
  if (minutes <= 0) return 'PT0M'

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  let duration = 'PT'
  if (hours > 0) duration += `${hours}H`
  if (mins > 0) duration += `${mins}M`

  return duration
}

// Examples:
// minutesToISO8601(30)  → "PT30M"
// minutesToISO8601(90)  → "PT1H30M"
// minutesToISO8601(120) → "PT2H"
```

### Schema Update for Slug Column
```typescript
// Source: https://orm.drizzle.team/docs/migrations
// server/db/schema.ts (updated)
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(), // NEW: SEO-friendly URL slug
  description: text('description'),
  // ... rest of fields unchanged
}, (table) => ({
  slugIdx: index('recipes_slug_idx').on(table.slug) // NEW: Index for fast slug lookups
}))
```

### Testing OG Image with Facebook Debugger
```bash
# Source: https://developers.facebook.com/tools/debug/
# Test your recipe URLs after implementing OG meta tags:
# 1. Visit: https://developers.facebook.com/tools/debug/
# 2. Enter: https://recipe-remix-9fd.pages.dev/recipe/thai-italian-pasta
# 3. Click "Scrape Again" to clear cache
# 4. Verify:
#    - Image loads (1200x630)
#    - Title and description correct
#    - No warnings/errors
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `<meta>` tags in `<head>` | `useServerSeoMeta` composable | Nuxt 3 (2022) | Type safety, XSS protection, SSR optimization |
| Numeric IDs in URLs (/recipe/123) | SEO-friendly slugs (/recipe/thai-pasta) | Standard since ~2010 | Better CTR, keyword relevance, user-friendly |
| Microdata (itemscope, itemprop) | JSON-LD structured data | Google recommendation 2016+ | Easier to implement, maintain, validate |
| Static sitemap.xml file | Dynamic sitemap from database | Modern CMSs/frameworks | Auto-updates, no manual maintenance |
| Custom redirect scripts | Route rules and server middleware | Nuxt 3 (2022) | Declarative, proper status codes, better DX |
| nuxt-og-image chromium renderer | `browser: { provider: 'cloudflare' }` | Feb 2026 | Native Cloudflare Pages support via Puppeteer |

**Deprecated/outdated:**
- **Meta robots noindex**: Use `useHead({ meta: [{ name: 'robots', content: 'noindex' }] })` instead of HTML tags
- **XML sitemaps pointing to numeric IDs**: Should migrate to slug-based URLs with 301 redirects
- **302 temporary redirects for permanent URL changes**: Use 301 to pass SEO link equity (Google confirmed both pass signals, but 301 is clearer intent)
- **Client-side meta tag manipulation**: Use SSR composables for initial render (bots don't execute JS)

## Open Questions

1. **Should we use nuxt-og-image or existing R2 images?**
   - What we know: R2 already has AI-generated images for recipes, nuxt-og-image can generate custom OG images with text overlays
   - What's unclear: Whether custom OG images with recipe title/description text provide better CTR than existing recipe photos
   - Recommendation: Start with existing R2 images via og:image meta tag (simpler, faster), consider nuxt-og-image in future if A/B testing shows benefit

2. **How to handle recipes without images for OG tags?**
   - What we know: OG image is required for rich social previews, some AI recipes may not have generated images yet
   - What's unclear: Best fallback strategy (generic branded image vs no image vs generate on-demand)
   - Recommendation: Create generic "Recipe Remix" branded OG image (1200x630) as fallback, reference in meta tag when recipe.imageKey is null

3. **Should slug column allow updates or be immutable?**
   - What we know: Changing slugs breaks external links and SEO value, but some recipes may need title corrections
   - What's unclear: Whether to support slug editing in admin UI or enforce immutability
   - Recommendation: Make slugs immutable after creation (set once on recipe creation), if title must change, use 301 redirect from old slug to new slug

4. **Do we need multilingual slugs or sitemap?**
   - What we know: Current app is English-only, sitemap module supports i18n
   - What's unclear: Whether future phases will add multilingual support
   - Recommendation: Implement single-language slugs and sitemap now, sitemap module will handle i18n if needed later

## Sources

### Primary (HIGH confidence)
- [Nuxt 4 SEO and Meta Documentation](https://nuxt.com/docs/4.x/getting-started/seo-meta) - Official Nuxt 4 SEO guide
- [useSeoMeta Composable API](https://nuxt.com/docs/4.x/api/composables/use-seo-meta) - Official API reference
- [useServerSeoMeta Composable API](https://nuxt.com/docs/4.x/api/composables/use-server-seo-meta) - Server-only meta composable
- [@nuxtjs/sitemap Module](https://nuxtseo.com/docs/sitemap/getting-started/installation) - Official sitemap module docs
- [Nuxt Schema.org Module](https://nuxtseo.com/docs/schema-org/getting-started/introduction) - Official schema.org module
- [Google Recipe Structured Data](https://developers.google.com/search/docs/appearance/structured-data/recipe) - Google's official Recipe schema requirements
- [Schema.org Recipe Type](https://schema.org/Recipe) - Official Recipe type definition
- [Google Canonical URL Documentation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) - Official canonical tag guide
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) - Official migration guide
- [slugify npm package](https://www.npmjs.com/package/slugify) - Standard slug generation library

### Secondary (MEDIUM confidence)
- [Nuxt SEO Learn Guide](https://nuxtseo.com/learn-seo/nuxt/mastering-meta) - Community-maintained best practices
- [SEO-Friendly URL Slugs Best Practices](https://storychief.io/blog/seo-url-best-practices) - Industry best practices (2026)
- [URL Structure Best Practices - Google](https://developers.google.com/search/docs/crawling-indexing/url-structure) - Official Google guidance
- [301 vs 302 Redirects SEO Guide](https://www.hikeseo.co/learn/technical/301-vs-302-redirects) - Redirect best practices
- [OG Image Size Guide 2026](https://myogimage.com/blog/og-image-size-meta-tags-complete-guide) - Social media image requirements
- [Cloudflare Pages SEO Considerations](https://developers.cloudflare.com/fundamentals/performance/improve-seo/) - Official Cloudflare SEO guide
- [Nuxt Redirects Guide](https://medium.com/@alex-marusych/use-redirects-in-nuxt-3-the-right-way-873062efed3b) - Nuxt 3 redirect patterns
- [ISO 8601 Duration in JavaScript](https://www.twilio.com/en-us/blog/developers/tutorials/building-blocks/parse-iso8601-duration-javascript) - Duration format guide

### Tertiary (LOW confidence)
- [nuxt-og-image Cloudflare Support](https://nuxtseo.com/docs/og-image/getting-started/introduction) - Recent Cloudflare support (marked for validation, module docs confirm Feb 2026 update)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All modules officially maintained, widely used, documented for Nuxt 4
- Architecture: HIGH - Patterns verified from official docs and real implementations
- Pitfalls: MEDIUM-HIGH - Based on industry best practices and common migration issues, some project-specific

**Research date:** 2026-02-12
**Valid until:** 2026-03-15 (~30 days, SEO standards are stable)
