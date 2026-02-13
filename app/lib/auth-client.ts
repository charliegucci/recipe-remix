import { createAuthClient } from 'better-auth/vue'
import { anonymousClient } from 'better-auth/client/plugins'

/**
 * Better Auth client for Vue/Nuxt.
 *
 * In the browser we use the current origin so login/register work on any port (e.g. 3001).
 * For SSR (e.g. useSession) we use NUXT_PUBLIC_AUTH_URL or localhost:3000.
 *
 * Usage in components:
 *   const { data: session } = await authClient.useSession(useFetch)
 *
 * Usage for actions:
 *   await signIn.email({ email, password })
 *   await signUp.email({ email, password, name })
 *   await signIn.anonymous()
 *   await signOut()
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/api/auth`
      : (process.env.NUXT_PUBLIC_AUTH_URL || 'http://localhost:3000/api/auth'),
  plugins: [
    anonymousClient()
  ]
})

// Destructure for convenient imports
export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession
} = authClient

// Type exports for components
export type Session = Awaited<ReturnType<typeof getSession>>
