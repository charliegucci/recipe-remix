import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getAuth } from '../../../lib/auth'
import { useDrizzle, schema } from '../../../utils/drizzle'

/**
 * Remove ingredient from pantry
 * DELETE /api/user/pantry/:id
 * Requires authenticated non-anonymous user
 */
export default defineEventHandler(async (event: H3Event) => {
  // Check authentication
  const session = await getAuth().api.getSession({ headers: event.headers })
  if (!session?.user || session.user.isAnonymous) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  // Get pantry item ID from route params
  const itemId = getRouterParam(event, 'id')
  if (!itemId) {
    throw createError({ statusCode: 400, message: 'Item ID is required' })
  }

  const db = useDrizzle(event)

  // Verify item exists and belongs to user
  const existing = await db
    .select()
    .from(schema.pantryItems)
    .where(
      and(
        eq(schema.pantryItems.id, itemId),
        eq(schema.pantryItems.userId, session.user.id)
      )
    )
    .limit(1)

  if (existing.length === 0) {
    throw createError({ statusCode: 404, message: 'Pantry item not found or not owned by user' })
  }

  // Delete the item
  await db
    .delete(schema.pantryItems)
    .where(
      and(
        eq(schema.pantryItems.id, itemId),
        eq(schema.pantryItems.userId, session.user.id)
      )
    )

  // Return 204 No Content
  setResponseStatus(event, 204)
  return null
})
