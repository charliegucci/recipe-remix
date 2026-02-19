import { ref, computed } from 'vue'
import { authClient } from '~/lib/auth-client'

interface FavoritesState {
  favoriteIds: Set<string>
  loading: boolean
  error: string | null
  requiresAuth: boolean
}

const state = ref<FavoritesState>({
  favoriteIds: new Set(),
  loading: false,
  error: null,
  requiresAuth: false
})

let initialized = false
let session: any = null

export function useFavorites() {
  // Get session on first call (client-side only)
  if (!session && process.client) {
    // Use getSession instead of useSession for composables
    authClient.getSession().then(s => {
      session = s?.data || s
    })
  }

  // Initialize on first call (client-side only)
  const initialize = async () => {
    if (initialized || !process.client) return
    initialized = true

    // Get session if not already loaded
    if (!session) {
      const sessionResult = await authClient.getSession()
      session = sessionResult?.data || sessionResult
    }

    // Check if user is authenticated and not anonymous
    if (!session?.user || session.user.isAnonymous) {
      state.value.requiresAuth = true
      return
    }

    state.value.requiresAuth = false
    state.value.loading = true

    try {
      // Fetch all favorite IDs
      const response = await $fetch('/api/user/favorites')
      const favoriteIds = new Set(response.recipes.map((r: any) => r.id))
      state.value.favoriteIds = favoriteIds
      state.value.error = null
    } catch (err: any) {
      console.error('Failed to load favorites:', err)
      state.value.error = err.message || 'Failed to load favorites'
    } finally {
      state.value.loading = false
    }
  }

  // Call initialize immediately
  initialize()

  const isFavorite = computed(() => {
    return (recipeId: string) => state.value.favoriteIds.has(recipeId)
  })

  const toggleFavorite = async (recipeId: string) => {
    if (state.value.requiresAuth) {
      return
    }

    const wasFavorited = state.value.favoriteIds.has(recipeId)

    // Optimistic update
    if (wasFavorited) {
      state.value.favoriteIds.delete(recipeId)
    } else {
      state.value.favoriteIds.add(recipeId)
    }

    try {
      if (wasFavorited) {
        await $fetch(`/api/user/favorites/${recipeId}`, { method: 'DELETE' })
      } else {
        await $fetch(`/api/user/favorites/${recipeId}`, { method: 'POST' })
      }
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err)
      // Revert optimistic update
      if (wasFavorited) {
        state.value.favoriteIds.add(recipeId)
      } else {
        state.value.favoriteIds.delete(recipeId)
      }
      state.value.error = err.message || 'Failed to update favorite'

      // Refresh from server
      await initialize()
    }
  }

  return {
    isFavorite,
    toggleFavorite,
    loading: computed(() => state.value.loading),
    error: computed(() => state.value.error),
    requiresAuth: computed(() => state.value.requiresAuth)
  }
}
