import { useLocalStorage } from '@vueuse/core'
import { authClient } from '~/lib/auth-client'

interface PantryItem {
  id: string
  ingredientId?: string
  name: string
  addedAt?: Date
}

interface DietaryRestriction {
  value: string
  label: string
}

const DIETARY_OPTIONS: DietaryRestriction[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-Free' },
  { value: 'dairy-free', label: 'Dairy-Free' },
  { value: 'nut-free', label: 'Nut-Free' }
]

/**
 * Hybrid pantry storage composable
 * - Guest users: localStorage
 * - Authenticated users: API + D1
 */
export function usePantry() {
  // Session state - populated client-side only
  const session = ref<any>(null)

  // Guest storage (SSR-safe with initOnMounted)
  const guestPantry = useLocalStorage<PantryItem[]>('guest_pantry', [], {
    initOnMounted: true
  })
  const guestDietary = useLocalStorage<string[]>('guest_dietary_restrictions', [], {
    initOnMounted: true
  })

  // Authenticated storage
  const authPantry = ref<PantryItem[] | null>(null)
  const authDietary = ref<string[] | null>(null)

  async function refreshPantry() {
    try {
      authPantry.value = await $fetch<PantryItem[]>('/api/user/pantry')
    } catch {
      authPantry.value = null
    }
  }

  async function refreshDietary() {
    try {
      authDietary.value = await $fetch<string[]>('/api/user/dietary-restrictions')
    } catch {
      authDietary.value = null
    }
  }

  // Initialize session and auth data client-side
  onMounted(async () => {
    try {
      const sessionResult = await authClient.getSession()
      session.value = sessionResult?.data || sessionResult
    } catch {
      session.value = null
    }

    if (session.value?.user && !session.value.user.isAnonymous) {
      await Promise.all([refreshPantry(), refreshDietary()])
    }
  })

  // Guest-to-auth migration: watch for session changes
  // When user transitions from anonymous to authenticated, migrate localStorage data
  const previousIsAnonymous = ref<boolean | null>(null)

  watchEffect(async () => {
    const currentUser = session.value?.user
    const currentIsAnonymous = currentUser?.isAnonymous ?? null

    // Detect transition from anonymous to authenticated
    if (previousIsAnonymous.value === true && currentIsAnonymous === false) {
      // User just linked their account - migrate guest data
      const guestPantryData = guestPantry.value
      const guestDietaryData = guestDietary.value

      // Only migrate if there's data to migrate
      if (guestPantryData.length > 0 || guestDietaryData.length > 0) {
        try {
          const result = await $fetch('/api/user/migrate-guest-data', {
            method: 'POST',
            body: {
              pantryItems: guestPantryData.map(item => ({
                ingredientId: item.ingredientId || item.id,
                ingredientName: item.name
              })),
              dietaryRestrictions: guestDietaryData
            }
          })

          console.log(`Migration complete: ${result.migratedPantryCount} pantry items, ${result.migratedRestrictionCount} restrictions`)

          // Clear localStorage after successful migration
          guestPantry.value = []
          guestDietary.value = []

          // Refresh auth data to show migrated items
          await refreshPantry()
          await refreshDietary()
        } catch (error) {
          console.error('Error migrating guest data:', error)
          // Don't clear localStorage if migration failed
        }
      }
    }

    // Update tracking state
    previousIsAnonymous.value = currentIsAnonymous
  })

  // Determine if user is authenticated
  const isAuthenticated = computed(() => {
    return session.value?.user && !session.value.user.isAnonymous
  })

  // Unified pantry interface
  const pantry = computed<PantryItem[]>(() => {
    if (isAuthenticated.value && authPantry.value) {
      return authPantry.value.map(item => ({
        id: item.id,
        ingredientId: item.ingredientId,
        name: item.name || (item as any).ingredientName,
        addedAt: item.addedAt
      }))
    }
    return guestPantry.value
  })

  // Unified dietary restrictions interface
  const dietaryRestrictions = computed<string[]>(() => {
    if (isAuthenticated.value && authDietary.value) {
      return authDietary.value
    }
    return guestDietary.value
  })

  // Add ingredient to pantry
  async function addIngredient(ingredientId: string, ingredientName: string) {
    if (isAuthenticated.value) {
      // API call for authenticated users
      try {
        await $fetch('/api/user/pantry', {
          method: 'POST',
          body: { ingredientId, ingredientName }
        })
        await refreshPantry()
      } catch (error: any) {
        if (error?.statusCode === 409) {
          // Already in pantry - silently ignore
          return
        }
        throw error
      }
    } else {
      // localStorage for guests
      const existing = guestPantry.value.find(item =>
        item.ingredientId === ingredientId || item.name === ingredientName
      )
      if (!existing) {
        guestPantry.value.push({
          id: crypto.randomUUID(),
          ingredientId,
          name: ingredientName
        })
      }
    }
  }

  // Remove ingredient from pantry
  async function removeIngredient(id: string) {
    if (isAuthenticated.value) {
      // API call for authenticated users
      await $fetch(`/api/user/pantry/${id}`, {
        method: 'DELETE'
      })
      await refreshPantry()
    } else {
      // localStorage for guests
      guestPantry.value = guestPantry.value.filter(item => item.id !== id)
    }
  }

  // Toggle dietary restriction
  async function toggleRestriction(restriction: string) {
    if (isAuthenticated.value) {
      // API call for authenticated users
      const current = authDietary.value || []
      const newRestrictions = current.includes(restriction)
        ? current.filter(r => r !== restriction)
        : [...current, restriction]

      await $fetch('/api/user/dietary-restrictions', {
        method: 'POST',
        body: { restrictions: newRestrictions }
      })
      await refreshDietary()
    } else {
      // localStorage for guests
      const current = guestDietary.value
      if (current.includes(restriction)) {
        guestDietary.value = current.filter(r => r !== restriction)
      } else {
        guestDietary.value = [...current, restriction]
      }
    }
  }

  // Check if ingredient is in pantry
  function isInPantry(ingredientId: string): boolean {
    return pantry.value.some(item => item.ingredientId === ingredientId)
  }

  return {
    pantry,
    dietaryRestrictions,
    dietaryOptions: DIETARY_OPTIONS,
    addIngredient,
    removeIngredient,
    toggleRestriction,
    isInPantry,
    isAuthenticated
  }
}
