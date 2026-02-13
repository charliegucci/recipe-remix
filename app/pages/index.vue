<script setup lang="ts">
// Lazy fetch so client-side navigation to home shows skeleton instead of blocking/white screen
const { data, pending, error, refresh } = useLazyAsyncData('home', () =>
  Promise.all([
    $fetch('/api/recipes/featured'),
    $fetch('/api/recipes?category=italian&page=1'),
    $fetch('/api/recipes?category=mexican&page=1'),
    $fetch('/api/recipes?category=asian&page=1'),
    $fetch('/api/recipes?category=american&page=1'),
    $fetch('/api/recipes?category=mediterranean&page=1'),
  ])
)

const raw = computed(() => data.value ?? [ [], [], [], [], [], [] ])
const featuredRecipes = computed(() => Array.isArray(raw.value[0]) ? raw.value[0] : [])
const italianRecipes = computed(() => Array.isArray(raw.value[1]) ? raw.value[1] : [])
const mexicanRecipes = computed(() => Array.isArray(raw.value[2]) ? raw.value[2] : [])
const asianRecipes = computed(() => Array.isArray(raw.value[3]) ? raw.value[3] : [])
const americanRecipes = computed(() => Array.isArray(raw.value[4]) ? raw.value[4] : [])
const mediterraneanRecipes = computed(() => Array.isArray(raw.value[5]) ? raw.value[5] : [])

const hasAnyRecipes = computed(() =>
  (featuredRecipes.value.length + italianRecipes.value.length + mexicanRecipes.value.length +
   asianRecipes.value.length + americanRecipes.value.length + mediterraneanRecipes.value.length) > 0
)

// SEO with OpenGraph
useServerSeoMeta({
  title: 'Recipe Remix - Creative Fusion Recipes from Your Pantry',
  description: 'Discover and create delicious fusion recipes using ingredients you already have. AI-powered recipe generation meets culinary creativity.',
  ogTitle: 'Recipe Remix - Creative Fusion Recipes',
  ogDescription: 'Discover and create delicious fusion recipes using ingredients you already have.',
  ogImage: 'https://remix-recipe.com/og-default.svg',
  ogType: 'website',
  ogUrl: 'https://remix-recipe.com'
})

useHead({
  link: [{ rel: 'canonical', href: 'https://remix-recipe.com' }]
})
</script>

<template>
  <div class="space-y-8 md:space-y-12 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto py-6 md:py-8">
    <!-- Error: show message and retry -->
    <div
      v-if="error"
      class="rounded-lg bg-red-50 border border-red-200 p-6 text-center"
    >
      <p class="text-red-800 mb-4">Could not load recipes. Please try again.</p>
      <button
        type="button"
        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        @click="refresh()"
      >
        Retry
      </button>
    </div>

    <!-- Loading State -->
    <RecipeListSkeleton v-else-if="pending" :count="9" />

    <!-- Empty state (e.g. after nav when data not yet loaded or APIs returned empty) -->
    <div
      v-else-if="!hasAnyRecipes"
      class="rounded-lg bg-gray-100 border border-gray-200 p-8 text-center"
    >
      <p class="text-gray-600 mb-4">No recipes to show right now.</p>
      <button
        type="button"
        class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
        @click="refresh()"
      >
        Reload
      </button>
    </div>

    <!-- Featured Carousel + Category Sections -->
    <template v-else>
      <FeaturedCarousel
        v-if="featuredRecipes && featuredRecipes.length > 0"
        :recipes="featuredRecipes"
      />

      <RecipeCategorySection
        v-if="italianRecipes && italianRecipes.length > 0"
        category="italian"
        category-label="Italian Cuisine"
        :initial-recipes="italianRecipes"
      />

      <RecipeCategorySection
        v-if="mexicanRecipes && mexicanRecipes.length > 0"
        category="mexican"
        category-label="Mexican Cuisine"
        :initial-recipes="mexicanRecipes"
      />

      <RecipeCategorySection
        v-if="asianRecipes && asianRecipes.length > 0"
        category="asian"
        category-label="Asian Cuisine"
        :initial-recipes="asianRecipes"
      />

      <RecipeCategorySection
        v-if="americanRecipes && americanRecipes.length > 0"
        category="american"
        category-label="American Cuisine"
        :initial-recipes="americanRecipes"
      />

      <RecipeCategorySection
        v-if="mediterraneanRecipes && mediterraneanRecipes.length > 0"
        category="mediterranean"
        category-label="Mediterranean Cuisine"
        :initial-recipes="mediterraneanRecipes"
      />
    </template>
  </div>
</template>
