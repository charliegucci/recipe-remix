# Architecture Research

> Recipe Remix Engine -- Cloudflare-native architecture for an AI-powered recipe generation app.
> Research date: 2026-02-04
> Sources: Cloudflare official documentation (Workflows, Workers AI, D1, KV, R2, Pages, AI Gateway, Access)

---

## System Overview

The system is a hybrid recipe platform with two content sources: a curated/imported recipe database and an AI-generated fusion layer that produces cross-cultural mashup recipes on demand. The architecture is fully serverless and lives entirely within the Cloudflare Developer Platform. No origin server exists; all compute is edge-first.

Logical topology (text representation of the request path):

```
Browser
  |
  v
Cloudflare Pages  (Nuxt 4 SSR -- static pages + API routes)
  |
  |-- static assets & SSR HTML --> served by Pages CDN directly
  |
  v
Pages Functions / Service Bindings
  |
  |-- read-path (recipes, ingredients, user data)  --> Workers API (TypeScript)
  |                                                        |
  |                                                        |--> KV (cache check)
  |                                                        |--> D1 (source of truth)
  |                                                        |--> R2 (image URLs only; images
  |                                                        |        served via public bucket)
  |                                                        |
  |-- write-path (new AI recipe request)                   v
  |                                              AI Gateway (prompt cache + rate limit)
  |                                                        |
  v                                                        v
Cloudflare Workflow  (async, durable)              Workers AI
  |                                                  (text generation: recipe content)
  |                                                  (text-to-image: recipe photos)
  |
  |-- step 1: validate ingredients via D1 lookup
  |-- step 2: call AI (text generation) via AI Gateway
  |-- step 3: call AI (text-to-image) via AI Gateway  [optional]
  |-- step 4: upload generated image to R2
  |-- step 5: persist recipe + image reference to D1
  |-- step 6: invalidate relevant KV cache keys
  |
  v
Frontend polls workflow instance status
  --> on completion, fetches the new recipe from the API (now in D1 + KV)
```

Key architectural decisions embedded in this layout:

1. AI generation is always async via Cloudflare Workflow. Workers AI text generation can take several seconds; Workflows provides durable, auto-retrying multi-step execution that survives the 30-second CPU limit of a plain Worker fetch handler.
2. AI Gateway sits in front of every Workers AI call. It provides response caching (identical prompts served from cache), rate limiting, model fallback, and analytics -- all without application code.
3. KV is a read-through cache in front of D1. D1 is the single source of truth; KV absorbs the read amplification that comes with a recipe browsing app.
4. R2 stores all recipe images (both curated imports and AI-generated). Images are served via a public bucket on a custom domain, so the Workers API never proxies image bytes.

---

## Components

### Frontend (Nuxt 4 on Cloudflare Pages)

**Role:** Render the user-facing application. Fetch data from the API layer. Trigger AI generation and poll for results.

**Deployment:** Cloudflare Pages with the Nuxt framework preset. Pages handles SSR, static asset serving, and preview deployments automatically on every git push.

**Bindings access:** Nuxt server-side routes run as Pages Functions. They can hold Service Bindings to the backend Workers (including the Workflow trigger service). Client-side code never calls Cloudflare bindings directly; it calls the API routes exposed by Pages Functions.

**Key pages and routes:**

| Route | Behaviour |
|---|---|
| `/` | Home / featured recipes (SSR, data from API) |
| `/recipe/[id]` | Single recipe detail (SSR) |
| `/generate` | Ingredient input form; triggers Workflow; polls status client-side via SSE or repeated fetch to a status endpoint |
| `/user/favorites` | Authenticated; reads user favourites from API |

**Nuxt + Pages binding pattern (from Cloudflare docs):**

```typescript
// server/api/recipes/[id].get.ts
export default defineEventHandler(async (event) => {
  // In Pages Functions, bindings live on the context.
  // Nuxt's nitro cloudflare adapter exposes them via getRuntimeConfig or event.context.
  const db = event.context.env.DB;          // D1 binding
  const cache = event.context.env.RECIPES;  // KV binding
  // ... fetch and return
});
```

**Static vs dynamic split:** Static marketing pages and the recipe catalogue (when pre-rendered) are served entirely from the Pages CDN with zero backend hit. Only user-specific or freshness-critical paths hit the API.

