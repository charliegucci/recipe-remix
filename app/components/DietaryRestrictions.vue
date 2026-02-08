<template>
  <div class="flex flex-wrap gap-3">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :class="[
        'px-4 py-2 rounded-full text-sm font-medium transition-all min-h-12',
        'border-2',
        isActive(option.value)
          ? 'bg-emerald-500 text-white border-emerald-500'
          : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-300 active:border-emerald-400'
      ]"
      @click="$emit('toggle', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface DietaryOption {
  value: string
  label: string
}

const props = defineProps<{
  options: DietaryOption[]
  activeRestrictions: string[]
}>()

defineEmits<{
  toggle: [restriction: string]
}>()

function isActive(value: string): boolean {
  return props.activeRestrictions.includes(value)
}
</script>
