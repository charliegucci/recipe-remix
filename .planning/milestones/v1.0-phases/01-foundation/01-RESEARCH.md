# Phase 1: Foundation - Research

**Researched:** 2026-02-05
**Domain:** Authentication, Database Setup, Responsive Design, Cloudflare Platform
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational infrastructure for Recipe Remix: authentication with optional anonymous access, database layer (D1), image storage (R2), and mobile-responsive design. The research validates that the pre-selected stack (Nuxt 4 + Cloudflare Pages + Better Auth + Drizzle ORM + Tailwind CSS) is well-suited for these requirements.

The key technical challenges are:
1. **Request-scoped bindings** - Cloudflare D1/KV/R2 bindings are only available within request context, requiring careful initialization patterns
2. **Anonymous-to-authenticated flow** - Better Auth's anonymous plugin handles guest users who later create accounts, with data linking
3. **SSR session handling** - Session state must work both server-side and client-side in Nuxt's hybrid rendering model

**Primary recommendation:** Use Better Auth with the anonymous plugin for authentication, Drizzle ORM with D1 for data persistence, and implement mobile-first responsive design with Tailwind CSS breakpoints.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.4.x | Authentication framework | Native D1 support via Drizzle adapter, anonymous plugin for guest users, Vue/Nuxt client |
| drizzle-orm | latest | Type-safe ORM | First-class D1 support, SQLite dialect, migrations via drizzle-kit |
| @nuxthub/core | latest | Cloudflare bindings | Auto-detects D1/KV/R2 bindings, simplifies local development |
| tailwindcss | 4.x | CSS framework | Mobile-first breakpoints, utility classes, excellent Nuxt integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | latest | Schema migrations | Generate and run D1 migrations |
| @better-auth/cli | latest | Auth schema generation | Generate Better Auth tables for Drizzle |
| nitro-cloudflare-dev | bundled | Local dev bindings | Included with C3 scaffolding, auto-detects wrangler config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Auth.js (NextAuth) | Auth.js has D1 adapter but is Next.js-centric; Better Auth has native Vue client |
| Better Auth | nuxt-auth-utils | Simpler but lacks anonymous user flow and social OAuth out of box |
| Drizzle ORM | Kysely | Both work with D1; Drizzle has better DX for migrations and type inference |

**Installation:**
```bash
npm install better-auth drizzle-orm @nuxthub/core
npm install -D drizzle-kit @better-auth/cli @cloudflare/workers-types
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── api/
│   └── auth/
│       └── [...all].ts     # Better Auth handler
├── db/
│   ├── schema.ts           # Drizzle schema (users, sessions, etc.)
│   ├── auth.schema.ts      # Generated Better Auth tables
│   └── migrations/         # Drizzle migration files
├── utils/
│   └── drizzle.ts          # Database connection helper
└── middleware/
    └── auth.ts             # Optional server middleware
lib/
├── auth.ts                 # Better Auth server config
└── auth-client.ts          # Better Auth Vue client
```

### Pattern 1: Request-Scoped D1 Access
**What:** D1 bindings are only available inside request handlers. Initialize Drizzle per-request.
**When to use:** Every server route that needs database access.
**Example:**
```typescript
// server/utils/drizzle.ts
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'

export function useDrizzle(event: H3Event) {
  const db = event.context.cloudflare.env.DB
  return drizzle(db, { schema })
}

// server/api/user/me.get.ts
export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session) return { user: null }

  return db.select().from(users).where(eq(users.id, session.user.id))
})
```

### Pattern 2: Better Auth Handler with Cloudflare Context
**What:** Pass Cloudflare bindings to Better Auth at request time.
**When to use:** The main auth API route handler.
**Example:**
```typescript
// server/api/auth/[...all].ts
import { auth } from '~/lib/auth'

export default defineEventHandler(async (event) => {
  return auth.handler(toWebRequest(event))
})

// lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '~/server/db/schema'

// Note: For Cloudflare, the DB binding must be passed dynamically
// This pattern uses NuxtHub's hubDatabase() helper
export const auth = betterAuth({
  database: drizzleAdapter(hubDatabase(), {
    provider: 'sqlite',
    schema
  }),
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        // Transfer anonymous user data (e.g., pantry items) to new account
        // This runs when a guest user signs up
      }
    })
  ]
})
```

### Pattern 3: SSR-Safe Session Hook
**What:** Use `useFetch` for server-side session retrieval in Nuxt.
**When to use:** Any page/component that needs session data during SSR.
**Example:**
```vue
<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

// Pass useFetch for SSR compatibility
const { data: session } = await authClient.useSession(useFetch)
</script>

<template>
  <div v-if="session">
    Welcome, {{ session.user.name }}
  </div>
  <div v-else>
    <NuxtLink to="/login">Sign in</NuxtLink>
    <span>or continue as guest</span>
  </div>
</template>
```

