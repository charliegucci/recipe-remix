import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getAuth } from '../../../lib/auth'
import { useDrizzle, schema } from '../../../utils/drizzle'

/**
 * Get user's dietary restrictions
 * GET /api/user/dietary-restrictions
 * Returns array of restriction strings
 * Requires authenticated non-anonymous user
 */
export default defineEventHandler(async (event: H3Event) => {
  // Check authentication
  const session = await getAuth().api.getSession({ headers: event.headers })
  if (!session?.user || (session.user as any).isAnonymous) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  // Fetch dietary restrictions for user
  const db = useDrizzle(event)
  const restrictions = await db
    .select({
      restriction: schema.userDietaryRestrictions.restriction
    })
    .from(schema.userDietaryRestrictions)
    .where(eq(schema.userDietaryRestrictions.userId, session.user.id))

  // Return just the restriction strings
  return restrictions.map(r => r.restriction)
})
