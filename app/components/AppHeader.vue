<script setup lang="ts">
import { authClient, signOut } from '~/lib/auth-client'

// SSR-safe session fetch
const { data: session, refresh } = await authClient.useSession(useFetch)

async function handleSignOut() {
  await signOut()
  // Force full page reload to clear session cookie state
  window.location.href = '/'
}
</script>

<template>
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo / Brand -->
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="text-xl font-bold text-orange-600">Recipe Remix</span>
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink to="/" class="text-gray-600 hover:text-gray-900">
            Home
          </NuxtLink>
          <!-- More nav items added in later phases -->
        </nav>

        <!-- Auth section -->
        <div class="flex items-center gap-4">
          <template v-if="session?.user">
            <span class="hidden sm:inline text-sm text-gray-600">
              {{ session.user.isAnonymous ? 'Guest' : session.user.name || session.user.email }}
            </span>
            <button
              v-if="session.user.isAnonymous"
              @click="navigateTo('/register')"
              class="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Create Account
            </button>
            <button
              @click="handleSignOut"
              class="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign In
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              Sign Up
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
