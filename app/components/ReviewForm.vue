<script setup lang="ts">
interface Props {
  recipeId: string
  existingReview?: {
    rating: number
    review: string | null
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  submitted: []
}>()

const { useSession } = await import('~/lib/auth-client')
const { data: session } = await useSession(useFetch)
const isAuthenticated = computed(() => session.value?.user && !session.value.user.isAnonymous)

const rating = ref(props.existingReview?.rating || 0)
const reviewText = ref(props.existingReview?.review || '')
const isSubmitting = ref(false)
const errorMessage = ref('')

const characterCount = computed(() => reviewText.value.length)
const isValid = computed(() => rating.value >= 1 && rating.value <= 5)

watch(() => props.existingReview, (newReview) => {
  if (newReview) {
    rating.value = newReview.rating
    reviewText.value = newReview.review || ''
  }
}, { immediate: true })

async function handleSubmit() {
  if (!isValid.value) {
    errorMessage.value = 'Please select a rating'
    return
  }

  if (reviewText.value.length > 1000) {
    errorMessage.value = 'Review must be 1000 characters or less'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch(`/api/user/reviews/${props.recipeId}`, {
      method: 'POST',
      body: {
        rating: rating.value,
        review: reviewText.value.trim() || undefined
      }
    })

    // Success - emit event to refresh review list
    emit('submitted')
  } catch (error: any) {
    console.error('Failed to submit review:', error)
    errorMessage.value = error?.data?.message || 'Failed to submit review. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="review-form bg-white rounded-lg p-6 shadow-sm border border-gray-200">
    <!-- Not authenticated: show sign-in prompt -->
    <div v-if="!isAuthenticated" class="text-center py-8">
      <p class="text-gray-600 mb-4">Sign in to leave a review</p>
      <NuxtLink
        to="/login"
        class="inline-block px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
      >
        Sign In
      </NuxtLink>
    </div>

    <!-- Authenticated: show review form -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          {{ existingReview ? 'Update Your Review' : 'Leave a Review' }}
        </h3>
      </div>

      <!-- Star rating selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Your Rating
        </label>
        <StarRating
          v-model="rating"
          :readonly="false"
          size="lg"
        />
      </div>

      <!-- Review text area -->
      <div>
        <label for="review-text" class="block text-sm font-medium text-gray-700 mb-2">
          Your Review (optional)
        </label>
        <textarea
          id="review-text"
          v-model="reviewText"
          placeholder="Share your thoughts about this recipe..."
          rows="4"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          :disabled="isSubmitting"
          maxlength="1000"
        />
        <div class="flex justify-between items-center mt-1">
          <p class="text-xs text-gray-500">
            {{ characterCount }}/1000 characters
          </p>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-700">{{ errorMessage }}</p>
      </div>

      <!-- Submit button -->
      <div>
        <button
          type="submit"
          :disabled="isSubmitting || !isValid"
          class="w-full px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isSubmitting">Submitting...</span>
          <span v-else>{{ existingReview ? 'Update Review' : 'Submit Review' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
