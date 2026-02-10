<script setup lang="ts">
interface SubstitutionResult {
  substitute: { name: string; quantity: string; unit: string }
  updatedInstructions: string[]
  updatedExplanation: string
  substitutionNote: string
}

const props = defineProps<{
  recipeId: string
  ingredientName: string
}>()

const emit = defineEmits<{
  close: []
  accept: [result: SubstitutionResult]
}>()

const reason = ref<'allergy' | 'unavailable' | 'preference'>('unavailable')
const loading = ref(false)
const error = ref('')
const result = ref<SubstitutionResult | null>(null)

async function findSubstitute() {
  loading.value = true
  error.value = ''
  result.value = null

  try {
    const response = await $fetch<{ success: boolean } & SubstitutionResult>(
      `/api/recipes/${props.recipeId}/substitute`,
      {
        method: 'POST',
        body: {
          ingredientName: props.ingredientName,
          reason: reason.value
        }
      }
    )

    if (response.success) {
      result.value = {
        substitute: response.substitute,
        updatedInstructions: response.updatedInstructions,
        updatedExplanation: response.updatedExplanation,
        substitutionNote: response.substitutionNote
      }
    }
  } catch (err: any) {
    error.value = err?.statusMessage || 'Failed to find a substitute. Please try again.'
  } finally {
    loading.value = false
  }
}

function accept() {
  if (result.value) {
    emit('accept', result.value)
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="emit('close')">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50" @click="emit('close')" />

    <!-- Dialog -->
    <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
      <h3 class="text-lg font-semibold text-gray-900 mb-1">Substitute Ingredient</h3>
      <p class="text-sm text-gray-600 mb-4">
        Find a replacement for <span class="font-medium text-gray-900">{{ ingredientName }}</span>
      </p>

      <!-- Reason selector -->
      <div v-if="!result" class="mb-4">
        <label class="text-sm font-medium text-gray-700 mb-2 block">Why do you need a substitute?</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in [
              { value: 'allergy', label: 'Allergy' },
              { value: 'unavailable', label: 'Unavailable' },
              { value: 'preference', label: 'Preference' }
            ]"
            :key="option.value"
            @click="reason = option.value as typeof reason"
            class="px-3 py-1.5 text-sm rounded-full border-2 transition-colors"
            :class="reason === option.value
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Find button -->
      <button
        v-if="!result"
        @click="findSubstitute"
        :disabled="loading"
        class="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ loading ? 'Finding substitute...' : 'Find Substitute' }}
      </button>

      <!-- Error -->
      <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

      <!-- Result -->
      <div v-if="result" class="space-y-4">
        <!-- Swap comparison -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="flex-1 text-center">
              <p class="text-xs text-gray-500 mb-1">Original</p>
              <p class="text-sm font-medium text-gray-900 line-through">{{ ingredientName }}</p>
            </div>
            <svg class="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div class="flex-1 text-center">
              <p class="text-xs text-gray-500 mb-1">Substitute</p>
              <p class="text-sm font-medium text-indigo-700">
                {{ result.substitute.quantity }} {{ result.substitute.unit }} {{ result.substitute.name }}
              </p>
            </div>
          </div>
        </div>

        <!-- Note -->
        <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p class="text-sm text-indigo-800">{{ result.substitutionNote }}</p>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-3">
          <button
            @click="emit('close')"
            class="flex-1 py-2 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="accept"
            class="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>

      <!-- Close button -->
      <button
        v-if="!result"
        @click="emit('close')"
        class="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  </div>
</template>
