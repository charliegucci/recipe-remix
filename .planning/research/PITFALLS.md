# Pitfalls Research

> **Project:** Recipe Remix Engine
> **Stack:** Nuxt 4 + Cloudflare Workers / D1 / KV / R2 + AI recipe generation
> **Date:** 2026-02-04
> **Purpose:** Catalogue every known failure mode before a single line of production code is written. Each section ends with concrete prevention steps tied to this project's architecture.

---

## Cloudflare Platform Pitfalls

### D1 Limitations

D1 is SQLite under the hood, deployed as a single Durable Object. That lineage creates constraints that bite teams who treat it like a conventional relational database.

**1. Hard 10 GB per-database cap.**
Each D1 database maxes out at 10 GB. This limit cannot be raised. For Recipe Remix the recipe corpus, user pantries, generation history, and generated-recipe cache could collectively exceed this if stored naively in one database. Cloudflare's own recommendation is to shard horizontally: per-user, per-tenant, or per-entity databases.

*Recipe Remix impact:* The generated-recipe cache alone could balloon quickly if every AI output is persisted with full ingredient lists, steps, images references, and metadata. Plan a separate database or aggressive TTL eviction from day one.

**2. Single-writer, single-threaded throughput.**
Only one write transaction runs at a time. If an average write takes 5 ms you get roughly 200 writes/second. If concurrent requests queue up and the queue fills, D1 returns an "overloaded" error rather than waiting indefinitely.

*Recipe Remix impact:* "Save to favourites," "rate a recipe," and "update pantry" are all writes that could collide during a spike. The generation-history table will see the most write pressure. Implement retry logic (see Prevention Strategies) and keep write paths as short as possible.

**3. Transient errors are expected, not exceptional.**
Cloudflare's own documentation states that "a handful of errors every several hours is not unexpected." D1 now auto-retries read-only queries (SELECT, EXPLAIN, WITH) up to 2 times, but writes are not auto-retried. Any write path that does not have application-level retry will surface errors to users.

**4. No open transactions from Workers.**
Workers cannot hold a `BEGIN ... COMMIT` transaction open across multiple requests or across await boundaries in the way a long-lived server process can. Each Worker invocation is ephemeral. A transaction that starts but never commits (because the Worker crashed or timed out) would block the entire database. D1 deliberately prevents this by running every query in an implicit transaction.

*Recipe Remix impact:* If the generation pipeline needs to atomically write a new recipe and update a user's history row, use D1's `batch()` method, not a manual transaction.

**5. Full-table scans destroy throughput and cost.**
Every row touched counts toward the `rows_read` billing metric and toward CPU time. A query like `SELECT * FROM recipes` with no WHERE clause on a table with thousands of rows will be expensive on both axes.

*Recipe Remix impact:* The ingredient-matching query path is the highest-risk full-scan candidate. Every query that touches the recipe corpus must have an appropriate index. The `rows_read` value in the `meta` object of every response must be logged and monitored.

**6. FTS5 (full-text search) has export and casing gotchas.**
If full-text search is used for ingredient or recipe-name matching, databases with FTS5 virtual tables cannot be exported via `wrangler d1 export`. FTS5 table names must be lowercase or D1 returns "not authorized." PostgreSQL (Hyperdrive) is case-sensitive for identifiers while SQLite is not -- if there is any future migration path, use lowercase everywhere from the start.

**7. Free-tier limits are now enforced (since February 2025).**
Free plan: 5 million rows read / day, 100,000 rows written / day, 5 GB total storage. Exceeding any of these returns errors until the daily window resets at 00:00 UTC. Development and staging environments on the free tier will hit these limits during heavy local testing.

---

### Workers Execution Limits

Workers are isolate-based and ephemeral. The execution model is fundamentally different from a long-running Node.js server, and every assumption from that world needs re-examination.

**1. CPU time vs. wall-clock time.**
The default CPU time limit is 30 seconds (extendable to 5 minutes on the paid plan via `limits.cpu_ms`). Crucially, time spent waiting on network I/O (fetching from an AI provider, reading from D1, reading from R2) does NOT count toward CPU time. Only time actively executing JavaScript counts.

