<template>
  <div class="relative">
    <!-- Search Input -->
    <div class="relative">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search ingredients..."
        class="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        @focus="showDropdown = true"
        @blur="handleBlur"
        @keydown.enter.prevent="selectFirst"
      />

      <!-- Loading indicator -->
      <div
        v-if="isSearching"
        class="absolute right-3 top-3.5"
      >
        <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>

    <!-- Dropdown Results -->
    <div
      v-if="showDropdown && (searchQuery.length >= 2 || searchQuery.length > 0)"
      class="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
    >
      <!-- Loading state -->
      <div
        v-if="isSearching"
        class="px-4 py-3 text-sm text-gray-500"
      >
        Searching...
      </div>

      <!-- Minimum characters message -->
      <div
        v-else-if="searchQuery.length < 2"
        class="px-4 py-3 text-sm text-gray-500"
      >
        Type at least 2 characters to search
      </div>

      <!-- Results -->
      <div
        v-else-if="results && results.length > 0"
        class="py-1"
      >
        <button
          v-for="ingredient in results"
          :key="ingredient.id"
          type="button"
          class="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-between min-h-[44px]"
          @mousedown="selectIngredient(ingredient)"
        >
          <span class="text-base font-medium text-gray-900">{{ ingredient.name }}</span>
          <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
            {{ ingredient.category }}
          </span>
        </button>
      </div>

      <!-- No results -->
      <div
        v-else
        class="px-4 py-3 text-sm text-gray-500"
      >
        No ingredients found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { refDebounced } from '@vueuse/core'

interface Ingredient {
  id: string
  name: string
  category: string
}

const emit = defineEmits<{
  select: [ingredient: Ingredient]
}>()

const searchQuery = ref('')
const showDropdown = ref(false)

// Debounced query for API calls (300ms delay)
const debouncedQuery = refDebounced(searchQuery, 300)

// Fetch results with debounced query
const results = ref<Ingredient[]>([])
const pending = ref(false)

watch(debouncedQuery, async (q) => {
  if (!q || q.length < 2) {
    results.value = []
    return
  }
  pending.value = true
  try {
    results.value = await $fetch<Ingredient[]>('/api/ingredients/search', {
      query: { q }
    })
  } catch {
    results.value = []
  } finally {
    pending.value = false
  }
})

// Show loading indicator when query is ahead of debounced query
const isSearching = computed(() => {
  return searchQuery.value !== debouncedQuery.value || pending.value
})

function selectIngredient(ingredient: Ingredient) {
  emit('select', ingredient)
  searchQuery.value = ''
  showDropdown.value = false
}

// Select the first result when Enter is pressed
function selectFirst() {
  if (results.value && results.value.length > 0) {
    selectIngredient(results.value[0])
  }
}

function handleBlur() {
  // Delay closing dropdown to allow click events to register
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}
</script>
