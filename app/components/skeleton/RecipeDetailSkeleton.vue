<template>
  <div class="recipe-detail-skeleton bg-gray-50 min-h-screen">
    <!-- Hero Image Placeholder -->
    <div class="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-gray-300 animate-pulse"></div>

    <!-- Content Container -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- Back Link Placeholder -->
      <div class="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>

      <!-- Metadata Bar -->
      <div class="bg-white rounded-lg p-6 shadow-sm">
        <div class="flex flex-wrap gap-3">
          <div class="h-10 w-24 bg-gray-200 animate-pulse rounded-lg"></div>
          <div class="h-10 w-24 bg-gray-200 animate-pulse rounded-lg"></div>
          <div class="h-10 w-24 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </div>

      <!-- Description Card -->
      <div class="bg-white rounded-lg p-6 shadow-sm space-y-2">
        <div class="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
        <div class="h-4 w-5/6 bg-gray-200 animate-pulse rounded"></div>
      </div>

      <!-- Ingredients Card -->
      <div class="bg-white rounded-lg p-6 shadow-sm">
        <div class="h-6 w-32 bg-gray-200 animate-pulse rounded mb-4"></div>
        <div class="space-y-3">
          <div class="h-4 w-3/4 bg-gray-200 animate-pulse rounded"></div>
          <div class="h-4 w-2/3 bg-gray-200 animate-pulse rounded"></div>
          <div class="h-4 w-4/5 bg-gray-200 animate-pulse rounded"></div>
          <div class="h-4 w-3/4 bg-gray-200 animate-pulse rounded"></div>
          <div class="h-4 w-2/3 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>

      <!-- Instructions Section -->
      <div class="space-y-4">
        <div class="h-6 w-32 bg-gray-200 animate-pulse rounded mb-4"></div>
        <div v-for="i in 4" :key="i" class="flex items-start gap-3">
          <div class="w-6 h-6 bg-gray-200 animate-pulse rounded-full flex-shrink-0"></div>
          <div class="h-4 flex-1 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    </div>
  </div>
</template>
