<script setup lang="ts">
const props = defineProps<{
  recipe: {
    id: string
    title: string
    slug: string
    description: string
    cookTime: number
    difficulty: 'easy' | 'medium' | 'hard'
    cuisineTags: string[]
    imageKey: string | null
    source?: string
  }
}>()

const isAiGenerated = computed(() => props.recipe.source === 'ai_generated')

const runtimeConfig = useRuntimeConfig()
const imageUrl = computed(() => {
  if (!props.recipe.imageKey) return null
  // Direct URLs (e.g. placeholder images) are used as-is
  if (props.recipe.imageKey.startsWith('http')) return props.recipe.imageKey
  // R2 public bucket URL - will be configured via env var in production
  const baseUrl = runtimeConfig.public.r2PublicUrl || 'https://pub-placeholder.r2.dev'
  return `${baseUrl}/${props.recipe.imageKey}`
})

const difficultyColor = computed(() => {
  switch (props.recipe.difficulty) {
    case 'easy': return 'text-green-600'
    case 'medium': return 'text-yellow-600'
    case 'hard': return 'text-red-600'
    default: return 'text-gray-600'
  }
})

// Only show FavoriteButton on client to avoid SSR hydration mismatch
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <NuxtLink
    :to="`/recipe/${recipe.slug}`"
    class="block bg-white rounded-xl shadow-sm motion-safe:hover:shadow-lg motion-safe:hover:-translate-y-1 transition-all duration-200 overflow-hidden group"
  >
    <!-- Image Section -->
    <div class="relative aspect-[4/3] overflow-hidden">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="recipe.title"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
      />
      <div
        v-else
        class="w-full h-full bg-gray-200 flex items-center justify-center"
      >
        <span v-if="isAiGenerated" class="text-gray-400 text-sm">Image generating...</span>
        <span v-else class="text-gray-400 text-sm">No image</span>
      </div>

      <!-- AI Badge -->
      <div v-if="isAiGenerated" class="absolute top-2 left-2 z-10">
        <span class="inline-flex items-center gap-1 bg-purple-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
          </svg>
          AI
        </span>
      </div>

      <!-- Favorite Button (client-side only) -->
      <div v-if="mounted" class="absolute top-2 right-2 z-10">
        <FavoriteButton :recipe-id="recipe.id" />
      </div>

      <!-- Desktop Hover Overlay -->
      <div class="absolute inset-0 bg-black bg-opacity-60 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span class="text-white text-lg font-medium">View Recipe</span>
      </div>
    </div>

    <!-- Card Body -->
    <div class="p-3 md:p-4">
      <!-- Title -->
      <h3 class="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
        {{ recipe.title }}
      </h3>

      <!-- Description -->
      <p class="text-sm text-gray-600 line-clamp-2 mb-3">
        {{ recipe.description }}
      </p>

      <!-- Metadata Row -->
      <div class="flex items-center gap-3 text-xs text-gray-500">
        <!-- Cook Time -->
        <div class="flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ recipe.cookTime }}min</span>
        </div>

        <!-- Difficulty -->
        <div class="flex items-center gap-1" :class="difficultyColor">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="capitalize">{{ recipe.difficulty }}</span>
        </div>

        <!-- Cuisine Tag -->
        <div v-if="recipe.cuisineTags.length > 0" class="flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span>{{ recipe.cuisineTags[0] }}</span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
