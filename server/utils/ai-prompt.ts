/**
 * AI Recipe Generation Prompt Builder
 *
 * Builds structured prompts for Workers AI to generate fusion recipes
 * based on pantry ingredients and cuisine preferences.
 */

interface PromptParams {
  ingredients: string[]
  cuisines: string[]
  restrictions: string[]
}

/**
 * Builds a structured prompt for fusion recipe generation.
 *
 * The prompt instructs the LLM to:
 * - Create a fusion recipe combining specified cuisines
 * - Use available pantry ingredients as the base
 * - Respect dietary restrictions
 * - Assume common pantry staples (salt, pepper, oil, water, sugar, flour)
 * - Return strictly formatted JSON output
 *
 * @param params - Ingredients, cuisines, and dietary restrictions
 * @returns Formatted prompt string for LLM
 */
export function buildRecipePrompt(params: PromptParams): string {
  const { ingredients, cuisines, restrictions } = params

  // Build cuisine fusion description
  const cuisineText = cuisines.length === 1
    ? cuisines[0]
    : `${cuisines.slice(0, -1).join(', ')} and ${cuisines[cuisines.length - 1]} fusion`

  // Build dietary restrictions text
  const restrictionsText = restrictions.length > 0
    ? `\n\nIMPORTANT: This recipe MUST be ${restrictions.join(', ')}. Do not include any ingredients that violate these dietary restrictions.`
    : ''

  const systemPrompt = 'You are a professional chef specializing in cross-cultural cuisine fusion. You create creative, delicious recipes that combine techniques and flavors from different culinary traditions.'

  const userPrompt = `Create a ${cuisineText} recipe using these available ingredients:
${ingredients.map(ing => `- ${ing}`).join('\n')}

You may also assume access to common pantry staples like: salt, pepper, olive oil, vegetable oil, water, sugar, flour (if not gluten-free).
${restrictionsText}

Your recipe should creatively combine cooking techniques and flavor profiles from the specified cuisines to create an exciting fusion dish.

Please explain any "bridge ingredients" you add that help connect the different culinary traditions (this helps users understand why certain ingredients work together).

Return your response as a JSON object with EXACTLY this structure:
{
  "title": "Recipe name (string)",
  "description": "2-3 sentences about the fusion concept and what makes this dish special",
  "ingredients": [
    {
      "name": "ingredient name (string)",
      "quantity": "amount (string)",
      "unit": "unit of measurement (string)"
    }
  ],
  "instructions": [
    "Step 1 instruction (string)",
    "Step 2 instruction (string)"
  ],
  "cuisineTags": ["cuisine1", "cuisine2"],
  "dietaryTags": ["tag1", "tag2"] (optional, use for vegetarian, vegan, gluten-free, dairy-free, nut-free),
  "cookTime": 30 (total cooking time in minutes, number),
  "difficulty": "easy" (one of: "easy", "medium", "hard"),
  "servings": 4 (number of servings, number)
}

Requirements:
- instructions array must have 5-15 steps
- Each step should be clear and actionable
- Include cooking times and temperatures where relevant
- Title should be appealing and describe the fusion concept
- Use the provided ingredients as the base of the recipe

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`

  return `${systemPrompt}\n\n${userPrompt}`
}
