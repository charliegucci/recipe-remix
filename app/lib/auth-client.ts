import { createAuthClient } from 'better-auth/vue'
import { anonymousClient } from 'better-auth/client/plugins'

/**
 * Better Auth client for Vue/Nuxt.
 * Use with useFetch for SSR compatibility.
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
  baseURL: '/api/auth',
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