*Recipe Remix impact:* The AI recipe generation call itself will not burn CPU -- it is an awaited network fetch. But parsing, validating, and structuring the AI response, running ingredient-match scoring, or serializing large JSON payloads all consume CPU. If the post-generation processing pipeline becomes complex, it will hit the 30-second default faster than expected.

**2. 128 MB memory, hard cap on both plans.**
Workers cannot allocate more than 128 MB of memory per isolate. Loading a large in-memory recipe index, pre-computing embeddings, or holding multiple large response payloads simultaneously will crash the isolate.

*Recipe Remix impact:* Do not attempt to load the full recipe corpus into memory for matching. Query D1 or use KV lookups. If Vectorize (embedding search) is introduced later, every vector operation is a network call, not an in-memory scan.

**3. Worker bundle size: 3 MB (free) / 10 MB (paid) after gzip.**
The Worker script itself -- all bundled JavaScript, including any vendored libraries -- must fit within this limit. Nuxt's server-side bundle, combined with any utility libraries pulled into the Worker, can exceed 3 MB easily.

*Recipe Remix impact:* The Nuxt nitro server output is the Worker. Monitor `wrangler deploy --dry-run` compressed size at every CI step. If the bundle bloats, split functionality into separate Workers connected via Service Bindings rather than bundling everything together.

**4. 1-second startup time budget.**
A Worker must parse its global scope and execute top-level code within 1 second. Larger bundles take longer to parse. Any top-level initialization (database connection setup, config loading, etc.) eats into this budget.

**5. Subrequest limits: 50 (free) / 1000 (paid) per request.**
Every outgoing `fetch()` call from a Worker counts as a subrequest. A single recipe-generation request that calls the AI provider, fetches ingredient data, writes to D1, reads from KV, and fetches an image from R2 could easily consume 5-10 subrequests. On the free plan, a complex request chain that fans out will hit the 50-request ceiling.

**6. Only 6 simultaneous outbound connections per request.**
Regardless of plan, a single Worker invocation can have at most 6 concurrent outgoing connections. If the generation pipeline tries to fire off more than 6 parallel fetches (e.g., fetching nutritional data for every ingredient in parallel), the extras will queue internally and add latency.

---

### Nuxt Deployment Gotchas

Nuxt on Cloudflare Workers is a supported path but carries sharp edges, particularly around SSR, routing, and the build pipeline.

**1. The nitro preset must be correct.**
Nuxt uses the `cloudflare_module` preset when targeting Workers. Using the wrong preset (e.g., `node` or `vercel`) will produce a build that deploys but silently falls back to client-side rendering or fails entirely. The preset is auto-detected when using `create-cloudflare`, but is easy to misconfigure in custom setups.

*Recipe Remix impact:* The server-side rendering of recipe pages -- including initial ingredient data, generated recipe content, and nutritional info -- depends on the correct preset. A wrong preset means the first paint shows nothing, and the page only populates after a client-side hydration fetch. This is a trust-destroying experience on a recipe app.

**2. Custom content components fail to render server-side on Workers.**
A documented bug (confirmed 2025) shows that custom components used in markdown content files render correctly on the client after hydration but fail to render during SSR when built with `cloudflare_module`. This does not reproduce on Vercel or in local dev mode. It is environment-specific to the Cloudflare Workers runtime.

*Recipe Remix impact:* If recipe cards, ingredient badges, or nutritional callouts are implemented as custom content components, they will be invisible on first load in production even though they work perfectly in local development. Test every component variant against a deployed preview, not just locally.

**3. Dynamic routes require explicit handling.**
Nuxt dynamic routes (e.g., `/recipe/[id]`) do not automatically resolve on Workers. Each dynamic segment needs to be handled by the nitro server route, not by static file fallback. Missing route configuration produces 404s in production that never appear locally.

**4. CSS and font loading blocks FCP/LCP.**
When using component libraries like NuxtUI, the generated `entry.css` bundles fonts first and blocks rendering. Reported FCP times on Workers deployments reach 1.8 seconds on mobile -- unacceptable for a recipe app where the user wants to see content immediately.

