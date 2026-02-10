/**
 * AI Recipe Response Parser and Validator
 *
 * Parses and validates JSON output from Workers AI recipe generation.
 * Ensures all required fields are present and properly typed.
 */

interface ParsedIngredient {
  name: string
  quantity: string
  unit: string
}

export interface ParsedRecipe {
  title: string
  description: string
  ingredients: ParsedIngredient[]
  instructions: string[]
  cuisineTags: string[]
  dietaryTags: string[]
  cookTime: number
  difficulty: 'easy' | 'medium' | 'hard'
  servings: number
  whyThisWorks: string
}

interface ParseResult {
  success: boolean
  recipe?: ParsedRecipe
  error?: string
}

/**
 * Parses and validates LLM JSON response for recipe generation.
 *
 * Handles:
 * - Markdown code block stripping (```json ... ```)
 * - JSON parsing with error handling
 * - Field-level validation (type checking, required fields)
 * - Default value assignment for optional fields
 *
 * @param raw - Raw string response from LLM
 * @returns Parse result with success status, recipe data, or error message
 */
export function parseRecipeResponse(raw: string): ParseResult {
  // Strip markdown code blocks if present
  let jsonText = raw.trim()

  // Remove ```json ... ``` or ``` ... ``` wrappers
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  }

  // Parse JSON
  let parsed: any
  try {
    parsed = JSON.parse(jsonText)
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown parsing error'}`
    }
  }

  // Validate required fields and types
  const errors: string[] = []

  // title: non-empty string
  if (typeof parsed.title !== 'string' || parsed.title.trim().length === 0) {
    errors.push('title must be a non-empty string')
  }

  // description: non-empty string
  if (typeof parsed.description !== 'string' || parsed.description.trim().length === 0) {
    errors.push('description must be a non-empty string')
  }

  // ingredients: array of objects with name, quantity, unit
  if (!Array.isArray(parsed.ingredients)) {
    errors.push('ingredients must be an array')
  } else if (parsed.ingredients.length === 0) {
    errors.push('ingredients array must not be empty')
  } else {
    for (let i = 0; i < parsed.ingredients.length; i++) {
      const ing = parsed.ingredients[i]
      if (typeof ing.name !== 'string' || ing.name.trim().length === 0) {
        errors.push(`ingredients[${i}].name must be a non-empty string`)
      }
      if (typeof ing.quantity !== 'string') {
        errors.push(`ingredients[${i}].quantity must be a string`)
      }
      if (typeof ing.unit !== 'string') {
        errors.push(`ingredients[${i}].unit must be a string`)
      }
    }
  }

  // instructions: array of non-empty strings, length 3-20
  if (!Array.isArray(parsed.instructions)) {
    errors.push('instructions must be an array')
  } else if (parsed.instructions.length < 3) {
    errors.push('instructions array must have at least 3 steps')
  } else if (parsed.instructions.length > 20) {
    errors.push('instructions array must have at most 20 steps')
  } else {
    for (let i = 0; i < parsed.instructions.length; i++) {
      const step = parsed.instructions[i]
      if (typeof step !== 'string' || step.trim().length === 0) {
        errors.push(`instructions[${i}] must be a non-empty string`)
      }
    }
  }

  // cuisineTags: array of strings
  if (!Array.isArray(parsed.cuisineTags)) {
    errors.push('cuisineTags must be an array')
  } else {
    for (let i = 0; i < parsed.cuisineTags.length; i++) {
      if (typeof parsed.cuisineTags[i] !== 'string') {
        errors.push(`cuisineTags[${i}] must be a string`)
      }
    }
  }

  // dietaryTags: optional array of strings (default to [])
  let dietaryTags: string[] = []
  if (parsed.dietaryTags !== undefined) {
    if (!Array.isArray(parsed.dietaryTags)) {
      errors.push('dietaryTags must be an array if provided')
    } else {
      for (let i = 0; i < parsed.dietaryTags.length; i++) {
        if (typeof parsed.dietaryTags[i] !== 'string') {
          errors.push(`dietaryTags[${i}] must be a string`)
        }
      }
      dietaryTags = parsed.dietaryTags
    }
  }

  // cookTime: positive number
  if (typeof parsed.cookTime !== 'number' || parsed.cookTime <= 0) {
    errors.push('cookTime must be a positive number')
  }

  // difficulty: one of 'easy', 'medium', 'hard'
  const validDifficulties = ['easy', 'medium', 'hard']
  if (!validDifficulties.includes(parsed.difficulty)) {
    errors.push('difficulty must be one of: easy, medium, hard')
  }

  // servings: positive number (default 4 if missing)
  let servings = 4
  if (parsed.servings !== undefined) {
    if (typeof parsed.servings !== 'number' || parsed.servings <= 0) {
      errors.push('servings must be a positive number if provided')
    } else {
      servings = parsed.servings
    }
  }

  // whyThisWorks: optional string, graceful degradation
  let whyThisWorks = ''
  if (parsed.whyThisWorks !== undefined) {
    if (typeof parsed.whyThisWorks === 'string' && parsed.whyThisWorks.trim().length >= 20) {
      whyThisWorks = parsed.whyThisWorks.trim()
    }
    // If present but too short or wrong type, silently default to empty string
  }

  // If any errors, return failure
  if (errors.length > 0) {
    return {
      success: false,
      error: `Validation failed: ${errors.join('; ')}`
    }
  }

  // Return validated recipe
  return {
    success: true,
    recipe: {
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
      cuisineTags: parsed.cuisineTags,
      dietaryTags,
      cookTime: parsed.cookTime,
      difficulty: parsed.difficulty,
      servings,
      whyThisWorks
    }
  }
}
