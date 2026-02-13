<script setup lang="ts">
import { signIn } from '~/lib/auth-client'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    const result = await signIn.email({
      email: email.value,
      password: password.value
    })

    if (result.error) {
      error.value = result.error.message || 'Login failed'
      return
    }

    // Force full page reload to ensure session cookie is available
    // (See RESEARCH.md Pitfall 1)
    window.location.href = '/'
  } catch (e: any) {
    error.value = e.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-8">Sign In</h1>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-orange-600 text-white py-3 px-4 min-h-[44px] rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-gray-600">
        Don't have an account?
        <NuxtLink to="/register" class="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center min-h-[44px]">
          Create one
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