*Recipe Remix impact:* Recipe cards and ingredient lists must appear above the fold fast. Font loading must be non-blocking. Use `font-display: swap`, subset fonts to only the characters actually used, and consider self-hosting fonts in R2 with aggressive cache headers rather than loading from a third-party CDN.

**5. Dashboard direct upload does not work with Functions.**
If the CI/CD pipeline ever needs a manual deploy (hotfix, rollback), the Cloudflare dashboard upload path will silently drop the Functions (server-side routes). All deployments must go through Wrangler CLI or a Git-connected build pipeline.

**6. Hybrid CSR and SSR under one domain is non-trivial.**
If some pages (e.g., the landing page) are statically generated and others (e.g., recipe generation, user accounts) require SSR, routing them correctly under a single domain requires careful Nitro configuration. Getting this wrong produces pages that appear to load but have no data.

---

## AI Recipe Generation Pitfalls

### Quality Issues

**1. Hallucinated ingredients and quantities.**
LLMs do not retrieve recipes -- they generate token sequences that statistically resemble recipes. This means they will invent ingredients, produce nonsensical quantities (e.g., "2 tablespoons of saffron" in a dish that uses none), and confidently present fabricated cooking techniques as established fact. The 2026 International AI Safety Report confirms hallucination remains a persistent, unsolved problem across all general-purpose AI systems.

*Recipe Remix impact:* Every AI-generated recipe must be validated against a known-good ingredient database before being shown to the user. Flag any ingredient the system cannot resolve against the database. Do not trust the model's quantities -- present them, but prompt the user to verify.

**2. Fusion combinations that are plausible-sounding but culinarily wrong.**
The "remix" angle is the product's core differentiator and its highest-risk surface. An AI model has no palate. It will happily combine flavor profiles that clash violently (e.g., heavily sweetened dessert sauces with fermented fish paste) and present the result as a novel fusion dish. It has no understanding of texture compatibility, cooking-temperature conflicts between ingredients, or how sauces emulsify.

*Recipe Remix impact:* The hybrid approach outlined in PROJECT.md (combining a recipe database with AI generation) is exactly the right call. The AI should propose combinations, but the system should score them against known flavor-compatibility rules before surfacing them. A flavor-profile matching layer is not optional -- it is the safety net between the AI's creativity and the user's dinner.

**3. Non-deterministic output across identical prompts.**
The same input ingredients and preferences will produce different recipes on successive calls. This makes automated testing of recipe quality nearly impossible and means users cannot reproduce a recipe they saw yesterday by re-entering the same inputs.

*Recipe Remix impact:* Every generated recipe must be persisted immediately upon generation with a stable ID. The generation endpoint must not be the retrieval endpoint. Once a recipe is generated, the user always retrieves the saved version, never re-generates.

**4. Nutritional information is frequently fabricated.**
AI models will produce calorie counts, macro breakdowns, and micronutrient data that are entirely invented. There is no calculation happening -- the model is pattern-matching against training data.

*Recipe Remix impact:* Do not display AI-generated nutritional data as fact. Either compute it server-side from a validated nutritional database (USDA, Open Food Facts) using the ingredient list and quantities, or label it explicitly as an estimate and link to a source.

---

### Safety Concerns (food allergies, bad combinations)

This is the single highest-stakes pitfall category for Recipe Remix. The documented real-world failures range from embarrassing to genuinely dangerous.

**1. Toxic chemical combinations generated as recipes.**
New Zealand supermarket Pak'nSave's "Savey Meal-Bot" generated recipes containing bleach, ammonia, and insect repellent when users input non-food household items. The model produced a "chlorine gas cocktail" recipe because it has no understanding of chemistry -- it only understands text patterns. Google's AI similarly suggested gluing cheese to pizza and eating rocks.

*Recipe Remix impact:* The input layer must validate that all user-supplied "ingredients" resolve to actual food items in a known database before passing them to the AI. If an input cannot be resolved, it must be rejected with a clear message, not forwarded to the model. This is a hard gate, not a soft warning.