---

### API Layer (Workers / Pages Functions)

**Role:** Serve JSON payloads to the frontend. Enforce authentication. Orchestrate reads from KV/D1 and trigger Workflows for writes.

**Deployment options -- two valid approaches, pick one:**

| Approach | When to use |
|---|---|
| Pages Functions (file-based routing under `functions/`) | Simpler; keeps everything in one Pages project; bindings configured in one `wrangler.jsonc` |
| Standalone Workers (separate `wrangler.jsonc`, called via Service Binding from Pages) | Better when the API surface is large, needs its own deployment lifecycle, or when you want to share it across multiple frontends |

For Recipe Remix, **Pages Functions are the recommended starting point.** If the API grows beyond ~15 endpoints or needs independent CI/CD, extract to a standalone Worker later. The Workflow trigger service must be a standalone Worker (Workflows are defined in Workers projects), so there will be at least one Service Binding regardless.

**API surface (initial set):**

```
GET  /api/recipes           -- list / search (paginated)
GET  /api/recipes/:id       -- single recipe
GET  /api/ingredients       -- ingredient catalogue (for autocomplete)
POST /api/generate          -- trigger fusion recipe generation (returns workflow instance ID)
GET  /api/generate/:id      -- poll workflow status; returns status + recipe when done
GET  /api/user/favorites    -- user's saved recipes (auth required)
POST /api/user/favorites    -- save a recipe (auth required)
DELETE /api/user/favorites/:id
```

**Read-path pattern (KV read-through):**

```typescript
async function getRecipe(env: Env, id: string) {
  const cacheKey = `recipe:${id}`;

  // 1. Try KV first
  const cached = await env.RECIPES.get(cacheKey, { type: "json" });
  if (cached) return cached;

  // 2. Miss -- query D1
  const row = await env.DB.prepare(
    "SELECT * FROM recipes WHERE id = ?"
  ).get(id);

  // 3. Write back to KV with a TTL
  if (row) {
    await env.RECIPES.put(cacheKey, JSON.stringify(row), { expirationTtl: 3600 });
  }

  return row;
}
```

---

### AI Integration

**Models used (all available on Workers AI today):**

| Task | Model | Notes |
|---|---|---|
| Recipe text generation | `@cf/meta/llama-3.1-8b-instruct` | Good instruction-following; OpenAI-compatible endpoint available |
| Text-to-image (recipe photos) | `@cf/stability-ai/stable-diffusion-xl-lightning` | Fast (few-step) 1024px output; good for food photography prompts |
| Text classification (safety gate) | `@cf/huggingface/distilbert-sst-2-int8` | Lightweight; can be used to filter prompt output before image gen |

**AI Gateway as the mandatory front door:**

All Workers AI calls go through an AI Gateway instance. This is a single-line change from calling `env.AI.run(...)` directly. Benefits that matter for a recipe app:

* **Prompt caching:** Identical recipe generation prompts (e.g. "make a Thai-Italian fusion pasta") are cached for up to 1 month. Cache TTL is configurable per request via the `cf-aig-cache-ttl` header. This directly reduces cost and latency for popular fusion combinations.
* **Rate limiting:** Prevents a single user from hammering the AI backend. Configurable per gateway in the dashboard; no code change required.
* **Model fallback:** If the primary model is unavailable, AI Gateway routes to a fallback automatically. Useful during Workers AI maintenance windows.
* **Analytics and logging:** Every AI call is logged. Useful for understanding which prompts are popular and for cost tracking.

**Prompt engineering structure for fusion recipes:**

```typescript
const prompt = `You are a professional chef specializing in cross-cultural cuisine fusion.
Given the following ingredients: ${ingredientList}
And the two cuisines to fuse: ${cuisine1} and ${cuisine2}

Generate a detailed recipe in the following JSON format:
{
  "title": string,
  "description": string,
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings": number,
  "ingredients": [{ "name": string, "quantity": string, "unit": string }],
  "steps": [string],
  "cuisine_tags": [string],
  "dietary_tags": [string]
}

Return only valid JSON. Do not include markdown formatting.`;
```

Requesting JSON output directly from the model keeps the Workflow step simple: parse once, persist once. Validate the shape with a schema check before writing to D1.

---

