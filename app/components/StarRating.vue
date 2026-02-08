<script setup lang="ts">
interface Props {
  modelValue: number // 0-5, can include decimals for display
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const hoveredRating = ref(0)

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
}

function handleClick(rating: number) {
  if (!props.readonly) {
    emit('update:modelValue', rating)
  }
}

function handleMouseEnter(rating: number) {
  if (!props.readonly) {
    hoveredRating.value = rating
  }
}

function handleMouseLeave() {
  if (!props.readonly) {
    hoveredRating.value = 0
  }
}

function getStarFill(position: number): 'full' | 'half' | 'empty' {
  const activeRating = hoveredRating.value || props.modelValue

  if (activeRating >= position) {
    return 'full'
  } else if (props.readonly && activeRating >= position - 0.5) {
    return 'half'
  } else {
    return 'empty'
  }
}
</script>

<template>
  <div class="inline-flex gap-0.5" :class="{ 'cursor-pointer': !readonly }">
    <button
      v-for="i in 5"
      :key="i"
      type="button"
      :disabled="readonly"
      class="relative transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 rounded"
      :class="[
        sizeClasses[size],
        !readonly ? 'hover:scale-110 active:scale-95' : ''
      ]"
      @click="handleClick(i)"
      @mouseenter="handleMouseEnter(i)"
      @mouseleave="handleMouseLeave"
      :aria-label="`${i} star${i > 1 ? 's' : ''}`"
    >
      <!-- Empty star (background) -->
      <svg
        class="absolute inset-0 text-gray-300"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>

      <!-- Half star overlay (for readonly mode with decimal ratings) -->
      <svg
        v-if="getStarFill(i) === 'half'"
        class="absolute inset-0 text-amber-400"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
        style="clip-path: inset(0 50% 0 0)"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>

      <!-- Full star overlay -->
      <svg
        v-if="getStarFill(i) === 'full'"
        class="absolute inset-0 text-amber-400"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  </div>
</template>
