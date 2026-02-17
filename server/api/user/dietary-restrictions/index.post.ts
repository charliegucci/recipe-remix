import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getAuth } from '../../../lib/auth'
import { useDrizzle, schema } from '../../../utils/drizzle'

// Valid dietary restrictions
const VALID_RESTRICTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free']

/**
 * Update user's dietary restrictions
 * POST /api/user/dietary-restrictions
 * Body: { restrictions: string[] }
 * This is a "sync" operation - replaces all existing restrictions
 * Requires authenticated non-anonymous user
 */
export default defineEventHandler(async (event: H3Event) => {
  // Check authentication
  const session = await getAuth().api.getSession({ headers: event.headers })
  if (!session?.user || (session.user as any).isAnonymous) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  // Parse request body
  const body = await readBody(event)
  const { restrictions } = body

  if (!Array.isArray(restrictions)) {
    throw createError({ statusCode: 400, message: 'restrictions must be an array' })
  }

  // Validate all restrictions
  for (const restriction of restrictions) {
    if (!VALID_RESTRICTIONS.includes(restriction)) {
      throw createError({
        statusCode: 400,
        message: `Invalid restriction: ${restriction}. Valid values: ${VALID_RESTRICTIONS.join(', ')}`
      })
    }
  }

  const db = useDrizzle(event)

  // Delete all existing restrictions for user
  await db
    .delete(schema.userDietaryRestrictions)
    .where(eq(schema.userDietaryRestrictions.userId, session.user.id))

  // Insert new restrictions (if any)
  if (restrictions.length > 0) {
    const newRestrictions = restrictions.map(restriction => ({
      id: crypto.randomUUID(),
      userId: session.user.id,
      restriction,
      createdAt: new Date()
    }))

    await db.insert(schema.userDietaryRestrictions).values(newRestrictions)
  }

  // Return the new restriction list
  return restrictions
})
