import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../utils/drizzle'

/**
 * Middleware to redirect legacy ID-based recipe URLs to slug-based URLs
 * Matches: /recipe/[uuid-or-numeric-id] -> 301 redirect to /recipe/[slug]
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Only intercept /recipe/ page routes (not API routes)
  if (!url.pathname.startsWith('/recipe/')) {
    return
  }

  // Extract the identifier from /recipe/[identifier]
  const pathParts = url.pathname.split('/')
  const identifier = pathParts[2]

  if (!identifier) {
    return
  }

  // Check if it's a UUID (8-4-4-4-12 hex pattern)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)

  // If it's NOT a UUID and looks like a slug, let it through
  // Slugs are lowercase with hyphens, but not in UUID format
  const looksLikeSlug = /^[a-z0-9]+(-[a-z0-9]+)+$/.test(identifier) && !isUuid

  if (looksLikeSlug) {
    // Already a slug, no redirect needed
    return
  }

  // It's a UUID or other non-slug identifier - look it up for redirect
  const db = useDrizzle(event)

  try {
    const recipe = await db
      .select({ slug: schema.recipes.slug })
      .from(schema.recipes)
      .where(eq(schema.recipes.id, identifier))
      .get()

    if (recipe?.slug) {
      // Redirect to slug-based URL
      return sendRedirect(event, `/recipe/${recipe.slug}`, 301)
    }
  } catch (error) {
    // Database error - let the request continue, will 404 naturally
    console.error('Error in legacy redirect middleware:', error)
  }

  // No matching recipe or already a slug - let request continue
})
