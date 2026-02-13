<script setup lang="ts">
import { authClient, signOut } from '~/lib/auth-client'

// SSR-safe session fetch
const { data: session } = await authClient.useSession(useFetch)

const mobileMenuOpen = ref(false)

function closeMenu() {
  mobileMenuOpen.value = false
}

async function handleSignOut() {
  await signOut()
  // Force full page reload to clear session cookie state
  window.location.href = '/'
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-white shadow border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo / Brand -->
        <NuxtLink to="/" class="flex items-center gap-2 shrink-0">
          <span class="text-xl font-semibold tracking-tight text-orange-600">Recipe Remix</span>
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink
            to="/"
            class="min-h-[44px] px-3 py-2 flex items-center text-gray-600 hover:text-orange-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Home
          </NuxtLink>
          <NuxtLink
            to="/pantry"
            class="min-h-[44px] px-3 py-2 flex items-center text-gray-600 hover:text-orange-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            My Pantry
          </NuxtLink>
          <NuxtLink
            to="/generate"
            class="min-h-[44px] px-3 py-2 flex items-center text-gray-600 hover:text-orange-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Generate
          </NuxtLink>
          <NuxtLink
            to="/favorites"
            class="min-h-[44px] px-3 py-2 flex items-center text-gray-600 hover:text-orange-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Favorites
          </NuxtLink>
          <NuxtLink
            to="/history"
            class="min-h-[44px] px-3 py-2 flex items-center text-gray-600 hover:text-orange-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            History
          </NuxtLink>
        </nav>

        <!-- Desktop auth (hidden on mobile; auth lives in drawer) -->
        <div class="hidden md:flex items-center gap-2">
          <template v-if="session?.user">
            <span class="text-sm text-gray-600">
              {{ session.user.isAnonymous ? 'Guest' : session.user.name || session.user.email }}
            </span>
            <button
              v-if="session.user.isAnonymous"
              type="button"
              @click="navigateTo('/register')"
              class="min-h-[44px] px-4 py-2 text-sm text-orange-600 hover:text-orange-700 font-medium rounded-md hover:bg-orange-50 transition-colors"
            >
              Create Account
            </button>
            <button
              type="button"
              @click="handleSignOut"
              class="min-h-[44px] px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
            >
              Sign Out
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="min-h-[44px] flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
            >
              Sign In
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="min-h-[44px] flex items-center text-sm bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
            >
              Sign Up
            </NuxtLink>
          </template>
        </div>

        <!-- Mobile: hamburger only (far right) -->
        <button
          type="button"
          class="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile: overlay (backdrop) -->
    <Transition name="overlay">
      <button
        v-if="mobileMenuOpen"
        type="button"
        class="md:hidden fixed inset-0 bg-black/30 z-40 cursor-default"
        aria-label="Close menu"
        tabindex="-1"
        @click="closeMenu"
      />
    </Transition>

    <!-- Mobile: right-aligned drawer -->
    <Transition name="drawer">
      <aside
        v-if="mobileMenuOpen"
        class="md:hidden fixed top-0 right-0 h-full w-[min(280px,85vw)] bg-white shadow-xl z-50 flex flex-col"
        aria-label="Main menu"
      >
        <div class="flex flex-col flex-1 overflow-y-auto pt-6 pb-4">
          <nav class="px-4">
            <NuxtLink
              to="/"
              class="flex items-center min-h-[44px] px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeMenu"
            >
              Home
            </NuxtLink>
            <NuxtLink
              to="/pantry"
              class="flex items-center min-h-[44px] px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeMenu"
            >
              My Pantry
            </NuxtLink>
            <NuxtLink
              to="/generate"
              class="flex items-center min-h-[44px] px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeMenu"
            >
              Generate
            </NuxtLink>
            <NuxtLink
              to="/favorites"
              class="flex items-center min-h-[44px] px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeMenu"
            >
              Favorites
            </NuxtLink>
            <NuxtLink
              to="/history"
              class="flex items-center min-h-[44px] px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeMenu"
            >
              History
            </NuxtLink>
          </nav>

          <!-- Divider and auth section -->
          <div class="mt-4 pt-4 border-t border-gray-200 px-4">
            <p class="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Account
            </p>
            <template v-if="session?.user">
              <p class="px-3 py-2 text-sm text-gray-600">
                {{ session.user.isAnonymous ? 'Guest' : session.user.name || session.user.email }}
              </p>
              <button
                v-if="session.user.isAnonymous"
                type="button"
                class="flex w-full items-center min-h-[44px] px-3 py-3 text-left text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                @click="closeMenu(); navigateTo('/register')"
              >
                Create Account
              </button>
              <button
                type="button"
                class="flex w-full items-center min-h-[44px] px-3 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                @click="handleSignOut"
              >
                Sign Out
              </button>
            </template>
            <template v-else>
              <NuxtLink
                to="/login"
                class="flex items-center min-h-[44px] px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                @click="closeMenu"
              >
                Sign In
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="flex items-center min-h-[44px] px-3 py-3 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-medium"
                @click="closeMenu"
              >
                Sign Up
              </NuxtLink>
            </template>
          </div>
        </div>
      </aside>
    </Transition>
  </header>
</template>

<style scoped>
/* Drawer slide-in from right */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.2s ease-out;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

/* Overlay fade */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease-out;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active,
  .drawer-leave-active,
  .overlay-enter-active,
  .overlay-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
