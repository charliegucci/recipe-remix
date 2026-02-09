/**
 * POST /api/recipes/:id/image
 *
 * PRIMARY and RELIABLE path for image generation.
 * Triggers image generation for an existing AI-generated recipe.
 *
 * This endpoint is the reliable fallback because Cloudflare Workers
 * fire-and-forget promises may not complete after response is sent.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/drizzle'
import { generateAndStoreImage } from '../../../utils/image-generation'
import { getAuth } from '../../../lib/auth'

export default defineEventHandler(async (event) => {
  // Require authentication
  const { user } = await getAuth().api.getSession({ headers: event.headers })
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  // Get recipe ID from route params
  const recipeId = getRouterParam(event, 'id')
  if (!recipeId) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID required'
    })
  }

  // Fetch recipe from database
  const db = useDrizzle(event)
  const recipe = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.id, recipeId))
    .get()

  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found'
    })
  }

  // Only allow image generation for AI-generated recipes
  if (recipe.source !== 'ai_generated') {
    throw createError({
      statusCode: 400,
      message: 'Image generation only available for AI-generated recipes'
    })
  }

  // If recipe already has an image, return existing imageKey
  if (recipe.imageKey) {
    return {
      success: true,
      imageKey: recipe.imageKey,
      message: 'Image already exists'
    }
  }

  // Parse cuisineTags from JSON string
  const cuisineTags = recipe.cuisineTags ? JSON.parse(recipe.cuisineTags) : []

  // Generate and store image
  const result = await generateAndStoreImage(
    recipeId,
    recipe.title,
    recipe.description || '',
    cuisineTags
  )

  if (!result.success) {
    throw createError({
      statusCode: 500,
      message: result.error || 'Image generation failed'
    })
  }

  // Update recipe with imageKey
  await db
    .update(schema.recipes)
    .set({ imageKey: result.imageKey })
    .where(eq(schema.recipes.id, recipeId))

  // Invalidate KV cache for this recipe
  try {
    await hubKV().del(`recipe:${recipeId}`)
  } catch {
    // Cache invalidation is non-critical
  }

  return {
    success: true,
    imageKey: result.imageKey
  }
})