**2. Preservation and canning recipes with incorrect safety parameters.**
UMN Extension researchers found that ChatGPT generated a preserved rhubarb recipe that combined two different preservation methods, had insufficient sugar, skipped pH-testing steps, and specified incorrect headspace. These are the kinds of errors that cause botulism. The model had no way to know the recipe was wrong because it does not understand food microbiology.

*Recipe Remix impact:* Recipe Remix's scope is fusion cooking, not preservation. But if a generated recipe includes any step involving canning, pickling, or long-term preservation, the system must either refuse to generate it (safest) or attach a mandatory disclaimer that links to USDA-verified preservation guidelines. Better yet: add "preservation techniques" to the explicit out-of-scope list in the prompt.

**3. Allergy and dietary restriction violations.**
AI models will occasionally generate recipes that violate the user's own stated dietary restrictions. A user who specifies "nut-free" may receive a recipe with almonds listed in step 3 but not in the ingredient list, or a sauce described as "creamy" that the model implicitly assumes contains peanuts.

*Recipe Remix impact:* Dietary restriction enforcement must happen as a post-generation validation pass, not as a prompt instruction alone. Every ingredient in every generated recipe must be checked against the user's restriction list before the recipe is returned. Prompt-level instructions are advisory to the model; code-level checks are enforceable.

**4. Cross-contamination and cooking temperature blindness.**
The model does not understand that chicken must reach 165 degrees Fahrenheit internally, that raw fish requires specific handling, or that certain mushrooms are toxic unless cooked thoroughly. It will happily produce recipes where a protein is undercooked because the step description sounds authoritative.

*Recipe Remix impact:* For any recipe containing meat, poultry, fish, or eggs, the system must inject validated safe-temperature guidelines into the relevant cooking steps. This can be a static lookup table keyed on protein type -- it does not need to be AI-generated.

---

### User Trust

**1. Users do not trust AI for novel/creative recipes.**
Oxford University research found that trust in AI-generated recipes is equivalent to human-authored recipes for standard, familiar dishes. For innovative or unusual combinations -- which is exactly what Recipe Remix produces -- trust drops significantly. The fusion/remix angle means the product launches directly into the low-trust zone.

*Recipe Remix impact:* The UI must not present generated recipes as authoritative. Every recipe needs visible provenance signals: what ingredients the user provided, what cuisine combinations were attempted, and a clear "AI-generated" label. The trust-building strategy is transparency, not authority.

**2. Disclaimers are necessary but insufficient on their own.**
DishGen and similar platforms already use disclaimers ("not verified for accuracy or safety"). Research shows that 84% of consumers engage more with companies that explain how they use AI. But a static disclaimer at the bottom of the page is invisible to most users -- especially on mobile where it scrolls off-screen.

*Recipe Remix impact:* Disclaimers must be contextual and inline. A small badge on every recipe card ("AI-generated -- verify before cooking") is more effective than a page-level disclaimer. For fusion recipes specifically, a "confidence" or "novelty" indicator that signals how experimental the combination is will calibrate user expectations.

**3. Over-reliance risk: users stop thinking critically.**
The 2026 International AI Safety Report flags that human oversight is undermined when systems present AI output with the same authority as verified information. In a recipe context, a user who trusts the app will follow instructions without checking -- and in a kitchen, that can mean food poisoning.

*Recipe Remix impact:* Design for "appropriate trust," not maximum trust. For high-novelty fusion recipes, add a deliberate friction point: a "This is an experimental combination -- do you want to proceed?" confirmation before showing the full recipe. This is not a bug -- it is a feature that protects users and reduces liability.

---

## Recipe App Specific Pitfalls

### Data Quality

**1. Ingredient normalization is deceptively hard.**
"1 can of tomatoes," "crushed tomatoes," "Roma tomatoes," and "tomato paste" are all different ingredients with different culinary properties. If the ingredient database does not normalize these, the matching engine will produce false positives (claiming a recipe matches when the user has a different form of the ingredient) and false negatives (missing matches because the names differ).

*Recipe Remix impact:* The pantry input system must map user-entered ingredients to canonical entries. This is a prerequisite for both the recipe-matching engine and the AI prompt construction. A user who types "tomatos" (misspelled) or "canned tomato" (non-canonical) must be matched to the correct ingredient entry. Fuzzy matching or an autocomplete backed by the ingredient database is not optional.

