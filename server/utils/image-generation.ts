/**
 * Image generation utility for AI-generated recipes.
 * Uses Workers AI text-to-image models and stores results in R2 blob storage.
 */

/**
 * Build a prompt for food photography image generation.
 * Optimized for text-to-image models with focused, concise descriptions.
 */
export function buildImagePrompt(
  title: string,
  description: string,
  cuisineTags: string[]
): string {
  // Extract 1-2 key descriptors from description (first sentence or first 50 chars)
  const descSnippet = (description
    .split('.')[0] ?? '')
    .substring(0, 50)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()

  // Build cuisine style string
  const cuisineStyle = cuisineTags.length > 0
    ? cuisineTags.slice(0, 2).join(' ')
    : 'international'

  // Template optimized for food photography
  const prompt = `Professional food photography of ${title}, ${cuisineStyle} fusion cuisine, beautifully plated on a ceramic dish, overhead shot, warm natural lighting, shallow depth of field, high resolution, appetizing`

  // Keep under 200 chars for best model results
  return prompt.substring(0, 200)
}

/**
 * Generate an image for a recipe using Workers AI and store in R2.
 * This function never throws - it returns a success/error result object.
 */
export async function generateAndStoreImage(
  recipeId: string,
  title: string,
  description: string,
  cuisineTags: string[]
): Promise<{ success: boolean; imageKey?: string; error?: string }> {
  try {
    // Build the image prompt
    const imagePrompt = buildImagePrompt(title, description, cuisineTags)

    // Call Workers AI text-to-image model
    // Model: @cf/black-forest-labs/flux-1-schnell (fast, high-quality)
    const aiResponse = await hubAI().run('@cf/black-forest-labs/flux-1-schnell', {
      prompt: imagePrompt
    })

    // Convert response to Uint8Array
    let imageBytes: Uint8Array
    if (aiResponse instanceof ReadableStream) {
      // Convert stream to bytes
      const reader = aiResponse.getReader()
      const chunks: Uint8Array[] = []
      let totalLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        totalLength += value.length
      }

      // Concatenate all chunks
      imageBytes = new Uint8Array(totalLength)
      let position = 0
      for (const chunk of chunks) {
        imageBytes.set(chunk, position)
        position += chunk.length
      }
    } else if (aiResponse instanceof Uint8Array) {
      imageBytes = aiResponse
    } else {
      return {
        success: false,
        error: 'Unexpected AI response format'
      }
    }

    // Store in R2 via NuxtHub blob storage
    const blobPath = `recipes/ai-generated/${recipeId}.png`
    await hubBlob().put(blobPath, imageBytes, {
      contentType: 'image/png'
    })

    // Return success with the blob pathname as imageKey
    return {
      success: true,
      imageKey: blobPath
    }
  } catch (error) {
    // Never throw - gracefully handle all failures
    // Image generation is non-critical and should not crash the caller
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during image generation'
    }
  }
}
