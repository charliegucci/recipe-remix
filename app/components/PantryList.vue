<template>
  <div>
    <!-- Pantry Items -->
    <div
      v-if="items.length > 0"
      class="flex flex-wrap gap-2"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-900 rounded-full border border-emerald-200"
      >
        <span class="text-sm font-medium">{{ item.name }}</span>
        <button
          type="button"
          class="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 rounded-full hover:bg-emerald-200 active:bg-emerald-300 transition-colors"
          @click="$emit('remove', item.id)"
          aria-label="Remove ingredient"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-8 text-gray-500"
    >
      <p class="text-base">Your pantry is empty. Add ingredients above!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PantryItem {
  id: string
  name: string
}

defineProps<{
  items: PantryItem[]
}>()

defineEmits<{
  remove: [id: string]
}>()
</script>
