import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/drizzle'
import { getAuth } from '../../../lib/auth'

export default defineEventHandler(async (event) => {
  const recipeId = getRouterParam(event, 'recipeId')

  if (!recipeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recipe ID is required'
    })
  }

  // Require authenticated non-anonymous user
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user || (session.user as any).isAnonymous) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const { rating, review } = body

  // Validate rating
  if (!rating || typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rating must be an integer between 1 and 5'
    })
  }

  // Validate review text if provided
  if (review !== undefined && review !== null) {
    if (typeof review !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Review must be a string'
      })
    }
    if (review.length > 1000) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Review must be 1000 characters or less'
      })
    }
  }

  const db = useDrizzle(event)
  const userId = session.user.id

  // Check if user already has a review for this recipe
  const existingReview = await db
    .select()
    .from(schema.userRecipeReviews)
    .where(
      and(
        eq(schema.userRecipeReviews.userId, userId),
        eq(schema.userRecipeReviews.recipeId, recipeId)
      )
    )
    .get()

  if (existingReview) {
    // Update existing review
    const updated = await db
      .update(schema.userRecipeReviews)
      .set({
        rating,
        review: review || null,
        updatedAt: new Date()
      })
      .where(eq(schema.userRecipeReviews.id, existingReview.id))
      .returning()
      .get()

    return {
      ...updated,
      statusCode: 200
    }
  } else {
    // Insert new review
    const newReview = await db
      .insert(schema.userRecipeReviews)
      .values({
        id: crypto.randomUUID(),
        userId,
        recipeId,
        rating,
        review: review || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()
      .get()

    return {
      ...newReview,
      statusCode: 201
    }
  }
})
