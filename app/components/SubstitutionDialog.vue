<script setup lang="ts">
import { usePantry } from '~/composables/usePantry'

interface SubstitutionResult {
  substitute: { name: string; quantity: string; unit: string }
  updatedInstructions: string[]
  updatedExplanation: string
  substitutionNote: string
  fromPantry?: boolean
}

const props = defineProps<{
  recipeId: string
  ingredientName: string
}>()

const emit = defineEmits<{
  close: []
  accept: [result: SubstitutionResult]
}>()

// Pantry composable for pantry-aware AI and manual pick
const { pantry } = usePantry()

// Tab state: 'ai' | 'pantry'
const activeTab = ref<'ai' | 'pantry'>('ai')

// AI Suggest tab state
const reason = ref<'allergy' | 'unavailable' | 'preference'>('unavailable')
const loading = ref(false)
const error = ref('')
const result = ref<SubstitutionResult | null>(null)

// Manual pantry pick tab state
const pantrySearch = ref('')

const filteredPantry = computed(() => {
  const q = pantrySearch.value.trim().toLowerCase()
  if (!q) return pantry.value
  return pantry.value.filter(item => item.name.toLowerCase().includes(q))
})

// Switch tabs: reset AI result when switching so user gets a fresh state
function switchTab(tab: 'ai' | 'pantry') {
  activeTab.value = tab
  // Reset AI state when switching to pantry tab so dialog feels clean
  if (tab === 'pantry') {
    error.value = ''
  }
}

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
          reason: reason.value,
          pantryItems: pantry.value.map(p => p.name)
        }
      }
    )

    if (response.success) {
      result.value = {
        substitute: response.substitute,
        updatedInstructions: response.updatedInstructions,
        updatedExplanation: response.updatedExplanation,
        substitutionNote: response.substitutionNote,
        fromPantry: response.fromPantry ?? false
      }
    }
  } catch (err: any) {
    error.value = err?.statusMessage || 'Failed to find a substitute. Please try again.'
  } finally {
    loading.value = false
  }
}

function acceptAiResult() {
  if (result.value) {
    emit('accept', result.value)
  }
}

function acceptManualPick(item: { name: string }) {
  emit('accept', {
    substitute: {
      name: item.name,
      quantity: '(adjust to taste)',
      unit: ''
    },
    updatedInstructions: [],
    updatedExplanation: '',
    substitutionNote: 'Manually selected from your pantry'
  })
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

      <!-- Tab segmented control -->
      <div class="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
        <button
          @click="switchTab('ai')"
          class="flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors"
          :class="activeTab === 'ai'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-gray-200'"
        >
          AI Suggest
        </button>
        <button
          @click="switchTab('pantry')"
          class="flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors"
          :class="activeTab === 'pantry'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-gray-200'"
        >
          Pick from Pantry
        </button>
      </div>

      <!-- =============================== -->
      <!-- Tab 1: AI Suggest               -->
      <!-- =============================== -->
      <div v-if="activeTab === 'ai'">
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
                <!-- Pantry badge -->
                <span
                  v-if="result.fromPantry"
                  class="inline-block mt-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium"
                >
                  From your pantry!
                </span>
              </div>
            </div>
          </div>

          <!-- Not in pantry note -->
          <p
            v-if="!result.fromPantry"
            class="text-xs text-gray-500 text-center"
          >
            Not in your pantry — you may need to buy this
          </p>

          <!-- Substitution note -->
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
              @click="acceptAiResult"
              class="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>

        <!-- Cancel (before result) -->
        <button
          v-if="!result"
          @click="emit('close')"
          class="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>

      <!-- =============================== -->
      <!-- Tab 2: Pick from Pantry         -->
      <!-- =============================== -->
      <div v-else-if="activeTab === 'pantry'">
        <!-- Empty pantry state -->
        <div v-if="pantry.length === 0" class="text-center py-8">
          <p class="text-sm text-gray-600 mb-3">Your pantry is empty. Add ingredients on the Pantry page.</p>
          <NuxtLink
            to="/pantry"
            class="text-sm text-indigo-600 font-medium hover:text-indigo-700"
            @click="emit('close')"
          >
            Go to Pantry
          </NuxtLink>
        </div>

        <!-- Pantry item list -->
        <div v-else>
          <!-- Search filter -->
          <div class="relative mb-3">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="pantrySearch"
              type="text"
              placeholder="Filter pantry items..."
              class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <!-- No matches after filter -->
          <p v-if="filteredPantry.length === 0" class="text-sm text-gray-500 text-center py-4">
            No pantry items match "{{ pantrySearch }}"
          </p>

          <!-- Scrollable list -->
          <div v-else class="space-y-1 max-h-64 overflow-y-auto pr-1">
            <button
              v-for="item in filteredPantry"
              :key="item.id"
              @click="acceptManualPick(item)"
              class="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2 group"
            >
              <span class="flex-1 font-medium">{{ item.name }}</span>
              <svg class="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Cancel -->
        <button
          @click="emit('close')"
          class="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