### Data Layer (D1 + KV)

#### D1 -- Relational Source of Truth

D1 uses SQLite semantics. The schema below is designed for the hybrid recipe model: both curated and AI-generated recipes live in the same `recipes` table, distinguished by the `source` column.

**Proposed schema:**

```sql
-- Core ingredient catalogue (used for input matching and search)
CREATE TABLE ingredients (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    aliases     TEXT,                          -- JSON array of alternate names for matching
    category    TEXT,                          -- e.g. "protein", "spice", "vegetable"
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);

-- Recipe master table
CREATE TABLE recipes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    description     TEXT,
    source          TEXT NOT NULL CHECK(source IN ('curated', 'ai_generated')),
    cuisine_tags    TEXT,                      -- JSON array: ["thai", "italian"]
    dietary_tags    TEXT,                      -- JSON array: ["gluten_free", "vegetarian"]
    prep_time       INTEGER,                   -- minutes
    cook_time       INTEGER,                   -- minutes
    servings        INTEGER,
    steps           TEXT NOT NULL,             -- JSON array of step strings
    image_key       TEXT,                      -- R2 object key (null if no image)
    ai_prompt       TEXT,                      -- the prompt used, if ai_generated (for dedup + caching)
    workflow_id     TEXT,                      -- Workflow instance ID, if ai_generated
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_recipes_source ON recipes(source);
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine_tags);  -- note: SQLite JSON queries can use this

-- Recipe <-> Ingredient many-to-many
CREATE TABLE recipe_ingredients (
    recipe_id   INTEGER NOT NULL REFERENCES recipes(id),
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    quantity    TEXT,
    unit        TEXT,
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- Users
CREATE TABLE users (
    id          TEXT PRIMARY KEY,             -- opaque ID from auth provider
    email       TEXT UNIQUE,
    display_name TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- User favourites (many-to-many: users <-> recipes)
CREATE TABLE user_favorites (
    user_id     TEXT NOT NULL REFERENCES users(id),
    recipe_id   INTEGER NOT NULL REFERENCES recipes(id),
    saved_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, recipe_id)
);

-- Generation history (audit trail for AI calls; also powers "recently generated" UX)
CREATE TABLE generation_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT REFERENCES users(id),
    recipe_id       INTEGER REFERENCES recipes(id),
    input_ingredients TEXT,                   -- JSON array of ingredient names as entered
    cuisine1        TEXT,
    cuisine2        TEXT,
    workflow_id     TEXT,
    status          TEXT CHECK(status IN ('pending','running','completed','failed')),
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    completed_at    INTEGER
);

CREATE INDEX idx_gen_history_user ON generation_history(user_id, created_at DESC);

-- PRAGMA for foreign key enforcement (must be set per connection)
PRAGMA foreign_keys = ON;
```

**D1 design notes:**

* Foreign keys are supported but must be enabled per connection with `PRAGMA foreign_keys = ON`. Run this as the first statement in each Worker request that writes.
* JSON columns (`cuisine_tags`, `steps`, `aliases`, etc.) are queryable in D1 using SQLite's `json_extract()` function. This avoids a separate tags table while still allowing filtered queries like "find all Thai recipes."
* The `ai_prompt` column on `recipes` serves double duty: it is the deduplication key (if the exact same prompt has already produced a recipe, skip generation) and it is the cache key for AI Gateway.
* D1 supports Time Travel (point-in-time recovery up to 30 days). No manual backup strategy is needed.

#### KV -- Edge Cache Layer

**What to cache and for how long:**

| Cache key pattern | Contents | TTL | Rationale |
|---|---|---|---|
| `recipe:{id}` | Full recipe row as JSON | 1 hour | Most popular path; rarely changes after creation |
| `recipes:list:{page}:{sort}` | Paginated recipe list | 5 minutes | Listing pages change as new recipes are added |
| `ingredients:search:{query}` | Ingredient search results | 24 hours | Ingredient catalogue is append-only and stable |
| `user:{uid}:favorites` | User's favourite recipe IDs | 5 minutes | User-specific; short TTL to stay fresh after saves |
| `workflow:status:{instance_id}` | Workflow instance status | 30 seconds | Polled by frontend; short TTL ensures freshness |

