import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/drizzle'
import { getAuth } from '../../../lib/auth'

export default defineEventHandler(async (event) => {
  // Require authenticated non-anonymous user
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user || (session.user as any).isAnonymous) {
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

  // Delete favorite (idempotent - no error if not found)
  await db
    .delete(schema.userFavorites)
    .where(
      and(
        eq(schema.userFavorites.userId, userId),
        eq(schema.userFavorites.recipeId, recipeId)
      )
    )
    .run()

  setResponseStatus(event, 204)
  return null
})
