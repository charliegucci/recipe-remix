# Phase 9: UI/UX Polish - Research

**Researched:** 2026-02-13
**Domain:** Vue 3 UI/UX, Tailwind CSS animations, accessibility, loading states
**Confidence:** HIGH

## Summary

Phase 9 focuses on polishing the user experience across Recipe Remix with skeleton loaders, progress indicators, user-friendly error states, mobile touch target improvements, page transitions, and UI consistency. The app is already built on a solid foundation with Nuxt 4, Tailwind v4, and VueUse, with several UX patterns already implemented (RecipeCardSkeleton, GenerationProgress component, error handling in useGenerate composable).

The research reveals that modern UI polish in 2026 emphasizes **purpose over decoration**: animations should enhance usability, not distract; loading states should reduce perceived wait time and prevent layout shift; error messages should be actionable and user-friendly; and mobile interactions should meet WCAG 2.2 Level AA standards (24×24px minimum, 44×44px recommended for touch targets).

Key findings show that Vue 3's `<Transition>` component, native View Transitions API support in Nuxt 4, Tailwind v4's CSS-first animation utilities, and VueUse's `useInfiniteScroll` provide all the tools needed for this phase. No new libraries are required—we can build on existing patterns and enhance them systematically.

**Primary recommendation:** Take an incremental approach—audit existing components for consistency gaps, enhance loading states with skeletons where missing, improve error boundaries with retry patterns, ensure all interactive elements meet 44×44px touch targets, add subtle transitions using Tailwind utilities, and conduct a final spacing/alignment pass using consistent Tailwind spacing tokens.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Nuxt 4 | (compat layer) | Framework with View Transitions API support | Native browser transitions, SSR-safe loading states, built-in page transitions |
| Tailwind CSS | v4 | Utility-first CSS with animation utilities | Built-in transition/animation classes, mobile-first responsive design, CSS-first config |
| VueUse | ^14.2.0 | Vue composition utilities | SSR-safe localStorage, useInfiniteScroll, transition helpers |
| Vue 3 | 3.3+ (via Nuxt) | Reactive framework with Transition component | Built-in `<Transition>` and `<TransitionGroup>`, errorCaptured lifecycle hook |

### Supporting (May Consider)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @formkit/auto-animate | Latest | Zero-config animations | If manual transition code becomes repetitive (optional enhancement) |
| vue-error-boundary | Latest | Error boundary component | If custom error boundaries become complex (current errorCaptured approach sufficient) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in CSS animations | Animation libraries (GSAP, Framer Motion) | Tailwind utilities are sufficient for micro-interactions; heavy libraries add unnecessary bundle size |
| Custom skeletons | UI library skeletons (PrimeVue, Vuetify) | Custom components give full control and match existing design system |
| Native View Transitions | Vue Transition only | Use View Transitions API where supported (Chrome 111+) with Vue Transition fallback |

**Installation:**
```bash
# No new packages required for core requirements
# Optional enhancements:
npm install @formkit/auto-animate  # Only if needed for complex list animations
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── components/
│   ├── skeleton/              # Skeleton loader components
│   │   ├── RecipeDetailSkeleton.vue
│   │   ├── RecipeListSkeleton.vue
│   │   └── (reuse RecipeCardSkeleton.vue)
│   ├── error/                 # Error boundary components
│   │   ├── ErrorBoundary.vue
│   │   └── ErrorMessage.vue
│   └── transitions/           # Reusable transition wrappers (optional)
│       └── FadeSlideTransition.vue
├── composables/
│   └── useErrorHandler.ts     # Centralized error handling logic
└── assets/css/
    └── animations.css         # Custom keyframe animations (if needed)
```

