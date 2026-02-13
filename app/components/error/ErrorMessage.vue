<script setup lang="ts">
defineProps<{
  title?: string
  message?: string
  retryLabel?: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="p-6 bg-red-50 border border-red-200 rounded-lg">
    <div class="flex gap-3">
      <!-- Error Icon -->
      <svg
        class="w-6 h-6 text-red-500 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <!-- Content -->
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-red-900 mb-1">
          {{ title || 'Something went wrong' }}
        </h3>
        <p class="text-sm text-red-700 mb-4">
          {{ message || 'We encountered an unexpected error. Please try again.' }}
        </p>
        <button
          class="px-4 py-2 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          @click="$emit('retry')"
        >
          {{ retryLabel || 'Try Again' }}
        </button>
      </div>
    </div>
  </div>
</template>
