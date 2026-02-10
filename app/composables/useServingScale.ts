import type { Ref } from 'vue'

interface Ingredient {
  name: string
  quantity: string
  unit: string
}

// Common fraction display map
const FRACTION_MAP: [number, string][] = [
  [0.25, '1/4'],
  [1 / 3, '1/3'],
  [0.5, '1/2'],
  [2 / 3, '2/3'],
  [0.75, '3/4'],
]

/**
 * Format a number as a human-readable quantity string.
 * Converts decimals to fractions where applicable.
 */
function formatQuantity(value: number): string {
  if (value <= 0) return '0'

  const whole = Math.floor(value)
  const decimal = value - whole

  // Pure whole number
  if (Math.abs(decimal) < 0.01) {
    return String(whole)
  }

  // Check if decimal part matches a common fraction
  for (const [frac, display] of FRACTION_MAP) {
    if (Math.abs(decimal - frac) < 0.01) {
      return whole > 0 ? `${whole} ${display}` : display
    }
  }

  // Fallback: format with 1 decimal place
  // If whole number after rounding, show without decimal
  const rounded = Math.round(value * 10) / 10
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) {
    return String(Math.round(rounded))
  }
  return rounded.toFixed(1)
}

/**
 * Parse a quantity string into a number.
 * Handles: "2", "1.5", "1/2", "1 1/2", etc.
 */
function parseQuantity(quantity: string): number | null {
  const trimmed = quantity.trim()
  if (!trimmed) return null

  // Try mixed number: "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]!, 10)
    const num = parseInt(mixedMatch[2]!, 10)
    const den = parseInt(mixedMatch[3]!, 10)
    if (den === 0) return null
    return whole + num / den
  }

  // Try fraction: "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]!, 10)
    const den = parseInt(fractionMatch[2]!, 10)
    if (den === 0) return null
    return num / den
  }

  // Try plain number: "2", "1.5"
  const num = parseFloat(trimmed)
  if (!isNaN(num)) return num

  return null
}

/**
 * Scale a quantity string by a ratio.
 * Handles numeric, fractions, mixed numbers, ranges, and non-numeric strings.
 */
function scaleQuantity(quantity: string, ratio: number): string {
  const trimmed = quantity.trim()
  if (!trimmed) return trimmed

  // Handle ranges: "2-3", "1/2-1"
  const rangeMatch = trimmed.match(/^(.+?)\s*-\s*(.+)$/)
  if (rangeMatch) {
    const low = parseQuantity(rangeMatch[1]!)
    const high = parseQuantity(rangeMatch[2]!)
    if (low !== null && high !== null) {
      return `${formatQuantity(low * ratio)}-${formatQuantity(high * ratio)}`
    }
  }

  // Try parsing as a single quantity
  const parsed = parseQuantity(trimmed)
  if (parsed !== null) {
    return formatQuantity(parsed * ratio)
  }

  // Non-numeric: return unchanged ("to taste", "a pinch", etc.)
  return trimmed
}

export function useServingScale(baseServings: number, ingredients: Ref<Ingredient[]>) {
  const currentServings = ref(baseServings)

  const scaledIngredients = computed(() => {
    const ratio = currentServings.value / baseServings
    if (ratio === 1) return ingredients.value

    return ingredients.value.map(ing => ({
      ...ing,
      quantity: scaleQuantity(ing.quantity, ratio),
    }))
  })

  return { currentServings, scaledIngredients }
}
