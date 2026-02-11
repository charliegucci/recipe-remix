import type { Database } from './drizzle'
import { logAnalyticsEvent } from './analytics'

/**
 * Execute a database query with performance monitoring.
 *
 * Wraps any query function, measures execution time, and logs
 * a `query_performance` analytics event via fire-and-forget.
 *
 * @param db - Request-scoped Database instance
 * @param queryName - Human-readable query label (e.g., 'insert_recipe')
 * @param fn - Async function performing the query
 * @returns The query result
 */
export async function executeMonitoredQuery<T>(
  db: Database,
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  let success = true

  try {
    const result = await fn()
    return result
  } catch (error) {
    success = false
    throw error
  } finally {
    const latencyMs = Date.now() - start

    logAnalyticsEvent(db, {
      eventType: 'query_performance',
      metadata: {
        queryName,
        latencyMs,
        success
      }
    })
  }
}
