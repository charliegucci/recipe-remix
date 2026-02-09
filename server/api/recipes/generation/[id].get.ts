import { getAuth } from '../../../lib/auth'
import { useDrizzle } from '../../../utils/drizzle'
import { generationHistory, recipes } from '../../../db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/recipes/generation/:id
 *
 * Poll generation status for a specific generation history record.
 * Enables frontend to check status when user navigates away and returns.
 *
 * Returns:
 * - 404 if generation not found
 * - 403 if generation belongs to different user
 * - 200 with generation status and recipe (if completed)
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  const generationId = getRouterParam(event, 'id')
  if (!generationId) {
    throw createError({
      statusCode: 400,
      message: 'Generation ID required'
    })
  }

  const db = useDrizzle(event)

  // Look up generation history record
  const [generation] = await db
    .select()
    .from(generationHistory)
    .where(eq(generationHistory.id, generationId))
    .limit(1)

  if (!generation) {
    throw createError({
      statusCode: 404,
      message: 'Generation not found'
    })
  }

  // Verify ownership
  if (generation.userId !== session.user.id) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to view this generation'
    })
  }

  // Base response
  const response: {
    id: string
    status: string
    recipeId: string | null
    errorMessage: string | null
    createdAt: Date
    completedAt: Date | null
    recipe?: any
  } = {
    id: generation.id,
    status: generation.status,
    recipeId: generation.recipeId,
    errorMessage: generation.errorMessage,
    createdAt: generation.createdAt,
    completedAt: generation.completedAt
  }

  // If completed and has recipe, fetch and include it
  if (generation.status === 'completed' && generation.recipeId) {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, generation.recipeId))
      .limit(1)

    if (recipe) {
      // Parse JSON fields before returning
      response.recipe = {
        ...recipe,
        ingredients: JSON.parse(recipe.ingredients),
        instructions: JSON.parse(recipe.instructions),
        cuisineTags: JSON.parse(recipe.cuisineTags),
        dietaryTags: JSON.parse(recipe.dietaryTags)
      }
    }
  }

  return response
})
