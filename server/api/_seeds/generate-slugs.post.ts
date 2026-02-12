import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/drizzle'
import { generateUniqueSlug } from '../../utils/slug-generator'

/**
 * One-time endpoint to generate slugs for all existing recipes
 * This is a migration helper endpoint
 */
export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)

  // Fetch all recipes (id and title only)
  const recipes = await db
    .select({
      id: schema.recipes.id,
      title: schema.recipes.title,
      slug: schema.recipes.slug
    })
    .from(schema.recipes)
    .all()

  if (recipes.length === 0) {
    return {
      success: true,
      message: 'No recipes found',
      count: 0
    }
  }

  // Check if slugs already exist
  const recipesNeedingSlugs = recipes.filter(r => !r.slug)

  if (recipesNeedingSlugs.length === 0) {
    return {
      success: true,
      message: 'All recipes already have slugs',
      count: 0,
      total: recipes.length
    }
  }

  // Generate unique slugs
  const existingSlugs = new Set<string>(
    recipes.filter(r => r.slug).map(r => r.slug!)
  )

  let updated = 0

  // Update each recipe individually (D1 batch may fail)
  for (const recipe of recipesNeedingSlugs) {
    const slug = generateUniqueSlug(recipe.title, existingSlugs)

    try {
      await db
        .update(schema.recipes)
        .set({ slug })
        .where(eq(schema.recipes.id, recipe.id))

      updated++
    } catch (error) {
      console.error(`Failed to update recipe ${recipe.id}:`, error)
      // Continue with other recipes
    }
  }

  return {
    success: true,
    message: `Generated slugs for ${updated} recipes`,
    count: updated,
    total: recipes.length
  }
})
