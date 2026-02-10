/**
 * Substitution Response Parser and Validator
 *
 * Parses and validates JSON output from Workers AI substitution suggestions.
 */

export interface ParsedSubstitution {
  substitute: {
    name: string
    quantity: string
    unit: string
  }
  updatedInstructions: string[]
  updatedExplanation: string
  substitutionNote: string
}

interface ParseResult {
  success: boolean
  substitution?: ParsedSubstitution
  error?: string
}

export function parseSubstitutionResponse(raw: string): ParseResult {
  let jsonText = raw.trim()

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  }

  let parsed: any
  try {
    parsed = JSON.parse(jsonText)
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown parsing error'}`
    }
  }

  const errors: string[] = []

  // substitute: object with name, quantity, unit
  if (!parsed.substitute || typeof parsed.substitute !== 'object') {
    errors.push('substitute must be an object')
  } else {
    if (typeof parsed.substitute.name !== 'string' || !parsed.substitute.name.trim()) {
      errors.push('substitute.name must be a non-empty string')
    }
    if (typeof parsed.substitute.quantity !== 'string') {
      errors.push('substitute.quantity must be a string')
    }
    if (typeof parsed.substitute.unit !== 'string') {
      errors.push('substitute.unit must be a string')
    }
  }

  // updatedInstructions: array of strings
  if (!Array.isArray(parsed.updatedInstructions)) {
    errors.push('updatedInstructions must be an array')
  } else if (parsed.updatedInstructions.length === 0) {
    errors.push('updatedInstructions must not be empty')
  }

  // updatedExplanation: string (optional, graceful)
  const updatedExplanation = typeof parsed.updatedExplanation === 'string'
    ? parsed.updatedExplanation.trim()
    : ''

  // substitutionNote: string
  if (typeof parsed.substitutionNote !== 'string' || !parsed.substitutionNote.trim()) {
    errors.push('substitutionNote must be a non-empty string')
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Validation failed: ${errors.join('; ')}`
    }
  }

  return {
    success: true,
    substitution: {
      substitute: {
        name: parsed.substitute.name.trim(),
        quantity: parsed.substitute.quantity,
        unit: parsed.substitute.unit
      },
      updatedInstructions: parsed.updatedInstructions,
      updatedExplanation,
      substitutionNote: parsed.substitutionNote.trim()
    }
  }
}
