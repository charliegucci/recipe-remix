<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

interface LatencyStats {
  count: number
  p50: number
  p95: number
  p99: number
  avg: number
  thresholdMs: number
  p99Breached: boolean
  byQuery: Array<{
    queryName: string
    count: number
    p50: number
    p95: number
    p99: number
    avg: number
  }>
}

interface GenerationStats {
  total: number
  successful: number
  failed: number
  successRate: number
}

interface ObservabilityData {
  latency: LatencyStats
  generation: {
    last24h: GenerationStats
    last7d: GenerationStats
  }
  aiRequests: {
    last7d: number
  }
  updatedAt: string
}

const { data, pending, error, refresh } = await useFetch<ObservabilityData>('/api/analytics/observability')

const formatMs = (ms: number) => `${ms}ms`
const formatRate = (rate: number) => `${rate}%`
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-gray-900">System Observability</h1>
      <button
        @click="refresh()"
        :disabled="pending"
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        {{ pending ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">Failed to load observability data. {{ error.message }}</p>
    </div>

    <div v-if="pending && !data" class="text-center py-12 text-gray-500">
      Loading observability data...
    </div>

    <template v-if="data">
      <!-- p99 Alert Banner -->
      <div
        v-if="data.latency.p99Breached"
        class="bg-red-50 border border-red-300 rounded-lg p-4 mb-6 flex items-center gap-3"
      >
        <svg class="w-6 h-6 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p class="font-semibold text-red-800">p99 Latency Threshold Breached</p>
          <p class="text-sm text-red-700">
            p99 latency is {{ formatMs(data.latency.p99) }} (threshold: {{ formatMs(data.latency.thresholdMs) }})
          </p>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <p class="text-sm text-gray-500 mb-1">p99 Latency</p>
          <p class="text-2xl font-bold" :class="data.latency.p99Breached ? 'text-red-600' : 'text-gray-900'">
            {{ formatMs(data.latency.p99) }}
          </p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <p class="text-sm text-gray-500 mb-1">24h Success Rate</p>
          <p class="text-2xl font-bold" :class="data.generation.last24h.successRate < 90 ? 'text-yellow-600' : 'text-green-600'">
            {{ formatRate(data.generation.last24h.successRate) }}
          </p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <p class="text-sm text-gray-500 mb-1">7d Generations</p>
          <p class="text-2xl font-bold text-gray-900">{{ data.generation.last7d.total }}</p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <p class="text-sm text-gray-500 mb-1">7d AI Requests</p>
          <p class="text-2xl font-bold text-gray-900">{{ data.aiRequests.last7d }}</p>
        </div>
      </div>

      <!-- Latency Percentiles -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">D1 Query Latency (Last 7 Days)</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div>
            <p class="text-sm text-gray-500">Queries</p>
            <p class="text-xl font-semibold">{{ data.latency.count }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Average</p>
            <p class="text-xl font-semibold">{{ formatMs(data.latency.avg) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">p50</p>
            <p class="text-xl font-semibold">{{ formatMs(data.latency.p50) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">p95</p>
            <p class="text-xl font-semibold">{{ formatMs(data.latency.p95) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">p99</p>
            <p class="text-xl font-semibold" :class="data.latency.p99Breached ? 'text-red-600' : ''">
              {{ formatMs(data.latency.p99) }}
            </p>
          </div>
        </div>

        <!-- Latency Bar Chart -->
        <div v-if="data.latency.byQuery.length > 0" class="space-y-3">
          <h3 class="text-sm font-medium text-gray-700">By Query</h3>
          <div v-for="query in data.latency.byQuery" :key="query.queryName" class="flex items-center gap-3">
            <span class="text-sm text-gray-600 w-48 truncate" :title="query.queryName">{{ query.queryName }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="query.p99 > data.latency.thresholdMs ? 'bg-red-500' : 'bg-blue-500'"
                :style="{ width: `${Math.min((query.p99 / Math.max(data.latency.thresholdMs * 2, 1)) * 100, 100)}%` }"
              />
            </div>
            <span class="text-sm text-gray-500 w-20 text-right">p99: {{ formatMs(query.p99) }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No query performance data yet. Generate a recipe to start collecting metrics.</p>
      </div>

      <!-- Generation Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Last 24 Hours -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Generation (Last 24h)</h2>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Total Attempts</span>
              <span class="font-medium">{{ data.generation.last24h.total }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Successful</span>
              <span class="font-medium text-green-600">{{ data.generation.last24h.successful }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Failed</span>
              <span class="font-medium text-red-600">{{ data.generation.last24h.failed }}</span>
            </div>
            <div class="flex justify-between border-t pt-2">
              <span class="text-gray-600 font-medium">Success Rate</span>
              <span class="font-bold" :class="data.generation.last24h.successRate < 90 ? 'text-yellow-600' : 'text-green-600'">
                {{ formatRate(data.generation.last24h.successRate) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Last 7 Days -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Generation (Last 7 Days)</h2>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Total Attempts</span>
              <span class="font-medium">{{ data.generation.last7d.total }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Successful</span>
              <span class="font-medium text-green-600">{{ data.generation.last7d.successful }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Failed</span>
              <span class="font-medium text-red-600">{{ data.generation.last7d.failed }}</span>
            </div>
            <div class="flex justify-between border-t pt-2">
              <span class="text-gray-600 font-medium">Success Rate</span>
              <span class="font-bold" :class="data.generation.last7d.successRate < 90 ? 'text-yellow-600' : 'text-green-600'">
                {{ formatRate(data.generation.last7d.successRate) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-xs text-gray-400 text-right">
        Last updated: {{ new Date(data.updatedAt).toLocaleString() }}
      </p>
    </template>
  </div>
</template>
