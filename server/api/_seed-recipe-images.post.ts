import { eq } from 'drizzle-orm'
import { useDrizzle } from '../utils/drizzle'
import { recipes } from '../db/schema'
import { buildImagePrompt } from '../utils/image-generation'

export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)

  // Query all curated recipes where featured = false
  const nonFeaturedRecipes = await db
    .select()
    .from(recipes)
    .where(eq(recipes.featured, false))

  const results: Array<{
    id: string
    title: string
    status: 'generated' | 'skipped' | 'failed'
    imageKey?: string
    error?: string
  }> = []

  let generated = 0
  let skipped = 0
  let failed = 0

  for (const recipe of nonFeaturedRecipes) {
    // Skip recipes that already have a blob-path imageKey (starts with 'recipes/')
    if (recipe.imageKey && recipe.imageKey.startsWith('recipes/')) {
      console.log(`[seed-recipe-images] Skipping "${recipe.title}" — already has blob imageKey: ${recipe.imageKey}`)
      results.push({ id: recipe.id, title: recipe.title, status: 'skipped', imageKey: recipe.imageKey })
      skipped++
      continue
    }

    try {
      // Build the prompt using the shared utility
      const cuisineTags: string[] = JSON.parse(recipe.cuisineTags || '[]')
      const prompt = buildImagePrompt(recipe.title, recipe.description || '', cuisineTags)

      console.log(`[seed-recipe-images] Generating image for "${recipe.title}" (${recipe.id})`)

      // Call Workers AI directly so we can use the curated blob path
      const aiResponse = await hubAI().run('@cf/black-forest-labs/flux-1-schnell', {
        prompt
      })

      // Convert response to Uint8Array
      // flux-1-schnell returns { image: "base64string" }
      let imageBytes: Uint8Array
      const responseAny = aiResponse as any

      if (typeof responseAny?.image === 'string') {
        // Base64-encoded image from Workers AI
        const binaryString = atob(responseAny.image)
        imageBytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i)
        }
      } else if (aiResponse instanceof ReadableStream) {
        // Stream response (legacy fallback)
        const reader = aiResponse.getReader()
        const chunks: Uint8Array[] = []
        let totalLength = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          totalLength += value.length
        }

        imageBytes = new Uint8Array(totalLength)
        let position = 0
        for (const chunk of chunks) {
          imageBytes.set(chunk, position)
          position += chunk.length
        }
      } else if (aiResponse instanceof Uint8Array) {
        imageBytes = aiResponse
      } else {
        throw new Error('Unexpected AI response format')
      }

      // Upload to R2 at the curated path
      const blobPath = `recipes/curated/${recipe.id}.png`
      await hubBlob().put(blobPath, imageBytes, {
        contentType: 'image/png'
      })

      // Update imageKey in D1
      await db
        .update(recipes)
        .set({ imageKey: blobPath })
        .where(eq(recipes.id, recipe.id))

      // Invalidate per-recipe KV cache
      try {
        await hubKV().del(`recipe:${recipe.id}`)
      } catch {
        // KV not available in some environments; non-fatal
      }

      results.push({ id: recipe.id, title: recipe.title, status: 'generated', imageKey: blobPath })
      generated++

      console.log(`[seed-recipe-images] Generated and stored: ${blobPath}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[seed-recipe-images] Error processing "${recipe.title}":`, message)
      results.push({ id: recipe.id, title: recipe.title, status: 'failed', error: message })
      failed++
    }

    // Rate limit: 200ms delay between AI calls to avoid hammering Workers AI
    await new Promise(r => setTimeout(r, 200))
  }

  // Invalidate recipe list KV caches after all images are generated
  try {
    const kv = hubKV()
    // Invalidate paginated list caches (covers up to 4 pages per category)
    const pages = [1, 2, 3, 4]
    const categories = ['all', 'italian', 'mexican', 'asian', 'american', 'mediterranean']
    const cacheKeys: string[] = []

    for (const category of categories) {
      for (const page of pages) {
        cacheKeys.push(`recipes:list:${category}:${page}`)
      }
    }

    for (const key of cacheKeys) {
      await kv.del(key)
    }
  } catch {
    // KV not available in some environments; non-fatal
  }

  return {
    success: true,
    generated,
    skipped,
    failed,
    total: nonFeaturedRecipes.length,
    results
  }
})
