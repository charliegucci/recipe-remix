/**
 * USDA Food Safety Temperature Requirements
 *
 * Implements SAFE-03 requirement: Inject USDA-recommended safe cooking temperatures
 * into recipe instructions for protein ingredients.
 *
 * Based on USDA Food Safety and Inspection Service guidelines.
 */

interface SafetyTemp {
  protein: string
  fahrenheit: number
  celsius: number
  restTime?: string
}

/**
 * Map of protein keywords to USDA safe minimum internal temperatures.
 *
 * Source: USDA Food Safety and Inspection Service
 * https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart
 */
export const PROTEIN_SAFETY_MAP: Record<string, SafetyTemp> = {
  // Red meat (steaks, chops, roasts) - 145°F + 3 min rest
  'beef': { protein: 'beef', fahrenheit: 145, celsius: 63, restTime: '3 minutes' },
  'veal': { protein: 'veal', fahrenheit: 145, celsius: 63, restTime: '3 minutes' },
  'lamb': { protein: 'lamb', fahrenheit: 145, celsius: 63, restTime: '3 minutes' },
  'pork': { protein: 'pork', fahrenheit: 145, celsius: 63, restTime: '3 minutes' },
  'steak': { protein: 'steak', fahrenheit: 145, celsius: 63, restTime: '3 minutes' },
  'chop': { protein: 'chop', fahrenheit: 145, celsius: 63, restTime: '3 minutes' },
  'roast': { protein: 'roast', fahrenheit: 145, celsius: 63, restTime: '3 minutes' },

  // Ground meats - 160°F
  'ground beef': { protein: 'ground beef', fahrenheit: 160, celsius: 71 },
  'ground pork': { protein: 'ground pork', fahrenheit: 160, celsius: 71 },
  'ground veal': { protein: 'ground veal', fahrenheit: 160, celsius: 71 },
  'ground lamb': { protein: 'ground lamb', fahrenheit: 160, celsius: 71 },
  'hamburger': { protein: 'hamburger', fahrenheit: 160, celsius: 71 },
  'burger': { protein: 'burger', fahrenheit: 160, celsius: 71 },
  'meatball': { protein: 'meatball', fahrenheit: 160, celsius: 71 },
  'meatloaf': { protein: 'meatloaf', fahrenheit: 160, celsius: 71 },

  // Poultry - 165°F
  'chicken': { protein: 'chicken', fahrenheit: 165, celsius: 74 },
  'turkey': { protein: 'turkey', fahrenheit: 165, celsius: 74 },
  'duck': { protein: 'duck', fahrenheit: 165, celsius: 74 },
  'goose': { protein: 'goose', fahrenheit: 165, celsius: 74 },
  'poultry': { protein: 'poultry', fahrenheit: 165, celsius: 74 },

  // Ground poultry - 165°F
  'ground chicken': { protein: 'ground chicken', fahrenheit: 165, celsius: 74 },
  'ground turkey': { protein: 'ground turkey', fahrenheit: 165, celsius: 74 },

  // Seafood - 145°F
  'fish': { protein: 'fish', fahrenheit: 145, celsius: 63 },
  'salmon': { protein: 'salmon', fahrenheit: 145, celsius: 63 },
  'tuna': { protein: 'tuna', fahrenheit: 145, celsius: 63 },
  'cod': { protein: 'cod', fahrenheit: 145, celsius: 63 },
  'halibut': { protein: 'halibut', fahrenheit: 145, celsius: 63 },
  'tilapia': { protein: 'tilapia', fahrenheit: 145, celsius: 63 },
  'shrimp': { protein: 'shrimp', fahrenheit: 145, celsius: 63 },
  'crab': { protein: 'crab', fahrenheit: 145, celsius: 63 },
  'lobster': { protein: 'lobster', fahrenheit: 145, celsius: 63 },
  'scallop': { protein: 'scallop', fahrenheit: 145, celsius: 63 },
  'shellfish': { protein: 'shellfish', fahrenheit: 145, celsius: 63 },

  // Eggs - 160°F (for dishes like custards, casseroles)
  'egg': { protein: 'egg', fahrenheit: 160, celsius: 71 }
}

/**
 * Injects USDA safe temperature notes into cooking instructions.
 *
 * Scans ingredient list for protein keywords, finds relevant cooking steps,
 * and appends safety temperature guidance.
 *
 * @param instructions - Array of instruction steps
 * @param ingredients - Array of ingredients with name field
 * @returns Modified instructions with safety notes appended
 */
export function injectSafetyTemps(
  instructions: string[],
  ingredients: Array<{ name: string }>
): string[] {
  // Find proteins in ingredients
  const detectedProteins: SafetyTemp[] = []
  const addedProteins = new Set<string>() // Prevent duplicates

  for (const ingredient of ingredients) {
    const ingredientNameLower = ingredient.name.toLowerCase()

    // Check for matches in PROTEIN_SAFETY_MAP
    // Sort by key length descending to match longer phrases first (e.g., "ground beef" before "beef")
    const sortedKeys = Object.keys(PROTEIN_SAFETY_MAP).sort((a, b) => b.length - a.length)

    for (const proteinKeyword of sortedKeys) {
      if (ingredientNameLower.includes(proteinKeyword)) {
        const safetyTemp = PROTEIN_SAFETY_MAP[proteinKeyword]
        if (safetyTemp && !addedProteins.has(safetyTemp.protein)) {
          detectedProteins.push(safetyTemp)
          addedProteins.add(safetyTemp.protein)
        }
        break // Stop after first match for this ingredient
      }
    }
  }

  // If no proteins detected, return original instructions
  if (detectedProteins.length === 0) {
    return instructions
  }

  // Clone instructions array
  const modifiedInstructions = [...instructions]

  // For each detected protein, find relevant cooking step and inject safety note
  for (const safetyTemp of detectedProteins) {
    const proteinLower = safetyTemp.protein.toLowerCase()

    // Find the cooking step that mentions this protein or general cooking verbs
    const cookingVerbs = ['cook', 'bake', 'grill', 'roast', 'fry', 'sauté', 'pan-fry', 'broil', 'sear']
    let targetStepIndex = -1

    // First, try to find a step mentioning the specific protein
    for (let i = 0; i < modifiedInstructions.length; i++) {
      const stepLower = modifiedInstructions[i]!.toLowerCase()
      if (stepLower.includes(proteinLower)) {
        targetStepIndex = i
        break
      }
    }

    // If no specific mention, find the first step with a cooking verb
    if (targetStepIndex === -1) {
      for (let i = 0; i < modifiedInstructions.length; i++) {
        const stepLower = modifiedInstructions[i]!.toLowerCase()
        for (const verb of cookingVerbs) {
          if (stepLower.includes(verb)) {
            targetStepIndex = i
            break
          }
        }
        if (targetStepIndex !== -1) break
      }
    }

    // If still no match, append to the last step
    if (targetStepIndex === -1) {
      targetStepIndex = modifiedInstructions.length - 1
    }

    // Build safety note
    let safetyNote = `Safety Note: ${safetyTemp.protein.charAt(0).toUpperCase() + safetyTemp.protein.slice(1)} should reach an internal temperature of ${safetyTemp.fahrenheit}°F (${safetyTemp.celsius}°C)`

    if (safetyTemp.restTime) {
      safetyNote += ` and rest for ${safetyTemp.restTime}`
    }

    safetyNote += ' for food safety.'

    // Append safety note to the target step
    modifiedInstructions[targetStepIndex] += ` ${safetyNote}`
  }

  return modifiedInstructions
}
