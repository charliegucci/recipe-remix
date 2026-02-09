import { defineEventHandler, createError } from 'h3'
import { useDrizzle, schema } from '../../utils/drizzle'
import { getAuth } from '../../lib/auth'
import { eq, and, gte, desc, count, sql } from 'drizzle-orm'

/**
 * Analytics dashboard endpoint (INFR-03).
 *
 * Returns:
 * - Generation stats (last 30 days): total, successful, failed, success rate
 * - Interaction stats (last 30 days): views, favorites, ratings
 * - Recent events (last 50)
 *
 * Authentication: Required (admin-level check out of scope for v1).
 * Caching: 5-minute KV TTL.
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  // Check KV cache first
  const cacheKey = 'analytics:dashboard'
  const cached = await hubKV().get(cacheKey)
  if (cached) {
    return cached
  }

  const db = useDrizzle(event)

  // Calculate 30 days ago timestamp
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Generation stats (last 30 days)
  const generationAttempts = await db
    .select({ count: count() })
    .from(schema.analyticsEvents)
    .where(
      and(
        sql`${schema.analyticsEvents.eventType} IN ('recipe_generated', 'recipe_generation_failed')`,
        gte(schema.analyticsEvents.createdAt, thirtyDaysAgo)
      )
    )

  const successfulGenerations = await db
    .select({ count: count() })
    .from(schema.analyticsEvents)
    .where(
      and(
        eq(schema.analyticsEvents.eventType, 'recipe_generated'),
        gte(schema.analyticsEvents.createdAt, thirtyDaysAgo)
      )
    )

  const failedGenerations = await db
    .select({ count: count() })
    .from(schema.analyticsEvents)
    .where(
      and(
        eq(schema.analyticsEvents.eventType, 'recipe_generation_failed'),
        gte(schema.analyticsEvents.createdAt, thirtyDaysAgo)
      )
    )

  const totalAttempts = generationAttempts[0]?.count ?? 0
  const successful = successfulGenerations[0]?.count ?? 0
  const failed = failedGenerations[0]?.count ?? 0
  const successRate = totalAttempts > 0 ? (successful / totalAttempts) * 100 : 0

  // Interaction stats (last 30 days)
  const recipeViews = await db
    .select({ count: count() })
    .from(schema.analyticsEvents)
    .where(
      and(
        eq(schema.analyticsEvents.eventType, 'recipe_viewed'),
        gte(schema.analyticsEvents.createdAt, thirtyDaysAgo)
      )
    )

  const recipeFavorites = await db
    .select({ count: count() })
    .from(schema.analyticsEvents)
    .where(
      and(
        eq(schema.analyticsEvents.eventType, 'recipe_favorited'),
        gte(schema.analyticsEvents.createdAt, thirtyDaysAgo)
      )
    )

  const recipeRatings = await db
    .select({ count: count() })
    .from(schema.analyticsEvents)
    .where(
      and(
        eq(schema.analyticsEvents.eventType, 'recipe_rated'),
        gte(schema.analyticsEvents.createdAt, thirtyDaysAgo)
      )
    )

  // Recent events (last 50)
  const recentEventsRaw = await db
    .select()
    .from(schema.analyticsEvents)
    .orderBy(desc(schema.analyticsEvents.createdAt))
    .limit(50)

  // Parse metadata JSON before returning
  const recentEvents = recentEventsRaw.map(event => ({
    ...event,
    metadata: JSON.parse(event.metadata)
  }))

  // Build response
  const dashboardData = {
    generation: {
      total: totalAttempts,
      successful,
      failed,
      successRate: Math.round(successRate * 100) / 100 // Round to 2 decimals
    },
    interactions: {
      views: recipeViews[0]?.count ?? 0,
      favorites: recipeFavorites[0]?.count ?? 0,
      ratings: recipeRatings[0]?.count ?? 0
    },
    recentEvents
  }

  // Cache for 5 minutes
  await hubKV().set(cacheKey, dashboardData, { ttl: 300 })

  return dashboardData
})
