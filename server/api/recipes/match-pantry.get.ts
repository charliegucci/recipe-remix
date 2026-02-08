import { useDrizzle, schema } from '../../utils/drizzle'
import crypto from 'node:crypto'

interface MatchedRecipe {
  recipe: any
  matchPercent: number
  matchedCount: number
  totalCount: number
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const ingredientsParam = query.ingredients as string | undefined
  const restrictionsParam = query.restrictions as string | undefined

  // If no ingredients provided, return empty array
  if (!ingredientsParam || ingredientsParam.trim() === '') {
    return []
  }

  // Parse comma-separated ingredient names
  const pantryIngredients = ingredientsParam
    .split(',')
    .map(name => name.trim().toLowerCase())
    .filter(name => name.length > 0)

  if (pantryIngredients.length === 0) {
    return []
  }

  // Parse dietary restrictions if provided
  const restrictions = restrictionsParam
    ? restrictionsParam.split(',').map(r => r.trim())
    : []

  // Create cache key from ingredients and restrictions
  const cacheKeyInput = `${ingredientsParam}|${restrictionsParam || ''}`
  const cacheHash = crypto.createHash('md5').update(cacheKeyInput).digest('hex')
  const cacheKey = `match:${cacheHash}`

  // Check KV cache first
  const kv = hubKV()
  const cached = await kv.getItem<MatchedRecipe[]>(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch all recipes from D1 (< 10k rows, in-memory filtering)
  const db = useDrizzle(event)
  const allRecipes = await db.select().from(schema.recipes)

  // Match recipes against pantry ingredients
  const matches: MatchedRecipe[] = []

  for (const recipe of allRecipes) {
    // Parse recipe ingredients
    const recipeIngredients = JSON.parse(recipe.ingredients) as Array<{
      name: string
      quantity?: string
      unit?: string
    }>

    const totalCount = recipeIngredients.length

    // Count matched ingredients (case-insensitive substring match)
    let matchedCount = 0
    for (const recipeIng of recipeIngredients) {
      const recipeIngName = recipeIng.name.toLowerCase()
      // Check if any pantry ingredient is contained in this recipe ingredient
      const isMatch = pantryIngredients.some(pantryIng =>
        recipeIngName.includes(pantryIng) || pantryIng.includes(recipeIngName)
      )
      if (isMatch) {
        matchedCount++
      }
    }

    // Calculate match percentage
    const matchPercent = totalCount > 0 ? (matchedCount / totalCount) * 100 : 0

    // Only include recipes with >= 50% match
    if (matchPercent >= 50) {
      // Check dietary restrictions if provided
      if (restrictions.length > 0) {
        const recipeDietaryTags = JSON.parse(recipe.dietaryTags) as string[]
        // All user restrictions must be present in recipe tags
        const meetsRestrictions = restrictions.every(restriction =>
          recipeDietaryTags.includes(restriction)
        )
        if (!meetsRestrictions) {
          continue // Skip this recipe
        }
      }

      // Parse all JSON fields before adding to results
      matches.push({
        recipe: {
          ...recipe,
          ingredients: recipeIngredients,
          instructions: JSON.parse(recipe.instructions),
          cuisineTags: JSON.parse(recipe.cuisineTags),
          dietaryTags: JSON.parse(recipe.dietaryTags)
        },
        matchPercent,
        matchedCount,
        totalCount
      })
    }
  }

  // Sort by match percentage desc, then by title asc
  matches.sort((a, b) => {
    if (b.matchPercent !== a.matchPercent) {
      return b.matchPercent - a.matchPercent
    }
    return a.recipe.title.localeCompare(b.recipe.title)
  })

  // Return top 20 matches
  const topMatches = matches.slice(0, 20)

  // Cache in KV with 5-minute TTL
  await kv.setItem(cacheKey, topMatches, { ttl: 300 })

  return topMatches
})
