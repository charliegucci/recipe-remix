<script setup lang="ts">
interface Props {
  recipeId: string
}

const props = defineProps<Props>()

const { useSession } = await import('~/lib/auth-client')
const { data: session } = await useSession(useFetch)
const currentUserId = computed(() => session.value?.user?.id)

interface Review {
  userId: string
  userName: string | null
  rating: number
  review: string | null
  createdAt: string
  updatedAt: string
}

interface ReviewData {
  avgRating: number | null
  totalReviews: number
  reviews: Review[]
  page: number
  pageSize: number
  hasMore: boolean
}

const { data: reviewData, refresh } = await useFetch<ReviewData>(
  `/api/user/reviews/${props.recipeId}`,
  {
    key: `reviews-${props.recipeId}`
  }
)

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

function isCurrentUserReview(review: Review): boolean {
  return currentUserId.value === review.userId
}

// Expose refresh method for parent component
defineExpose({
  refresh
})
</script>

<template>
  <div class="review-list space-y-6">
    <!-- Aggregate rating summary -->
    <div v-if="reviewData" class="flex items-center gap-4 pb-4 border-b border-gray-200">
      <div class="flex items-center gap-2">
        <StarRating
          :model-value="reviewData.avgRating || 0"
          :readonly="true"
          size="md"
        />
        <span v-if="reviewData.avgRating" class="text-lg font-semibold text-gray-900">
          {{ reviewData.avgRating.toFixed(1) }}
        </span>
      </div>
      <span class="text-sm text-gray-600">
        {{ reviewData.totalReviews }} {{ reviewData.totalReviews === 1 ? 'review' : 'reviews' }}
      </span>
    </div>

    <!-- Empty state -->
    <div v-if="reviewData && reviewData.reviews.length === 0" class="text-center py-8">
      <p class="text-gray-500">No reviews yet. Be the first!</p>
    </div>

    <!-- Review list -->
    <div v-if="reviewData && reviewData.reviews.length > 0" class="space-y-4">
      <div
        v-for="review in reviewData.reviews"
        :key="review.userId"
        class="review-item p-4 rounded-lg border transition-colors"
        :class="isCurrentUserReview(review)
          ? 'bg-orange-50 border-orange-200'
          : 'bg-white border-gray-200'"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <!-- Reviewer name and badge -->
            <div class="flex items-center gap-2 mb-2">
              <p class="font-medium text-gray-900 truncate">
                {{ review.userName || 'Anonymous' }}
              </p>
              <span
                v-if="isCurrentUserReview(review)"
                class="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full"
              >
                Your review
              </span>
            </div>

            <!-- Star rating -->
            <div class="flex items-center gap-2 mb-2">
              <StarRating
                :model-value="review.rating"
                :readonly="true"
                size="sm"
              />
              <span class="text-xs text-gray-500">{{ formatDate(review.createdAt) }}</span>
            </div>

            <!-- Review text -->
            <p v-if="review.review" class="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {{ review.review }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
