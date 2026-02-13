<script setup lang="ts">
import { authClient, signOut } from '~/lib/auth-client'

// SSR-safe session fetch
const { data: session, refresh } = await authClient.useSession(useFetch)

const mobileMenuOpen = ref(false)

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
          <NuxtLink to="/" class="min-h-[44px] flex items-center text-gray-600 hover:text-gray-900">
            Home
          </NuxtLink>
          <NuxtLink to="/pantry" class="min-h-[44px] flex items-center text-gray-600 hover:text-gray-900">
            My Pantry
          </NuxtLink>
          <NuxtLink to="/generate" class="min-h-[44px] flex items-center text-gray-600 hover:text-gray-900">
            Generate
          </NuxtLink>
          <NuxtLink to="/favorites" class="min-h-[44px] flex items-center text-gray-600 hover:text-gray-900">
            Favorites
          </NuxtLink>
          <NuxtLink to="/history" class="min-h-[44px] flex items-center text-gray-600 hover:text-gray-900">
            History
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-4">
          <!-- Mobile hamburger button -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
            :aria-expanded="mobileMenuOpen"
          >
            <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Auth section -->
          <template v-if="session?.user">
            <span class="hidden sm:inline text-sm text-gray-600">
              {{ session.user.isAnonymous ? 'Guest' : session.user.name || session.user.email }}
            </span>
            <button
              v-if="session.user.isAnonymous"
              @click="navigateTo('/register')"
              class="min-h-[44px] px-4 py-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Create Account
            </button>
            <button
              @click="handleSignOut"
              class="min-h-[44px] px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="min-h-[44px] flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Sign In
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="min-h-[44px] flex items-center text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              Sign Up
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation Menu -->
    <nav v-if="mobileMenuOpen" class="md:hidden border-t border-gray-200 py-2">
      <NuxtLink to="/" class="block px-4 py-3 min-h-[44px] text-gray-700 hover:bg-gray-50 transition-colors" @click="mobileMenuOpen = false">Home</NuxtLink>
      <NuxtLink to="/pantry" class="block px-4 py-3 min-h-[44px] text-gray-700 hover:bg-gray-50 transition-colors" @click="mobileMenuOpen = false">My Pantry</NuxtLink>
      <NuxtLink to="/generate" class="block px-4 py-3 min-h-[44px] text-gray-700 hover:bg-gray-50 transition-colors" @click="mobileMenuOpen = false">Generate</NuxtLink>
      <NuxtLink to="/favorites" class="block px-4 py-3 min-h-[44px] text-gray-700 hover:bg-gray-50 transition-colors" @click="mobileMenuOpen = false">Favorites</NuxtLink>
      <NuxtLink to="/history" class="block px-4 py-3 min-h-[44px] text-gray-700 hover:bg-gray-50 transition-colors" @click="mobileMenuOpen = false">History</NuxtLink>
    </nav>
  </header>
</template>