### Pattern 1: Skeleton Loader Pattern
**What:** Display content-shaped placeholders during loading to reduce perceived wait time and prevent layout shift
**When to use:** Any async data fetch that renders list items or detail pages
**Example:**
```vue
<template>
  <div v-if="pending">
    <RecipeCardSkeleton v-for="i in 6" :key="i" />
  </div>
  <div v-else>
    <RecipeCard v-for="recipe in recipes" :key="recipe.id" :recipe="recipe" />
  </div>
</template>

<script setup>
const { data: recipes, pending } = await useFetch('/api/recipes')
</script>
```

**Current implementation:** RecipeCardSkeleton.vue exists and follows best practices with `animate-pulse` and proper aspect ratios.

### Pattern 2: Progress Indicator with Status Steps
**What:** Multi-step progress indicator showing current step and completion status
**When to use:** Long-running operations with distinct phases (AI generation, file uploads)
**Example:**
```vue
<!-- Current GenerationProgress.vue already implements this pattern -->
<GenerationProgress
  :status="status"
  :error-message="errorMessage"
/>
```

**Enhancement needed:** Add estimated time remaining based on polling duration.

### Pattern 3: Error Boundary with Retry
**What:** Catch errors in component subtree, display user-friendly message with retry action
**When to use:** Wrap error-prone async operations (API calls, image loads)
**Example:**
```vue
<template>
  <div v-if="error" class="error-state">
    <ErrorMessage
      :title="errorTitle"
      :message="errorMessage"
      @retry="handleRetry"
    />
  </div>
  <slot v-else />
</template>

<script setup>
import { errorCaptured } from 'vue'

const error = ref(null)

errorCaptured((err) => {
  error.value = err
  return false // Stop propagation
})

function handleRetry() {
  error.value = null
  emit('retry')
}
</script>
```

### Pattern 4: Touch-Friendly Interactive Elements
**What:** Ensure all clickable/tappable elements meet minimum size requirements
**When to use:** All buttons, links, form controls, and interactive icons
**Example:**
```vue
<!-- Minimum 44×44px touch target -->
<button class="min-w-[44px] min-h-[44px] flex items-center justify-center">
  <svg class="w-5 h-5">...</svg>
</button>

<!-- Expand touch area with padding -->
<a href="#" class="inline-block p-3"> <!-- 3*4px = 12px, likely adds to 44px total -->
  Text Link
</a>
```

**Audit needed:** Check existing buttons in AppHeader.vue, FavoriteButton.vue, form controls.

### Pattern 5: Page Transitions with View Transitions API
**What:** Smooth element morphing between page navigations using native browser API
**When to use:** Recipe list → detail page transitions, authenticated page navigation
**Example:**
```vue
<!-- nuxt.config.ts -->
export default defineNuxtConfig({
  app: {
    pageTransition: {
      name: 'page',
      mode: 'out-in'
    },
    viewTransition: true // Enable View Transitions API
  }
})

<!-- CSS -->
<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
}
</style>
```

### Pattern 6: Micro-Animations with Tailwind
**What:** Subtle transitions on hover, focus, and state changes
**When to use:** Buttons, cards, form inputs, favoriting actions
**Example:**
```vue
<!-- Already implemented in FavoriteButton.vue -->
<button class="transition-all duration-200 hover:shadow-md active:scale-90">
  <svg class="w-5 h-5 transition-colors hover:text-red-500">...</svg>
</button>

<!-- Add to RecipeCard.vue -->
<NuxtLink class="group transition-all duration-200 hover:scale-[1.02]">
  <div class="overflow-hidden">
    <img class="transition-transform duration-300 group-hover:scale-110" />
  </div>
</NuxtLink>
```

