import { eq } from 'drizzle-orm'
import { useDrizzle } from '../utils/drizzle'
import { recipes } from '../db/schema'

// Curated Unsplash food image URLs mapped by recipe title
const TITLE_TO_IMAGE_URL: Record<string, string> = {
  'Spaghetti Carbonara': 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=1200&q=80',
  'Tacos al Pastor': 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1200&q=80',
  'Pad Thai': 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=1200&q=80',
  'Classic Cheeseburger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80',
  'Greek Salad': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80'
}

export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)

  // Query all featured recipes
  const featuredRecipes = await db
    .select()
    .from(recipes)
    .where(eq(recipes.featured, true))

  const results: Array<{ id: string; title: string; success: boolean; imageKey?: string; error?: string }> = []
  const skipped: string[] = []

  for (const recipe of featuredRecipes) {
    const imageUrl = TITLE_TO_IMAGE_URL[recipe.title]

    if (!imageUrl) {
      console.warn(`[seed-images] No image URL found for featured recipe: "${recipe.title}" — skipping`)
      skipped.push(recipe.title)
      continue
    }

    try {
      // Fetch the image from Unsplash
      const response = await fetch(imageUrl)

      if (!response.ok) {
        console.error(`[seed-images] Failed to fetch image for "${recipe.title}": HTTP ${response.status} ${response.url}`)
        results.push({ id: recipe.id, title: recipe.title, success: false, error: `HTTP ${response.status}` })
        continue
      }

      // Convert to Uint8Array
      const arrayBuffer = await response.arrayBuffer()
      const imageBytes = new Uint8Array(arrayBuffer)

      // Upload to R2 blob storage
      const blobPath = `recipes/featured/${recipe.id}.jpg`
      await hubBlob().put(blobPath, imageBytes, {
        contentType: 'image/jpeg'
      })

      // Update imageKey in D1
      await db
        .update(recipes)
        .set({ imageKey: blobPath })
        .where(eq(recipes.id, recipe.id))

      results.push({ id: recipe.id, title: recipe.title, success: true, imageKey: blobPath })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[seed-images] Error processing "${recipe.title}":`, message)
      results.push({ id: recipe.id, title: recipe.title, success: false, error: message })
    }
  }

  // Invalidate the recipes:featured KV cache so the carousel picks up new imageKeys
  try {
    const kv = hubKV()
    await kv.del('recipes:featured')
  } catch {
    // KV not available in some environments; non-fatal
  }

  const successCount = results.filter(r => r.success).length
  const failedCount = results.filter(r => !r.success).length

  return {
    success: true,
    uploaded: successCount,
    failed: failedCount,
    skipped: skipped.length,
    results,
    skippedTitles: skipped
  }
})
