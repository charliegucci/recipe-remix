<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

const { data: session } = await authClient.useSession(useFetch)

// Fetch history if authenticated
const { data: history, pending, error, refresh } = await useAsyncData(
  'user-history',
  async () => {
    if (!session.value?.user || session.value.user.isAnonymous) {
      return { recipes: [], hasMore: false }
    }
    try {
      return await $fetch('/api/user/history')
    } catch (err) {
      console.error('Failed to fetch history:', err)
      return { recipes: [], hasMore: false }
    }
  }
)

const isAuthenticated = computed(() => session.value?.user && !session.value.user.isAnonymous)
const recipes = computed(() => history.value?.recipes || [])

// SEO meta tags
useServerSeoMeta({
  title: 'Recipe History | Recipe Remix',
  description: 'View your recently viewed recipes',
  robots: 'noindex'
})

useHead({
  link: [{ rel: 'canonical', href: 'https://recipe-remix-9fd.pages.dev/history' }]
})

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Cooking History</h1>
        <p class="text-gray-600">Recipes you've recently viewed</p>
      </div>

      <!-- Auth Gate -->
      <div v-if="!isAuthenticated" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Sign in to view your cooking history</h2>
        <p class="text-gray-600 mb-6">Track recipes you've viewed and cooked</p>
        <NuxtLink to="/login" class="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Sign In
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-else-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <RecipeCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-600 mb-4">Failed to load history</p>
        <button @click="refresh()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Try Again
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="recipes.length === 0" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">No cooking history yet</h2>
        <p class="text-gray-600 mb-6">Start exploring recipes to build your history</p>
        <NuxtLink to="/" class="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Browse Recipes
        </NuxtLink>
      </div>

      <!-- Recipe List -->
      <div v-else class="space-y-6">
        <div
          v-for="recipe in recipes"
          :key="recipe.id"
          class="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div class="flex flex-col sm:flex-row">
            <!-- Recipe Image -->
            <div class="sm:w-48 aspect-[4/3] sm:aspect-square flex-shrink-0 relative overflow-hidden">
              <NuxtLink :to="`/recipe/${recipe.slug}`" class="block h-full">
                <img
                  v-if="recipe.imageKey"
                  :src="recipe.imageKey.startsWith('http') ? recipe.imageKey : `${$config.public.r2PublicUrl || 'https://pub-placeholder.r2.dev'}/${recipe.imageKey}`"
                  :alt="recipe.title"
                  loading="lazy"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span class="text-gray-400 text-sm">No image</span>
                </div>
              </NuxtLink>
            </div>

            <!-- Recipe Info -->
            <div class="flex-1 p-4 sm:p-6">
              <NuxtLink :to="`/recipe/${recipe.slug}`" class="block group">
                <h3 class="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {{ recipe.title }}
                </h3>
                <p class="text-sm text-gray-600 line-clamp-2 mb-3">
                  {{ recipe.description }}
                </p>

                <!-- Metadata -->
                <div class="flex items-center gap-4 text-xs text-gray-500">
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ recipe.cookTime }}min</span>
                  </div>
                  <div class="flex items-center gap-1 capitalize" :class="{
                    'text-green-600': recipe.difficulty === 'easy',
                    'text-yellow-600': recipe.difficulty === 'medium',
                    'text-red-600': recipe.difficulty === 'hard'
                  }">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{{ recipe.difficulty }}</span>
                  </div>
                </div>

                <!-- View Date -->
                <div class="mt-3 text-xs text-gray-400">
                  Viewed {{ formatDate(recipe.viewedAt) }}
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
