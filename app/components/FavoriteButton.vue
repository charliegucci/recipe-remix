<script setup lang="ts">
const props = defineProps<{
  recipeId: string
  size?: 'sm' | 'lg'
}>()

const sizeVariant = computed(() => props.size ?? 'sm')

const { isFavorite, toggleFavorite, requiresAuth } = useFavorites()
const isFav = computed(() => isFavorite.value(props.recipeId))

const handleClick = async (event: Event) => {
  // Prevent event propagation (button is inside clickable RecipeCard)
  event.preventDefault()
  event.stopPropagation()

  if (requiresAuth.value) {
    // User needs to sign in
    // Show toast or navigate to login
    navigateTo('/login')
    return
  }

  await toggleFavorite(props.recipeId)
}
</script>

<template>
  <!-- Small variant (default): pill overlay used on RecipeCard -->
  <button
    v-if="sizeVariant === 'sm'"
    @click="handleClick"
    class="p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 motion-safe:hover:scale-110 active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
    :aria-label="isFav ? 'Remove from favorites' : 'Add to favorites'"
  >
    <!-- Filled heart when favorited -->
    <svg
      v-if="isFav"
      class="w-5 h-5 text-red-500"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>

    <!-- Outline heart when not favorited -->
    <svg
      v-else
      class="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  </button>

  <!-- Large variant: text label + larger icon used on recipe detail page -->
  <button
    v-else
    @click="handleClick"
    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 motion-safe:active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 min-w-[44px] min-h-[44px]"
    :class="isFav
      ? 'bg-red-50 border-red-200 text-red-600 shadow-sm'
      : 'bg-white border-gray-200 text-gray-700 shadow-sm hover:border-red-200 hover:text-red-500'"
    :aria-label="isFav ? 'Remove from favorites' : 'Add to favorites'"
  >
    <!-- Filled heart when favorited -->
    <svg
      v-if="isFav"
      class="w-6 h-6 text-red-500 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>

    <!-- Outline heart when not favorited -->
    <svg
      v-else
      class="w-6 h-6 flex-shrink-0 transition-colors"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>

    <span class="text-sm font-medium">{{ isFav ? 'Saved' : 'Save' }}</span>
  </button>
</template>
