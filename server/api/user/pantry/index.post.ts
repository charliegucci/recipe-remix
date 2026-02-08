import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getAuth } from '../../../lib/auth'
import { useDrizzle, schema } from '../../../utils/drizzle'

/**
 * Add ingredient to pantry
 * POST /api/user/pantry
 * Body: { ingredientId: string, ingredientName: string }
 * Requires authenticated non-anonymous user
 */
export default defineEventHandler(async (event: H3Event) => {
  // Check authentication
  const session = await getAuth().api.getSession({ headers: event.headers })
  if (!session?.user || session.user.isAnonymous) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  // Parse request body
  const body = await readBody(event)
  const { ingredientId, ingredientName } = body

  if (!ingredientId || !ingredientName) {
    throw createError({ statusCode: 400, message: 'ingredientId and ingredientName are required' })
  }

  const db = useDrizzle(event)

  // Check for duplicate
  const existing = await db
    .select()
    .from(schema.pantryItems)
    .where(
      and(
        eq(schema.pantryItems.userId, session.user.id),
        eq(schema.pantryItems.ingredientId, ingredientId)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    throw createError({ statusCode: 409, message: 'Ingredient already in pantry' })
  }

  // Create new pantry item
  const newItem = {
    id: crypto.randomUUID(),
    userId: session.user.id,
    ingredientId,
    ingredientName,
    addedAt: new Date()
  }

  await db.insert(schema.pantryItems).values(newItem)

  // Return created item with 201 status
  setResponseStatus(event, 201)
  return {
    id: newItem.id,
    ingredientId: newItem.ingredientId,
    ingredientName: newItem.ingredientName,
    addedAt: newItem.addedAt
  }
})