### Anti-Patterns to Avoid
- **Overly long animations:** Keep durations 200-500ms; anything longer feels sluggish
- **Animation for decoration:** Every animation should serve a purpose (indicate state, guide attention, provide feedback)
- **Inconsistent timing:** Use a limited set of durations (200ms, 300ms, 500ms) across the app
- **Missing reduced-motion support:** Always respect `prefers-reduced-motion` media query
- **Spinner overload:** Use skeletons instead of generic spinners for content loading
- **Layout shift:** Skeleton dimensions must match final content to prevent CLS
- **Technical error messages:** Never show raw error codes/stack traces to end users
- **Small touch targets:** Ensure 44×44px minimum for all interactive elements on mobile

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton loaders | Generic loading spinner library | Tailwind utilities + custom components | Skeletons are simple CSS (bg-gray-200 animate-pulse); custom components match your exact layout |
| Error boundaries | Complex error handling state machines | errorCaptured hook + simple state | Vue's errorCaptured provides all needed functionality; libraries add overhead |
| Progress indicators | Animated progress bar library | CSS transitions + step state | Multi-step progress is just conditional rendering; CSS handles animation |
| Touch target sizing | JavaScript click area detection | Tailwind spacing classes (p-3, min-w-[44px]) | CSS handles sizing; no need for JS measurement |
| Page transitions | Heavy animation library (GSAP) | View Transitions API + Vue Transition | Native browser API is more performant; Vue Transition covers fallback |
| Micro-animations | Complex animation orchestration | Tailwind transition utilities | Simple transitions don't need a library; add complexity only when needed |

**Key insight:** UI polish is about attention to detail and consistency, not complex tooling. Tailwind utilities, Vue's built-in features, and native browser APIs provide everything needed. Focus on systematic application rather than searching for the "perfect" library.

## Common Pitfalls

### Pitfall 1: Skeleton Dimensions Mismatch
**What goes wrong:** Skeleton loader has different height/spacing than actual content, causing layout shift when data loads (poor Core Web Vitals CLS score)
**Why it happens:** Skeletons designed without measuring actual rendered content
**How to avoid:** Use exact aspect-ratios, padding, and spacing that match final content; test with real data
**Warning signs:** Visible "jump" when loading completes; Lighthouse CLS warnings

### Pitfall 2: Progress Without Real Progress
**What goes wrong:** Progress bar shows indeterminate spinner or fake progress for long operations, increasing user anxiety
**Why it happens:** No way to track actual completion percentage
**How to avoid:** For AI generation, track polling attempts and show step-based progress (step 1/4) rather than percentage; show estimated time based on polling duration
**Warning signs:** Users report uncertainty about whether app is working; high abandonment during generation

### Pitfall 3: Technical Error Messages
**What goes wrong:** Users see "500 Internal Server Error" or "Network request failed" without actionable guidance
**Why it happens:** Displaying raw error objects/messages directly in UI
**How to avoid:** Map error status codes to user-friendly messages; always include retry button; log technical details server-side
**Warning signs:** Users screenshot errors for support tickets; confusion about what went wrong
**Current implementation:** useGenerate.ts already has good error mapping (lines 89-101)

### Pitfall 4: Insufficient Touch Targets
**What goes wrong:** Mobile users struggle to tap small buttons/links; high mis-tap rate
**Why it happens:** Designing for desktop mouse precision without considering finger size
**How to avoid:** Enforce 44×44px minimum for all interactive elements; use Tailwind's `p-3` (12px) padding to expand touch areas
**Warning signs:** User testing shows repeated tap attempts; accessibility audit failures

### Pitfall 5: Animation Overload
**What goes wrong:** Too many simultaneous animations distract and slow down the UI
**Why it happens:** Adding transitions to every element without considering cumulative effect
**How to avoid:** Limit animations to state changes, user actions, and page transitions; use animation sparingly for emphasis
**Warning signs:** UI feels "busy"; users mention "too much motion"; performance drops on low-end devices

### Pitfall 6: Ignoring Reduced Motion Preference
**What goes wrong:** Users with motion sensitivity or vestibular disorders experience discomfort
**Why it happens:** Not respecting `prefers-reduced-motion` media query
**How to avoid:** Wrap animations in `@media (prefers-reduced-motion: no-preference)` or use Tailwind's `motion-safe:` variant
**Warning signs:** Accessibility complaints; WCAG 2.1 violations (2.3.3 Animation from Interactions)

