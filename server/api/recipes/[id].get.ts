import { eq, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recipe ID is required'
    })
  }

  const cacheKey = `recipe:${id}`

  // Check KV cache first (shorter TTL for review data freshness)
  const kv = hubKV()
  const cached = await kv.getItem(cacheKey)
  if (cached) {
    return cached
  }

  // Query D1 for single recipe
  const db = useDrizzle(event)
  const result = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.id, id))
    .get()

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
    .where(eq(schema.userRecipeReviews.recipeId, id))
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

  return recipe
})
