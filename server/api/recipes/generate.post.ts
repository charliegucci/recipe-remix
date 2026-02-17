import { useDrizzle, schema } from '../../utils/drizzle'
import { drizzle } from 'drizzle-orm/d1'
import { getAuth } from '../../lib/auth'
import { buildRecipePrompt } from '../../utils/ai-prompt'
import { parseRecipeResponse } from '../../utils/recipe-parser'
import { validateIngredients } from '../../utils/ingredient-validation'
import { checkDietaryRestrictions } from '../../utils/dietary-check'
import { injectSafetyTemps } from '../../utils/food-safety'
import { generateAndStoreImage } from '../../utils/image-generation'
import { logAnalyticsEvent } from '../../utils/analytics'
import { retryD1Write } from '../../utils/d1-retry'
import { executeMonitoredQuery } from '../../utils/monitored-query'
import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'

/**
 * POST /api/recipes/generate
 *
 * AI recipe generation endpoint - the core of Phase 4.
 * Orchestrates the full pipeline: prompt building, LLM call, validation, safety injection.
 *
 * Implements: GEN-01, GEN-02, SAFE-01, SAFE-02, SAFE-03, SAFE-04, INFR-02
 */

interface GenerateRequest {
  ingredients: string[]
  cuisines: string[]
  restrictions?: string[]
}

const SUPPORTED_CUISINES = [
  'Italian',
  'Mexican',
  'Japanese',
  'Thai',
  'Indian',
  'Chinese',
  'Korean',
  'French',
  'Mediterranean',
  'Middle Eastern',
  'American',
  'Ethiopian',
  'surprise'
]

