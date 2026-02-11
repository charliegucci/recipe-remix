# Stack Research — Recipe Remix Engine

> Research date: 2026-02-04
> Purpose: Validate the proposed Cloudflare-centric stack for an AI-powered recipe generation app.
> Verdict: The proposed stack is sound. Every component is production-ready or GA. One substitution is required in the auth layer (see Authentication section). No blockers found.

---

## Recommended Stack

| Layer | Technology | Version / Status | Confidence |
|---|---|---|---|
| Frontend framework | Nuxt 4 | 4.3 (stable, released July 2025) | HIGH |
| Hosting / edge | Cloudflare Pages + Workers | GA | HIGH |
| Backend API | Cloudflare Workers (TypeScript) | GA | HIGH |
| Async / AI pipeline | Cloudflare Workflows | GA (April 2025) | HIGH |
| AI inference routing | Cloudflare AI Gateway | GA | HIGH |
| Relational data | Cloudflare D1 (SQLite) | GA, 10 GB/db limit | HIGH |
| Cache / sessions | Cloudflare KV | GA | HIGH |
| Image / asset storage | Cloudflare R2 | GA | HIGH |
| Authentication | Better Auth + D1 | 0.2.x (actively maintained) | MEDIUM-HIGH |
| ORM / query layer | Drizzle ORM (with D1 dialect) | Current | HIGH |
| Ingredient autocomplete | OpenFoodFacts API or Spoonacular | External — validate in API research | MEDIUM |
| Recipe database source | Spoonacular or curated D1 seed | Validate in API research phase | MEDIUM |

---

## Nuxt 4 + Cloudflare

### Status: VALIDATED. Ship it.

Nuxt 4.0 released July 15, 2025. Current stable is 4.3. Cloudflare Pages deployment is zero-config via the Nitro cloudflare-pages preset. The `create-cloudflare` CLI (C3) scaffolds a Nuxt project with all adapters and Wrangler config pre-wired.

### What works
- Full SSR on Cloudflare Workers via Nitro. Pages are rendered at the edge.
- All Cloudflare bindings (D1, KV, R2, AI, Workflows) are accessible inside Nuxt server routes (`server/api/`) and server middleware. Nitro exposes them on `event.context.env`.
- NuxtHub (`@nuxthub/core`) provides a module that wires D1, KV, R2, and AI bindings for local development and production. Use it for the initial scaffolding, but note that NuxtHub Admin (the dashboard) is being sunset December 31, 2025 — deploy via standard Cloudflare Pages CI going forward.
- Nuxt 4 ships with separate TypeScript projects for app code, server code, and shared code. This maps cleanly onto the Cloudflare model where server routes run in Workers and client code runs in the browser.

### Gotchas
1. **Bindings are server-only.** D1, KV, R2, and AI are never available in client-side code. All data access goes through `server/api/` routes or server plugins.
2. **No persistent file system.** Workers are stateless. Any file the app needs across requests must live in R2 or D1.
3. **Cold starts.** Nuxt on Workers has sub-50ms cold starts in practice. Not a concern for this app.
4. **Nuxt 3 EOL is July 31, 2026.** If any dependency or tutorial references Nuxt 3 patterns, flag it for migration. Nuxt 4 is the only version to target.

### Key references
- Cloudflare Pages Nuxt guide: https://developers.cloudflare.com/pages/framework-guides/deploy-a-nuxt-site/
- Nuxt deploy-to-Cloudflare docs: https://nuxt.com/deploy/cloudflare
- Nuxt 4 announcement: https://nuxt.com/blog/v4

---

## Backend — Workers + Workflows

### Cloudflare Workers (TypeScript)

Workers are the compute layer for everything server-side: API routes, auth middleware, data access, and triggering Workflows. In a Nuxt 4 app on Pages, Nuxt server routes (`server/api/*.ts`) compile down to Workers functions automatically. No separate Worker deployment is needed for basic CRUD.

For long-running or AI-heavy work, a **dedicated Worker** is warranted. This is where Workflows come in.

### Cloudflare Workflows — the right tool for AI recipe generation

Workflows went GA in April 2025. They are durable, multi-step, automatically retried functions that persist state across steps. This is exactly the right primitive for AI recipe generation because:

1. LLM calls are slow (1-30 seconds) and can time out. A Workflow step retries automatically on failure.
2. Recipe generation is naturally multi-step: validate ingredients, call AI, post-process output, store result, optionally generate an image. Each step is independently retriable.
3. Workflows can run for hours. An AI call that takes 30 seconds will not hit the Workers CPU timeout.

#### Recommended Workflow for recipe generation

```typescript
export class RecipeGenerationWorkflow extends WorkflowEntrypoint {
  async run(event: WorkflowEvent, step: WorkflowStep) {

    // Step 1: Validate and normalize ingredients + dietary flags
    const normalized = await step.do('validate-ingredients', async () => {
      // Dedupe, normalize, check against known ingredient list
      return normalizeIngredients(event.params.ingredients, event.params.dietary);
    });

    // Step 2: Query D1 for existing recipes that match (the "database" half of hybrid)
    const existingMatches = await step.do('match-existing-recipes', async () => {
      return await queryRecipeDatabase(this.env.DB, normalized);
    });

    // Step 3: Call AI via AI Gateway for fusion recipe generation
    const aiRecipe = await step.do('generate-fusion-recipe', {
      retries: { limit: 3, backoff: { initial: 2000, multiplier: 2 } }
    }, async () => {
      return await callAIGateway(this.env.AI_GATEWAY, normalized, existingMatches);
    });

    // Step 4: Post-process and validate AI output (hallucination guard)
    const validated = await step.do('validate-ai-output', async () => {
      return validateRecipeOutput(aiRecipe, normalized);
    });

    // Step 5: Persist the generated recipe to D1
    const recipeId = await step.do('persist-recipe', async () => {
      return await saveRecipe(this.env.DB, validated);
    });

    return { recipeId, recipe: validated, existingMatches };
  }
}
```

#### Key Workflow rules to follow
- Every side effect (DB write, AI call, external HTTP) goes inside a `step.do()`. Code outside steps may re-execute on replay.
- Step names must be deterministic strings. Do not use timestamps or random values in step names.
- Steps are idempotent by convention. The `persist-recipe` step should upsert, not blindly insert.
- Use `NonRetryableError` for permanent failures (e.g., malformed input that will never succeed).

### AI Gateway — how to route LLM calls

AI Gateway is a mandatory layer in front of any LLM call. It provides:
- **Multi-provider routing:** Call OpenAI, Anthropic, Workers AI, or others through a single endpoint. If one provider is down, fall back automatically.
- **Response caching:** Identical prompts (e.g., "generate a recipe for chicken and rice, vegetarian") return cached responses, saving tokens and latency.
- **Observability:** Token usage, latency, and error rates per provider, all in the Cloudflare dashboard.
- **No per-request fee.** You pay the underlying provider's token rates.

For Recipe Remix, the recommended setup is:
- Primary model: An Anthropic or OpenAI model via AI Gateway (strongest at creative, structured text generation).
- Fallback: Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) for cost-sensitive or latency-sensitive paths.
- Cache TTL: Set aggressively for identical ingredient+dietary combinations. Recipe generation for the same inputs should not hit the LLM twice.

#### Key references
- AI Gateway overview: https://developers.cloudflare.com/ai-gateway/
- Anthropic via AI Gateway: https://developers.cloudflare.com/ai-gateway/usage/providers/anthropic/
- Workers AI models: https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/
- Workflow docs: https://developers.cloudflare.com/workflows/
- Workflow rules: https://developers.cloudflare.com/workflows/build/rules-of-workflows/
- Workflow GA changelog: https://developers.cloudflare.com/changelog/2025-04-07-workflows-ga/

---

## Data Layer — D1 + KV

### When to use D1

D1 is Cloudflare's serverless SQLite database. Use it for anything that requires structure, relationships, or queries:

- **Users table** — id, email, created_at, preferences (JSON column)
- **Pantry table** — user_id, ingredient_id, added_at
- **Ingredients table** — canonical ingredient list with normalized names, categories
- **Recipes table** — generated and seeded recipes with full structured data
- **Favorites / history / ratings** — all relational, all belong in D1
- **Dietary restriction profiles** — small lookup tables

D1 is now GA with a 10 GB per-database limit and read replication in public beta. For Recipe Remix, a single database is more than sufficient. Use the Sessions API (`env.DB.withSession()`) for read replication once traffic warrants it.

### When to use KV

KV is an eventually consistent, globally distributed key-value store. It is optimized for high-read, low-write workloads. Use it for:

- **Session tokens** — after auth, store the session ID -> session data mapping in KV with a TTL matching the session length. This is the standard pattern recommended by Cloudflare for auth sessions.
- **AI response cache** — cache the output of recipe generation keyed by a hash of (ingredients + dietary restrictions + cuisine preference). Set a TTL of hours or days. On a cache hit, skip the Workflow entirely.
- **Ingredient autocomplete suggestions** — cache the top autocomplete results for common prefixes. Refreshed periodically by a background job.
- **App configuration / feature flags** — anything that is read frequently but written rarely.

### The D1 + KV composition pattern

This is not an either/or choice. The standard production pattern is:

1. **KV as a read-through cache in front of D1.** On an API request, check KV first. On a miss, query D1, write the result to KV with a short TTL (60 seconds to 5 minutes depending on staleness tolerance), return the result.
2. **On writes, invalidate KV.** When a user adds an ingredient to their pantry (D1 write), delete or overwrite the corresponding KV cache key. Note: KV deletion takes up to 60 seconds to propagate globally. For user-facing writes where the user expects to see the change immediately, return the fresh data from D1 directly on that response, and let the cache catch up.

### D1 schema sketch for Recipe Remix

```sql
-- Ingredients (canonical list, seeded)
CREATE TABLE ingredients (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,                   -- "protein", "vegetable", "grain", etc.
  aliases     TEXT,                   -- JSON array of alternate names for matching
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Users (optional accounts)
CREATE TABLE users (
  id          TEXT PRIMARY KEY,       -- UUID or auth-provider ID
  email       TEXT UNIQUE,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Pantry (user's saved ingredients)
CREATE TABLE pantry (
  user_id     TEXT REFERENCES users(id),
  ingredient_id INTEGER REFERENCES ingredients(id),
  added_at    TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, ingredient_id)
);

-- Dietary profiles
CREATE TABLE dietary_profiles (
  user_id     TEXT PRIMARY KEY REFERENCES users(id),
  restrictions TEXT NOT NULL DEFAULT '[]'  -- JSON array: ["vegetarian","gluten-free"]
);

-- Recipes (both seeded DB recipes and AI-generated)
CREATE TABLE recipes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  ingredients TEXT NOT NULL,          -- JSON array of {ingredient_id, amount, unit}
  instructions TEXT NOT NULL,         -- JSON array of step strings
  cuisine_tags TEXT DEFAULT '[]',     -- JSON: ["Thai","Italian","fusion"]
  dietary_tags TEXT DEFAULT '[]',     -- JSON: ["vegetarian","gluten-free"]
  source      TEXT NOT NULL,          -- "ai" | "database" | "remix"
  image_key   TEXT,                   -- R2 object key (nullable)
  cook_time   INTEGER,               -- minutes
  difficulty  TEXT,                   -- "easy" | "medium" | "hard"
  nutrition   TEXT,                   -- JSON nutritional info (nullable)
  created_at  TEXT DEFAULT (datetime('now'))
);

-- User favorites
CREATE TABLE favorites (
  user_id     TEXT REFERENCES users(id),
  recipe_id   TEXT REFERENCES recipes(id),
  created_at  TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, recipe_id)
);

-- User ratings
CREATE TABLE ratings (
  user_id     TEXT REFERENCES users(id),
  recipe_id   TEXT REFERENCES recipes(id),
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, recipe_id)
);
```

### Key references
- Cloudflare storage options guide: https://developers.cloudflare.com/workers/platform/storage-options/
- D1 read replication: https://developers.cloudflare.com/d1/best-practices/read-replication/
- KV docs: https://developers.cloudflare.com/kv/

---

## Storage — R2

### What R2 is for in this app

R2 stores recipe images — both seeded images from the recipe database and any user-uploaded or AI-generated images. R2 is S3-compatible, has zero egress fees within Cloudflare, and integrates via a binding in Workers.

### Integration patterns — pick the right one per use case

#### Pattern A: Server-side upload via Workers binding (for AI-generated or processed images)

When the server generates or transforms an image, upload it directly from the Worker:

```typescript
// In a server route or Workflow step
const imageBuffer = await generateRecipeImage(recipe);  // from an image generation API
await env.RECIPE_IMAGES.put(`recipes/${recipeId}.webp`, imageBuffer, {
  httpMetadata: { contentType: 'image/webp' }
});
```