**2. Quantity and unit mismatch across cuisines.**
Japanese recipes use grams. American recipes use cups and tablespoons. European recipes use milliliters. A fusion recipe that combines techniques from multiple traditions will produce unit collisions that confuse users and break serving-size scaling.

*Recipe Remix impact:* The recipe output layer must normalize all quantities to a single system (metric is the safest default globally) and offer a unit-conversion toggle. The AI prompt should specify the unit system explicitly to reduce hallucinated mixed units.

**3. Ingredient freshness and substitutability.**
"Fresh basil" and "dried basil" are not interchangeable in quantity or flavor. The pantry system must distinguish between forms of the same ingredient, or the matching engine will suggest recipes that taste nothing like what the user has.

### Search / Matching Issues

**1. Ingredient-to-recipe matching degrades with sparse pantries.**
If a user has only 3-4 ingredients, exact-match queries against a recipe database will return zero results. The system must handle partial matches gracefully -- showing recipes sorted by "percentage of ingredients you have" rather than binary match/no-match.

*Recipe Remix impact:* This is precisely the scenario where the AI generation path should activate. The hybrid model (DB match for high-confidence full matches, AI generation for creative partial matches) must have a clear handoff threshold. If the DB returns fewer than N results above a confidence threshold, trigger generation.

**2. Semantic search vs. keyword search trade-offs.**
A user searching for "something spicy and creamy" needs semantic understanding, not keyword matching. But semantic search (via embeddings and vector similarity) adds latency and infrastructure complexity (Cloudflare Vectorize). Keyword search is fast but misses intent.

*Recipe Remix impact:* For v1, keyword search on ingredient names with fuzzy matching is sufficient for the pantry-matching path. The AI generation path handles the creative/semantic intent ("give me something surprising"). Do not over-engineer search before validating that users actually use it.

**3. KV cache staleness for recipe lookups.**
KV is eventually consistent. A recipe that was just generated and saved to D1 may not be visible in a KV cache read for up to 60 seconds (or longer if that edge location previously cached a negative lookup). A user who generates a recipe and immediately tries to retrieve it via a KV-cached path may get a "not found" error.

*Recipe Remix impact:* The generation response must return the recipe directly in the API response and persist it to the client state (local storage or in-memory) simultaneously. Do not rely on a subsequent KV read to serve the just-generated recipe. KV is for read-heavy cached lookups of previously-generated recipes, not for the immediate post-generation flow.

### Mobile UX Failures