### Pitfall 7: Missing Empty/Error States
**What goes wrong:** App shows blank screen or generic error when no data or error occurs
**Why it happens:** Only designing "happy path" with data
**How to avoid:** Design and implement empty states, error states, and loading states for every data-dependent component
**Warning signs:** Users confused when list is empty; unclear what to do after error

### Pitfall 8: Inconsistent Spacing and Alignment
**What goes wrong:** Components have slightly different padding, margins, or alignment, making UI feel unpolished
**Why it happens:** Using arbitrary values instead of design tokens; copy-pasting without checking consistency
**How to avoid:** Use Tailwind's spacing scale (4px base unit); audit all components for spacing consistency; use consistent gap values (gap-3, gap-4, gap-6)
**Warning signs:** Visual "off-ness" even when individual components look fine; difficulty explaining design decisions

## Code Examples

Verified patterns from official sources and current codebase:

### Example 1: Skeleton Loader with Proper Dimensions
```vue
<!-- RecipeCardSkeleton.vue - Current implementation is already correct -->
<template>
  <div class="bg-white rounded-xl shadow-sm overflow-hidden">
    <!-- Image: exact aspect ratio -->
    <div class="aspect-[4/3] bg-gray-200 animate-pulse"></div>

    <!-- Body: exact padding match -->
    <div class="p-3 md:p-4">
      <!-- Title: measured height -->
      <div class="h-4 bg-gray-200 animate-pulse rounded w-3/4 mb-2"></div>

      <!-- Description: measured spacing -->
      <div class="space-y-2 mb-3">
        <div class="h-3 bg-gray-200 animate-pulse rounded w-full"></div>
        <div class="h-3 bg-gray-200 animate-pulse rounded w-5/6"></div>
      </div>

      <!-- Metadata -->
      <div class="flex items-center gap-3">
        <div class="h-3 bg-gray-200 animate-pulse rounded w-16"></div>
        <div class="h-3 bg-gray-200 animate-pulse rounded w-16"></div>
      </div>
    </div>
  </div>
</template>
```

### Example 2: Recipe Detail Page Skeleton
```vue
<!-- RecipeDetailSkeleton.vue - NEW -->
<template>
  <div class="recipe-detail-skeleton">
    <!-- Hero image skeleton -->
    <div class="aspect-[4/3] sm:aspect-[16/9] bg-gray-300 animate-pulse"></div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- Title -->
      <div class="h-8 bg-gray-200 animate-pulse rounded w-2/3"></div>

      <!-- Metadata badges -->
      <div class="flex gap-3">
        <div class="h-10 bg-gray-200 animate-pulse rounded w-24"></div>
        <div class="h-10 bg-gray-200 animate-pulse rounded w-24"></div>
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <div class="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
        <div class="h-4 bg-gray-200 animate-pulse rounded w-5/6"></div>
      </div>

      <!-- Ingredients section -->
      <div class="bg-white rounded-lg p-6 space-y-3">
        <div class="h-6 bg-gray-200 animate-pulse rounded w-32 mb-4"></div>
        <div class="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 animate-pulse rounded w-2/3"></div>
        <div class="h-4 bg-gray-200 animate-pulse rounded w-4/5"></div>
      </div>
    </div>
  </div>
</template>
```

### Example 3: Progress Indicator with Time Estimate
```vue
<!-- GenerationProgress.vue enhancement -->
<script setup lang="ts">
const props = defineProps<{
  status: 'idle' | 'generating' | 'validating' | 'imaging' | 'complete' | 'error'
  errorMessage?: string
  startTime?: Date // NEW: Track when generation started
}>()

// Calculate elapsed time and estimate remaining
const elapsedSeconds = computed(() => {
  if (!props.startTime) return 0
  return Math.floor((Date.now() - props.startTime.getTime()) / 1000)
})

// Estimate: AI generation typically takes 30-60 seconds
const estimatedRemaining = computed(() => {
  if (props.status === 'complete') return 0
  const elapsed = elapsedSeconds.value
  // Assume 45 seconds average, show remaining
  const estimated = Math.max(0, 45 - elapsed)
  return estimated
})
</script>

<template>
  <div class="space-y-4">
    <!-- Steps (existing) -->
    <div class="space-y-3">
      <!-- ... existing step display ... -->
    </div>

    <!-- Time estimate (NEW) -->
    <div v-if="status !== 'complete' && status !== 'error'" class="text-sm text-gray-600 text-center">
      <span v-if="estimatedRemaining > 0">
        About {{ estimatedRemaining }} seconds remaining...
      </span>
      <span v-else>
        Almost done...
      </span>
    </div>

    <!-- Error (existing) -->
    <div v-if="status === 'error' && errorMessage">
      <!-- ... existing error display ... -->
    </div>
  </div>
</template>
```

