import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'

// Singleton auth instance - created lazily on first request
let _auth: ReturnType<typeof betterAuth> | null = null

/**
 * Get the Better Auth instance.
 * IMPORTANT: Must be called within a request handler context
 * because hubDatabase() requires Cloudflare bindings to be available.
 */
export function getAuth() {
  if (!_auth) {
    _auth = betterAuth({
      // Use NuxtHub's hubDatabase() for D1 access
      database: drizzleAdapter(drizzle(hubDatabase(), { schema }), {
        provider: 'sqlite',
        usePlural: true // tables: users, sessions, accounts
      }),

      // Email/password authentication (USER-01, USER-02)
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        // Password reset emails deferred to Phase 3
        // For now, log reset URLs to console
        sendResetPassword: async ({ user, url }) => {
          console.log(`[DEV] Password reset for ${user.email}: ${url}`)
        }
      },

      // Session configuration for login persistence (USER-02)
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24,      // Refresh session every 24h
        cookieCache: {
          enabled: true,
          maxAge: 60 * 5 // 5 minute cookie cache
        }
      },

      // Anonymous users for guest access (USER-03)
      plugins: [
        anonymous({
          onLinkAccount: async ({ anonymousUser, newUser }) => {
            // When a guest creates an account, transfer their data
            // Note: Client-side migration handles the actual data transfer
            // The client detects anonymous -> authenticated transition and calls
            // /api/user/migrate-guest-data with localStorage data
            const fromId = (anonymousUser as { user?: { id: string }; id?: string }).id ?? (anonymousUser as { user?: { id: string } }).user?.id ?? 'unknown'
            const toId = (newUser as { user?: { id: string }; id?: string }).id ?? (newUser as { user?: { id: string } }).user?.id ?? 'unknown'
            console.log(`Linking anonymous user ${fromId} to ${toId}`)
          }
        })
      ],

      // Base URL for callbacks
      baseURL: process.env.BETTER_AUTH_URL || 'https://remix-recipe.com',

      // Trusted origins for CORS and cookie operations
      trustedOrigins: [
        'https://remix-recipe.com',
        'https://recipe-remix-9fd.pages.dev',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ],

      // Secret for signing tokens (required for login/register)
      secret: (() => {
        const secret = process.env.BETTER_AUTH_SECRET
        if (secret) return secret
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Better Auth] BETTER_AUTH_SECRET is not set; using dev-only fallback. Set it in .env for production (e.g. openssl rand -base64 32).')
          return 'dev-secret-key-for-local-only-min-32-characters-long'
        }
        throw new Error('BETTER_AUTH_SECRET is required in production. Set it in your environment (e.g. openssl rand -base64 32).')
      })()
    })
  }
  return _auth
}

// Export auth type for client
export type Auth = ReturnType<typeof getAuth>
