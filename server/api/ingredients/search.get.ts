import { eq, like, or, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDrizzle, schema } from '../../utils/drizzle'

/**
 * Ingredient autocomplete search API
 * GET /api/ingredients/search?q=<query>
 * Returns top 10 ranked ingredient matches
 */
export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()

  // Return empty array for queries shorter than 2 chars
  if (q.length < 2) {
    return []
  }

  // Normalize query for caching
  const normalizedQuery = q.toLowerCase()
  const cacheKey = `ingredients:search:${normalizedQuery}`

  // Check KV cache first (24-hour TTL - ingredient list is static)
  const kv = hubKV()
  const cached = await kv.getItem(cacheKey)
  if (cached) {
    return cached
  }

  // Query database for matches
  const db = useDrizzle(event)

  // Search in both name and commonNames fields
  const searchPattern = `%${normalizedQuery}%`

  const results = await db
    .select({
      id: schema.ingredients.id,
      name: schema.ingredients.name,
      category: schema.ingredients.category
    })
    .from(schema.ingredients)
    .where(
      or(
        sql`LOWER(${schema.ingredients.name}) LIKE ${searchPattern}`,
        sql`LOWER(${schema.ingredients.commonNames}) LIKE ${searchPattern}`
      )
    )
    .orderBy(schema.ingredients.name)
    .limit(10)

  // Format results
  const formattedResults = results.map(({ id, name, category }) => ({
    id,
    name,
    category
  }))

  // Cache results for 24 hours
  await kv.setItem(cacheKey, formattedResults, {
    ttl: 60 * 60 * 24 // 24 hours
  })

  return formattedResults
})