**1. Screen real estate is the scarcest resource.**
Recipe apps are used on phones in kitchens, often with one hand, sometimes with greasy fingers. Information hierarchy on mobile must be ruthless. Every recipe card must communicate the essential information (what it is, how long it takes, difficulty, whether it matches the user's pantry) in the space above the fold on a 375px-wide viewport.

**2. Step-by-step instructions must survive app-switching.**
Users cook while following recipes. They will switch to a timer app, answer a phone call, or lock their screen mid-recipe. The step-progress state must persist across app switches. On a web app this means either local storage persistence or a service worker that keeps state alive. Losing progress mid-recipe is the single most common complaint in recipe app reviews.

*Recipe Remix impact:* Implement step-completion state in local storage keyed on recipe ID. The UI must show a "resume cooking" prompt if the user returns to a recipe mid-way. This is a mobile-critical feature, not a polish item.

**3. Touch targets and gesture conflicts.**
Serving-size adjustment buttons, ingredient checkboxes, and step-completion taps must all have minimum 44x44px touch targets (Apple HIG standard). Scroll-hijacking or custom gesture handlers that conflict with the browser's native scroll behavior will make the app feel broken on mobile.

**4. Font and image loading blocks first paint.**
On mobile networks (especially 3G or weak WiFi in a kitchen), large images and web fonts are the primary blockers to Largest Contentful Paint. Recipe images are large by nature. Recipe cards must use lazy loading for images below the fold and show a skeleton placeholder immediately.

**5. Unit conversion must be one tap.**
A user mid-cook who needs to convert grams to cups should not have to leave the app, open a calculator, and come back. Unit conversion must be inline, triggered by a single tap on any measurement.

**6. Serving-size scaling must be in-app.**
Doubling or halving a recipe's ingredient quantities is one of the most common in-app actions for recipe apps. If the user has to do this math manually or leave the app, the experience fails. The serving adjuster must update all quantities on the page in real time.

---

## Prevention Strategies

The following steps are ordered by priority: implement the highest-severity items before writing production code for the features they protect.

### P0 -- Implement Before Shipping

**1. Input validation gate for all ingredients.**
Every ingredient entered by the user or generated by the AI must be resolved against a canonical ingredient database before any recipe is generated or displayed. Unresolvable inputs (household chemicals, non-food items, misspellings with no close match) are rejected at the boundary. This prevents the toxic-combination class of failures entirely.

**2. Post-generation dietary restriction validation.**
After the AI returns a recipe, run a code-level check of every ingredient against the user's stated restrictions (nut-free, gluten-free, dairy-free, etc.). This is a synchronous check that blocks the recipe from being displayed if it fails. Prompt-level instructions to the AI are not sufficient -- they are probabilistic, not guaranteed.

**3. Persist every generated recipe immediately with a stable ID.**
The AI generation endpoint must save the recipe to D1 and return it in the same response. The client must cache it locally. No subsequent re-generation should ever occur for the same recipe. This solves non-determinism, enables "resume cooking," and provides an audit trail.

**4. D1 retry logic on all write paths.**
Every D1 write (save recipe, update pantry, log history, rate a recipe) must be wrapped in a retry loop with exponential backoff. D1 transient errors on writes are expected. A failed write that surfaces as a silent data loss is worse than a retry that adds 200ms of latency.

**5. Correct Nitro preset validation in CI.**
Add a build-step check that confirms the deployed Worker uses the `cloudflare_module` preset. If the preset is wrong, the build should fail, not silently deploy a broken SSR experience.

### P1 -- Implement Before First Real Users

**6. Inline AI-generated labels on every recipe.**
Every recipe card and recipe detail page must carry a visible "AI-generated" indicator. This is not a disclaimer buried in a footer -- it is a first-class UI element on the recipe itself. Pair it with a brief note: "Verify ingredients and cooking times before serving."

**7. Safe-temperature injection for protein-containing recipes.**
Maintain a static lookup table of USDA-recommended internal temperatures for all common proteins (chicken, beef, pork, fish, eggs). For any generated recipe that contains one of these proteins, inject the safe temperature into the relevant cooking step before displaying the recipe. This is a deterministic post-processing step, not an AI prompt.

**8. Exclusion list in AI prompts for dangerous recipe categories.**
The prompt sent to the AI must explicitly exclude preservation, canning, pickling, and fermentation techniques. These are high-risk categories where incorrect instructions can cause serious harm, and they are outside the core fusion-recipe value proposition. If the AI returns a recipe containing these techniques despite the instruction, the post-generation validator must flag it.

**9. KV vs D1 read path separation.**
Do not use KV as the primary read path for freshly-generated recipes. Use D1 directly for any recipe that was generated in the current session. KV is reserved for cached reads of recipes that are at least one full cache TTL old (default 60 seconds, tune upward for recipe data that changes infrequently).

**10. Mobile step-progress persistence.**
Before any recipe detail page ships, implement local-storage-backed step completion state. The "resume cooking" flow must work end to end on mobile before the feature is considered shippable.

### P2 -- Implement Before v1 Launch

**11. AI Gateway integration for all model calls.**
Route all AI inference calls through Cloudflare AI Gateway. This provides: request-level logging and analytics (required by the PROJECT.md quality bar), caching of identical prompts (reduces cost and latency for repeated ingredient combinations), rate limiting (prevents runaway AI spend), and model fallback (if the primary model is down, fall back to a secondary without user-visible failure).

**12. Workers AI rate limit awareness.**
Text generation via Workers AI is rate-limited to 300 requests per minute (model-dependent). At scale, Recipe Remix will hit this limit during traffic spikes. Design the generation path to queue requests gracefully and return a "generating..." state to the user rather than a 429 error. AI Gateway's rate limiting can enforce this at the gateway level before it hits Workers AI.

**13. D1 index strategy for all query patterns.**
Before populating the recipe database, define indexes for every query pattern the app will execute. The critical indexes: ingredient lookup by name (for pantry matching), recipe lookup by ID (for retrieval), recipe lookup by cuisine tag (for filtering), and any composite indexes needed for the partial-match scoring query. Run `PRAGMA optimize` after index creation.

**14. Bundle size monitoring in CI.**
Add `wrangler deploy --dry-run` to the CI pipeline and fail the build if the compressed Worker bundle exceeds 8 MB (leaving headroom below the 10 MB paid-plan limit). Log the size at every build for trend tracking.

**15. Flavor-compatibility scoring layer.**
Before a generated fusion recipe is surfaced, run the ingredient list through a flavor-compatibility scoring function. This can start simple: a lookup table of known incompatible flavor profiles (e.g., strongly sweetened dessert components + fermented fish sauces). Flag low-scoring combinations as "experimental" in the UI rather than blocking them entirely. Refine the scoring based on user feedback over time.

**16. Non-blocking font and image loading.**
All fonts must use `font-display: swap`. Recipe images must use lazy loading (`loading="lazy"`) for anything below the initial viewport. Image assets stored in R2 must be served with long cache headers (at minimum 1 week for recipe images, which are immutable once generated). Consider serving a low-resolution placeholder immediately and loading the full image asynchronously.

**17. Serving-size and unit-conversion controls.**
The recipe detail page must include an in-app serving adjuster (plus/minus buttons) that recalculates all ingredient quantities in real time. A unit-system toggle (metric/imperial) must be available on every recipe. These are not v2 features -- they are table stakes for a mobile recipe app.

**18. Confidence and novelty indicators in the UI.**
Each generated recipe should carry a signal of how experimental it is. This can be derived from the generation metadata: how many of the component cuisines are being combined, how many ingredients are unusual, how far the flavor profile deviates from known stable combinations. Present this as a simple "novelty level" indicator (e.g., mild / adventurous / experimental) so users can self-select their comfort level. High-novelty recipes get the confirmation prompt described in the User Trust section.

---

## Quick-Reference: Limits Cheat Sheet

| Resource | Free | Paid | Notes |
|---|---|---|---|
| D1 storage per database | 5 GB total across all DBs | 10 GB per database | Hard cap, cannot be raised |
| D1 rows read | 5M / day | 25B / month | Full table scans burn this fast |
| D1 rows written | 100K / day | 50M / month | Single-writer; queue under load |
| Workers CPU time | 10 ms | 30 s default, up to 5 min | Network I/O does NOT count |
| Workers memory | 128 MB | 128 MB | Both plans, hard cap |
| Workers bundle size | 3 MB (gzip) | 10 MB (gzip) | Monitor every build |
| Workers subrequests | 50 / request | 1000 / request | Every fetch() counts |
| Simultaneous outbound connections | 6 | 6 | Both plans |
| KV read consistency | Eventually consistent | Eventually consistent | Up to 60s+ propagation delay |
| Workers AI text generation | 300 req/min | 300 req/min | Model-dependent; see rate limit docs |
| Static assets per Worker version | 20,000 | 100,000 | Individual file max 25 MiB |
| Worker startup time | 1 second | 1 second | Top-level code must finish in this window |
| AI Gateway logs (free) | 100K total | 1M total | Per account, not per gateway |

---

*Sources consulted: Cloudflare D1 docs (limits, FAQ, best practices, release notes), Cloudflare Workers docs (limits, Nuxt guide, static assets), Cloudflare KV docs (FAQ, how KV works), Cloudflare R2 docs, Cloudflare Workers AI limits, Cloudflare AI Gateway docs, Cloudflare Pages known issues, NPR / OPB reporting on deadly AI recipes, UMN Extension AI recipe safety analysis, The Register (Pak'nSave Savey Meal-Bot), Oxford University AI chef trust research, 2026 International AI Safety Report, FAO AI for Food Safety report, IAFP 2025 symposium coverage, recipe app UX case studies (Tubik Studio, SideChef, Medium case studies).*
