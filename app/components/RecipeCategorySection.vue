<script setup lang="ts">
import { useInfiniteScroll } from '@vueuse/core'

interface RecipeItem {
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

const props = defineProps<{
  category: string
  categoryLabel: string
  initialRecipes: RecipeItem[]
}>()

const recipes = ref([...props.initialRecipes])
const page = ref(1)
const hasMore = ref(props.initialRecipes.length > 0)
const loading = ref(false)

const loadMore = async () => {
  if (!hasMore.value || loading.value) return

  loading.value = true
  try {
    page.value += 1
    const newRecipes = await $fetch<RecipeItem[]>(`/api/recipes?category=${props.category}&page=${page.value}`)

    if (!newRecipes || newRecipes.length === 0) {
      hasMore.value = false
    } else {
      recipes.value.push(...newRecipes)
    }
  } catch (error) {
    console.error('Failed to load more recipes:', error)
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

// Use window as scroll target for infinite scroll
const canLoadMore = computed(() => hasMore.value && !loading.value)

onMounted(() => {
  useInfiniteScroll(
    window,
    () => {
      if (canLoadMore.value) {
        loadMore()
      }
    },
    { distance: 300 }
  )
})
</script>

<template>
  <section class="space-y-4 md:space-y-6">
    <!-- Section Header -->
    <h2 class="text-2xl md:text-3xl font-bold text-gray-900">
      {{ categoryLabel }}
    </h2>

    <!-- Recipe Grid -->
    <div v-if="recipes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <RecipeCard
        v-for="recipe in recipes"
        :key="recipe.id"
        :recipe="recipe"
      />

      <!-- Loading Skeletons -->
      <template v-if="loading">
        <RecipeCardSkeleton v-for="i in 3" :key="`skeleton-${i}`" />
      </template>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-12 px-4 bg-gray-50 rounded-xl"
    >
      <p class="text-gray-500 text-lg">No recipes in this category yet</p>
    </div>
  </section>
</template>