#### Pattern B: Presigned URL upload (for user-uploaded images, if added later)

For any future feature where users upload their own recipe photos, generate a presigned PUT URL on the server and hand it to the client. The client uploads directly to R2 — the Worker is not in the upload path, which is faster and avoids the 128 MB Worker memory limit.

```typescript
// Server route that generates the presigned URL
const url = await env.RECIPE_IMAGES.generatePresignedUrl(
  `user-uploads/${userId}/${filename}`,
  { method: 'PUT', expiresIn: 300 }  // 5-minute window
);
return { uploadUrl: url };
```

#### Pattern C: Image transformation before storage (advanced, optional for v1)

Cloudflare Images binding can watermark, transcode to AVIF/WebP, and resize images before they hit R2. Useful if image quality or size consistency matters. Defer to v2 unless the seeded recipe images need normalization at ingest time.

### Serving images

Images stored in R2 are served via a public bucket URL or through a Worker route. If the bucket is public, images are automatically served through Cloudflare's CDN with global edge caching. This is the recommended path for recipe images — they are static once created.

### Key references
- R2 upload docs: https://developers.cloudflare.com/r2/objects/upload-objects/
- R2 Workers API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- Secure uploads tutorial: https://developers.cloudflare.com/workers/tutorials/upload-assets-with-r2/
- Image transformation tutorial: https://developers.cloudflare.com/images/tutorials/optimize-user-uploaded-image/
- User-generated content architecture: https://developers.cloudflare.com/reference-architecture/diagrams/storage/storing-user-generated-content/

---

## Authentication

### CRITICAL: Lucia Auth is deprecated. Do not use it.

Lucia v3 was deprecated in early 2025. There is no v4. The maintainer's recommendation is to implement sessions from scratch using Lucia's guides as a reference, or to switch to a maintained library. The Cloudflare D1 adapter for Lucia is unmaintained.

### Recommended: Better Auth

Better Auth is the strongest fit for this stack. It is actively maintained, has explicit Cloudflare Workers + D1 support, and covers all the auth requirements for Recipe Remix (optional accounts, social login, session management).

#### Why Better Auth over the alternatives

| Option | Fit for Recipe Remix | Notes |
|---|---|---|
| **Better Auth** | BEST | Native D1 support via Drizzle or Kysely. Works in Workers. Session storage in D1 or KV. Actively maintained. |
| Auth0 | Good | Managed SaaS, strong social login. Adds an external dependency and latency hop. Overkill for optional accounts on a single app. |
| Cloudflare Access | Wrong layer | Designed for zero-trust network gating (internal tools, VPNs). Not appropriate for end-user app accounts. |
| Auth.js / NextAuth | Possible | Has a D1 adapter, but its ecosystem is Next.js-centric. Less battle-tested on Nuxt + Workers. |
| Roll your own | Possible | Lucia's guides make this feasible, but Better Auth gives you sessions, CSRF protection, and social login out of the box with less code. |
| Clerk | Possible | Managed, easy to integrate. Adds vendor lock-in and per-user pricing that may not be warranted for an optional-account app. |

#### Better Auth + Cloudflare D1 setup notes

1. **Request-scoped bindings.** D1 bindings are only available inside a request context in Workers. Better Auth must be initialized per-request, not at module top level. The `better-auth-cloudflare` package handles this automatically.
2. **ORM:** Use Drizzle ORM with the D1 dialect. Better Auth generates its schema via Drizzle migrations, which run against D1 via Wrangler.
3. **Session storage:** Better Auth stores sessions in D1 by default. For high-traffic apps, you can layer KV as a session cache (check KV first, fall back to D1). For Recipe Remix at launch, D1-only sessions are fine — add KV caching if session query latency becomes measurable.
4. **Social login (optional):** Better Auth supports Google, GitHub, and others out of the box. Wire up one or two providers at launch. Users without a social account can use email + password.
5. **Optional accounts:** Nothing in the auth layer forces accounts. The app works fully without auth. Auth is only required to persist pantry, favorites, history, and ratings. Gate those features on session presence.

#### Package
```
npm install better-auth better-auth-cloudflare drizzle-orm better-sqlite3
```

