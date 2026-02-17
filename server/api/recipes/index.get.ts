import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/drizzle'

const PAGE_SIZE = 12 // 3 columns x 4 rows

export default defineEventHandler(async (event) => {
  const { category, page = 1 } = getQuery(event)
  const pageNum = Number(page)

  if (isNaN(pageNum) || pageNum < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid page number'
    })
  }

  const offset = (pageNum - 1) * PAGE_SIZE
  const cacheKey = `recipes:list:${category || 'all'}:${pageNum}`

  // Check KV cache first
  const kv = hubKV()
  const cached = await kv.getItem(cacheKey)
  if (cached) {
    // Set CDN cache headers before returning
    setResponseHeaders(event, {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600'
    })
    return cached
  }

  // Query D1
  const db = useDrizzle(event)
  let results

  if (!category) {
    // No category filter - get all recipes
    results = await db
      .select()
      .from(schema.recipes)
      .orderBy(schema.recipes.createdAt)
      .limit(PAGE_SIZE)
      .offset(offset)
  } else {
    // Filter by category - join with recipeCategories
    const joinResults = await db
      .select()
      .from(schema.recipes)
      .innerJoin(
        schema.recipeCategories,
        eq(schema.recipes.id, schema.recipeCategories.recipeId)
      )
      .where(eq(schema.recipeCategories.category, (category as string).charAt(0).toUpperCase() + (category as string).slice(1).toLowerCase()))
      .orderBy(schema.recipes.createdAt)
      .limit(PAGE_SIZE)
      .offset(offset)

    // Extract just the recipes part from join result
    results = joinResults.map(row => row.recipes)
  }

  // Parse JSON fields
  const recipes = results.map(recipe => ({
    ...recipe,
    ingredients: JSON.parse(recipe.ingredients),
    instructions: JSON.parse(recipe.instructions),
    cuisineTags: JSON.parse(recipe.cuisineTags),
    dietaryTags: JSON.parse(recipe.dietaryTags)
  }))

  // Cache in KV with 5 minute TTL
  await kv.setItem(cacheKey, recipes, { ttl: 300 })

  // Set CDN cache headers before returning
  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600'
  })

  return recipes
})
