import { useLocalStorage } from '@vueuse/core'

interface GeneratedRecipe {
  id: string
  title: string
  description: string
  ingredients: Array<{
    name: string
    quantity: string
    unit?: string
  }>
  instructions: string[]
  cuisineTags: string[]
  dietaryTags: string[]
  cookTime: number
  difficulty: string
  servings: number
  explanation: string | null
  imageKey: string | null
  source: string
  featured: boolean
  createdAt: Date
}

type GenerationStatus = 'idle' | 'generating' | 'validating' | 'imaging' | 'complete' | 'error'

/**
 * Generation state management composable
 * Handles recipe generation with polling and resume support
 */
export function useGenerate() {
  // State
  const status = ref<GenerationStatus>('idle')
  const generatedRecipe = ref<GeneratedRecipe | null>(null)
  const errorMessage = ref<string>('')
  const startTime = ref<number | null>(null)

  // Persist generationId to localStorage (SSR-safe)
  const generationId = useLocalStorage<string | null>('lastGenerationId', null, {
    initOnMounted: true
  })

  /**
   * Generate a new recipe
   */
  async function generate(
    ingredients: string[],
    cuisines: string[],
    restrictions: string[]
  ): Promise<void> {
    status.value = 'generating'
    errorMessage.value = ''
    generatedRecipe.value = null
    startTime.value = Date.now()

    try {
      const response = await $fetch<{
        recipe: GeneratedRecipe
        generationId: string
        selectedCuisines: string[]
      }>('/api/recipes/generate', {
        method: 'POST',
        body: { ingredients, cuisines, restrictions }
      })

      // Store generation ID for resume
      generationId.value = response.generationId

      // Store generated recipe
      generatedRecipe.value = response.recipe
      status.value = 'complete'

      // Fire-and-forget image generation (don't block on this)
      // The UI will update when image is ready
      if (response.recipe.id) {
        $fetch(`/api/recipes/${response.recipe.id}/image`, {
          method: 'POST'
        })
          .then((result: any) => {
            if (result.success && result.imageKey && generatedRecipe.value) {
              generatedRecipe.value.imageKey = result.imageKey
            }
          })
          .catch(() => {
            // Image generation is non-critical, silently fail
          })
      }
    } catch (error: any) {
      status.value = 'error'

      // Parse error for user-friendly message
      const statusCode = error?.statusCode || error?.status
      const statusMsg = error?.statusMessage || error?.message

      if (statusCode === 401) {
        errorMessage.value = 'Please log in to generate recipes'
      } else if (statusCode === 400) {
        errorMessage.value = statusMsg || 'Invalid request. Please check your inputs.'
      } else if (statusCode === 422) {
        errorMessage.value = statusMsg || 'Recipe could not be generated. Please try again.'
      } else {
        errorMessage.value = 'Something went wrong. Please try again.'
      }
    }
  }

  /**
   * Reset all state
   */
  function reset(): void {
    status.value = 'idle'
    generatedRecipe.value = null
    errorMessage.value = ''
    generationId.value = null
    startTime.value = null
  }

  /**
   * Resume a previous generation from localStorage
   * Called on page mount
   */
  async function resumeGeneration(): Promise<void> {
    const id = generationId.value
    if (!id) return

    // Poll the generation endpoint
    const maxPolls = 30 // 30 polls * 2 seconds = 60 seconds max
    let pollCount = 0

    const poll = async (): Promise<void> => {
      try {
        const response = await $fetch<{
          id: string
          status: string
          recipeId: string | null
          errorMessage: string | null
          recipe?: GeneratedRecipe
        }>(`/api/recipes/generation/${id}`)

        if (response.status === 'completed' && response.recipe) {
          // Load recipe and mark complete
          generatedRecipe.value = response.recipe
          status.value = 'complete'
        } else if (response.status === 'generating') {
          status.value = 'generating'

          // Continue polling if under max
          pollCount++
          if (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            await poll()
          } else {
            // Timeout
            status.value = 'error'
            errorMessage.value = 'Generation timed out. Please try again.'
            generationId.value = null
          }
        } else if (response.status === 'validating') {
          status.value = 'validating'

          // Continue polling
          pollCount++
          if (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            await poll()
          } else {
            // Timeout
            status.value = 'error'
            errorMessage.value = 'Generation timed out. Please try again.'
            generationId.value = null
          }
        } else if (response.status === 'failed') {
          status.value = 'error'
          errorMessage.value = response.errorMessage || 'Generation failed. Please try again.'
          generationId.value = null
        }
      } catch (error: any) {
        // 404 or other error - clear state
        if (error?.statusCode === 404) {
          generationId.value = null
          status.value = 'idle'
        } else {
          status.value = 'error'
          errorMessage.value = 'Could not resume generation. Please start a new one.'
          generationId.value = null
        }
      }
    }

    await poll()
  }

  /**
   * Retry image generation for a recipe
   */
  async function retryImageGeneration(recipeId: string): Promise<void> {
    try {
      const result = await $fetch<{
        success: boolean
        imageKey: string
      }>(`/api/recipes/${recipeId}/image`, {
        method: 'POST'
      })

      if (result.success && result.imageKey && generatedRecipe.value) {
        generatedRecipe.value.imageKey = result.imageKey
      }
    } catch (error) {
      console.error('Failed to generate image:', error)
    }
  }

  return {
    status,
    generatedRecipe,
    errorMessage,
    generationId,
    startTime,
    generate,
    reset,
    resumeGeneration,
    retryImageGeneration
  }
}