**KV consistency caveat (from docs):** KV is eventually consistent. Writes propagate within ~60 seconds across the global network. For recipe generation, this is fine -- the frontend polls status, and by the time the workflow completes and the user refreshes, propagation has long finished. For user favourites, the 5-minute TTL combined with the eventual consistency window means a favourite saved in one region might not appear immediately if the user moves to another edge location. This is acceptable for this use case. If it becomes a problem, write favourites directly through D1 and only cache reads.

**Cache invalidation strategy:** When a Workflow completes and writes a new recipe to D1, the final Workflow step deletes the relevant KV keys (`recipes:list:*` patterns). Individual recipe keys do not need invalidation because new recipes get new IDs. For user favourites, delete `user:{uid}:favorites` on any favourite mutation.

---

### Storage (R2)

**Role:** Store all recipe images -- both imported curated images and AI-generated food photos.

**Bucket structure:**

```
recipe-remix-images/
  recipes/
    curated/
      {recipe_id}.jpg        -- imported images
    ai-generated/
      {recipe_id}.jpg        -- images produced by text-to-image AI
  placeholders/
    default-recipe.jpg       -- fallback when no image is available
```

**Serving strategy (from Cloudflare docs):**

R2 buckets are private by default. For Recipe Remix, enable a **public bucket on a custom domain** (e.g. `images.reciperemix.com`). This gives:

* Direct browser access to images without routing through a Worker (zero egress cost on R2).
* Cloudflare CDN caching on the custom domain automatically. Set a long `Cache-Control` header (e.g. 1 year) on image objects because image URLs are content-addressed by recipe ID -- they never change.
* Access to WAF rules and bot management on the images subdomain.

Do NOT use the `r2.dev` subdomain for production; it lacks caching and security features.

**Upload path:** The Workflow writes the generated image bytes to R2 using the R2 binding (`env.BUCKET.put(...)`). The Worker never streams image bytes back to the user -- it just stores the key and persists the key reference in D1.

```typescript
// Inside a Workflow step
const imageBuffer = await generateImage(prompt); // Workers AI text-to-image
const key = `recipes/ai-generated/${recipeId}.jpg`;
await this.env.BUCKET.put(key, imageBuffer, {
  httpMetadata: {
    contentType: "image/jpeg",
    cacheControl: "public, max-age=31536000"
  }
});
```

**Lifecycle policy:** AI-generated images for recipes that have never been viewed or saved in 180 days can be moved to a cheaper storage class or deleted via an R2 object lifecycle rule. This is configurable in the R2 bucket settings without code changes.

---

### Auth

**Recommended approach: application-level auth with JWT session cookies, not Cloudflare Access.**

Cloudflare Access is designed for internal tools and zero-trust networks. For a consumer-facing app like Recipe Remix, a standard application-level auth flow is more appropriate. The pattern:

1. **Sign-up / Login:** User submits credentials (email + password, or OAuth via a provider like Google). The Pages Function validates credentials against the `users` table in D1 (password stored as a bcrypt hash) or exchanges an OAuth code with the provider.

2. **Session creation:** On successful auth, generate a signed JWT containing `{ sub: userId, exp: <timestamp> }`. Sign it with a secret stored as a Worker environment secret (`wrangler secret put`). Set it as an `HttpOnly`, `Secure`, `SameSite=Lax` cookie on the response.

3. **Request authentication:** On every API request, the Pages Function middleware reads the cookie, verifies the JWT signature and expiration, and extracts the user ID. Attach it to the request context so downstream route handlers can use it without re-reading the cookie.

4. **Session refresh:** If the JWT is within 24 hours of expiration, issue a new one with a fresh `exp` on the response. No separate refresh token is needed for an app of this scope.

```typescript
// Middleware sketch (runs before every /api/user/* route)
import { jwtVerify, SignJWTOptions } from 'jose';

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

async function authMiddleware(request: Request, env: Env) {
  const cookie = parseCookies(request.headers.get("cookie") || "");
  const token = cookie["session"];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.sub as string; // user ID
  } catch {
    return null; // expired or tampered
  }
}
```

**Why not Cloudflare Access here:** Access inserts a JWT into every request automatically, which is powerful for internal apps. But it requires setting up an identity provider at the Cloudflare dashboard level, does not give you control over the sign-up flow, and adds complexity for a greenfield consumer app. If Recipe Remix later becomes an enterprise product with SSO requirements, Access can be layered in front of the existing auth without changing the backend.

