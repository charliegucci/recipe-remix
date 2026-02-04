# Research Summary

> Synthesized 2026-02-04 from STACK.md, FEATURES.md, ARCHITECTURE.md, and PITFALLS.md.

---

## Stack Verdict

The proposed Cloudflare-centric stack is validated. Every component is production-ready or GA, and the pieces compose cleanly into the architecture that ARCHITECTURE.md describes. One required change was identified during research: **Lucia Auth is deprecated and must not be used.** Better Auth (v0.2.x) with its native D1 support replaces it. This is the only substitution required. All other components -- Nuxt 4, Workers, Workflows, AI Gateway, D1, KV, R2, and Drizzle ORM -- carry HIGH confidence and no blocking concerns. Two items remain at MEDIUM confidence and need a follow-up research pass before implementation: the external ingredient/recipe API source (Spoonacular vs. Edamam vs. a curated D1 seed) and the Better Auth `better-auth-cloudflare` package version stability.

---

## Key Stack Decisions

- **Nuxt 4 on Cloudflare Pages** is the frontend and SSR layer. Zero-config deployment via the Nitro `cloudflare-pages` preset. Bindings are server-only; all data access flows through `server/api/` routes. Nuxt 3 is EOL July 2026 -- target Nuxt 4 exclusively.
- **Cloudflare Workflows** are the runtime for all AI recipe generation. They are durable, auto-retrying, and have no per-step timeout. LLM and image-generation calls live inside `step.do()` blocks exclusively; never run them in a plain Workers fetch handler.
- **AI Gateway** is mandatory in front of every LLM call. It provides prompt caching (critical for repeated ingredient combinations), multi-provider fallback, rate limiting, and analytics at zero per-request cost.
- **Better Auth replaces Lucia Auth.** Better Auth has explicit Cloudflare Workers + D1 support, handles session management, and supports social login. Must be initialized per-request (not at module top level) because D1 bindings are request-scoped.
- **Drizzle ORM with the D1 dialect** is the query layer. It is the only TypeScript ORM that works correctly with D1's request-scoped, serverless binding model. Sequelize, Mongoose, and Prisma connection-pooling are all incompatible.
- **D1 is the single source of truth; KV is a read-through cache.** On reads: check KV first, fall back to D1, write the result back to KV with a TTL. On writes: write to D1, then invalidate the relevant KV keys. Do not use KV as the primary path for freshly generated recipes -- propagation delay is up to 60 seconds.
- **R2 stores all recipe images** (curated and AI-generated). Images are served via a public bucket on a custom domain with long `Cache-Control` headers. The Worker never proxies image bytes -- it only stores the R2 key reference in D1.
- **Durable Objects are explicitly excluded.** Recipe and pantry data is not real-time and does not need a single authoritative instance. D1 is the correct and only choice for this data.

---

## Table Stakes Features

Every competitor in this space ships these. Shipping without any one of them results in immediate user abandonment. All are confirmed for v1.

1. **Ingredient input with search and autocomplete** -- Users type ingredient names and expect instant, accurate suggestions. Backed by a canonical ingredient database in D1. Non-negotiable.
2. **Persistent pantry** -- A saved ingredient list that survives across sessions. The single biggest retention feature in the category. Must be easy to add, remove, and update.
3. **Dietary filters** -- At minimum: vegetarian, vegan, gluten-free, dairy-free, nut-free. These must be applied as a hard constraint on generation, not a post-filter. Users with restrictions leave immediately if this is missing.
4. **Structured recipe output** -- Every recipe must include: title, ingredient list with quantities and units, ordered step-by-step instructions, estimated cooking time, and difficulty level. Vague or missing measurements are the top complaint about AI-generated recipes and will destroy trust.
5. **Cooking time and difficulty indication** -- Users filter and self-select on these. "30 minutes or less" is the most common filter across the category.
6. **Food waste framing** -- The ingredient-based concept inherently serves this. Make it explicit in copy. It is expected messaging, not a differentiator.
7. **Serving-size scaling and unit conversion** -- In-app, real-time, one tap. These are not polish items for a recipe app; they are table stakes, especially on mobile.

---

## Key Differentiators

These are what make Recipe Remix distinct from every competitor analyzed. The gap in the market is clear: no current mainstream app owns ingredient-based fusion recipe generation end-to-end.

1. **Structured fusion recipe generation grounded in flavor science.** The core product. No competitor combines a persistent pantry, AI generation, and a flavor-compatibility model in a single product. Google Food Mood is the closest (pick two countries, get a fusion recipe) but is an experimental art project with no pantry, no substitution, and no persistence. Plant Jammer does flavor-science pairing but is locked to plant-based. Recipe Remix targets the entire ingredient space with cross-cultural fusion.
2. **The "why this works" explanation on every fusion recipe.** Every generated recipe should surface 1-2 "bridge" ingredients or techniques that make the cross-cultural combination coherent. Example: "miso paste bridges Japanese umami into this risotto because risotto is already umami-forward." This turns a potentially weird recipe into an educational and delightful one. This is the single most important piece of copy on the recipe card.
3. **Ingredient substitution and recipe modification after generation.** Users will never have exactly what a recipe calls for. The ability to say "I don't have cilantro" and get a structurally sound updated recipe is a major trust builder and a retention driver. Minimum viable controls: regenerate, swap ingredient, adjust spice level.
4. **Flavor-compatibility scoring as a guardrail on AI creativity.** Raw LLM output for fusion is often inedible. A scoring layer that evaluates ingredient combinations against known flavor-profile rules before surfacing them to the user is what separates a trustworthy product from a novelty chatbot. Flag low-scoring combinations as "experimental" rather than blocking them entirely; refine based on user feedback.

