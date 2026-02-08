import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/drizzle'
import { getAuth } from '../../../lib/auth'

export default defineEventHandler(async (event) => {
  // Require authenticated non-anonymous user
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user || session.user.isAnonymous) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const userId = session.user.id
  const recipeId = getRouterParam(event, 'recipeId')

  if (!recipeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recipe ID is required'
    })
  }

  const db = useDrizzle(event)

  // Verify recipe exists
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

  // Check if already favorited
  const existing = await db
    .select()
    .from(schema.userFavorites)
    .where(
      and(
        eq(schema.userFavorites.userId, userId),
        eq(schema.userFavorites.recipeId, recipeId)
      )
    )
    .get()

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Recipe already favorited'
    })
  }

  // Insert favorite
  await db
    .insert(schema.userFavorites)
    .values({
      userId,
      recipeId,
      createdAt: new Date()
    })
    .run()

  setResponseStatus(event, 201)
  return { favorited: true }
})
