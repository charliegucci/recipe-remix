<script setup lang="ts">
import { minutesToISO8601 } from '~/utils/duration-formatter'

interface Ingredient {
  name: string
  quantity: string
  unit: string
}

interface Recipe {
  id: string
  title: string
  slug: string
  description: string | null
  ingredients: Ingredient[]
  instructions: string[]
  cuisineTags: string[]
  dietaryTags: string[]
  cookTime: number | null
  difficulty: 'easy' | 'medium' | 'hard' | null
  explanation: string | null
  servings: number
  imageKey: string | null
  source: string
  featured: boolean
  createdAt: Date
  avgRating: number | null
  totalReviews: number
}

const route = useRoute()
const slug = route.params.slug as string

// Fetch recipe data with SSR using slug
const { data: recipe, error, refresh } = await useFetch<Recipe>(`/api/recipes/${slug}`)

// Local error state for friendly error display (instead of Nuxt error page)
const fetchError = ref<string | null>(null)

if (error.value) {
  fetchError.value = error.value.statusMessage || 'Recipe not found'
}

if (!recipe.value && !fetchError.value) {
  fetchError.value = 'Recipe not found'
}

// SEO metadata with OpenGraph and Twitter cards
const siteUrl = 'https://remix-recipe.com'
const recipeUrl = `${siteUrl}/recipe/${slug}`