export default defineEventHandler(async (event) => {
  // === 1. Authentication ===
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user || (session.user as any).isAnonymous) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required. Please sign in to generate recipes.'
    })
  }

  const userId = session.user.id

  // === 2. Parse and validate input ===
  const body = await readBody<GenerateRequest>(event)
  const { ingredients, cuisines, restrictions = [] } = body

  // Validate ingredients array (min 2)
  if (!Array.isArray(ingredients) || ingredients.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please provide at least 2 ingredients'
    })
  }

  // Validate cuisines array (min 1, max 3)
  if (!Array.isArray(cuisines) || cuisines.length < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please select at least one cuisine'
    })
  }

  if (cuisines.length > 3) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please select at most 3 cuisines'
    })
  }

  // Validate cuisine values
  for (const cuisine of cuisines) {
    if (!SUPPORTED_CUISINES.includes(cuisine)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unsupported cuisine: ${cuisine}`
      })
    }
  }

  const db = useDrizzle(event)

  // === 3. Create generation history record ===
  const generationId = crypto.randomUUID()

  try {
    await retryD1Write(() =>
      executeMonitoredQuery(db, 'insert_generation_history', () =>
        db.insert(schema.generationHistory).values({
          id: generationId,
          userId,
          inputIngredients: JSON.stringify(ingredients),
          cuisinePreferences: JSON.stringify(cuisines),
          status: 'generating',
          createdAt: new Date()
        })
      )
    )
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to initialize recipe generation'
    })
  }

  // === 4. Handle "surprise" cuisine selection ===
  let selectedCuisines = [...cuisines]
  if (cuisines.includes('surprise')) {
    // Remove "surprise" and pick 2 random cuisines
    const availableCuisines = SUPPORTED_CUISINES.filter(c => c !== 'surprise')
    const shuffled = availableCuisines.sort(() => Math.random() - 0.5)
    selectedCuisines = shuffled.slice(0, 2)
  }

  // === 5. Build prompt ===
  const prompt = buildRecipePrompt({
    ingredients,
    cuisines: selectedCuisines,
    restrictions
  })

  // === 6. Call Workers AI ===
  let llmResponse: string
  let retryCount = 0
  const MAX_RETRIES = 1

  while (retryCount <= MAX_RETRIES) {
    try {
      const ai = hubAI()
      const result = await ai.run('@cf/meta/llama-3.1-70b-instruct' as any, {
        messages: [
          { role: 'user', content: retryCount === 0 ? prompt : `Your previous response was not valid JSON. Please return ONLY the JSON object with no markdown or extra text.\n\n${prompt}` }
        ],
        max_tokens: 2048
      })

      // Extract response text
      const resultAny = result as any
      llmResponse = typeof resultAny.response === 'string'
        ? resultAny.response
        : resultAny.response?.response || JSON.stringify(result)

      // === 7. Parse response ===
      const parseResult = parseRecipeResponse(llmResponse)

      if (parseResult.success && parseResult.recipe) {
        // Success - break out of retry loop
        const recipe = parseResult.recipe

        // === 8. Validate ingredients (SAFE-01, SAFE-04) ===
        const validationResult = await validateIngredients(db, recipe.ingredients)

        if (!validationResult.valid) {
          // Update history to failed
          await db.update(schema.generationHistory)
            .set({
              status: 'failed',
              errorMessage: `Unverified ingredients: ${validationResult.unresolved.join(', ')}`,
              completedAt: new Date()
            })
            .where(eq(schema.generationHistory.id, generationId))

          logAnalyticsEvent(db, {
            eventType: 'recipe_generation_failed',
            userId,
            metadata: { error: 'unverified_ingredients', unresolved: validationResult.unresolved, cuisines: selectedCuisines }
          })

          throw createError({
            statusCode: 422,
            statusMessage: 'Recipe contains unverified ingredients',
            data: { unresolved: validationResult.unresolved }
          })
        }

        // === 9. Check dietary restrictions (SAFE-02) ===
        if (restrictions.length > 0) {
          const dietaryCheck = checkDietaryRestrictions(recipe.ingredients, restrictions)

          if (!dietaryCheck.passed) {
            // Update history to failed
            await db.update(schema.generationHistory)
              .set({
                status: 'failed',
                errorMessage: `Dietary violations: ${dietaryCheck.violations.map(v => `${v.ingredient} (${v.restriction})`).join(', ')}`,
                completedAt: new Date()
              })
              .where(eq(schema.generationHistory.id, generationId))

            logAnalyticsEvent(db, {
              eventType: 'recipe_generation_failed',
              userId,
              metadata: { error: 'dietary_violations', violations: dietaryCheck.violations, cuisines: selectedCuisines }
            })

            throw createError({
              statusCode: 422,
              statusMessage: 'Recipe violates dietary restrictions',
              data: { violations: dietaryCheck.violations }
            })
          }
        }

        // === 10. Inject safety temperatures (SAFE-03) ===
        const safeInstructions = injectSafetyTemps(recipe.instructions, recipe.ingredients)

        // === 11. Save recipe to D1 ===
        const recipeId = crypto.randomUUID()
        const recipeSlug = `${recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${recipeId.slice(0, 8)}`

        try {
          await retryD1Write(() =>
            executeMonitoredQuery(db, 'insert_recipe', () =>
              db.insert(schema.recipes).values({
                id: recipeId,
                slug: recipeSlug,
                title: recipe.title,
                description: recipe.description,
                ingredients: JSON.stringify(recipe.ingredients),
                instructions: JSON.stringify(safeInstructions),
                cuisineTags: JSON.stringify(recipe.cuisineTags),
                dietaryTags: JSON.stringify(recipe.dietaryTags),
                cookTime: recipe.cookTime,
                difficulty: recipe.difficulty,
                servings: recipe.servings,
                explanation: recipe.whyThisWorks || null,
                imageKey: null, // Image generation happens async in Plan 03
                source: 'ai_generated',
                featured: false,
                createdAt: new Date()
              })
            )
          )
        } catch (error) {
          // Update history to failed
          await db.update(schema.generationHistory)
            .set({
              status: 'failed',
              errorMessage: 'Failed to save recipe to database',
              completedAt: new Date()
            })
            .where(eq(schema.generationHistory.id, generationId))

          logAnalyticsEvent(db, {
            eventType: 'recipe_generation_failed',
            userId,
            metadata: { error: 'db_save_failed', cuisines: selectedCuisines }
          })

          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to save recipe. Please try again.'
          })
        }

        // === 12. Update generation history to completed ===
        await retryD1Write(() =>
          executeMonitoredQuery(db, 'update_generation_completed', () =>
            db.update(schema.generationHistory)
              .set({
                status: 'completed',
                recipeId,
                completedAt: new Date()
              })
              .where(eq(schema.generationHistory.id, generationId))
          )
        )

        // === 12.5. Log analytics event ===
        logAnalyticsEvent(db, {
          eventType: 'recipe_generated',
          userId,
          recipeId,
          metadata: { cuisines: selectedCuisines, ingredientCount: ingredients.length }
        })

        // === 12.6. Best-effort fire-and-forget image generation ===
        // IMPORTANT: In Cloudflare Workers, fire-and-forget promises may not complete
        // after the response is sent. This is best-effort only. The frontend MUST call
        // POST /api/recipes/:id/image as the primary reliable path for image generation.
        generateAndStoreImage(recipeId, recipe.title, recipe.description, recipe.cuisineTags)
          .then(async (result) => {
            if (result.success && result.imageKey) {
              const imgDb = hubDatabase()
              const imgDrizzle = drizzle(imgDb, { schema })
              await imgDrizzle.update(schema.recipes)
                .set({ imageKey: result.imageKey })
                .where(eq(schema.recipes.id, recipeId))
              logAnalyticsEvent(db, { eventType: 'image_generated', userId, recipeId })
            }
          })
          .catch(() => {
            logAnalyticsEvent(db, { eventType: 'image_generation_failed', userId, recipeId })
          })

        // === 13. Invalidate KV cache ===
        // Clear recipe listing caches (they may now be stale)
        const kv = hubKV()
        try {
          // Delete common cache keys that might include this new recipe
          await kv.del('recipes:featured')
          // Could also delete category caches if we knew which categories apply
        } catch {
          // Cache invalidation failure is non-critical
        }

        // === 14. Return response ===
        return {
          recipe: {
            id: recipeId,
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: safeInstructions,
            cuisineTags: recipe.cuisineTags,
            dietaryTags: recipe.dietaryTags,
            cookTime: recipe.cookTime,
            difficulty: recipe.difficulty,
            servings: recipe.servings,
            explanation: recipe.whyThisWorks || null,
            imageKey: null,
            source: 'ai_generated',
            featured: false,
            createdAt: new Date()
          },
          generationId,
          selectedCuisines // Return actual cuisines picked (in case of "surprise")
        }
      } else {
        // Parse failed - retry if we haven't yet
        if (retryCount < MAX_RETRIES) {
          retryCount++
          continue // Retry with stricter prompt
        } else {
          // Both attempts failed
          await db.update(schema.generationHistory)
            .set({
              status: 'failed',
              errorMessage: `Parse error: ${parseResult.error}`,
              completedAt: new Date()
            })
            .where(eq(schema.generationHistory.id, generationId))

          logAnalyticsEvent(db, {
            eventType: 'recipe_generation_failed',
            userId,
            metadata: { error: 'parse_failed', parseError: parseResult.error, cuisines: selectedCuisines }
          })

          throw createError({
            statusCode: 422,
            statusMessage: 'Could not generate a valid recipe. Please try again.',
            data: { parseError: parseResult.error }
          })
        }
      }
    } catch (error) {
      // LLM call failed or other error
      if ((error as any).statusCode) {
        // Already a createError - rethrow
        throw error
      }

      // Update history to failed
      await db.update(schema.generationHistory)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown AI error',
          completedAt: new Date()
        })
        .where(eq(schema.generationHistory.id, generationId))

      logAnalyticsEvent(db, {
        eventType: 'recipe_generation_failed',
        userId,
        metadata: { error: error instanceof Error ? error.message : 'Unknown AI error', cuisines: selectedCuisines }
      })

      throw createError({
        statusCode: 500,
        statusMessage: 'AI service unavailable. Please try again later.',
        data: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      })
    }
  }

  // Should never reach here due to throw in retry loop, but TypeScript needs this
  throw createError({
    statusCode: 500,
    statusMessage: 'Unexpected error during recipe generation'
  })
})
