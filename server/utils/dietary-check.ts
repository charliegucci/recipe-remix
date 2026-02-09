/**
 * Dietary Restriction Validation
 *
 * Implements SAFE-02 requirement: Detect and flag dietary restriction violations
 * in AI-generated recipes post-generation.
 *
 * Supports: vegetarian, vegan, gluten-free, dairy-free, nut-free
 */

interface DietaryViolation {
  ingredient: string
  restriction: string
}

interface DietaryCheckResult {
  passed: boolean
  violations: DietaryViolation[]
}

/**
 * Map of dietary restrictions to excluded ingredient keywords.
 *
 * Each restriction contains an array of keywords that should NOT appear
 * in ingredients for recipes with that dietary restriction.
 */
export const RESTRICTION_MAP: Record<string, string[]> = {
  'vegetarian': [
    // Meat
    'beef', 'pork', 'lamb', 'veal', 'steak', 'bacon', 'ham', 'sausage',
    'salami', 'pepperoni', 'prosciutto', 'chorizo', 'ground beef', 'ground pork',
    // Poultry
    'chicken', 'turkey', 'duck', 'goose', 'poultry',
    // Seafood
    'fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'trout', 'mackerel',
    'shrimp', 'crab', 'lobster', 'scallop', 'shellfish', 'clam', 'mussel', 'oyster',
    'anchovy', 'sardine', 'seafood',
    // Meat-based products
    'gelatin', 'lard', 'tallow', 'rennet', 'meat stock', 'chicken stock',
    'beef stock', 'bone broth'
  ],

  'vegan': [
    // All vegetarian exclusions
    'beef', 'pork', 'lamb', 'veal', 'steak', 'bacon', 'ham', 'sausage',
    'salami', 'pepperoni', 'prosciutto', 'chorizo', 'ground beef', 'ground pork',
    'chicken', 'turkey', 'duck', 'goose', 'poultry',
    'fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'trout', 'mackerel',
    'shrimp', 'crab', 'lobster', 'scallop', 'shellfish', 'clam', 'mussel', 'oyster',
    'anchovy', 'sardine', 'seafood',
    'gelatin', 'lard', 'tallow', 'rennet', 'meat stock', 'chicken stock',
    'beef stock', 'bone broth',
    // Dairy
    'milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream', 'whey',
    'casein', 'lactose', 'ghee', 'buttermilk', 'half and half', 'heavy cream',
    'parmesan', 'mozzarella', 'cheddar', 'feta', 'goat cheese', 'ricotta',
    'cream cheese', 'cottage cheese',
    // Eggs
    'egg', 'eggs', 'mayonnaise', 'aioli',
    // Honey
    'honey'
  ],

  'gluten-free': [
    'wheat', 'wheat flour', 'all-purpose flour', 'bread flour', 'whole wheat',
    'barley', 'rye', 'malt', 'brewer\'s yeast',
    'flour', // Exclude generic flour unless specified as gluten-free
    'pasta', // Exclude generic pasta unless specified as gluten-free
    'noodle', 'spaghetti', 'linguine', 'fettuccine', 'penne', 'macaroni',
    'bread', 'breadcrumb', 'bread crumbs', 'panko',
    'couscous', 'farro', 'semolina', 'seitan',
    'soy sauce', // Regular soy sauce contains wheat
    'teriyaki sauce' // Usually contains soy sauce with wheat
  ],

  'dairy-free': [
    'milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream', 'whey',
    'casein', 'lactose', 'ghee', 'buttermilk', 'half and half', 'heavy cream',
    'parmesan', 'mozzarella', 'cheddar', 'feta', 'goat cheese', 'ricotta',
    'cream cheese', 'cottage cheese', 'kefir', 'condensed milk', 'evaporated milk',
    'ice cream', 'whipped cream'
  ],

  'nut-free': [
    'almond', 'almonds', 'almond flour', 'almond milk', 'almond butter',
    'walnut', 'walnuts',
    'pecan', 'pecans',
    'cashew', 'cashews', 'cashew butter',
    'peanut', 'peanuts', 'peanut butter', 'peanut oil',
    'pistachio', 'pistachios',
    'hazelnut', 'hazelnuts', 'nutella',
    'macadamia', 'macadamia nut',
    'brazil nut', 'brazil nuts',
    'pine nut', 'pine nuts', 'pignoli',
    'nut', 'nuts', 'tree nut', 'mixed nuts'
  ]
}

/**
 * Checks if ingredients violate specified dietary restrictions.
 *
 * Performs case-insensitive keyword matching against the RESTRICTION_MAP.
 * Returns all violations found, allowing the caller to decide whether to
 * flag, warn, or reject the recipe.
 *
 * @param ingredients - Array of ingredients with name field
 * @param restrictions - Array of dietary restriction strings (e.g., ['vegetarian', 'gluten-free'])
 * @returns Check result with passed status and list of violations
 */
export function checkDietaryRestrictions(
  ingredients: Array<{ name: string }>,
  restrictions: string[]
): DietaryCheckResult {
  const violations: DietaryViolation[] = []

  for (const restriction of restrictions) {
    const excludedKeywords = RESTRICTION_MAP[restriction.toLowerCase()]

    if (!excludedKeywords) {
      // Unknown restriction, skip
      continue
    }

    for (const ingredient of ingredients) {
      const ingredientNameLower = ingredient.name.toLowerCase()

      // Check each excluded keyword
      for (const keyword of excludedKeywords) {
        if (ingredientNameLower.includes(keyword)) {
          // Special case: Allow "rice flour", "almond flour" (if not nut-free), etc.
          // if the generic "flour" is excluded but a specific gluten-free flour is used
          if (keyword === 'flour') {
            const glutenFreeFlours = ['rice flour', 'almond flour', 'coconut flour', 'chickpea flour', 'tapioca flour', 'gluten-free flour']
            const isGlutenFreeFlour = glutenFreeFlours.some(gfFlour => ingredientNameLower.includes(gfFlour))
            if (isGlutenFreeFlour && restriction === 'gluten-free') {
              continue // Allow gluten-free flours
            }
          }

          // Special case: Allow "rice pasta", "gluten-free pasta", etc.
          if (keyword === 'pasta') {
            const glutenFreePasta = ['rice pasta', 'gluten-free pasta', 'lentil pasta', 'chickpea pasta']
            const isGlutenFreePasta = glutenFreePasta.some(gfPasta => ingredientNameLower.includes(gfPasta))
            if (isGlutenFreePasta && restriction === 'gluten-free') {
              continue // Allow gluten-free pasta
            }
          }

          violations.push({
            ingredient: ingredient.name,
            restriction
          })
          break // Only add each ingredient once per restriction
        }
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations
  }
}
