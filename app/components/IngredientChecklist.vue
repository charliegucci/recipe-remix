<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface Ingredient {
  name: string
  quantity: string
  unit: string
}

const props = defineProps<{
  recipeId: string
  ingredients: Ingredient[]
}>()

// Initialize as empty object, hydrate from localStorage on client mount
const checked = ref<Record<number, boolean>>({})

// SSR-safe: Only access localStorage after component is mounted
onMounted(() => {
  const storageKey = `recipe:${props.recipeId}:ingredients`
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      checked.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load ingredient checklist state:', error)
  }
})

// Persist to localStorage whenever checked state changes
watch(
  checked,
  (newChecked) => {
    const storageKey = `recipe:${props.recipeId}:ingredients`
    try {
      localStorage.setItem(storageKey, JSON.stringify(newChecked))
    } catch (error) {
      console.error('Failed to save ingredient checklist state:', error)
    }
  },
  { deep: true }
)

function toggleIngredient(index: number) {
  checked.value[index] = !checked.value[index]
}

function clearAll() {
  checked.value = {}
  const storageKey = `recipe:${props.recipeId}:ingredients`
  try {
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.error('Failed to clear ingredient checklist:', error)
  }
}
</script>

<template>
  <div class="ingredient-checklist">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Ingredients</h3>
      <button
        v-if="Object.keys(checked).some(key => checked[Number(key)])"
        @click="clearAll"
        class="text-sm text-gray-600 hover:text-gray-900 underline"
      >
        Clear all
      </button>
    </div>

    <ul class="space-y-2">
      <li
        v-for="(ingredient, index) in ingredients"
        :key="index"
        @click="toggleIngredient(index)"
        class="flex items-center min-h-12 py-3 px-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors rounded"
        :class="{ 'bg-gray-50': checked[index] }"
      >
        <!-- Custom checkbox -->
        <div class="flex-shrink-0 mr-4">
          <div
            class="w-6 h-6 border-2 rounded flex items-center justify-center transition-all"
            :class="
              checked[index]
                ? 'border-green-500 bg-green-500'
                : 'border-gray-400'
            "
          >
            <svg
              v-if="checked[index]"
              class="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <!-- Ingredient text -->
        <div
          class="flex-1 text-base"
          :class="{
            'line-through text-gray-400': checked[index],
            'text-gray-900': !checked[index]
          }"
        >
          <span v-if="ingredient.quantity" class="font-medium">
            {{ ingredient.quantity }}
          </span>
          <span v-if="ingredient.unit" class="font-medium">
            {{ ingredient.unit }}
          </span>
          <span>{{ ingredient.name }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* Touch-friendly tap targets ensured via min-h-12 and py-3 */
</style>
