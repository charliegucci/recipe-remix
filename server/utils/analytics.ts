import type { Database } from './drizzle'
import { schema } from './drizzle'

/**
 * Analytics event types tracked across the application.
 * These events feed into the analytics dashboard (INFR-03).
 */
export type AnalyticsEventType =
  | 'recipe_generated'
  | 'recipe_generation_failed'
  | 'recipe_viewed'
  | 'recipe_favorited'
  | 'recipe_unfavorited'
  | 'recipe_rated'
  | 'image_generated'
  | 'image_generation_failed'

/**
 * Input structure for logging an analytics event.
 */
export interface AnalyticsEventInput {
  eventType: AnalyticsEventType
  userId?: string | null
  recipeId?: string | null
  metadata?: Record<string, any>
}

/**
 * Log an analytics event to the database.
 *
 * FIRE-AND-FORGET: This function does NOT return a promise that the caller
 * needs to await. The internal DB operation is wrapped in .catch() to ensure
 * analytics failures never crash the caller.
 *
 * This design ensures analytics has zero impact on request latency or reliability.
 *
 * @param db Request-scoped Database instance
 * @param input Event data to log
 */
export function logAnalyticsEvent(db: Database, input: AnalyticsEventInput): void {
  // Fire-and-forget: Start the promise but don't return it
  // Swallow all errors to ensure analytics failures never propagate
  db.insert(schema.analyticsEvents)
    .values({
      id: crypto.randomUUID(),
      eventType: input.eventType,
      userId: input.userId ?? null,
      recipeId: input.recipeId ?? null,
      metadata: JSON.stringify(input.metadata ?? {}),
      createdAt: new Date()
    })
    .catch(() => {
      // Silently swallow all analytics errors
      // Analytics should never crash the application
    })
}