### Example 4: Error Boundary Component with Retry
```vue
<!-- ErrorBoundary.vue - NEW -->
<script setup lang="ts">
import { errorCaptured } from 'vue'

const props = defineProps<{
  fallbackTitle?: string
  fallbackMessage?: string
}>()

const emit = defineEmits<{
  retry: []
}>()

const error = ref<Error | null>(null)
const hasError = computed(() => error.value !== null)

// Catch errors in child components
errorCaptured((err: Error) => {
  error.value = err
  console.error('ErrorBoundary caught:', err)
  return false // Stop error propagation
})

function handleRetry() {
  error.value = null
  emit('retry')
}
</script>

<template>
  <div v-if="hasError" class="error-boundary-fallback p-6 bg-red-50 border border-red-200 rounded-lg">
    <div class="flex gap-3">
      <svg class="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-red-900 mb-1">
          {{ fallbackTitle || 'Something went wrong' }}
        </h3>
        <p class="text-sm text-red-700 mb-4">
          {{ fallbackMessage || 'We encountered an unexpected error. Please try again.' }}
        </p>
        <button
          @click="handleRetry"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>

  <slot v-else />
</template>
```

### Example 5: Touch-Friendly Button Sizing
```vue
<!-- Ensure minimum 44×44px touch targets -->
<template>
  <!-- Icon-only button -->
  <button
    class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
    aria-label="Add to favorites"
  >
    <svg class="w-5 h-5">...</svg>
  </button>

  <!-- Text button with padding -->
  <button class="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
    <!-- py-3 = 12px top + 12px bottom + text height = ~44px -->
    Generate Recipe
  </button>

  <!-- Link with expanded touch area -->
  <NuxtLink
    to="/pantry"
    class="inline-block p-3 text-gray-600 hover:text-gray-900 transition-colors"
  >
    <!-- p-3 = 12px all sides, expands touch area around text -->
    My Pantry
  </NuxtLink>

  <!-- Mobile navigation -->
  <nav class="flex gap-2 md:gap-6">
    <!-- Smaller gap on mobile for touch targets -->
    <NuxtLink class="px-3 py-2 min-h-[44px] flex items-center">Home</NuxtLink>
    <NuxtLink class="px-3 py-2 min-h-[44px] flex items-center">Pantry</NuxtLink>
  </nav>
</template>
```

### Example 6: Page Transitions with Nuxt 4
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    pageTransition: {
      name: 'fade',
      mode: 'out-in',
      appear: true // Run on initial page load
    },
    // Enable native View Transitions API (experimental)
    viewTransition: true
  }
})
```

```css
/* assets/css/main.css */
/* Vue Transition fallback for browsers without View Transitions API */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* View Transitions API (Chrome 111+) */
@media (prefers-reduced-motion: no-preference) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 300ms;
    animation-timing-function: ease-in-out;
  }
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 1ms !important;
  }
}
```

### Example 7: Micro-Animations with Tailwind
```vue
<!-- RecipeCard.vue enhancement -->
<template>
  <NuxtLink
    :to="`/recipe/${recipe.slug}`"
    class="block bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 motion-safe:hover:scale-[1.02]"
  >
    <div class="relative overflow-hidden group">
      <img
        :src="imageUrl"
        :alt="recipe.title"
        class="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <!-- Favorite button -->
      <div class="absolute top-2 right-2">
        <FavoriteButton :recipe-id="recipe.id" />
      </div>
    </div>

    <div class="p-3 md:p-4">
      <h3 class="font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
        {{ recipe.title }}
      </h3>
      <!-- ... rest of card ... -->
    </div>
  </NuxtLink>