---

## Data Flow

### Flow A: Browsing an existing recipe (the hot path)

```
1. User navigates to /recipe/42
2. Nuxt SSR fires a server-side fetch to the Pages Function handler
3. Handler calls getRecipe(env, "42"):
     a. KV.get("recipe:42") --> HIT --> return cached JSON
     b. (on miss) D1 query --> write to KV --> return
4. Handler also fetches the image URL:
     Image is served from https://images.reciperemix.com/recipes/.../42.jpg
     (direct from R2 public bucket; no Worker involved)
5. Nuxt renders HTML; Pages serves it from CDN
```

This path is designed to be as fast as possible. KV reads are sub-millisecond at the edge. D1 reads are only needed on a cold cache.

### Flow B: AI fusion recipe generation (the async path)

```
1. User fills in ingredients and two cuisines, hits "Generate"
2. Frontend POST to /api/generate with { ingredients, cuisine1, cuisine2 }
3. Pages Function:
     a. Authenticates the user (JWT cookie check)
     b. Validates ingredients against the D1 ingredients catalogue
     c. Checks D1 for an existing recipe with the same ai_prompt (dedup)
     d. If exists: return immediately with the existing recipe ID
     e. If not: call WORKFLOW_SERVICE.createInstance({ ingredients, cuisine1, cuisine2 })
        via Service Binding to the Workflow trigger Worker
     f. Write a row to generation_history with status = "pending"
     g. Return { workflowInstanceId, status: "pending" } to the frontend
4. Frontend begins polling GET /api/generate/{instanceId} every 3 seconds
5. Meanwhile, the Workflow executes:
     step 1 -- Validate & normalise ingredients (D1 lookup)
     step 2 -- Build prompt string
     step 3 -- Call Workers AI text generation via AI Gateway --> JSON recipe
     step 4 -- Parse and validate JSON; retry step 3 if malformed (auto-retry)
     step 5 -- Call Workers AI text-to-image via AI Gateway --> image bytes
     step 6 -- Upload image to R2
     step 7 -- INSERT recipe row into D1; INSERT recipe_ingredients rows
     step 8 -- UPDATE generation_history SET status = "completed"
     step 9 -- DELETE KV keys matching "recipes:list:*" to invalidate listing cache
6. Next poll from frontend hits /api/generate/{instanceId}:
     Handler checks generation_history --> status = "completed"
     Returns { status: "completed", recipeId: 123 }
7. Frontend redirects to /recipe/123 which renders via Flow A
```

### Flow C: Saving a favourite

```
1. Authenticated user clicks "Save" on /recipe/42
2. Frontend POST /api/user/favorites with { recipeId: 42 }
3. Pages Function:
     a. Verify JWT --> extract userId
     b. INSERT INTO user_favorites (user_id, recipe_id) VALUES (?, ?)
     c. DELETE KV key "user:{userId}:favorites"
     d. Return 201
```

---

## Async Patterns

### Why Cloudflare Workflows (not a plain Worker fetch)

A synchronous Worker fetch handler has a hard CPU time limit. AI text generation calls can take 5-15 seconds. Text-to-image calls can take 10-30 seconds. Chaining both in a single fetch handler risks timeout. More importantly, if any step fails mid-chain (network hiccup to AI Gateway, R2 write failure), the entire request fails and the user sees an error with no way to resume.

Cloudflare Workflows solve both problems:

* **Durable execution:** Each `step.do(...)` call is a checkpoint. If the Worker instance dies between steps, the Workflow resumes from the last completed step automatically.
* **Auto-retry:** Steps that throw are retried with configurable backoff. AI inference is inherently flaky; automatic retries handle transient failures without application code.
* **No timeout pressure:** Workflows can run for minutes, hours, or days. A 45-second AI pipeline is trivial.
* **Observability:** Every Workflow instance has a status that can be polled (`instance.status()`). The frontend does not need WebSockets or SSE -- simple polling against the status endpoint is sufficient and idiomatic.

### Workflow definition skeleton