### Pattern 4: Mobile-First Responsive Layout
**What:** Start with mobile styles, layer larger breakpoints.
**When to use:** All UI components.
**Example:**
```html
<!-- Recipe card: stacked on mobile, side-by-side on md+ -->
<div class="flex flex-col md:flex-row gap-4">
  <img
    class="w-full h-48 object-cover md:w-48 md:h-full rounded-lg"
    src="/recipe.jpg"
    alt="Recipe"
  />
  <div class="flex-1 p-4">
    <h2 class="text-lg font-semibold md:text-xl">Recipe Title</h2>
    <p class="text-sm text-gray-600 md:text-base">Description...</p>
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Top-level DB initialization:** Do NOT initialize Drizzle at module scope; bindings won't be available
- **Using `sm:` for mobile styles:** Unprefixed utilities are for mobile; `sm:` targets 640px+
- **Skipping SSR session fetch:** Using `authClient.useSession()` without `useFetch` breaks SSR
- **Storing sessions only in D1:** Add KV caching for session reads at scale (Phase 6 optimization)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt wrapper | Better Auth built-in | Handles salt, timing attacks, secure comparison |
| Session management | Cookie + localStorage | Better Auth sessions | Secure cookies, CSRF protection, expiry handling |
| Anonymous users | Guest ID in localStorage | Better Auth anonymous plugin | Proper session, account linking, data transfer |
| JWT verification | Manual jose/jsonwebtoken | Better Auth API | Signature verification, expiry, refresh handled |
| Responsive breakpoints | Custom media queries | Tailwind breakpoints | Consistent, mobile-first, well-tested |
| D1 migrations | Raw SQL files | Drizzle Kit | Type-safe, diff-based, rollback support |

**Key insight:** Authentication is a security-critical domain where subtle bugs (timing attacks, session fixation, CSRF) are easy to introduce. Better Auth handles these correctly; custom implementations rarely do.

## Common Pitfalls

### Pitfall 1: Session Cookie Not Available After Login
**What goes wrong:** After `signIn()`, navigating with client-side routing shows user as logged out until page refresh.
**Why it happens:** The session cookie is set on the response but not immediately available to server middleware during client-side navigation.
**How to avoid:** Force a full page reload after login: `window.location.href = '/dashboard'` instead of `navigateTo('/dashboard')`.
**Warning signs:** User appears logged out in header but logged in on dashboard after refresh.

### Pitfall 2: D1 Binding Undefined in Auth Config
**What goes wrong:** `TypeError: Cannot read properties of undefined (reading 'prepare')` when auth runs.
**Why it happens:** Better Auth config is evaluated at module load time, before request bindings exist.
**How to avoid:** Use NuxtHub's `hubDatabase()` helper or lazy-initialize the database adapter.
**Warning signs:** Works in local dev (mocked bindings) but fails on Cloudflare deployment.

### Pitfall 3: Anonymous User Data Lost on Account Link
**What goes wrong:** Guest user's pantry/favorites disappear when they create an account.
**Why it happens:** Anonymous plugin deletes the anonymous user after linking by default.
**How to avoid:** Implement `onLinkAccount` callback to transfer data before the anonymous record is deleted.
**Warning signs:** Users complain about losing saved items when signing up.

### Pitfall 4: Mobile Layout Breaks with Horizontal Scroll
**What goes wrong:** Recipe cards or forms cause horizontal overflow on mobile.
**Why it happens:** Fixed widths, uncontrolled images, or flex items that don't shrink.
**How to avoid:** Always use `max-w-full`, `overflow-hidden`, and `flex-shrink` appropriately. Test at 320px viewport.
**Warning signs:** Horizontal scrollbar appears; content extends beyond viewport.

### Pitfall 5: Drizzle Migrations Not Running on Deploy
**What goes wrong:** Tables don't exist in production D1 despite working locally.
**Why it happens:** Migrations must be explicitly run against remote D1; they don't auto-apply on deploy.
**How to avoid:** Add migration step to deploy script: `wrangler d1 migrations apply DB_NAME --remote`.
**Warning signs:** "no such table" errors only in production.

## Code Examples

Verified patterns from official sources:

### Complete Auth Server Setup
```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'

export const auth = betterAuth({
  database: drizzleAdapter(hubDatabase(), {
    provider: 'sqlite',
    usePlural: true  // tables: users, sessions, accounts
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24       // Update session every 24h
  },

  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        const db = hubDatabase()
        // Transfer pantry items from anonymous to new user
        await db.update(pantryItems)
          .set({ userId: newUser.id })
          .where(eq(pantryItems.userId, anonymousUser.id))
      }
    })
  ]
})
```

### Complete Auth Client Setup
```typescript
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/vue'
import { anonymousClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: '/api/auth',
  plugins: [anonymousClient()]
})

export const {
  signIn,
  signOut,
  signUp,
  useSession
} = authClient
```

### Auth API Route Handler
```typescript
// server/api/auth/[...all].ts
import { auth } from '~/lib/auth'

export default defineEventHandler(async (event) => {
  return auth.handler(toWebRequest(event))
})
```

### Protected API Route
```typescript
// server/api/user/favorites.get.ts
import { auth } from '~/lib/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  const db = useDrizzle(event)
  return db.select()
    .from(favorites)
    .where(eq(favorites.userId, session.user.id))
})
```

### Guest-Friendly Page Component
```vue
<!-- pages/index.vue -->
<script setup lang="ts">
import { authClient } from '~/lib/auth-client'

