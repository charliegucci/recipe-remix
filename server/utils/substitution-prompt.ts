/**
 * Ingredient Substitution Prompt Builder
 *
 * Builds prompts for Workers AI to suggest ingredient substitutions
 * within the context of an existing recipe.
 */

interface SubstitutionPromptParams {
  recipeTitle: string
  recipeDescription: string
  ingredients: Array<{ name: string; quantity: string; unit: string }>
  instructions: string[]
  explanation: string | null
  ingredientToReplace: string
  reason: 'allergy' | 'unavailable' | 'preference'
  pantryItems?: string[]
}

export function buildSubstitutionPrompt(params: SubstitutionPromptParams): string {
  const {
    recipeTitle,
    recipeDescription,
    ingredients,
    instructions,
    explanation,
    ingredientToReplace,
    reason,
    pantryItems
  } = params

  const reasonText = {
    allergy: 'due to an allergy or intolerance',
    unavailable: 'because it is unavailable',
    preference: 'due to personal preference'
  }[reason]

  const ingredientsList = ingredients
    .map(ing => `- ${ing.quantity} ${ing.unit} ${ing.name}`)
    .join('\n')

  const instructionsList = instructions
    .map((step, i) => `${i + 1}. ${step}`)
    .join('\n')

  const explanationSection = explanation
    ? `\nFusion explanation: ${explanation}`
    : ''

  const pantrySection = pantryItems && pantryItems.length > 0
    ? `\nThe user has the following items in their pantry:\n${pantryItems.map(item => `- ${item}`).join('\n')}\nSTRONGLY PREFER suggesting a substitute from the user's pantry items above. If a good match exists in the pantry, use it. If no pantry item is suitable, suggest the best general substitute and note it's not in the user's pantry.\n`
    : ''

  const systemPrompt = 'You are a professional chef specializing in ingredient substitutions. You understand how ingredients interact in recipes and can suggest accurate replacements that maintain the dish\'s flavor profile and structure.'

  const userPrompt = `I need to substitute "${ingredientToReplace}" in the following recipe ${reasonText}.

Recipe: ${recipeTitle}
Description: ${recipeDescription}${explanationSection}
${pantrySection}
Current ingredients:
${ingredientsList}

Current instructions:
${instructionsList}

Please suggest a substitute for "${ingredientToReplace}" and update the recipe accordingly.

Return your response as a JSON object with EXACTLY this structure:
{
  "substitute": {
    "name": "substitute ingredient name (string)",
    "quantity": "amount (string)",
    "unit": "unit of measurement (string)"
  },
  "updatedInstructions": [
    "Step 1 with substitute applied (string)",
    "Step 2 (string)"
  ],
  "updatedExplanation": "Updated 2-3 sentence explanation of why this fusion works with the substitution (string)",
  "substitutionNote": "Brief note about why this substitute works well here (string)",
  "fromPantry": true
}

Requirements:
- The substitute should work well in this specific recipe context
- updatedInstructions must have the same number of steps as the original
- Only modify instructions that reference the replaced ingredient
- The substitutionNote should explain the flavor/texture tradeoffs
- Set "fromPantry" to true if the substitute was chosen from the user's pantry items, false otherwise
${reason === 'allergy' ? '- CRITICAL: The substitute must be safe for someone with an allergy to ' + ingredientToReplace : ''}

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`

  return `${systemPrompt}\n\n${userPrompt}`
}
