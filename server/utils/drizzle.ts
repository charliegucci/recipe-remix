import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from '../db/schema'

/**
 * Get a request-scoped Drizzle instance.
 * IMPORTANT: D1 bindings are only available within request handlers.
 * Do NOT call this at module scope - it will fail.
 */
export function useDrizzle(event: H3Event) {
  // NuxtHub provides hubDatabase() which handles binding resolution
  const db = hubDatabase()
  return drizzle(db, { schema })
}

// Re-export schema for convenience
export { schema }
export type Database = ReturnType<typeof useDrizzle>
