<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <AppHeader />

    <main class="flex-1">
      <slot />
    </main>

    <footer class="bg-white border-t border-gray-200 py-6 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p class="text-center text-sm text-gray-500">
          Recipe Remix - AI-Powered Fusion Cuisine
        </p>
      </div>
    </footer>
  </div>
</template>
