<script setup lang="ts">
const props = defineProps<{
  status: 'idle' | 'generating' | 'validating' | 'imaging' | 'complete' | 'error'
  errorMessage?: string
  startTime?: number | null
  stepStartTimes?: Record<string, number>
}>()

// Define steps with their icons and text
const steps = [
  {
    key: 'generating',
    label: 'Crafting your recipe',
    estimateSecs: 8
  },
  {
    key: 'validating',
    label: 'Validating ingredients',
    estimateSecs: 5
  },
  {
    key: 'imaging',
    label: 'Generating food photo',
    estimateSecs: 12
  }
]

// Determine step status
const getStepStatus = (stepKey: string) => {
  if (props.status === 'error') return 'error'

  const stepOrder = ['generating', 'validating', 'imaging', 'complete']
  const stepIndex = stepOrder.indexOf(stepKey)
  const currentIndex = stepOrder.indexOf(props.status)

  if (currentIndex === -1) return 'pending' // idle state
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'active'
  return 'pending'
}

// Per-step countdown — ticks every 500ms
const now = ref(Date.now())
let countdownInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  countdownInterval = setInterval(() => {
    now.value = Date.now()
  }, 500)
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})

// Compute per-step countdown for the active step
const getStepCountdown = (step: { key: string; estimateSecs: number }): string | null => {
  if (getStepStatus(step.key) !== 'active') return null
  if (!props.stepStartTimes || !props.stepStartTimes[step.key]) return null

  const elapsed = (now.value - props.stepStartTimes[step.key]) / 1000
  const remaining = Math.ceil(step.estimateSecs - elapsed)

  if (remaining <= 0) return 'Almost done...'
  return `~${remaining}s remaining`
}

// Overall progress bar percentage
const progressPercent = computed(() => {
  switch (props.status) {
    case 'generating': return 15
    case 'validating': return 45
    case 'imaging': return 75
    case 'complete': return 100
    default: return 0
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Overall progress bar -->
    <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        class="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-purple-500 rounded-full"
        :style="{ width: progressPercent + '%', transition: 'width 500ms ease-out' }"
      />
    </div>

    <!-- Steps list -->
    <div class="space-y-4">
      <div
        v-for="step in steps"
        :key="step.key"
        class="flex items-start gap-4 py-1"
      >
        <!-- Animated icon area (40x40) -->
        <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <!-- Completed: green checkmark with scale-in animation -->
          <div
            v-if="getStepStatus(step.key) === 'completed'"
            class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-green-600 icon-scale-in"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <!-- Active: generating — sparkle/magic with amber pulse -->
          <div
            v-else-if="getStepStatus(step.key) === 'active' && step.key === 'generating'"
            class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-amber-500 icon-sparkle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>

          <!-- Active: validating — shield with slow spin -->
          <div
            v-else-if="getStepStatus(step.key) === 'active' && step.key === 'validating'"
            class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-blue-500 icon-spin-slow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <!-- Active: imaging — camera with flash -->
          <div
            v-else-if="getStepStatus(step.key) === 'active' && step.key === 'imaging'"
            class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-purple-500 icon-flash"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <!-- Pending: gray dashed circle -->
          <div
            v-else
            class="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-white"
          />
        </div>

        <!-- Label + countdown -->
        <div class="flex-1 pt-1.5">
          <div
            :class="[
              'font-medium transition-all duration-200',
              getStepStatus(step.key) === 'active' ? 'text-base text-gray-900' : 'text-sm',
              getStepStatus(step.key) === 'active' && step.key === 'generating' ? 'text-amber-700' : '',
              getStepStatus(step.key) === 'active' && step.key === 'validating' ? 'text-blue-700' : '',
              getStepStatus(step.key) === 'active' && step.key === 'imaging' ? 'text-purple-700' : '',
              getStepStatus(step.key) === 'completed' ? 'text-green-600' : '',
              getStepStatus(step.key) === 'pending' ? 'text-gray-400 font-normal' : ''
            ]"
          >
            {{ step.label }}
          </div>
          <!-- Per-step countdown (active step only, when stepStartTimes available) -->
          <div
            v-if="getStepCountdown(step)"
            :class="[
              'text-xs mt-0.5',
              step.key === 'generating' ? 'text-amber-500' : '',
              step.key === 'validating' ? 'text-blue-500' : '',
              step.key === 'imaging' ? 'text-purple-500' : ''
            ]"
          >
            {{ getStepCountdown(step) }}
          </div>
        </div>
      </div>
    </div>

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

<style scoped>
/* Completed step checkmark: scale-in entrance */
@keyframes scale-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.icon-scale-in {
  animation: scale-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* Active generating step: sparkle pulse with amber glow */
@keyframes sparkle {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.75;
  }
}

.icon-sparkle {
  animation: sparkle 1s ease-in-out infinite;
}

/* Active validating step: slow full rotation */
@keyframes spin-slow {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.icon-spin-slow {
  animation: spin-slow 2s linear infinite;
}

/* Active imaging step: brightness flash every 1.5s */
@keyframes flash {
  0%, 85%, 100% {
    filter: brightness(1);
    opacity: 1;
  }
  90% {
    filter: brightness(1.8);
    opacity: 0.9;
  }
}

.icon-flash {
  animation: flash 1.5s ease-in-out infinite;
}
</style>
