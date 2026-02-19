<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Generate a Fusion Recipe
      </h1>
      <p class="text-gray-600">
        Combine cuisines and let AI create a unique fusion recipe from your pantry
      </p>
    </div>

    <!-- Resume Detection - Show previous generation if exists -->
    <div v-if="mounted && (status === 'complete' || status === 'generating' || status === 'validating' || status === 'imaging')">
      <!-- Result Section -->
      <div v-if="status === 'complete' && generatedRecipe" class="space-y-6">
        <!-- Recipe Card -->
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <!-- Image -->
          <div class="aspect-video bg-gray-100 relative">
            <img
              v-if="generatedRecipe.imageKey"
              :src="`/api/images/${generatedRecipe.imageKey}`"
              :alt="generatedRecipe.title"
              loading="lazy"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              <div class="text-center">
                <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-sm">Image generating...</p>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="p-6">
            <!-- Title and AI Badge -->
            <div class="flex items-start justify-between gap-4 mb-3">
              <h2 class="text-2xl font-bold text-gray-900">
                {{ generatedRecipe.title }}
              </h2>
              <span class="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full whitespace-nowrap">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                AI-generated
              </span>
            </div>

            <p class="text-gray-600 mb-4">{{ generatedRecipe.description }}</p>

            <!-- Meta Info -->
            <div class="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
              <div class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ generatedRecipe.cookTime }} min
              </div>
              <div class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {{ generatedRecipe.difficulty }}
              </div>
              <div class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {{ generatedRecipe.servings }} servings
              </div>
            </div>

            <!-- Ingredients -->
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Ingredients</h3>
              <ul class="space-y-2">
                <li
                  v-for="(ingredient, idx) in generatedRecipe.ingredients"
                  :key="idx"
                  class="flex items-start gap-2 text-gray-700"
                >
                  <span class="text-orange-600 mt-1">•</span>
                  <span>
                    {{ ingredient.quantity }}{{ ingredient.unit ? ' ' + ingredient.unit : '' }} {{ ingredient.name }}
                  </span>
                </li>
              </ul>
            </div>

            <!-- Instructions -->
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
              <ol class="space-y-3">
                <li
                  v-for="(step, idx) in generatedRecipe.instructions"
                  :key="idx"
                  class="flex gap-3"
                >
                  <span class="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600 text-white text-sm font-medium flex items-center justify-center">
                    {{ idx + 1 }}
                  </span>
                  <span class="text-gray-700 pt-0.5">{{ step }}</span>
                </li>
              </ol>
            </div>

            <!-- View Full Recipe Link -->
            <div class="flex gap-3">
              <NuxtLink
                :to="`/recipe/${(generatedRecipe as { slug?: string }).slug || generatedRecipe.id}`"
                class="flex-1 px-4 py-2 bg-orange-600 text-white text-center rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                View Full Recipe
              </NuxtLink>
              <button
                @click="handleReset"
                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Generate Another
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Section -->
      <div v-else-if="status === 'generating' || status === 'validating' || status === 'imaging'" class="space-y-6">
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <LazyGenerationProgress :status="status" :error-message="errorMessage" :start-time="startTime" :step-start-times="stepStartTimes" />
        </div>
        <button
          @click="handleReset"
          class="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Generation Form (show when idle or after error) -->
    <div v-else-if="mounted && (status === 'idle' || status === 'error')" class="space-y-6">
      <!-- Error Message -->
      <ErrorMessage
        v-if="status === 'error' && errorMessage"
        title="Generation Failed"
        :message="errorMessage"
        retry-label="Try Again"
        @retry="handleReset"
      />

      <!-- Pantry Ingredients -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Your Pantry Ingredients</h2>
        <template v-if="pantryState.pantry.value.length > 0">
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="item in pantryState.pantry.value"
              :key="item.id"
              class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
            >
              {{ item.name }}
            </span>
          </div>
          <p class="text-sm text-gray-600">{{ pantryState.pantry.value.length }} ingredients available</p>
        </template>
        <template v-else>
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-blue-800">
              <NuxtLink to="/pantry" class="font-medium underline">Add ingredients to your pantry</NuxtLink> to get started
            </p>
          </div>
        </template>
      </div>

      <!-- Cuisine Selection -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Choose Cuisines to Fuse</h2>
        <p class="text-sm text-gray-600 mb-4">Select up to 3 cuisines or pick "Surprise Me"</p>
        <LazyCuisineSelector v-model="selectedCuisines" :max="3" hydrate-on-idle />
      </div>

      <!-- Dietary Restrictions Display -->
      <div v-if="pantryState.dietaryRestrictions.value.length > 0">
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Dietary Restrictions</h2>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="restriction in pantryState.dietaryRestrictions.value"
            :key="restriction"
            class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
          >
            {{ formatRestriction(restriction) }}
          </span>
        </div>
        <p class="text-sm text-gray-600">Your dietary restrictions will be respected</p>
      </div>

      <!-- Generate Button -->
      <div>
        <template v-if="!pantryState.isAuthenticated.value">
          <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-sm text-yellow-800 mb-3">
              <NuxtLink to="/login" class="font-medium underline">Log in</NuxtLink> to generate recipes
            </p>
          </div>
        </template>
        <template v-else>
          <button
            @click="handleGenerate"
            :disabled="!canGenerate"
            :class="[
              'w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200',
              'flex items-center justify-center gap-2',
              canGenerate
                ? 'bg-orange-600 text-white hover:bg-orange-700 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            ]"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Generate Fusion Recipe
          </button>
          <p v-if="!canGenerate" class="text-sm text-gray-600 text-center mt-2">
            {{ generationHint }}
          </p>
        </template>
      </div>
    </div>

    <!-- Loading state (before mount) -->
    <div v-else class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePantry } from '~/composables/usePantry'
import { useGenerate } from '~/composables/useGenerate'

// SEO meta tags
useServerSeoMeta({
  title: 'Create a Recipe | Recipe Remix',
  description: 'Generate custom fusion recipes from your pantry ingredients',
  robots: 'noindex'
})

useHead({
  link: [{ rel: 'canonical', href: 'https://remix-recipe.com/generate' }]
})

// SSR-safe mounting pattern
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

// Pantry state
const pantryState = usePantry()

// Generation state
const { status, generatedRecipe, errorMessage, startTime, stepStartTimes, generate, reset, resumeGeneration } = useGenerate()

// Selected cuisines
const selectedCuisines = ref<string[]>([])

// Resume on mount
onMounted(async () => {
  await resumeGeneration()
})

// Validation
const canGenerate = computed(() => {
  return (
    pantryState.isAuthenticated.value &&
    pantryState.pantry.value.length >= 2 &&
    selectedCuisines.value.length >= 1 &&
    (status.value === 'idle' || status.value === 'error')
  )
})

const generationHint = computed(() => {
  if (pantryState.pantry.value.length < 2) {
    return 'Add at least 2 ingredients to your pantry'
  }
  if (selectedCuisines.value.length < 1) {
    return 'Select at least 1 cuisine'
  }
  return ''
})

// Handlers
async function handleGenerate() {
  if (!canGenerate.value) return

  const ingredients = pantryState.pantry.value.map(item => item.name)
  const restrictions = pantryState.dietaryRestrictions.value

  // Map "Surprise Me" to "surprise" for API
  const cuisines = selectedCuisines.value.map(c =>
    c === 'Surprise Me' ? 'surprise' : c
  )

  await generate(ingredients, cuisines, restrictions)
}

function handleReset() {
  reset()
  selectedCuisines.value = []
}

function formatRestriction(restriction: string): string {
  return restriction
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-')
}
</script>
