import { createAuthClient } from 'better-auth/vue'
import { anonymousClient } from 'better-auth/client/plugins'

/**
 * Better Auth client for Vue/Nuxt.
 *
 * IMPORTANT: This client uses an absolute URL for SSR compatibility.
 * The base URL is determined at runtime based on environment.
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
  // Use absolute URL - required for SSR where relative URLs have no origin
  // In production, set NUXT_PUBLIC_AUTH_URL environment variable
  baseURL: process.env.NUXT_PUBLIC_AUTH_URL || 'http://localhost:3000/api/auth',
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
