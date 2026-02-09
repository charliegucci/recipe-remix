import type { Database } from './drizzle'
import { schema } from './drizzle'

interface IngredientInput {
  name: string
  quantity: string
  unit: string
}

interface ResolvedIngredient {
  name: string
  quantity: string
  unit: string
  ingredientId: string
  canonicalName: string
}

interface ValidationResult {
  valid: boolean
  resolved: ResolvedIngredient[]
  unresolved: string[]
}

// Module-level cache for ingredients with 5-minute expiry
let ingredientCache: Array<{ id: string; name: string; commonNames: string }> | null = null
let cacheExpiry: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Validates AI-generated ingredient names against the canonical ingredients table.
 *
 * Matching logic:
 * 1. Exact match (case-insensitive) on ingredients.name
 * 2. Substring match both directions (e.g., "chicken breast" matches "chicken")
 * 3. Check commonNames JSON array for aliases
 *
 * Implements SAFE-01 and SAFE-04 requirements.
 *
 * @param db - Drizzle database instance
 * @param aiIngredients - Array of AI-generated ingredients with name, quantity, unit
 * @returns Validation result with resolved and unresolved ingredients
 */
export async function validateIngredients(
  db: Database,
  aiIngredients: IngredientInput[]
): Promise<ValidationResult> {
  // Load ingredients from cache or DB
  const now = Date.now()
  if (!ingredientCache || now > cacheExpiry) {
    const ingredients = await db.select({
      id: schema.ingredients.id,
      name: schema.ingredients.name,
      commonNames: schema.ingredients.commonNames
    }).from(schema.ingredients)

    ingredientCache = ingredients
    cacheExpiry = now + CACHE_TTL_MS
  }

  const resolved: ResolvedIngredient[] = []
  const unresolved: string[] = []

  for (const aiIngredient of aiIngredients) {
    const aiName = aiIngredient.name.toLowerCase().trim()
    let matched = false

    for (const ingredient of ingredientCache) {
      const canonicalName = ingredient.name.toLowerCase()

      // 1. Exact match (case-insensitive)
      if (aiName === canonicalName) {
        resolved.push({
          name: aiIngredient.name,
          quantity: aiIngredient.quantity,
          unit: aiIngredient.unit,
          ingredientId: ingredient.id,
          canonicalName: ingredient.name
        })
        matched = true
        break
      }

      // 2. Substring match both directions (same logic as match-pantry.get.ts)
      if (aiName.includes(canonicalName) || canonicalName.includes(aiName)) {
        resolved.push({
          name: aiIngredient.name,
          quantity: aiIngredient.quantity,
          unit: aiIngredient.unit,
          ingredientId: ingredient.id,
          canonicalName: ingredient.name
        })
        matched = true
        break
      }

      // 3. Check commonNames JSON array
      try {
        const commonNames = JSON.parse(ingredient.commonNames) as string[]
        for (const commonName of commonNames) {
          const commonNameLower = commonName.toLowerCase()
          if (aiName === commonNameLower ||
              aiName.includes(commonNameLower) ||
              commonNameLower.includes(aiName)) {
            resolved.push({
              name: aiIngredient.name,
              quantity: aiIngredient.quantity,
              unit: aiIngredient.unit,
              ingredientId: ingredient.id,
              canonicalName: ingredient.name
            })
            matched = true
            break
          }
        }
        if (matched) break
      } catch {
        // Invalid JSON in commonNames, skip
        continue
      }
    }

    if (!matched) {
      unresolved.push(aiIngredient.name)
    }
  }

  return {
    valid: unresolved.length === 0,
    resolved,
    unresolved
  }
}
