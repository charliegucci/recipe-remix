import { defineEventHandler, createError } from 'h3'
import { useDrizzle, schema } from '../../utils/drizzle'
import { getAuth } from '../../lib/auth'
import { eq, and, gte, desc, count, sql } from 'drizzle-orm'

/**
 * Observability dashboard endpoint (Phase 6).
 *
 * Returns:
 * - D1 query latency percentiles (p50, p95, p99) from query_performance events
 * - Generation success/failure rates (last 24h and 7d)
 * - AI request counts
 * - p99 threshold breach indicator
 *
 * Authentication: Required.
 * Caching: 5-minute KV TTL.
 */

const P99_THRESHOLD_MS = 500

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
  const cacheKey = 'analytics:observability'
  const cached = await hubKV().get(cacheKey)
  if (cached) {
    return cached
  }

  const db = useDrizzle(event)

  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // === 1. Query Performance Latency Percentiles ===
  // Fetch all query_performance events from last 7 days
  const perfEventsRaw = await db
    .select({
      metadata: schema.analyticsEvents.metadata
    })
    .from(schema.analyticsEvents)
    .where(
      and(
        eq(schema.analyticsEvents.eventType, 'query_performance'),
        gte(schema.analyticsEvents.createdAt, sevenDaysAgo)
      )
    )
    .orderBy(desc(schema.analyticsEvents.createdAt))
    .limit(10000)

  // Extract latencies from metadata
  const latencies: number[] = []
  const queryBreakdown: Record<string, number[]> = {}

  for (const row of perfEventsRaw) {
    try {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      if (typeof meta?.latencyMs === 'number') {
        latencies.push(meta.latencyMs)
        const name = meta.queryName || 'unknown'
        if (!queryBreakdown[name]) queryBreakdown[name] = []
        queryBreakdown[name].push(meta.latencyMs)
      }
    } catch {
      // Skip malformed metadata
    }
  }

  // Calculate percentiles
  const calcPercentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, idx)] ?? 0
  }

  const latencyStats = {
    count: latencies.length,
    p50: calcPercentile(latencies, 50),
    p95: calcPercentile(latencies, 95),
    p99: calcPercentile(latencies, 99),
    avg: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0
  }

  // Per-query breakdown
  const queryStats = Object.entries(queryBreakdown).map(([name, values]) => ({
    queryName: name,
    count: values.length,
    p50: calcPercentile(values, 50),
    p95: calcPercentile(values, 95),
    p99: calcPercentile(values, 99),
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }))

  // === 2. Generation Stats (24h and 7d) ===
  const [gen24h, gen7d] = await Promise.all([
    getGenerationStats(db, twentyFourHoursAgo),
    getGenerationStats(db, sevenDaysAgo)
  ])

  // === 3. AI Request Counts ===
  const aiRequests7d = await db
    .select({ count: count() })
    .from(schema.analyticsEvents)
    .where(
      and(
        sql`${schema.analyticsEvents.eventType} IN ('recipe_generated', 'recipe_generation_failed', 'image_generated', 'image_generation_failed')`,
        gte(schema.analyticsEvents.createdAt, sevenDaysAgo)
      )
    )

  // === 4. Threshold Breach Detection ===
  const p99Breached = latencyStats.p99 > P99_THRESHOLD_MS

  const observabilityData = {
    latency: {
      ...latencyStats,
      thresholdMs: P99_THRESHOLD_MS,
      p99Breached,
      byQuery: queryStats
    },
    generation: {
      last24h: gen24h,
      last7d: gen7d
    },
    aiRequests: {
      last7d: aiRequests7d[0]?.count ?? 0
    },
    updatedAt: now.toISOString()
  }

  // Cache for 5 minutes
  await hubKV().set(cacheKey, observabilityData, { ttl: 300 })

  return observabilityData
})

async function getGenerationStats(db: ReturnType<typeof useDrizzle>, since: Date) {
  const [total, successful, failed] = await Promise.all([
    db.select({ count: count() }).from(schema.analyticsEvents).where(
      and(
        sql`${schema.analyticsEvents.eventType} IN ('recipe_generated', 'recipe_generation_failed')`,
        gte(schema.analyticsEvents.createdAt, since)
      )
    ),
    db.select({ count: count() }).from(schema.analyticsEvents).where(
      and(
        eq(schema.analyticsEvents.eventType, 'recipe_generated'),
        gte(schema.analyticsEvents.createdAt, since)
      )
    ),
    db.select({ count: count() }).from(schema.analyticsEvents).where(
      and(
        eq(schema.analyticsEvents.eventType, 'recipe_generation_failed'),
        gte(schema.analyticsEvents.createdAt, since)
      )
    )
  ])

  const totalCount = total[0]?.count ?? 0
  const successCount = successful[0]?.count ?? 0
  const failedCount = failed[0]?.count ?? 0

  return {
    total: totalCount,
    successful: successCount,
    failed: failedCount,
    successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 10000) / 100 : 0
  }
}
