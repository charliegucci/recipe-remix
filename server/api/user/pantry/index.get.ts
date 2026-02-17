import { eq, desc } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getAuth } from '../../../lib/auth'
import { useDrizzle, schema } from '../../../utils/drizzle'

/**
 * Get user's pantry items
 * GET /api/user/pantry
 * Requires authenticated non-anonymous user
 */
export default defineEventHandler(async (event: H3Event) => {
  // Check authentication
  const session = await getAuth().api.getSession({ headers: event.headers })
  if (!session?.user || (session.user as any).isAnonymous) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  // Fetch pantry items for user
  const db = useDrizzle(event)
  const items = await db
    .select({
      id: schema.pantryItems.id,
      ingredientId: schema.pantryItems.ingredientId,
      ingredientName: schema.pantryItems.ingredientName,
      addedAt: schema.pantryItems.addedAt
    })
    .from(schema.pantryItems)
    .where(eq(schema.pantryItems.userId, session.user.id))
    .orderBy(desc(schema.pantryItems.addedAt))

  return items
})
