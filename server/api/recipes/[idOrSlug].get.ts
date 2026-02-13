import { eq, sql, or } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const idOrSlug = getRouterParam(event, 'idOrSlug')

  if (!idOrSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recipe ID or slug is required'
    })
  }

  const cacheKey = `recipe:${idOrSlug}`

  // Check KV cache first (shorter TTL for review data freshness)
  const kv = hubKV()
  const cached = await kv.getItem(cacheKey)
  if (cached) {
    // Set CDN cache headers before returning
    setResponseHeaders(event, {
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    })
    return cached
  }

  // Query D1 for single recipe - try slug first, then ID
  const db = useDrizzle(event)

  // First try to find by slug (preferred for SEO)
  let result = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.slug, idOrSlug))
    .get()

  // If not found by slug, try by ID (for backward compatibility and API calls)
  if (!result) {
    result = await db
      .select()
      .from(schema.recipes)
      .where(eq(schema.recipes.id, idOrSlug))
      .get()
  }

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recipe not found'
    })
  }

  // Get aggregate rating data
  const aggregateResult = await db
    .select({
      avgRating: sql<number>`AVG(${schema.userRecipeReviews.rating})`,
      totalReviews: sql<number>`COUNT(*)`
    })
    .from(schema.userRecipeReviews)
    .where(eq(schema.userRecipeReviews.recipeId, result.id))
    .get()

  const avgRating = aggregateResult?.avgRating || null
  const totalReviews = aggregateResult?.totalReviews || 0

  // Parse JSON fields
  const recipe = {
    ...result,
    ingredients: JSON.parse(result.ingredients),
    instructions: JSON.parse(result.instructions),
    cuisineTags: JSON.parse(result.cuisineTags),
    dietaryTags: JSON.parse(result.dietaryTags),
    servings: result.servings ?? 4,
    explanation: result.explanation ?? null,
    avgRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
    totalReviews
  }

  // Cache in KV with 5 minute TTL (shorter for review data freshness)
  await kv.setItem(cacheKey, recipe, { ttl: 300 })

  // Set CDN cache headers before returning
  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
  })

  return recipe
})