</template>
```

### Example 8: Consistent Spacing Audit
```vue
<!-- Before: Inconsistent spacing -->
<div class="mb-3">          <!-- 12px -->
  <div class="mb-2">        <!-- 8px -->
    <div class="gap-2">     <!-- 8px -->
      <div class="py-2.5">  <!-- 10px (arbitrary) -->

<!-- After: Consistent spacing scale -->
<div class="mb-4">          <!-- 16px - use 4/6/8 for major spacing -->
  <div class="mb-3">        <!-- 12px - use 3 for sub-sections -->
    <div class="gap-3">     <!-- 12px - consistent with mb-3 -->
      <div class="py-3">    <!-- 12px - use multiples of 4 -->
```

**Spacing guidelines:**
- **Tight spacing (gap-2, p-2):** Within small components, inline elements
- **Default spacing (gap-3, p-3, mb-3):** Between related elements, component padding
- **Medium spacing (gap-4, mb-4):** Between component sections
- **Large spacing (gap-6, mb-6, py-6):** Between major page sections
- **Extra large (gap-8, mb-8, py-8):** Page-level spacing, hero sections

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic spinners for loading | Content-shaped skeleton loaders | ~2018 | Reduces perceived wait time; prevents layout shift (better CLS) |
| JavaScript-heavy animations | CSS transitions + native View Transitions API | 2023-2024 | Better performance; smoother animations; less JS overhead |
| 48dp touch targets (Material 2) | 44×44px minimum (WCAG 2.2 Level AA) | 2023 (WCAG 2.2 release) | Legally required for accessibility; better mobile UX |
| Vue Transition only | View Transitions API + Vue Transition fallback | 2024 (Chrome 111+) | Native browser animations are more performant when available |
| Tailwind v3 JIT config | Tailwind v4 CSS-first config | 2024 | Animations defined in CSS @theme blocks; cleaner config |
| Page-level error handling | Component-level error boundaries | Ongoing | Better error isolation; clearer error context |
| Fixed spacing values | Design token spacing scale | 2020+ | Consistency across design systems; easier to maintain |

**Deprecated/outdated:**
- **Generic loading spinners:** Replace with skeleton loaders that match content structure
- **JavaScript touch target detection:** Use CSS sizing (min-w/min-h) instead of measuring click areas in JS
- **Animation libraries for simple transitions:** Tailwind utilities handle 90% of UI polish animations
- **Technical error messages in UI:** Always map to user-friendly messages with actionable next steps
- **36px touch targets:** WCAG 2.2 (June 2025 legally enforceable) requires 24px minimum, 44px recommended

## Open Questions

1. **Should we add estimated time remaining to AI generation progress?**
   - What we know: useGenerate.ts polls every 2 seconds; typical generation takes 30-60 seconds
   - What's unclear: Whether showing time estimate improves UX or creates anxiety if estimate is wrong
   - Recommendation: Start with step-based progress (current implementation); add time estimate in later iteration if user testing shows need

2. **Should we implement global error boundary or page-level boundaries?**
   - What we know: Vue's errorCaptured hook works at any component level; Nuxt provides error.vue for page-level errors
   - What's unclear: Best granularity for error boundaries in this app
   - Recommendation: Start with page-level error boundaries around major features (recipe list, generation form); add component-level boundaries only where needed

3. **Should we use View Transitions API for all page transitions or just specific routes?**
   - What we know: View Transitions API is Chrome 111+ only; Nuxt supports experimental viewTransition flag
   - What's unclear: Whether to enable globally or per-route; performance impact on recipe list → detail transition
   - Recommendation: Enable globally with `viewTransition: true` in nuxt.config.ts; provide Vue Transition fallback for other browsers

4. **Do we need a dedicated animation configuration or ad-hoc Tailwind classes?**
   - What we know: Tailwind v4 supports custom animations in CSS @theme blocks; current app uses inline Tailwind classes
   - What's unclear: Whether to centralize animation timing/easing or keep it distributed
   - Recommendation: Keep ad-hoc Tailwind classes for now; extract to @theme config only if duplication becomes problematic

5. **Should we add reduced-motion support to existing animations?**
   - What we know: WCAG 2.1 requires respecting prefers-reduced-motion; Tailwind has motion-safe: variant
   - What's unclear: Which animations should be disabled vs. simplified for reduced motion
   - Recommendation: Use motion-safe: prefix for decorative animations (hover scale, image zoom); keep functional animations (page transitions, loading indicators) but reduce duration to 1ms

## Sources

### Primary (HIGH confidence)
- [Vue 3 Official Documentation - Transition Component](https://vuejs.org/guide/built-ins/transition) - Vue's built-in transition system
- [Nuxt 4 Transitions Documentation](https://nuxt.com/docs/4.x/getting-started/transitions) - Page and layout transitions
- [Tailwind CSS v4 Animation Utilities](https://tailwindcss.com/docs/animation) - Built-in animation classes
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) - Mobile-first breakpoints
- [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) - 24×44px Level AA requirement
- [WCAG 2.1 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) - 44×44px Level AAA recommendation
- Current codebase: RecipeCardSkeleton.vue, GenerationProgress.vue, useGenerate.ts, FavoriteButton.vue

### Secondary (MEDIUM confidence)
- [Vue Skeleton Loading Screen using Suspense Components](https://learnvue.co/articles/vue-skeleton-loading) - Vue 3 skeleton patterns
- [Vue.js Error Boundaries - Vue School](https://vueschool.io/articles/vuejs-tutorials/what-is-a-vue-js-error-boundary-component/) - errorCaptured hook usage
- [Enhancing Vue Apps with Native View Transitions](https://medium.com/@natalia.afanaseva/enhancing-vue-apps-with-native-view-transitions-b25045be7a4e) - View Transitions API integration
- [Accessible Target Sizes Cheatsheet — Smashing Magazine](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/) - Touch target best practices
- [UI/UX Evolution 2026: Micro-Interactions & Motion](https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/) - Animation timing and easing
- [Design Systems in 2026: Predictions, Pitfalls, and Power Moves](https://rydarashid.medium.com/design-systems-in-2026-predictions-pitfalls-and-power-moves-f401317f7563) - Design token trends
- [Carbon Design System - Spacing](https://carbondesignsystem.com/elements/spacing/overview/) - Spacing token patterns
- [Master Transitions in Tailwind v4](https://tailkits.com/blog/tailwind-transitions-guide/) - Tailwind v4 transition utilities

### Tertiary (LOW confidence)
- Various npm packages (vue-error-boundary, @formkit/auto-animate) - Optional enhancements, not required for core functionality

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All tools are already installed and verified in package.json and nuxt.config.ts
- Architecture patterns: **HIGH** - RecipeCardSkeleton and GenerationProgress already demonstrate proper patterns; error handling in useGenerate is already user-friendly
- Pitfalls: **HIGH** - Verified with official WCAG docs and current codebase review
- Touch target requirements: **HIGH** - WCAG 2.2 (June 2025 enforcement) and platform guidelines (iOS/Material) all specify 44×44px
- Animation timing: **MEDIUM** - General 200-500ms guideline is well-established, but optimal timing requires user testing
- View Transitions API support: **MEDIUM** - Chrome 111+ only (as of 2026); fallback pattern is clear but adoption may be lower

**Research date:** 2026-02-13
**Valid until:** 2026-05-13 (90 days for UI/UX patterns; stable domain)
