import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const cacheKey = 'recipes:featured'

  // Check KV cache first
  const kv = hubKV()
  const cached = await kv.getItem(cacheKey)
  if (cached) {
    // Set CDN cache headers before returning
    setResponseHeaders(event, {
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    })
    return cached
  }

  // Query D1 for featured recipes
  const db = useDrizzle(event)
  const results = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.featured, true))
    .limit(5)

  // Parse JSON fields
  const recipes = results.map(recipe => ({
    ...recipe,
    ingredients: JSON.parse(recipe.ingredients),
    instructions: JSON.parse(recipe.instructions),
    cuisineTags: JSON.parse(recipe.cuisineTags),
    dietaryTags: JSON.parse(recipe.dietaryTags)
  }))

  // Cache in KV with 24 hour TTL (featured rarely changes)
  await kv.setItem(cacheKey, recipes, { ttl: 86400 })

  // Set CDN cache headers before returning
  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
  })

  return recipes
})
