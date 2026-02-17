<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

const { data: session } = await authClient.useSession(useFetch)

// Fetch favorites if authenticated
const { data: favorites, pending, error, refresh } = await useAsyncData(
  'user-favorites',
  async () => {
    if (!session.value?.user || (session.value.user as any).isAnonymous) {
      return { recipes: [], hasMore: false }
    }
    try {
      return await $fetch('/api/user/favorites')
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
      return { recipes: [], hasMore: false }
    }
  }
)

const isAuthenticated = computed(() => session.value?.user && !(session.value.user as any).isAnonymous)
const recipes = computed(() => favorites.value?.recipes || [])

// SEO meta tags
useServerSeoMeta({
  title: 'Your Favorite Recipes | Recipe Remix',
  description: 'View and manage your saved favorite recipes',
  robots: 'noindex'
})

useHead({
  link: [{ rel: 'canonical', href: 'https://remix-recipe.com/favorites' }]
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
        <p class="text-gray-600">Recipes you've saved for later</p>
      </div>

      <!-- Auth Gate -->
      <div v-if="!isAuthenticated" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Sign in to save your favorite recipes</h2>
        <p class="text-gray-600 mb-6">Create an account to keep track of recipes you love</p>
        <NuxtLink to="/login" class="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Sign In
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <RecipeListSkeleton v-else-if="pending" :count="6" />

      <!-- Error State -->
      <div v-else-if="error" class="max-w-2xl mx-auto">
        <ErrorMessage
          title="Couldn't load favorites"
          message="We had trouble loading your favorite recipes."
          @retry="refresh()"
        />
      </div>

      <!-- Empty State -->
      <div v-else-if="recipes.length === 0" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
        <p class="text-gray-600 mb-6">Browse recipes and tap the heart to save your favorites</p>
        <NuxtLink to="/" class="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Browse Recipes
        </NuxtLink>
      </div>

      <!-- Recipe Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <RecipeCard
          v-for="recipe in recipes"
          :key="recipe.id"
          :recipe="(recipe as any)"
        />
      </div>
    </div>
  </div>
</template>