if (recipe.value) {
  const ogImage = recipe.value.imageKey
    ? `${siteUrl}/api/images/${recipe.value.imageKey}`
    : `${siteUrl}/og-default.svg`

  useServerSeoMeta({
    title: `${recipe.value.title} | Recipe Remix`,
    description: recipe.value.description || `Delicious ${recipe.value.cuisineTags.join(' & ')} fusion recipe`,
    ogTitle: recipe.value.title,
    ogDescription: recipe.value.description || `Try this ${recipe.value.difficulty || 'delicious'} fusion recipe`,
    ogImage: ogImage,
    ogType: 'website',
    ogUrl: recipeUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: recipe.value.title,
    twitterDescription: recipe.value.description || `Delicious fusion recipe from Recipe Remix`
  })

  // Canonical URL
  useHead({
    link: [{ rel: 'canonical', href: recipeUrl }]
  })

  // Recipe structured data (JSON-LD)
  useSchemaOrg([
    defineRecipe({
      name: recipe.value.title,
      description: recipe.value.description || undefined,
      image: ogImage,
      author: { '@type': 'Organization', name: 'Recipe Remix' },
      datePublished: recipe.value.createdAt,
      cookTime: recipe.value.cookTime ? minutesToISO8601(recipe.value.cookTime) : undefined,
      totalTime: recipe.value.cookTime ? minutesToISO8601(Math.ceil(recipe.value.cookTime * 1.3)) : undefined,
      recipeYield: `${recipe.value.servings} servings`,
      recipeCategory: recipe.value.cuisineTags?.[0] || 'Fusion',
      recipeCuisine: recipe.value.cuisineTags?.join(', ') || 'Fusion',
      recipeIngredient: recipe.value.ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`.trim()),
      recipeInstructions: recipe.value.instructions.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        text: step
      })),
      keywords: [...(recipe.value.cuisineTags || []), ...(recipe.value.dietaryTags || [])].filter(Boolean).join(', '),
      aggregateRating: recipe.value.avgRating ? {
        '@type': 'AggregateRating',
        ratingValue: recipe.value.avgRating,
        reviewCount: recipe.value.totalReviews
      } : undefined
    })
  ])
} else {
  useServerSeoMeta({
    title: 'Recipe Not Found | Recipe Remix',
    description: 'The requested recipe could not be found'
  })
}

// Helper function to format cook time
function formatCookTime(minutes: number | null): string {
  if (!minutes) return 'Not specified'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

// Helper function to get difficulty badge color
function getDifficultyColor(difficulty: string | null): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'hard':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

// Get the actual recipe ID from the fetched recipe (needed for sub-endpoints)
const recipeId = computed(() => recipe.value?.id || '')

// Get current user's existing review for this recipe
const { useSession } = await import('~/lib/auth-client')
const { data: session } = await useSession(useFetch)
const userId = computed(() => session.value?.user?.id)

const { data: existingReview, refresh: refreshExistingReview } = await useFetch<{ rating: number; review: string | null } | null>(
  () => userId.value && recipeId.value ? `/api/user/reviews/${recipeId.value}` : null,
  {
    key: `user-review-${slug}`,
    transform: (data: any) => {
      // Find the current user's review from the list
      const userReview = data.reviews?.find((r: any) => r.userId === userId.value)
      return userReview ? { rating: userReview.rating, review: userReview.review } : null
    }
  }
)

// Review list component ref for refreshing
const reviewListRef = ref<{ refresh: () => void } | null>(null)

// Handle review submission
async function handleReviewSubmitted() {
  // Refresh both the user's review and the review list
  await refreshExistingReview()
  await reviewListRef.value?.refresh()
}

// Helper: check if instruction contains a safety note
function isSafetyNote(instruction: string): boolean {
  return instruction.includes('Safety Note:')
}

// Helper: split instruction into parts before/after "Safety Note:"
function splitSafetyNote(instruction: string): { before: string; safetyNote: string } | null {
  const idx = instruction.indexOf('Safety Note:')
  if (idx === -1) return null
  return {
    before: instruction.substring(0, idx).trim(),
    safetyNote: instruction.substring(idx).trim()
  }
}

const isAiGenerated = computed(() => recipe.value?.source === 'ai_generated')

// === Substitution overrides (session-local, not persisted) ===
const substitutedIngredients = ref<Ingredient[] | null>(null)
const substitutedInstructions = ref<string[] | null>(null)
const substitutedExplanation = ref<string | null>(null)

// Active data: prefer substitution overrides, then original
const activeIngredients = computed(() => substitutedIngredients.value ?? recipe.value?.ingredients ?? [])
const activeInstructions = computed(() => substitutedInstructions.value ?? recipe.value?.instructions ?? [])
const activeExplanation = computed(() => substitutedExplanation.value ?? recipe.value?.explanation ?? null)

// Serving size scaling — chains after substitution
const { currentServings, scaledIngredients } = useServingScale(
  recipe.value?.servings ?? 4,
  activeIngredients
)

// Substitution dialog state
const substitutionTarget = ref<string | null>(null)

function openSubstitution(ingredientName: string) {
  substitutionTarget.value = ingredientName
}

function handleSubstitutionAccepted(result: {
  substitute: { name: string; quantity: string; unit: string }
  updatedInstructions: string[]
  updatedExplanation: string
  substitutionNote: string
}) {
  if (!substitutionTarget.value) return

  // Replace ingredient in active list
  const current = activeIngredients.value.map(ing => {
    if (ing.name.toLowerCase() === substitutionTarget.value!.toLowerCase()) {
      return {
        name: result.substitute.name,
        quantity: result.substitute.quantity,
        unit: result.substitute.unit
      }
    }
    return ing
  })
  substitutedIngredients.value = current

  // Update instructions and explanation
  if (result.updatedInstructions.length > 0) {
    substitutedInstructions.value = result.updatedInstructions
  }
  if (result.updatedExplanation) {
    substitutedExplanation.value = result.updatedExplanation
  }

  substitutionTarget.value = null
}

// Image generation button state
const generatingImage = ref(false)
async function generateImage() {
  if (!recipe.value) return
  generatingImage.value = true
  try {
    await $fetch(`/api/recipes/${recipeId.value}/image`, { method: 'POST' })
    // Refresh recipe data to get new imageKey
    await refreshNuxtData()
  } catch {
    // Silently fail — user can retry
  } finally {
    generatingImage.value = false
  }
}

// Record view in history (client-side only)
const { recordView } = useHistory()
onMounted(() => {
  if (recipeId.value) {
    recordView(recipeId.value)
    // Fire-and-forget view analytics
    $fetch('/api/analytics/events', {
      method: 'POST',
      body: { eventType: 'recipe_viewed', recipeId: recipeId.value }
    }).catch(() => {})
  }
})
</script>

<template>
  <!-- Error State -->
  <div v-if="fetchError" class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <ErrorMessage
        title="Recipe Not Found"
        :message="fetchError"
        retry-label="Try Again"
        @retry="async () => { fetchError = null; await refresh(); if (error.value) fetchError = error.value.statusMessage || 'Recipe not found' }"
      />
    </div>
  </div>

  <!-- Recipe Content -->
  <div v-else-if="recipe" class="recipe-detail-page bg-gray-50 min-h-screen">
    <!-- Hero Image Section -->
    <div class="relative w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500">
      <!-- Image if available -->
      <NuxtImg
        v-if="recipe.imageKey"
        :src="recipe.imageKey.startsWith('http') ? recipe.imageKey : `/api/images/${recipe.imageKey}`"
        :alt="recipe.title"
        loading="eager"
        fetchpriority="high"
        format="webp"
        sizes="sm:100vw md:100vw lg:800px"
        class="w-full h-full object-cover"
      />
      <!-- No image: placeholder with generate button for AI recipes -->
      <div v-else class="w-full h-full flex flex-col items-center justify-center text-white/80 relative z-10">
        <span v-if="isAiGenerated" class="text-lg mb-3">Image not yet generated</span>
        <button
          v-if="isAiGenerated"
          :disabled="generatingImage"
          class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          @click.prevent="generateImage"
        >
          {{ generatingImage ? 'Generating...' : 'Generate Image' }}
        </button>
      </div>

      <!-- Gradient overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

      <!-- Title overlay -->
      <div class="absolute bottom-0 left-0 right-0 p-6 sm:p-8 pointer-events-none">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
            {{ recipe.title }}
          </h1>
          <!-- AI-Generated Badge -->
          <span
            v-if="isAiGenerated"
            class="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
            </svg>
            AI-Generated Recipe
          </span>
        </div>
      </div>
    </div>

    <!-- Content Container -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Navigation: Back to Home -->
      <div class="mb-6">
        <NuxtLink
          to="/"
          class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </NuxtLink>
      </div>

      <!-- Metadata Bar with Rating -->
      <div class="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <div class="flex flex-col gap-4">
          <!-- Rating section -->
          <div v-if="recipe.avgRating || recipe.totalReviews > 0" class="flex items-center gap-3 pb-4 border-b border-gray-200">
            <StarRating
              :model-value="recipe.avgRating || 0"
              :readonly="true"
              size="md"
            />
            <span v-if="recipe.avgRating" class="text-lg font-semibold text-gray-900">
              {{ recipe.avgRating.toFixed(1) }}
            </span>
            <span class="text-sm text-gray-600">
              ({{ recipe.totalReviews }} {{ recipe.totalReviews === 1 ? 'review' : 'reviews' }})
            </span>
          </div>

          <!-- Metadata badges -->
          <div class="flex flex-wrap gap-3">
            <!-- Cook Time -->
            <div
              v-if="recipe.cookTime"
              class="inline-flex items-center px-4 py-2 bg-gray-50 rounded-lg"
            >
              <svg class="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-medium text-gray-900">{{ formatCookTime(recipe.cookTime) }}</span>
            </div>

            <!-- Difficulty -->
            <div
              v-if="recipe.difficulty"
              class="inline-flex items-center px-4 py-2 rounded-lg border-2"
              :class="getDifficultyColor(recipe.difficulty)"
            >
              <span class="text-sm font-semibold capitalize">{{ recipe.difficulty }}</span>
            </div>

            <!-- Cuisine Tags -->
            <div
              v-for="tag in recipe.cuisineTags"
              :key="tag"
              class="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border-2 border-blue-200"
            >
              <span class="text-sm font-medium">{{ tag }}</span>
            </div>

            <!-- Dietary Tags -->
            <div
              v-for="tag in recipe.dietaryTags"
              :key="tag"
              class="inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg border-2 border-purple-200"
            >
              <span class="text-sm font-medium">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="recipe.description" class="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <p class="text-gray-700 leading-relaxed">{{ recipe.description }}</p>
      </div>

      <!-- Why This Fusion Works (AI recipes only) -->
      <LazyWhyThisWorks
        v-if="isAiGenerated && activeExplanation"
        :explanation="activeExplanation"
        class="mb-6"
        hydrate-on-idle
      />

      <!-- Ingredients Section -->
      <div class="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <ServingScaler
            v-model="currentServings"
            :base-servings="recipe.servings ?? 4"
          />
        </div>
        <IngredientChecklist
          :recipe-id="recipeId"
          :ingredients="scaledIngredients"
          :is-ai-generated="isAiGenerated"
          @substitute="openSubstitution"
        />
      </div>

      <!-- Instructions Section -->
      <div class="space-y-4 mb-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
        <template v-for="(instruction, index) in activeInstructions" :key="index">
          <!-- Safety Note callout (SAFE-03) -->
          <div v-if="isSafetyNote(instruction) && splitSafetyNote(instruction)" class="space-y-2">
            <StepCard
              v-if="splitSafetyNote(instruction)!.before"
              :recipe-id="recipeId"
              :step-number="index + 1"
              :total-steps="activeInstructions.length"
              :instruction="splitSafetyNote(instruction)!.before"
            />
            <div class="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg flex items-start gap-2">
              <svg class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="text-sm text-amber-900">{{ splitSafetyNote(instruction)!.safetyNote }}</span>
            </div>
          </div>
          <!-- Regular instruction -->
          <StepCard
            v-else
            :recipe-id="recipeId"
            :step-number="index + 1"
            :total-steps="activeInstructions.length"
            :instruction="instruction"
          />
        </template>
      </div>

      <!-- Reviews Section -->
      <div class="border-t border-gray-300 pt-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>

        <!-- Review Form -->
        <div class="mb-8">
          <LazyReviewForm
            :recipe-id="recipeId"
            :existing-review="existingReview || undefined"
            @submitted="handleReviewSubmitted"
            hydrate-on-visible
          />
        </div>

        <!-- Review List -->
        <div>
          <LazyReviewList
            ref="reviewListRef"
            :recipe-id="recipeId"
            hydrate-on-visible
          />
        </div>
      </div>
    </div>

    <!-- Substitution Dialog -->
    <LazySubstitutionDialog
      v-if="substitutionTarget"
      :recipe-id="recipeId"
      :ingredient-name="substitutionTarget"
      @close="substitutionTarget = null"
      @accept="handleSubstitutionAccepted"
    />
  </div>
</template>

<style scoped>
/* Additional responsive styles if needed */
</style>
