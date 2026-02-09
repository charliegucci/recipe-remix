import { defineEventHandler, readBody, createError } from 'h3'
import { useDrizzle } from '../../utils/drizzle'
import { logAnalyticsEvent } from '../../utils/analytics'
import { getAuth } from '../../lib/auth'

/**
 * Analytics event ingestion endpoint for client-side events.
 *
 * Purpose: Allows the browser to log analytics events like recipe_viewed,
 * recipe_favorited, etc.
 *
 * Security: Only accepts safe event types from clients. Server-side events
 * (recipe_generated, etc.) should use logAnalyticsEvent directly.
 *
 * Authentication: Optional - guests can log views too.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Validate event type
  const ALLOWED_CLIENT_EVENT_TYPES = [
    'recipe_viewed',
    'recipe_favorited',
    'recipe_unfavorited'
  ]

  if (!body.eventType || !ALLOWED_CLIENT_EVENT_TYPES.includes(body.eventType)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or disallowed event type'
    })
  }

  // Get userId from session if authenticated (optional for guests)
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })
  const userId = session?.user?.id ?? null

  // Log the event (fire-and-forget)
  const db = useDrizzle(event)
  logAnalyticsEvent(db, {
    eventType: body.eventType,
    userId,
    recipeId: body.recipeId ?? null,
    metadata: body.metadata ?? {}
  })

  // Return immediately - don't wait for DB write
  return { status: 'accepted' }
})
