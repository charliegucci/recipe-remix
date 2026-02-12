import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core'

// Better Auth requires these exact table structures
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }),
  image: text('image'),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

// Verification tokens for email verification (optional, for later)
export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

// Recipe tables for Core Read Path
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  ingredients: text('ingredients').notNull(), // JSON array: [{name, quantity, unit}]
  instructions: text('instructions').notNull(), // JSON array of strings
  cuisineTags: text('cuisine_tags').notNull().default('[]'), // JSON array
  dietaryTags: text('dietary_tags').notNull().default('[]'), // JSON array
  cookTime: integer('cook_time'), // minutes
  difficulty: text('difficulty'), // 'easy' | 'medium' | 'hard'
  imageKey: text('image_key'), // R2 object key, nullable
  source: text('source').notNull().default('curated'), // 'curated' | 'ai_generated'
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  servings: integer('servings').default(4),
  explanation: text('explanation'), // "Why this fusion works" — AI-generated explanation
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  slugIdx: index('recipes_slug_idx').on(table.slug)
}))

export const recipeCategories = sqliteTable('recipe_categories', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  category: text('category').notNull()
}, (table) => ({
  categoryIdx: index('recipe_categories_category_idx').on(table.category)
}))

// Phase 3: Pantry and User Features

// Curated ingredient master list (seeded, not user-generated)
export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'produce', 'protein', 'dairy', 'grains', 'spices', 'condiments', 'baking', 'canned', 'nuts_seeds'
  commonNames: text('common_names').notNull().default('[]'), // JSON array for search aliases
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  nameIdx: index('ingredients_name_idx').on(table.name)
}))

// User's pantry ingredients (authenticated users only)
export const pantryItems = sqliteTable('pantry_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ingredientId: text('ingredient_id').notNull(),
  ingredientName: text('ingredient_name').notNull(),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  userIdx: index('pantry_items_user_idx').on(table.userId),
  ingredientIdx: index('pantry_items_ingredient_idx').on(table.ingredientId)
}))

// User's dietary restrictions (authenticated users only)
export const userDietaryRestrictions = sqliteTable('user_dietary_restrictions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  restriction: text('restriction').notNull(), // 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  userIdx: index('user_dietary_restrictions_user_idx').on(table.userId),
  uniqueUserRestriction: index('user_dietary_restrictions_unique').on(table.userId, table.restriction)
}))

// User favorites (junction table with composite primary key)
export const userFavorites = sqliteTable('user_favorites', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.recipeId] }),
  userIdx: index('user_favorites_user_idx').on(table.userId),
  recipeIdx: index('user_favorites_recipe_idx').on(table.recipeId)
}))

// User's recipe viewing/generation history
export const userRecipeHistory = sqliteTable('user_recipe_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  viewedAt: integer('viewed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  userIdx: index('user_recipe_history_user_idx').on(table.userId),
  viewedAtIdx: index('user_recipe_history_viewed_at_idx').on(table.viewedAt)
}))

// User ratings and reviews
export const userRecipeReviews = sqliteTable('user_recipe_reviews', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 stars
  review: text('review'), // Optional text review
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  uniqueUserRecipe: index('user_recipe_reviews_unique').on(table.userId, table.recipeId),
  recipeIdx: index('user_recipe_reviews_recipe_idx').on(table.recipeId)
}))

// Phase 4: AI Generation Pipeline

// Analytics events for tracking user interactions and generation metrics
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(), // 'recipe_generated', 'recipe_generation_failed', 'recipe_viewed', 'recipe_favorited'
  userId: text('user_id').references(() => users.id),
  recipeId: text('recipe_id').references(() => recipes.id),
  metadata: text('metadata').notNull().default('{}'), // JSON object for extra data
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt)
}))

// AI recipe generation history and status tracking
export const generationHistory = sqliteTable('generation_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: text('recipe_id').references(() => recipes.id),
  inputIngredients: text('input_ingredients').notNull(), // JSON array of ingredient names
  cuisinePreferences: text('cuisine_preferences').notNull().default('[]'), // JSON array of selected cuisines
  status: text('status').notNull().default('pending'), // 'pending' | 'generating' | 'validating' | 'completed' | 'failed'
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' })
}, (table) => ({
  userCreatedAtIdx: index('generation_history_user_created_at_idx').on(table.userId, table.createdAt),
  statusIdx: index('generation_history_status_idx').on(table.status)
}))
