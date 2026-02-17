import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/drizzle'
import { getAuth } from '../../../lib/auth'

const PAGE_SIZE = 20

export default defineEventHandler(async (event) => {
  // Require authenticated non-anonymous user
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user || (session.user as any).isAnonymous) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const userId = session.user.id

  // Parse page query param
  const query = getQuery(event)
  const page = parseInt(query.page as string) || 0
  const offset = page * PAGE_SIZE

  // Fetch history with recipe join
  const db = useDrizzle(event)
  const results = await db
    .select({
      recipe: schema.recipes,
      viewedAt: schema.userRecipeHistory.viewedAt
    })
    .from(schema.userRecipeHistory)
    .innerJoin(schema.recipes, eq(schema.userRecipeHistory.recipeId, schema.recipes.id))
    .where(eq(schema.userRecipeHistory.userId, userId))
    .orderBy(desc(schema.userRecipeHistory.viewedAt))
    .limit(PAGE_SIZE + 1)
    .offset(offset)
    .all()

  // Determine if more pages exist
  const hasMore = results.length > PAGE_SIZE
  const items = hasMore ? results.slice(0, PAGE_SIZE) : results

  // Parse JSON fields and include viewedAt
  const recipes = items.map(item => ({
    ...item.recipe,
    ingredients: JSON.parse(item.recipe.ingredients),
    instructions: JSON.parse(item.recipe.instructions),
    cuisineTags: JSON.parse(item.recipe.cuisineTags),
    dietaryTags: JSON.parse(item.recipe.dietaryTags),
    viewedAt: item.viewedAt
  }))

  return {
    recipes,
    hasMore
  }
})
