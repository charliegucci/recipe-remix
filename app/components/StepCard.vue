<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'

const props = defineProps<{
  recipeId: string
  stepNumber: number
  totalSteps: number
  instruction: string
}>()

// Initialize as false, hydrate from localStorage on client mount
const completed = ref<boolean>(false)

// Compute storage key
const storageKey = computed(() => `recipe:${props.recipeId}:steps`)

// SSR-safe: Only access localStorage after component is mounted
onMounted(() => {
  try {
    const stored = localStorage.getItem(storageKey.value)
    if (stored) {
      const steps = JSON.parse(stored) as Record<number, boolean>
      completed.value = steps[props.stepNumber] || false
    }
  } catch (error) {
    console.error('Failed to load step completion state:', error)
  }
})

// Persist to localStorage whenever completion state changes
watch(completed, (newCompleted) => {
  try {
    // Load existing steps state
    const stored = localStorage.getItem(storageKey.value)
    const steps = stored ? JSON.parse(stored) : {}

    // Update this step's completion state
    steps[props.stepNumber] = newCompleted

    // Save back to localStorage
    localStorage.setItem(storageKey.value, JSON.stringify(steps))
  } catch (error) {
    console.error('Failed to save step completion state:', error)
  }
})

function toggleCompletion() {
  completed.value = !completed.value
}
</script>

<template>
  <div
    @click="toggleCompletion"
    class="step-card cursor-pointer transition-all duration-200 hover:shadow-md"
    :class="{
      'bg-white border-2 border-gray-200': !completed,
      'bg-green-50 border-2 border-green-200': completed
    }"
  >
    <!-- Card container with padding -->
    <div class="p-6">
      <!-- Step number badge at top -->
      <div class="flex items-center justify-between mb-4">
        <div
          class="text-sm font-semibold px-3 py-1 rounded-full"
          :class="{
            'bg-orange-100 text-orange-700': !completed,
            'bg-green-100 text-green-700': completed
          }"
        >
          Step {{ stepNumber }} of {{ totalSteps }}
        </div>

        <!-- Checkmark indicator -->
        <div
          class="flex-shrink-0 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all"
          :class="{
            'border-2 border-gray-300': !completed,
            'bg-green-500': completed
          }"
        >
          <svg
            v-if="completed"
            class="w-5 h-5 text-white"
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

      <!-- Instruction text -->
      <p
        class="text-base leading-relaxed"
        :class="{
          'text-gray-900': !completed,
          'text-gray-600': completed
        }"
      >
        {{ instruction }}
      </p>
    </div>

    <!-- Visual feedback: subtle scale on tap -->
    <div
      v-if="completed"
      class="absolute inset-0 pointer-events-none bg-green-500 opacity-0 transition-opacity duration-200"
    />
  </div>
</template>

<style scoped>
.step-card {
  position: relative;
  border-radius: 0.75rem;
  /* Touch-friendly: entire card is tappable */
  min-height: 120px;
}

/* Active state feedback for touch */
.step-card:active {
  transform: scale(0.98);
}
</style>
