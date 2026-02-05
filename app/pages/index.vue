<script setup lang="ts">
import { authClient, signIn } from '~/lib/auth-client'

const { data: session } = await authClient.useSession(useFetch)
const loading = ref(false)

async function continueAsGuest() {
  loading.value = true
  try {
    await signIn.anonymous()
    // Full page reload to ensure session is set
    window.location.href = '/'
  } catch (e) {
    console.error('Failed to create guest session:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="text-center max-w-lg">
      <h1 class="text-3xl font-bold mb-4 md:text-4xl lg:text-5xl">
        Recipe Remix
      </h1>
      <p class="text-gray-600 mb-8 text-lg">
        AI-powered fusion cuisine from your pantry ingredients
      </p>

      <!-- Authenticated user -->
      <div v-if="session?.user && !session.user.isAnonymous" class="space-y-4">
        <p class="text-gray-700">
          Welcome back, {{ session.user.name || session.user.email }}!
        </p>
        <p class="text-sm text-gray-500">
          Ready to create some delicious recipes?
        </p>
        <!-- Pantry button added in Phase 3 -->
      </div>

      <!-- Guest user -->
      <div v-else-if="session?.user?.isAnonymous" class="space-y-4">
        <p class="text-gray-700">
          You're browsing as a guest.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <NuxtLink
            to="/register"
            class="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            Create Account
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
          >
            Sign In
          </NuxtLink>
        </div>
        <p class="text-xs text-gray-500 mt-4">
          Creating an account saves your recipes and preferences.
        </p>
      </div>

      <!-- Not logged in -->
      <div v-else class="space-y-4">
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <NuxtLink
            to="/register"
            class="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            Get Started
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
          >
            Sign In
          </NuxtLink>
        </div>

        <div class="mt-6">
          <button
            @click="continueAsGuest"
            :disabled="loading"
            class="text-gray-600 hover:text-gray-900 text-sm underline"
          >
            {{ loading ? 'Setting up...' : 'Continue as Guest' }}
          </button>
          <p class="text-xs text-gray-500 mt-2">
            No account required. You can upgrade later without losing data.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
