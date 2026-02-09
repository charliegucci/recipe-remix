<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string[]
  max?: number
}>(), {
  max: 3
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// Cuisine options with emoji flags
const cuisineOptions = [
  { name: 'Italian', emoji: '🇮🇹' },
  { name: 'Mexican', emoji: '🇲🇽' },
  { name: 'Japanese', emoji: '🇯🇵' },
  { name: 'Thai', emoji: '🇹🇭' },
  { name: 'Indian', emoji: '🇮🇳' },
  { name: 'Chinese', emoji: '🇨🇳' },
  { name: 'Korean', emoji: '🇰🇷' },
  { name: 'French', emoji: '🇫🇷' },
  { name: 'Mediterranean', emoji: '🌊' },
  { name: 'Middle Eastern', emoji: '🕌' },
  { name: 'American', emoji: '🇺🇸' },
  { name: 'Ethiopian', emoji: '🇪🇹' }
]

const surpriseMeOption = { name: 'Surprise Me', emoji: '🎲' }

// Check if a cuisine is selected
const isSelected = (cuisine: string) => props.modelValue.includes(cuisine)

// Check if we've reached max selections
const isMaxReached = computed(() => props.modelValue.length >= props.max)

// Check if an option should be disabled
const isDisabled = (cuisine: string) => {
  if (isSelected(cuisine)) return false
  if (cuisine === surpriseMeOption.name && props.modelValue.length > 0) return false
  return isMaxReached.value
}

// Toggle a cuisine selection
const toggleCuisine = (cuisine: string) => {
  if (isDisabled(cuisine)) return

  const current = [...props.modelValue]

  // Handle "Surprise Me" special logic
  if (cuisine === surpriseMeOption.name) {
    if (isSelected(cuisine)) {
      // Deselect Surprise Me
      emit('update:modelValue', [])
    } else {
      // Select only Surprise Me, deselect all others
      emit('update:modelValue', [surpriseMeOption.name])
    }
    return
  }

  // If Surprise Me is selected, deselect it first
  if (current.includes(surpriseMeOption.name)) {
    emit('update:modelValue', [cuisine])
    return
  }

  // Regular cuisine toggle
  if (isSelected(cuisine)) {
    emit('update:modelValue', current.filter(c => c !== cuisine))
  } else {
    emit('update:modelValue', [...current, cuisine])
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Surprise Me Option -->
    <button
      type="button"
      @click="toggleCuisine(surpriseMeOption.name)"
      :class="[
        'w-full min-h-12 px-4 py-3 rounded-lg border-2 transition-all duration-200',
        'flex items-center justify-center gap-2 text-sm font-medium',
        isSelected(surpriseMeOption.name)
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-dashed border-gray-300 bg-white text-gray-700 hover:border-gray-400'
      ]"
    >
      <span class="text-xl">{{ surpriseMeOption.emoji }}</span>
      <span>{{ surpriseMeOption.name }}</span>
    </button>

    <!-- Cuisine Grid -->
    <div class="grid grid-cols-3 md:grid-cols-4 gap-3">
      <button
        v-for="cuisine in cuisineOptions"
        :key="cuisine.name"
        type="button"
        @click="toggleCuisine(cuisine.name)"
        :disabled="isDisabled(cuisine.name)"
        :class="[
          'min-h-12 px-3 py-2 rounded-lg border-2 transition-all duration-200',
          'flex flex-col items-center justify-center gap-1 text-xs font-medium',
          isSelected(cuisine.name)
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : isDisabled(cuisine.name)
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 cursor-pointer'
        ]"
      >
        <span class="text-xl">{{ cuisine.emoji }}</span>
        <span class="text-center leading-tight">{{ cuisine.name }}</span>
      </button>
    </div>
  </div>
</template>