const { data: session } = await authClient.useSession(useFetch)

async function continueAsGuest() {
  await authClient.signIn.anonymous()
  navigateTo('/pantry')
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4">
    <h1 class="text-2xl font-bold mb-8 md:text-4xl">Recipe Remix</h1>

    <div v-if="session?.user" class="text-center">
      <p class="mb-4">Welcome back, {{ session.user.name || 'Chef' }}!</p>
      <NuxtLink to="/pantry" class="btn-primary">Go to Pantry</NuxtLink>
    </div>

    <div v-else class="flex flex-col gap-4 w-full max-w-sm">
      <NuxtLink to="/login" class="btn-primary text-center">
        Sign In
      </NuxtLink>
      <NuxtLink to="/register" class="btn-secondary text-center">
        Create Account
      </NuxtLink>
      <button @click="continueAsGuest" class="btn-outline">
        Continue as Guest
      </button>
      <p class="text-sm text-gray-500 text-center">
        Guest accounts can be upgraded later without losing data.
      </p>
    </div>
  </div>
</template>
```

### Drizzle Schema for Auth Tables
```typescript
// server/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }),
  image: text('image'),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
})

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
})

// Application-specific tables (for later phases)
export const pantryItems = sqliteTable('pantry_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  ingredientId: integer('ingredient_id').notNull(),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull()
})
```

### Wrangler Configuration
```jsonc
// wrangler.jsonc
{
  "name": "recipe-remix",
  "compatibility_date": "2025-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "recipe-remix-db",
      "database_id": "<your-database-id>"
    }
  ],
  "r2_buckets": [
    {
      "binding": "IMAGES",
      "bucket_name": "recipe-remix-images"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "<your-kv-id>"
    }
  ]
}
```

### Responsive Tailwind Config
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue'
  ],
  theme: {
    extend: {
      // Default breakpoints are mobile-first:
      // sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
    }
  }
} satisfies Config
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lucia Auth | Better Auth | Early 2025 | Lucia deprecated; Better Auth is the maintained successor |
| NuxtHub Admin deployment | Cloudflare Pages Git | Dec 2025 | NuxtHub Admin sunset; use standard CI/CD |
| Tailwind v3 config files | Tailwind v4 CSS-based config | 2025 | Config now in CSS with `@theme` |
| Manual D1 SQL migrations | Drizzle Kit generate | 2024 | Type-safe, diff-based migrations standard |

**Deprecated/outdated:**
- **Lucia Auth:** Deprecated early 2025, no v4 planned. Do not use.
- **@sidebase/nuxt-auth:** Known issues with Cloudflare Pages; use Better Auth instead.
- **NuxtHub Admin dashboard:** Sunset December 31, 2025. Deploy via Cloudflare Pages.

## Open Questions

Things that couldn't be fully resolved:

1. **Email delivery for password reset**
   - What we know: Better Auth supports `sendResetPassword` callback
   - What's unclear: Which email service to use with Cloudflare (Resend, Mailchannels, etc.)
   - Recommendation: Defer email delivery to Phase 3; log reset URLs to console for Phase 1

2. **Session storage optimization**
   - What we know: Sessions in D1 work but add latency per request
   - What's unclear: Best pattern for KV session caching with Better Auth
   - Recommendation: Start with D1-only; add KV caching in Phase 6 if needed

3. **R2 public bucket vs Worker route**
   - What we know: Both approaches work for serving images
   - What's unclear: Which provides better caching and cost profile
   - Recommendation: Start with public bucket (simpler); evaluate Worker route if custom headers needed

## Sources

### Primary (HIGH confidence)
- [Better Auth Nuxt Integration](https://www.better-auth.com/docs/integrations/nuxt) - Official integration guide
- [Better Auth Anonymous Plugin](https://www.better-auth.com/docs/plugins/anonymous) - Guest user documentation
- [Cloudflare D1 Getting Started](https://developers.cloudflare.com/d1/get-started/) - Official D1 setup
- [Cloudflare Pages Nuxt Guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nuxt-site/) - Official deployment docs
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design) - Official breakpoint docs

### Secondary (MEDIUM confidence)
- [better-auth-cloudflare GitHub](https://github.com/zpg6/better-auth-cloudflare) - Community patterns for D1 integration
- [NuxtHub Drizzle Recipe](https://hub.nuxt.com/docs/recipes/drizzle) - NuxtHub-specific Drizzle setup
- [nuxthub-better-auth demo](https://github.com/atinux/nuxthub-better-auth) - Reference implementation

### Tertiary (LOW confidence)
- Community blog posts and tutorials (verify against official docs before using)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are GA, well-documented, and validated against official sources
- Architecture: HIGH - Patterns derived from official documentation and maintained examples
- Pitfalls: HIGH - Based on documented issues, official FAQs, and project research docs

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable, mature stack)
