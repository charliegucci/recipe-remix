import { getAuth } from '../../lib/auth'
import { useDrizzle, schema } from '../../utils/drizzle'
import { eq, and } from 'drizzle-orm'

interface MigrationBody {
  pantryItems: Array<{
    ingredientId: string
    ingredientName: string
  }>
  dietaryRestrictions: string[]
}

export default defineEventHandler(async (event) => {
  // Require authenticated non-anonymous user
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  if ((session.user as any).isAnonymous) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anonymous users cannot migrate data'
    })
  }

  const userId = session.user.id
  const body = await readBody<MigrationBody>(event)
  const { pantryItems = [], dietaryRestrictions = [] } = body

  const db = useDrizzle(event)

  let migratedPantryCount = 0
  let migratedRestrictionCount = 0

  // Migrate pantry items
  if (pantryItems.length > 0) {
    for (const item of pantryItems) {
      // Check if item already exists for this user
      const existing = await db
        .select()
        .from(schema.pantryItems)
        .where(
          and(
            eq(schema.pantryItems.userId, userId),
            eq(schema.pantryItems.ingredientId, item.ingredientId)
          )
        )
        .limit(1)

      if (existing.length === 0) {
        // Insert new pantry item
        await db.insert(schema.pantryItems).values({
          id: crypto.randomUUID(),
          userId,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          addedAt: new Date()
        })
        migratedPantryCount++
      }
    }
  }

  // Migrate dietary restrictions
  if (dietaryRestrictions.length > 0) {
    // Delete existing restrictions (we're replacing, not merging)
    await db
      .delete(schema.userDietaryRestrictions)
      .where(eq(schema.userDietaryRestrictions.userId, userId))

    // Insert new restrictions
    for (const restriction of dietaryRestrictions) {
      await db.insert(schema.userDietaryRestrictions).values({
        id: crypto.randomUUID(),
        userId,
        restriction,
        createdAt: new Date()
      })
      migratedRestrictionCount++
    }
  }

  return {
    migratedPantryCount,
    migratedRestrictionCount
  }
})