---

## Architecture Highlights

- **Fully serverless, edge-first, single platform.** No origin server. All compute is Cloudflare Workers (via Pages Functions or standalone Workers). The entire system -- frontend SSR, API, AI pipeline, data, images -- lives within the Cloudflare Developer Platform. This eliminates operational complexity for a small team.
- **AI generation is always async via Cloudflare Workflows.** The frontend triggers a Workflow, receives an instance ID, and polls a status endpoint every 3 seconds. The Workflow executes a deterministic sequence of steps: validate ingredients, build prompt, call AI for recipe text, call AI for recipe image, upload image to R2, persist recipe to D1, invalidate KV cache. Each step is independently retriable. If any step fails, the Workflow resumes from the last checkpoint -- the user never sees a mid-pipeline crash.
- **Prompt deduplication before generation.** Before triggering a Workflow, the API checks the `ai_prompt` column in D1 for an exact match against the same ingredient + cuisine combination. If a recipe already exists, it is returned immediately with no AI call. AI Gateway's prompt cache provides a second layer of deduplication at the inference level.
- **Separate read and write paths with different latency profiles.** The read path (browsing recipes) is optimized for speed: KV cache at the edge, D1 on a miss, images served directly from an R2 public bucket via CDN. The write path (generating a recipe) is optimized for reliability: durable Workflow execution, auto-retries, and eventual consistency is acceptable because the user is already in a "generating..." state.
- **Pages Functions for the API, a standalone Worker for Workflows.** Pages Functions handle all CRUD routes and keep the deployment simple. The Workflow trigger service is a standalone Worker called via a Service Binding. This is the minimum number of deployment units needed, and it maps cleanly onto the Cloudflare model.
- **The hybrid recipe model.** Curated/seeded recipes and AI-generated recipes live in the same `recipes` table, distinguished by a `source` column. The system uses database matching for high-confidence full pantry matches and activates AI generation when the database returns fewer results than a confidence threshold. This is both a product decision and a safety decision -- the curated database provides a quality floor.

---

## Critical Pitfalls to Avoid

- **AI hallucination on ingredients, quantities, and food safety.** This is the highest-severity risk in the entire project. LLMs invent ingredients, produce nonsensical quantities, and generate recipes with dangerous food safety errors (toxic chemical combinations, incorrect preservation parameters, undercooked proteins). Prevention is multi-layered and non-optional: (1) all user-supplied ingredients must resolve against a canonical food database before reaching the AI -- unresolvable inputs are rejected, not forwarded; (2) every ingredient in every AI-generated recipe must be validated against the same database after generation; (3) dietary restriction checks must be code-level post-generation validation, not prompt-level instructions (prompts are probabilistic; code checks are enforceable); (4) a static lookup table of USDA safe internal temperatures must be injected into any recipe containing meat, poultry, fish, or eggs; (5) preservation, canning, pickling, and fermentation techniques must be explicitly excluded from the AI prompt and flagged by the post-generation validator if they appear anyway.
- **Non-deterministic recipes.** The same inputs will produce different recipes on successive AI calls. A recipe a user loved yesterday cannot be reproduced today. Prevention: every generated recipe is persisted to D1 with a stable ID immediately upon generation. The generation endpoint and the retrieval endpoint are separate. The user always retrieves the saved version. Recipe caching must ship simultaneously with generation -- non-determinism is an anti-feature, not a known limitation.
- **Lucia Auth is deprecated.** Any tutorial or dependency that references Lucia + Cloudflare is stale. Do not use it. Use Better Auth.
- **D1 write failures are expected, not exceptional.** Cloudflare documents that transient errors on writes are normal. Every D1 write path must have application-level retry logic with exponential backoff. Use `batch()` for multi-statement writes rather than manual transactions (Workers cannot hold open transactions across await boundaries).
- **KV eventual consistency on the post-generation read path.** A recipe just written to D1 may not be visible via KV for up to 60 seconds. Do not serve a freshly generated recipe through the KV-cached read path. Return it directly from D1 in the generation response and cache it client-side.
- **Wrong Nitro preset silently breaks SSR.** If the build uses the wrong preset (e.g., `node` or `vercel` instead of `cloudflare-pages`), the app deploys but renders nothing on first paint. Add a CI check that validates the preset. Every component must be tested against a deployed preview, not just local dev, because a documented bug causes custom content components to fail SSR in the Workers runtime specifically.
- **Workers memory and bundle size are hard caps.** 128 MB memory per isolate, 10 MB bundle after gzip on paid. Do not load the full recipe corpus into memory. Monitor bundle size at every CI step. If the Nuxt server bundle bloats, split functionality into separate Workers via Service Bindings.
- **Fusion recipes that sound plausible but taste terrible.** The AI has no palate and no understanding of texture compatibility or cooking-temperature conflicts. A flavor-compatibility scoring layer is not optional -- it is the safety net between the AI's creativity and the user's dinner. Start with a lookup table of known incompatible flavor profiles; refine over time with user feedback.

