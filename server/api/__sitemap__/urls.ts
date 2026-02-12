import { asSitemapUrl, defineSitemapEventHandler } from '#imports'
import { recipes } from '../../db/schema'
import { useDrizzle } from '../../utils/drizzle'

/**
 * Dynamic sitemap source endpoint
 * Generates sitemap URLs for all recipes plus static pages
 *
 * @see https://nuxtseo.com/sitemap/guides/runtime-config
 */
export default defineSitemapEventHandler(async (event) => {
  const db = useDrizzle(event)

  // Query all recipes for sitemap
  const allRecipes = await db
    .select({
      slug: recipes.slug,
      createdAt: recipes.createdAt,
      featured: recipes.featured
    })
    .from(recipes)
    .all()

  // Map recipes to sitemap URLs
  const recipeUrls = allRecipes.map((recipe) =>
    asSitemapUrl({
      loc: `/recipe/${recipe.slug}`,
      lastmod: recipe.createdAt,
      changefreq: 'weekly',
      priority: recipe.featured ? 0.9 : 0.7
    })
  )

  // Add static pages
  const staticUrls = [
    asSitemapUrl({
      loc: '/',
      changefreq: 'daily',
      priority: 1.0
    })
  ]

  return [...staticUrls, ...recipeUrls]
})
