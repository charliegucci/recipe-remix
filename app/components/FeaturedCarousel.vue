<script setup lang="ts">
const props = defineProps<{
  recipes: Array<{
    id: string
    title: string
    slug: string
    description: string
    cookTime: number
    imageKey: string | null
    cuisineTags: string[]
  }>
}>()

const currentIndex = ref(0)
let autoAdvanceInterval: NodeJS.Timeout | null = null

const getImageUrl = (imageKey: string | null) => {
  if (!imageKey) return null
  if (imageKey.startsWith('http')) return imageKey
  return `/_hub/blob/${imageKey}`
}

const goToSlide = (index: number) => {
  currentIndex.value = index
  resetAutoAdvance()
}

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % props.recipes.length
  resetAutoAdvance()
}

const prevSlide = () => {
  currentIndex.value = (currentIndex.value - 1 + props.recipes.length) % props.recipes.length
  resetAutoAdvance()
}

const resetAutoAdvance = () => {
  if (autoAdvanceInterval) {
    clearInterval(autoAdvanceInterval)
  }
  autoAdvanceInterval = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % props.recipes.length
  }, 5000)
}

onMounted(() => {
  resetAutoAdvance()
})

onUnmounted(() => {
  if (autoAdvanceInterval) {
    clearInterval(autoAdvanceInterval)
  }
})
</script>

<template>
  <section class="relative w-full bg-gray-900 rounded-xl overflow-hidden">
    <!-- Slides Container -->
    <div class="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden">
      <div
        class="flex transition-transform duration-500 ease-in-out h-full"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div
          v-for="(recipe, index) in recipes"
          :key="recipe.id"
          class="min-w-full h-full relative"
        >
          <!-- Image -->
          <NuxtImg
            v-if="getImageUrl(recipe.imageKey)"
            :src="getImageUrl(recipe.imageKey)"
            :alt="recipe.title"
            :loading="index === currentIndex ? 'eager' : 'lazy'"
            :fetchpriority="index === currentIndex ? 'high' : 'low'"
            format="webp"
            sizes="sm:100vw md:100vw lg:1200px"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 flex items-center justify-center"
          >
            <svg class="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>

          <!-- Gradient Overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

          <!-- Text Content -->
          <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-12">
            <NuxtLink
              :to="`/recipe/${recipe.slug}`"
              class="block max-w-3xl"
            >
              <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
                {{ recipe.title }}
              </h2>
              <p class="text-base md:text-lg text-gray-100 mb-4 line-clamp-2">
                {{ recipe.description }}
              </p>
              <div class="flex items-center gap-4 text-sm text-gray-200">
                <span class="flex items-center gap-1">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ recipe.cookTime }} min
                </span>
                <span v-if="recipe.cuisineTags.length > 0" class="flex items-center gap-1">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {{ recipe.cuisineTags[0] }}
                </span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Navigation Arrows (Desktop only) -->
      <button
        v-if="recipes.length > 1"
        @click="prevSlide"
        class="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors"
        aria-label="Previous slide"
      >
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        v-if="recipes.length > 1"
        @click="nextSlide"
        class="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors"
        aria-label="Next slide"
      >
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Dot Indicators -->
    <div
      v-if="recipes.length > 1"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
    >
      <button
        v-for="(recipe, index) in recipes"
        :key="`dot-${recipe.id}`"
        @click="goToSlide(index)"
        :class="[
          'w-2 h-2 rounded-full transition-all duration-300',
          index === currentIndex
            ? 'bg-white w-6'
            : 'bg-white/50 hover:bg-white/75'
        ]"
        :aria-label="`Go to slide ${index + 1}`"
      ></button>
    </div>
  </section>
</template>
