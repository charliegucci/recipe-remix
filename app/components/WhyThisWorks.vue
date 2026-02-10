<script setup lang="ts">
defineProps<{
  explanation: string
}>()
</script>

<template>
  <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
    <div class="flex items-start gap-3">
      <svg class="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <div>
        <h4 class="text-sm font-semibold text-indigo-900 mb-1">Why This Fusion Works</h4>
        <p class="text-sm text-indigo-800 leading-relaxed">{{ explanation }}</p>
      </div>
    </div>
  </div>
</template>
