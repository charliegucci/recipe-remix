import { eq } from 'drizzle-orm'
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

  // Check KV cache first
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

  // Parse JSON fields
  const recipe = {
    ...result,
    ingredients: JSON.parse(result.ingredients),
    instructions: JSON.parse(result.instructions),
    cuisineTags: JSON.parse(result.cuisineTags),
    dietaryTags: JSON.parse(result.dietaryTags)
  }

  // Cache in KV with 1 hour TTL
  await kv.setItem(cacheKey, recipe, { ttl: 3600 })

  return recipe
})
