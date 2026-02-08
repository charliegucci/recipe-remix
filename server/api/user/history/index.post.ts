import { eq } from 'drizzle-orm'
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

  // Read body
  const body = await readBody(event)
  const recipeId = body?.recipeId

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

  // Generate UUID for history entry
  const id = crypto.randomUUID()

  // Insert history entry (always create new row)
  await db
    .insert(schema.userRecipeHistory)
    .values({
      id,
      userId,
      recipeId,
      viewedAt: new Date()
    })
    .run()

  setResponseStatus(event, 201)
  return { recorded: true }
})
