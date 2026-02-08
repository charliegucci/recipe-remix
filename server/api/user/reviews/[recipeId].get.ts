import { eq, desc, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/drizzle'

export default defineEventHandler(async (event) => {
  const recipeId = getRouterParam(event, 'recipeId')

  if (!recipeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recipe ID is required'
    })
  }

  const db = useDrizzle(event)

  // Get query params for pagination
  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const pageSize = 10
  const offset = (page - 1) * pageSize

  // Get aggregate stats
  const aggregateResult = await db
    .select({
      avgRating: sql<number>`AVG(${schema.userRecipeReviews.rating})`,
      totalReviews: sql<number>`COUNT(*)`
    })
    .from(schema.userRecipeReviews)
    .where(eq(schema.userRecipeReviews.recipeId, recipeId))
    .get()

  const avgRating = aggregateResult?.avgRating || null
  const totalReviews = aggregateResult?.totalReviews || 0

  // Get paginated reviews with user details
  const reviews = await db
    .select({
      userId: schema.userRecipeReviews.userId,
      userName: schema.users.name,
      rating: schema.userRecipeReviews.rating,
      review: schema.userRecipeReviews.review,
      createdAt: schema.userRecipeReviews.createdAt,
      updatedAt: schema.userRecipeReviews.updatedAt
    })
    .from(schema.userRecipeReviews)
    .leftJoin(schema.users, eq(schema.userRecipeReviews.userId, schema.users.id))
    .where(eq(schema.userRecipeReviews.recipeId, recipeId))
    .orderBy(desc(schema.userRecipeReviews.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all()

  return {
    avgRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
    totalReviews,
    reviews,
    page,
    pageSize,
    hasMore: totalReviews > page * pageSize
  }
})
