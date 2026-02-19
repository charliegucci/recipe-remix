import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/drizzle'
import { getAuth } from '../../../lib/auth'
import { buildSubstitutionPrompt } from '../../../utils/substitution-prompt'
import { parseSubstitutionResponse } from '../../../utils/substitution-parser'
import { logAnalyticsEvent } from '../../../utils/analytics'

/**
 * POST /api/recipes/:id/substitute
 *
 * Suggests an ingredient substitution using AI.
 * Returns the substitution without persisting to DB (session-local only).
 *
 * Implements: GEN-05
 */

interface SubstituteRequest {
  ingredientName: string
  reason: 'allergy' | 'unavailable' | 'preference'
  pantryItems?: string[]
}

export default defineEventHandler(async (event) => {
  // Auth required
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user || (session.user as any).isAnonymous) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const recipeId = getRouterParam(event, 'id')
  if (!recipeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recipe ID is required'
    })
  }

  const body = await readBody<SubstituteRequest>(event)
  const { ingredientName, reason, pantryItems } = body

  if (!ingredientName || typeof ingredientName !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'ingredientName is required'
    })
  }

  const validReasons = ['allergy', 'unavailable', 'preference']
  if (!reason || !validReasons.includes(reason)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'reason must be one of: allergy, unavailable, preference'
    })
  }

  // Fetch recipe from DB
  const db = useDrizzle(event)
  const recipe = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.id, recipeId))
    .get()

  if (!recipe) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recipe not found'
    })
  }

  const ingredients = JSON.parse(recipe.ingredients)
  const instructions = JSON.parse(recipe.instructions)

  // Verify ingredient exists in recipe
  const targetIngredient = ingredients.find(
    (ing: any) => ing.name.toLowerCase() === ingredientName.toLowerCase()
  )

  if (!targetIngredient) {
    throw createError({
      statusCode: 400,
      statusMessage: `Ingredient "${ingredientName}" not found in this recipe`
    })
  }

  // Build prompt
  const prompt = buildSubstitutionPrompt({
    recipeTitle: recipe.title,
    recipeDescription: recipe.description || '',
    ingredients,
    instructions,
    explanation: recipe.explanation || null,
    ingredientToReplace: ingredientName,
    reason,
    pantryItems: Array.isArray(pantryItems) ? pantryItems : undefined
  })

  // Call Workers AI
  try {
    const ai = hubAI()
    const result = await ai.run('@cf/meta/llama-3.1-70b-instruct' as any, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048
    })

    const llmResponse = typeof (result as any).response === 'string'
      ? (result as any).response
      : (result as any).response?.response || JSON.stringify(result)

    const parseResult = parseSubstitutionResponse(llmResponse)

    if (!parseResult.success || !parseResult.substitution) {
      // Log and return error
      logAnalyticsEvent(db, {
        eventType: 'recipe_generation_failed',
        userId: session.user.id,
        recipeId,
        metadata: { error: 'substitution_parse_failed', parseError: parseResult.error }
      })

      throw createError({
        statusCode: 422,
        statusMessage: 'Could not generate a valid substitution. Please try again.'
      })
    }

    // Log analytics
    logAnalyticsEvent(db, {
      eventType: 'recipe_generated',
      userId: session.user.id,
      recipeId,
      metadata: {
        action: 'substitution',
        original: ingredientName,
        substitute: parseResult.substitution.substitute.name,
        reason
      }
    })

    return {
      success: true,
      ...parseResult.substitution
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: 'AI service unavailable. Please try again later.'
    })
  }
})
