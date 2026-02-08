<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <RecipeCardSkeleton v-for="i in 6" :key="i" />
    </div>

    <!-- Empty State: No Matches -->
    <div
      v-else-if="!loading && matches.length === 0 && ingredients.length > 0"
      class="text-center py-12 px-4 bg-gray-50 rounded-lg"
    >
      <svg
        class="w-16 h-16 text-gray-400 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No matching recipes found
      </h3>
      <p class="text-gray-600">
        Try adding more ingredients to find recipes!
      </p>
    </div>

    <!-- Matches Grid -->
    <div
      v-else-if="matches.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="match in matches"
        :key="match.recipe.id"
        class="relative"
      >
        <!-- Match Badge -->
        <div class="absolute top-2 left-2 z-10">
          <span
            :class="[
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm',
              getMatchBadgeColor(match.matchPercent)
            ]"
          >
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            {{ Math.round(match.matchPercent) }}% match
          </span>
        </div>

        <!-- Recipe Card -->
        <RecipeCard :recipe="match.recipe" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { refDebounced } from '@vueuse/core'

interface PantryIngredient {
  name: string
}

const props = defineProps<{
  ingredients: PantryIngredient[]
  restrictions: string[]
}>()

interface MatchedRecipe {
  recipe: any
  matchPercent: number
  matchedCount: number
  totalCount: number
}

const matches = ref<MatchedRecipe[]>([])
const loading = ref(false)

// Create debounced version of ingredients and restrictions
const ingredientsDebounced = refDebounced(
  computed(() => props.ingredients),
  500
)
const restrictionsDebounced = refDebounced(
  computed(() => props.restrictions),
  500
)

// Fetch matches when debounced values change
watch(
  [ingredientsDebounced, restrictionsDebounced],
  async ([newIngredients, newRestrictions]) => {
    // If no ingredients, clear matches
    if (!newIngredients || newIngredients.length === 0) {
      matches.value = []
      return
    }

    loading.value = true

    try {
      // Build query params
      const ingredientNames = newIngredients.map((i: PantryIngredient) => i.name).join(',')
      const restrictionsParam = newRestrictions && newRestrictions.length > 0
        ? newRestrictions.join(',')
        : ''

      const params = new URLSearchParams({
        ingredients: ingredientNames
      })
      if (restrictionsParam) {
        params.append('restrictions', restrictionsParam)
      }

      // Fetch matches
      const result = await $fetch<MatchedRecipe[]>(`/api/recipes/match-pantry?${params.toString()}`)
      matches.value = result
    } catch (error) {
      console.error('Error fetching pantry matches:', error)
      matches.value = []
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

function getMatchBadgeColor(matchPercent: number): string {
  if (matchPercent >= 80) {
    return 'bg-green-100 text-green-800'
  } else if (matchPercent >= 60) {
    return 'bg-yellow-100 text-yellow-800'
  } else {
    return 'bg-orange-100 text-orange-800'
  }
}
</script>
