<script setup lang="ts">
// SSR data fetching for featured recipes and category sections
const { data } = await useAsyncData('home', () =>
  Promise.all([
    $fetch('/api/recipes/featured'),
    $fetch('/api/recipes?category=italian&page=1'),
    $fetch('/api/recipes?category=mexican&page=1'),
    $fetch('/api/recipes?category=asian&page=1'),
    $fetch('/api/recipes?category=american&page=1'),
    $fetch('/api/recipes?category=mediterranean&page=1'),
  ])
)

const [
  featuredRecipes,
  italianRecipes,
  mexicanRecipes,
  asianRecipes,
  americanRecipes,
  mediterraneanRecipes,
] = data.value || [[], [], [], [], [], []]

// SEO with OpenGraph
useServerSeoMeta({
  title: 'Recipe Remix - Creative Fusion Recipes from Your Pantry',
  description: 'Discover and create delicious fusion recipes using ingredients you already have. AI-powered recipe generation meets culinary creativity.',
  ogTitle: 'Recipe Remix - Creative Fusion Recipes',
  ogDescription: 'Discover and create delicious fusion recipes using ingredients you already have.',
  ogImage: 'https://recipe-remix-9fd.pages.dev/og-default.svg',
  ogType: 'website',
  ogUrl: 'https://recipe-remix-9fd.pages.dev'
})

useHead({
  link: [{ rel: 'canonical', href: 'https://recipe-remix-9fd.pages.dev' }]
})
</script>

<template>
  <div class="space-y-8 md:space-y-12 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto py-6 md:py-8">
    <!-- Featured Carousel -->
    <FeaturedCarousel
      v-if="featuredRecipes && featuredRecipes.length > 0"
      :recipes="featuredRecipes"
    />

    <!-- Category Sections -->
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
  </div>
</template>
