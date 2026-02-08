import { useLocalStorage } from '@vueuse/core'
import { useSession } from '~/lib/auth-client'

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
  const { data: session } = useSession()

  // Guest storage (SSR-safe with initOnMounted)
  const guestPantry = useLocalStorage<PantryItem[]>('guest_pantry', [], {
    initOnMounted: true
  })
  const guestDietary = useLocalStorage<string[]>('guest_dietary_restrictions', [], {
    initOnMounted: true
  })

  // Authenticated storage
  const { data: authPantry, refresh: refreshPantry } = useFetch<PantryItem[]>('/api/user/pantry', {
    immediate: false,
    // Only fetch if user is authenticated and not anonymous
    watch: [() => session.value],
    lazy: true
  })

  const { data: authDietary, refresh: refreshDietary } = useFetch<string[]>('/api/user/dietary-restrictions', {
    immediate: false,
    watch: [() => session.value],
    lazy: true
  })

  // Initialize auth data if user is logged in
  onMounted(() => {
    if (session.value?.user && !session.value.user.isAnonymous) {
      refreshPantry()
      refreshDietary()
    }
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
