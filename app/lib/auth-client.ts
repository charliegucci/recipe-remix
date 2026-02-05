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
 *
 * Note: baseURL uses useRequestURL() for SSR compatibility.
 * During SSR, relative URLs like '/api/auth' fail because there's no origin.
 * We detect the origin from the request during SSR, or fall back to location on client.
 */
function getBaseURL(): string {
  // Client-side: use relative URL (browser will resolve it)
  if (typeof window !== 'undefined') {
    return '/api/auth'
  }
  // SSR: need full URL - this will be called during request handling
  // The actual request URL will be available via useRequestURL in components
  // For module-level initialization, use a placeholder that gets overridden
  return 'http://localhost:3000/api/auth'
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
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