### Key references
- Better Auth + Cloudflare: https://github.com/zpg6/better-auth-cloudflare
- Better Auth on Hono (Cloudflare pattern): https://hono.dev/examples/better-auth-on-cloudflare
- Auth0 on Workers (alternative reference): https://developers.cloudflare.com/workers/tutorials/authorize-users-with-auth0
- Lucia deprecation context: https://github.com/lucia-auth/lucia/discussions/1707

---

## Confidence Levels

| Recommendation | Confidence | Rationale |
|---|---|---|
| Nuxt 4 on Cloudflare Pages | HIGH | Stable release, zero-config deployment, first-class Nitro preset. Verified by official docs on both sides. |
| Workers + TypeScript for API | HIGH | This is the native compute model for Pages. No alternative needed. |
| Cloudflare Workflows for AI pipeline | HIGH | GA as of April 2025. The step-based, retry-first model is a direct match for LLM orchestration. |
| AI Gateway for LLM routing | HIGH | GA, multi-provider, caching built in. The only sane way to call external LLMs from Workers. |
| D1 for relational data | HIGH | GA, 10 GB limit is more than sufficient, read replication available. SQLite is the right engine for this data volume. |
| KV for sessions and cache | HIGH | The standard Cloudflare pattern. Eventual consistency is not a problem for session reads or recipe cache. |
| R2 for images | HIGH | GA, zero egress fees, S3-compatible. No reason to use anything else within the Cloudflare ecosystem. |
| Better Auth for user accounts | MEDIUM-HIGH | Actively maintained, D1 support confirmed. The `better-auth-cloudflare` package is newer (0.2.x) — monitor for breaking changes in the first few months. The core Better Auth library is stable. |
| Drizzle ORM | HIGH | The dominant TypeScript ORM for D1 and SQLite. Used by Better Auth, well-documented, zero runtime overhead. |
| Ingredient/recipe API source | MEDIUM | Not yet validated. Spoonacular and Edamam are the leading options. This needs its own research pass focused on API quality, rate limits, and cost. |

---

## What NOT to Use

### Do not use Lucia Auth
Deprecated in early 2025. No maintained fork or adapter for D1. All existing tutorials referencing Lucia + Cloudflare are stale.

### Do not use Cloudflare Access for end-user auth
Cloudflare Access is a zero-trust network product. It gates access to internal applications and infrastructure. It is not designed for, and should not be used for, end-user account creation and login flows in a consumer-facing app.

### Do not use Durable Objects for recipe or pantry data
Durable Objects are for stateful, real-time, single-instance workloads (chat rooms, WebSocket connections, rate limiting). Recipe data is not real-time and does not require a single authoritative instance. D1 is the correct choice. Using Durable Objects here adds complexity with no benefit.

### Do not store session data in D1 without KV caching at scale
At low traffic, D1 sessions are fine. If the app scales beyond a few hundred concurrent users, every authenticated request will hit D1 for a session lookup. KV in front of D1 reduces this to sub-millisecond reads for hot sessions. Plan for this transition but do not over-engineer it at launch.

### Do not run LLM calls directly in a Workers fetch handler
Workers have a CPU time limit (30 seconds on the free plan, 5 minutes on paid). LLM calls are I/O-bound and can take 10-30 seconds. Put them in a Workflow step. This also gives you automatic retries and state persistence for free.

### Do not use NuxtHub Admin for deployment in production
NuxtHub Admin is being sunset December 31, 2025. Use standard Cloudflare Pages Git integration (push to GitHub, Pages builds and deploys automatically). The `@nuxthub/core` Nuxt module is still useful for local development binding simulation.

### Do not use a traditional ORM that requires a persistent Node.js process
Libraries that expect a long-running database connection pool (e.g., Sequelize, Mongoose, Prisma with connection pooling) do not work in Workers. Drizzle is designed for serverless and works correctly with D1's request-scoped binding model.

### Do not put large JSON blobs in D1 columns without indexing strategy
The schema sketch above uses JSON columns for ingredients, instructions, and tags. This is fine for storage and retrieval. But if you need to query by tag (e.g., "all vegetarian recipes"), add a separate junction table or a generated/virtual column with an index. Do not rely on JSON extraction functions in WHERE clauses at scale — SQLite's JSON support is functional but not optimized for high-cardinality filtering.

---

*Research compiled 2026-02-04. Sources verified against official Cloudflare documentation and current library status. Re-validate Better Auth version and ingredient API options before implementation begins.*
