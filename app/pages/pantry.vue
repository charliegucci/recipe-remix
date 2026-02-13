<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        My Pantry
      </h1>
      <p class="text-gray-600">
        Add ingredients you have on hand to get personalized recipe recommendations
      </p>
    </div>

    <!-- Ingredient Search -->
    <div class="mb-8">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Add Ingredients
      </label>
      <IngredientAutocomplete @select="handleSelectIngredient" />
    </div>

    <!-- Pantry List -->
    <div class="mb-12">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">
        Your Pantry ({{ pantryState.pantry.value.length }})
      </h2>
      <PantryList
        :items="pantryState.pantry.value"
        @remove="handleRemoveIngredient"
      />
    </div>

    <!-- Divider -->
    <div class="border-t border-gray-200 my-8"></div>

    <!-- Dietary Preferences -->
    <div class="mb-12">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">
          Dietary Preferences
        </h2>
        <p class="text-sm text-gray-600">
          Select any dietary restrictions to filter recipe recommendations
        </p>
      </div>

      <DietaryRestrictions
        :options="pantryState.dietaryOptions"
        :active-restrictions="pantryState.dietaryRestrictions.value"
        @toggle="handleToggleRestriction"
      />
    </div>

    <!-- Recipes You Can Make (only show when pantry has items) -->
    <div v-if="pantryState.pantry.value.length > 0">
      <!-- Divider -->
      <div class="border-t border-gray-200 my-8"></div>

      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          Recipes You Can Make
        </h2>
        <p class="text-gray-600">
          Based on your pantry ingredients and dietary preferences
        </p>
      </div>

      <PantryMatches
        :ingredients="pantryState.pantry.value"
        :restrictions="pantryState.dietaryRestrictions.value"
      />
    </div>

    <!-- Guest Mode Notice -->
    <div
      v-if="!pantryState.isAuthenticated.value"
      class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <div class="flex items-start gap-3">
        <svg
          class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p class="text-sm font-medium text-blue-900 mb-1">
            Guest Mode
          </p>
          <p class="text-sm text-blue-700">
            Your pantry and preferences are stored locally. <nuxt-link to="/auth/login" class="underline font-medium">Sign in</nuxt-link> to sync across devices.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePantry } from '~/composables/usePantry'

const pantryState = usePantry()

// SEO meta tags
useServerSeoMeta({
  title: 'My Pantry | Recipe Remix',
  description: 'Manage your pantry ingredients for personalized recipe recommendations',
  robots: 'noindex'
})

useHead({
  link: [{ rel: 'canonical', href: 'https://remix-recipe.com/pantry' }]
})

async function handleSelectIngredient(ingredient: { id: string; name: string }) {
  try {
    await pantryState.addIngredient(ingredient.id, ingredient.name)
  } catch (error) {
    console.error('Error adding ingredient:', error)
  }
}

async function handleRemoveIngredient(id: string) {
  try {
    await pantryState.removeIngredient(id)
  } catch (error) {
    console.error('Error removing ingredient:', error)
  }
}

async function handleToggleRestriction(restriction: string) {
  try {
    await pantryState.toggleRestriction(restriction)
  } catch (error) {
    console.error('Error toggling restriction:', error)
  }
}
</script>
