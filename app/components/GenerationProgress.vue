<script setup lang="ts">
const props = defineProps<{
  status: 'idle' | 'generating' | 'validating' | 'imaging' | 'complete' | 'error'
  errorMessage?: string
  startTime?: number | null
}>()

// Define steps with their icons and text
const steps = [
  {
    key: 'generating',
    label: 'Crafting your fusion recipe...',
    icon: 'sparkles'
  },
  {
    key: 'validating',
    label: 'Validating ingredients...',
    icon: 'check-circle'
  },
  {
    key: 'imaging',
    label: 'Generating food photo...',
    icon: 'photo'
  },
  {
    key: 'complete',
    label: 'Done!',
    icon: 'check-badge'
  }
]

// Determine step status
const getStepStatus = (stepKey: string) => {
  if (props.status === 'error') return 'error'

  const stepIndex = steps.findIndex(s => s.key === stepKey)
  const currentIndex = steps.findIndex(s => s.key === props.status)

  if (currentIndex === -1) return 'pending' // idle state
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'active'
  return 'pending'
}

// Elapsed time tracking
const elapsed = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

watch(() => props.startTime, (val) => {
  if (val) {
    elapsed.value = 0
    timer = setInterval(() => {
      elapsed.value = Math.floor((Date.now() - val) / 1000)
    }, 1000)
  } else if (timer) {
    clearInterval(timer)
    timer = null
  }
}, { immediate: true })

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// Estimated remaining time
const estimatedRemaining = computed(() => {
  if (props.status === 'idle' || props.status === 'complete' || props.status === 'error') {
    return null
  }

  // Step-based estimates (in seconds)
  const estimates: Record<string, number> = {
    generating: 20,
    validating: 10,
    imaging: 15
  }

  const currentStepEstimate = estimates[props.status] || 0
  const remaining = currentStepEstimate - elapsed.value

  if (remaining <= 0) {
    return 'Almost done...'
  }

  return `About ${remaining} seconds remaining...`
})
</script>

<template>
  <div class="space-y-4">
    <!-- Steps List -->
    <div class="space-y-3">
      <div
        v-for="step in steps"
        :key="step.key"
        class="flex items-center gap-3"
      >
        <!-- Icon -->
        <div class="flex-shrink-0">
          <!-- Completed -->
          <div
            v-if="getStepStatus(step.key) === 'completed'"
            class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
          >
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <!-- Active -->
          <div
            v-else-if="getStepStatus(step.key) === 'active'"
            class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse"
          >
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>

          <!-- Error -->
          <div
            v-else-if="getStepStatus(step.key) === 'error'"
            class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
          >
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <!-- Pending -->
          <div
            v-else
            class="w-6 h-6 rounded-full border-2 border-gray-300 bg-white"
          ></div>
        </div>

        <!-- Label -->
        <div
          :class="[
            'text-sm transition-all duration-200',
            getStepStatus(step.key) === 'active' ? 'font-semibold text-gray-900' : 'text-gray-600',
            getStepStatus(step.key) === 'error' ? 'text-red-600' : ''
          ]"
        >
          {{ step.label }}
        </div>
      </div>
    </div>

    <!-- Time Estimate -->
    <p
      v-if="estimatedRemaining"
      class="text-sm text-gray-500 text-center mt-2"
    >
      {{ estimatedRemaining }}
    </p>

    <!-- Error Message -->
    <div
      v-if="status === 'error' && errorMessage"
      class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
    >
      <div class="flex gap-2">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-red-800">Generation Failed</p>
          <p class="text-sm text-red-700 mt-1">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