---

## Build Order Recommendation

This order is driven by two principles: each phase is independently testable and deployable, and dependencies flow strictly downward -- nothing in a later phase depends on something not yet built.

1. **Phase 1 -- Foundation (Data + Auth + Storage).** Set up the D1 database, run the schema migration, and seed the ingredients table. Implement auth middleware (Better Auth + JWT session cookies). Create the R2 bucket, upload the default placeholder image, and enable the public bucket on a custom domain. Verify everything with CLI queries and curl -- no UI yet.
2. **Phase 2 -- Core Read Path (Browse Recipes).** Wire up the Pages Functions API for recipes and ingredients. Build Nuxt SSR pages for recipe listing and detail. Add the KV read-through cache in front of D1. Integrate images from the R2 public bucket. Confirm end-to-end data flow from browser to D1 and back.
3. **Phase 3 -- Pantry and User Features.** Build the persistent pantry with autocomplete backed by the ingredient database. Implement dietary filter profiles (set once, persist). Add the favorites API and UI. Add generation history. All of these require Phase 1 auth to be solid.
4. **Phase 4 -- AI Generation Pipeline.** Create the AI Gateway instance with caching and rate limiting. Implement the RecipeGenerationWorkflow as a standalone Workers project. Build the trigger service (WorkerEntrypoint with Service Binding). Wire up the generate endpoint and frontend polling. Add the post-generation validation layer (ingredient resolution, dietary checks, safe-temperature injection, preservation exclusion). Add the prompt deduplication check against existing recipes. Run a full end-to-end integration test: ingredients in, Workflow runs, recipe appears in D1, image in R2, frontend renders.
5. **Phase 5 -- Fusion Intelligence and Polish.** Add the fusion framing layer: identify bridge ingredients/techniques and generate the "why this works" explanation for every recipe. Add the flavor-compatibility scoring layer. Implement ingredient substitution and recipe modification. Add novelty/confidence indicators to the UI. Wire up the "AI-generated" badge on every recipe card. Add the experimental-combination confirmation prompt for high-novelty recipes.
6. **Phase 6 -- Observability and Hardening.** Review AI Gateway cache hit rates and tune prompt-caching TTLs. Review D1 query patterns and confirm indexes cover all hot paths. Add bundle size monitoring to CI. Tune KV TTLs based on actual traffic. Add non-blocking font and image loading. Stress-test write paths under load and verify retry logic handles D1 transient errors correctly.

---

## Open Questions

1. **External ingredient/recipe API source.** Spoonacular, Edamam, and Open Food Facts are the leading candidates for the ingredient catalogue and for seeding the curated recipe database. This needs its own research pass focused on API quality, rate limits, cost, and license terms. The answer determines whether the ingredient database is sourced externally or built and maintained internally. This is a prerequisite for Phase 1.
2. **Flavor-compatibility model: build vs. buy.** The flavor-compatibility scoring layer is the intellectual core of the fusion product. The research identifies Plant Jammer's aromatic-profile approach and IBM Chef Watson's flavor-compound analysis as the two best models. The decision is whether to build a lightweight lookup table internally (fast to ship, limited coverage) or integrate with an existing flavor-pairing dataset or API (broader coverage, external dependency). This should be decided before Phase 5 begins, but the data source question from item 1 may inform it.
3. **Better Auth version stability.** The `better-auth-cloudflare` package is at v0.2.x. It is actively maintained but newer than the rest of the stack. Monitor for breaking changes in the first few months. Have a contingency plan (roll your own sessions using Lucia's guides as a reference, or switch to Auth.js with its D1 adapter) if the package stalls.
4. **AI model selection within AI Gateway.** The architecture recommends an Anthropic or OpenAI model as the primary for recipe text generation (strongest at creative, structured output) with a Workers AI Llama model as the cost-sensitive fallback. The specific model versions, pricing tiers, and quality benchmarks for this use case have not been validated. This should be a short spike in Phase 4.
5. **Paid vs. free tier for launch.** Several limits on the free tier (5M D1 rows read/day, 100K rows written/day, 50 subrequests per Worker invocation, 3 MB bundle size) will be hit during development and possibly at launch depending on traffic. The decision on when to move to a paid plan affects CI/CD strategy and should be made before Phase 4 begins.
6. **Photo/camera ingredient scanning.** Explicitly deferred to v2. Do not promise it in v1 marketing. Accuracy on unlabeled or obscure ingredients is not yet reliable enough to deliver on the expectation it sets.