```typescript
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workflows";

interface Env {
  AI: Ai;
  DB: D1Database;
  BUCKET: R2Bucket;
  RECIPES: KVNamespace;
}

interface GenerateParams {
  ingredients: string[];
  cuisine1: string;
  cuisine2: string;
  userId: string;
}

export class RecipeGenerationWorkflow extends WorkflowEntrypoint<Env, GenerateParams> {
  async run(event: WorkflowEvent<GenerateParams>, step: WorkflowStep) {
    const { ingredients, cuisine1, cuisine2, userId } = event.params;

    // Step 1: Validate ingredients exist in catalogue
    const validated = await step.do("validate ingredients", async () => {
      // D1 query to check ingredients table
      // Returns normalised list
    });

    // Step 2: Generate recipe text via AI Gateway
    const recipeJson = await step.do("generate recipe text", async () => {
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: buildPrompt(validated, cuisine1, cuisine2) }]
      });
      return JSON.parse(response.response); // validated against expected schema
    });

    // Step 3: Generate recipe image
    const imageBuffer = await step.do("generate recipe image", async () => {
      const imagePrompt = `Professional food photography of ${recipeJson.title}, ${recipeJson.description}`;
      const response = await this.env.AI.run("@cf/stability-ai/stable-diffusion-xl-lightning", {
        prompt: imagePrompt
      });
      return response; // Uint8Array
    });

    // Step 4: Upload image to R2
    const recipeId = await step.do("persist recipe", async () => {
      const result = await this.env.DB.prepare(
        "INSERT INTO recipes (title, description, source, ...) VALUES (?, ?, 'ai_generated', ...)"
      ).run(...Object.values(recipeJson));

      const imageKey = `recipes/ai-generated/${result.meta.last_row_id}.jpg`;
      await this.env.BUCKET.put(imageKey, imageBuffer, {
        httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" }
      });

      // Update image_key on the recipe row
      await this.env.DB.prepare("UPDATE recipes SET image_key = ? WHERE id = ?")
        .run(imageKey, result.meta.last_row_id);

      return result.meta.last_row_id;
    });

    // Step 5: Invalidate cache
    await step.do("invalidate listing cache", async () => {
      // KV does not support wildcard deletes natively.
      // Maintain a small "cache generation" counter in KV or use
      // a versioned key pattern (e.g. recipes:list:v{n}:{page}).
      // Increment the version counter; old versioned keys expire naturally.
    });

    return { recipeId };
  }
}
```

### Triggering from Pages

The Workflow lives in its own Workers project. Pages calls it via a Service Binding to a `WorkerEntrypoint` that exposes a `createInstance` method:

```typescript
// workers/workflow-trigger/index.ts
import { WorkerEntrypoint } from "cloudflare:workers";

export default class WorkflowsService extends WorkerEntrypoint {
  async fetch() { return new Response(null, { status: 404 }); }

  async createInstance(payload: GenerateParams) {
    const instance = await this.env.RECIPE_GENERATION.create({ params: payload });
    return Response.json({ id: instance.id, details: await instance.status() });
  }

  async getInstance(instanceId: string) {
    const instance = await this.env.RECIPE_GENERATION.get(instanceId);
    return Response.json({ details: await instance.status() });
  }
}
```

```typescript
// pages/functions/api/generate.post.ts  (Pages Function)
export const onRequest: PagesFunction<Env> = async (context) => {
  const body = await context.request.json();
  return context.env.WORKFLOW_SERVICE.createInstance(body);
};
```

### Polling pattern

The frontend does not need to maintain a persistent connection. A simple polling loop every 3 seconds against `GET /api/generate/{id}` is sufficient. The Workflow status endpoint returns one of: `queued`, `running`, `completed`, `errored`. On `completed`, the frontend navigates to the recipe. On `errored`, it shows a retry option. This pattern is explicitly documented and recommended by Cloudflare for Workflow-backed UIs.

---

## Suggested Build Order

The build order below is driven by two principles: (1) each phase must be independently testable and deployable, and (2) dependencies flow downward -- nothing in a later phase depends on something not yet built.

### Phase 1 -- Foundation (Data + Auth)

Build first because everything else depends on these.

