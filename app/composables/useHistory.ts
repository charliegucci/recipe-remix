import { authClient } from '~/lib/auth-client'

export function useHistory() {
  const recordView = async (recipeId: string) => {
    // Get session
    const session = await authClient.getSession()

    // Only record if user is authenticated and not anonymous
    if (!session?.user || session.user.isAnonymous) {
      return
    }

    // Fire-and-forget - don't block UI
    try {
      await $fetch('/api/user/history', {
        method: 'POST',
        body: { recipeId }
      })
    } catch (err) {
      // Silently fail - viewing history is not critical
      console.warn('Failed to record view:', err)
    }
  }

  return {
    recordView
  }
}
