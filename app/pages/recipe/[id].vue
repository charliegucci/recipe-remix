<script setup lang="ts">
interface Ingredient {
  name: string
  quantity: string
  unit: string
}

interface Recipe {
  id: string
  title: string
  description: string | null
  ingredients: Ingredient[]
  instructions: string[]
  cuisineTags: string[]
  dietaryTags: string[]
  cookTime: number | null
  difficulty: 'easy' | 'medium' | 'hard' | null
  imageKey: string | null
  source: string
  featured: boolean
  createdAt: Date
}

const route = useRoute()
const recipeId = route.params.id as string

// Fetch recipe data with SSR
const { data: recipe, error } = await useFetch<Recipe>(`/api/recipes/${recipeId}`)

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusMessage || 'Recipe not found'
  })
}

if (!recipe.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Recipe not found'
  })
}

// SEO metadata
useHead({
  title: `${recipe.value.title} | Recipe Remix`,
  meta: [
    { name: 'description', content: recipe.value.description || 'Delicious recipe from Recipe Remix' }
  ]
})

// Helper function to format cook time
function formatCookTime(minutes: number | null): string {
  if (!minutes) return 'Not specified'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

// Helper function to get difficulty badge color
function getDifficultyColor(difficulty: string | null): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'hard':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}
</script>

<template>
  <div v-if="recipe" class="recipe-detail-page bg-gray-50 min-h-screen">
    <!-- Hero Image Section -->
    <div class="relative w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500">
      <!-- Image if available -->
      <img
        v-if="recipe.imageKey"
        :src="`/api/images/${recipe.imageKey}`"
        :alt="recipe.title"
        class="w-full h-full object-cover"
        loading="eager"
      />

      <!-- Gradient overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      <!-- Title overlay -->
      <div class="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
            {{ recipe.title }}
          </h1>
        </div>
      </div>
    </div>

    <!-- Content Container -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Navigation: Back to Home -->
      <div class="mb-6">
        <NuxtLink
          to="/"
          class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </NuxtLink>
      </div>

      <!-- Metadata Bar -->
      <div class="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <div class="flex flex-wrap gap-3">
          <!-- Cook Time -->
          <div
            v-if="recipe.cookTime"
            class="inline-flex items-center px-4 py-2 bg-gray-50 rounded-lg"
          >
            <svg class="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium text-gray-900">{{ formatCookTime(recipe.cookTime) }}</span>
          </div>

          <!-- Difficulty -->
          <div
            v-if="recipe.difficulty"
            class="inline-flex items-center px-4 py-2 rounded-lg border-2"
            :class="getDifficultyColor(recipe.difficulty)"
          >
            <span class="text-sm font-semibold capitalize">{{ recipe.difficulty }}</span>
          </div>

          <!-- Cuisine Tags -->
          <div
            v-for="tag in recipe.cuisineTags"
            :key="tag"
            class="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border-2 border-blue-200"
          >
            <span class="text-sm font-medium">{{ tag }}</span>
          </div>

          <!-- Dietary Tags -->
          <div
            v-for="tag in recipe.dietaryTags"
            :key="tag"
            class="inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg border-2 border-purple-200"
          >
            <span class="text-sm font-medium">{{ tag }}</span>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="recipe.description" class="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <p class="text-gray-700 leading-relaxed">{{ recipe.description }}</p>
      </div>

      <!-- Ingredients Section -->
      <div class="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <IngredientChecklist
          :recipe-id="recipeId"
          :ingredients="recipe.ingredients"
        />
      </div>

      <!-- Instructions Section -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
        <StepCard
          v-for="(instruction, index) in recipe.instructions"
          :key="index"
          :recipe-id="recipeId"
          :step-number="index + 1"
          :total-steps="recipe.instructions.length"
          :instruction="instruction"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional responsive styles if needed */
</style>