1. **D1 database setup and schema migration.** Create the database, run the schema above, seed the `ingredients` table with an initial catalogue. Verify with `wrangler d1 execute` queries.
2. **Auth middleware.** Implement JWT signing, cookie setting, and verification. Build a minimal sign-up and login endpoint. Protect a single test route. No UI yet -- test with curl or Postman.
3. **R2 bucket creation.** Create the bucket. Upload the default placeholder image. Enable the public bucket on a custom domain. Confirm the image is accessible via the public URL.

### Phase 2 -- Core Read Path

The recipe browsing experience. No AI involved yet.

4. **Pages Functions API -- recipes and ingredients.** Wire up `GET /api/recipes`, `GET /api/recipes/:id`, `GET /api/ingredients`. Read directly from D1. No KV caching yet -- keep it simple and verifiable.
5. **Nuxt frontend -- recipe listing and detail pages.** SSR pages that call the API routes. Style them. Confirm end-to-end data flow: browser -> Pages SSR -> D1 -> render.
6. **KV caching layer.** Add the read-through cache in front of D1 reads. Add cache invalidation on writes. Verify cache hits with Workers Analytics or by adding a response header (`X-Cache: HIT|MISS`).
7. **Image integration.** Wire recipe detail pages to display images from the R2 public bucket URL. Show the placeholder for recipes without images.

### Phase 3 -- User Features

Requires Phase 1 auth to be solid.

8. **Favourites API and UI.** `POST/DELETE /api/user/favorites`, `GET /api/user/favorites`. Add favourite buttons to recipe cards. Tie KV invalidation to favourite mutations.
9. **Generation history page.** Read from `generation_history` table. Shows past generations and their status. This is also the page the user lands on after triggering a generation.

### Phase 4 -- AI Generation Pipeline

The most complex phase. All of Phase 1 and Phase 2 must be stable before starting here, because the Workflow writes to D1 and R2, and the result surfaces through the read path.

10. **AI Gateway setup.** Create an AI Gateway in the Cloudflare dashboard. Enable caching and rate limiting. Note the gateway URL -- all AI calls will go through it.
11. **Workflow definition and deployment.** Implement `RecipeGenerationWorkflow` as described above. Deploy as a standalone Workers project. Test locally with `wrangler dev` and the Workflow dashboard.
12. **Workflow trigger service.** The `WorkerEntrypoint` that exposes `createInstance` and `getInstance`. Wire the Service Binding in the Pages `wrangler.jsonc`.
13. **Generate endpoint and frontend polling.** `POST /api/generate` triggers; `GET /api/generate/:id` polls. Frontend shows a loading/progress state. On completion, redirects to the recipe.
14. **End-to-end integration test.** Enter ingredients, pick cuisines, submit. Watch the Workflow run in the dashboard. Confirm the recipe appears in D1, the image appears in R2, and the frontend renders correctly.

### Phase 5 -- Polish and Observability

15. **AI Gateway analytics review.** Check cache hit rates. Tune prompt caching TTLs. Adjust rate limits based on usage patterns.
16. **Error handling and retry UX.** If a Workflow errors, the frontend shows a clear message and a "Retry" button that re-triggers with the same parameters.
17. **Performance tuning.** Review KV TTLs. Add `Cache-Control` headers to API responses so Cloudflare's CDN caches JSON where appropriate (e.g. public recipe listings). Review D1 indexes against actual query patterns.
18. **Deduplication.** Before triggering a Workflow, check `recipes.ai_prompt` for an exact match. If found, skip generation and return the existing recipe. This also benefits from AI Gateway's prompt cache for the AI call itself.

---

## Constraints and Limits to Watch

| Resource | Relevant Limit | Impact |
|---|---|---|
| Workers CPU time (fetch) | 30 ms (free) / 30 s (paid) | AI calls must not run in a plain fetch handler; use Workflows |
| Workflows step duration | No hard per-step limit; total instance can run for days | No concern for recipe generation |
| D1 database size | 10 GB per database | Ample for a recipe catalogue; millions of rows |
| KV eventual consistency | ~60 seconds propagation | Acceptable; design TTLs around this |
| AI Gateway cache TTL | Up to 1 month | Good for stable prompts; set shorter for seasonal recipes |
| R2 egress | Zero fees via public bucket or Workers | No cost concern for image serving |
| Workers AI rate limits | Varies by model; check dashboard | AI Gateway rate limiting should be configured below the Workers AI limit |
