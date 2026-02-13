<script setup lang="ts">
const props = defineProps<{
  baseServings: number
}>()

const servings = defineModel<number>({ required: true })

function decrease() {
  if (servings.value > 1) servings.value--
}

function increase() {
  if (servings.value < 20) servings.value++
}
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-sm font-medium text-gray-700">Servings:</span>
    <div class="flex items-center gap-2">
      <button
        @click="decrease"
        :disabled="servings <= 1"
        class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border-2 border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
        </svg>
      </button>
      <span class="w-8 text-center text-lg font-semibold text-gray-900">{{ servings }}</span>
      <button
        @click="increase"
        :disabled="servings >= 20"
        class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border-2 border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
    <span v-if="servings !== props.baseServings" class="text-xs text-gray-500">
      (Original: {{ props.baseServings }})
    </span>
  </div>
</template>
