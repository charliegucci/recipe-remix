import { useDrizzle } from '../utils/drizzle'
import {
  recipes,
  recipeCategories,
  userFavorites,
  userRecipeHistory,
  userRecipeReviews,
  analyticsEvents,
  generationHistory
} from '../db/schema'
import { generateUniqueSlug } from '../utils/slug-generator'

export default defineEventHandler(async (event) => {
  const db = useDrizzle(event)

  // Clear existing data (order matters: delete tables that reference recipes first)
  await db.delete(recipeCategories)
  await db.delete(userFavorites)
  await db.delete(userRecipeHistory)
  await db.delete(userRecipeReviews)
  await db.delete(analyticsEvents)
  await db.delete(generationHistory)
  await db.delete(recipes)

  // Seed recipes with stable UUIDs.
  // Featured recipes (5) use Unsplash food images matching the dish; others use picsum. For production, blob storage + imageKey is an option (Phase 13).
  const recipeData = [
    // Italian (5 recipes, 1 featured)
    {
      id: crypto.randomUUID(),
      title: 'Spaghetti Carbonara',
      description: 'Classic Roman pasta with eggs, guanciale, pecorino, and black pepper. Creamy without cream.',
      ingredients: JSON.stringify([
        { name: 'Spaghetti', quantity: '400', unit: 'g' },
        { name: 'Guanciale', quantity: '200', unit: 'g' },
        { name: 'Eggs', quantity: '4', unit: 'whole' },
        { name: 'Pecorino Romano', quantity: '100', unit: 'g' },
        { name: 'Black pepper', quantity: '1', unit: 'tsp' }
      ]),
      instructions: JSON.stringify([
        'Cook spaghetti in salted boiling water until al dente',
        'Dice guanciale and cook in a pan until crispy',
        'Whisk eggs with grated pecorino and black pepper',
        'Drain pasta, reserving 1 cup pasta water',
        'Remove guanciale pan from heat, add pasta',
        'Add egg mixture, tossing quickly with pasta water to create creamy sauce',
        'Serve immediately with extra pecorino and pepper'
      ]),
      cuisineTags: JSON.stringify(['Italian']),
      dietaryTags: JSON.stringify([]),
      cookTime: 25,
      difficulty: 'medium',
      imageKey: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
      source: 'curated',
      featured: true,
      category: 'Italian'
    },
    {
      id: crypto.randomUUID(),
      title: 'Margherita Pizza',
      description: 'Simple Neapolitan pizza with tomato, mozzarella, basil, and olive oil.',
      ingredients: JSON.stringify([
        { name: 'Pizza dough', quantity: '1', unit: 'ball' },
        { name: 'San Marzano tomatoes', quantity: '200', unit: 'g' },
        { name: 'Fresh mozzarella', quantity: '200', unit: 'g' },
        { name: 'Fresh basil', quantity: '10', unit: 'leaves' },
        { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
        { name: 'Salt', quantity: '1', unit: 'tsp' }
      ]),
      instructions: JSON.stringify([
        'Preheat oven to 500°F (260°C) with pizza stone inside',
        'Stretch dough into 12-inch circle',
        'Crush tomatoes and season with salt',
        'Spread tomato sauce on dough, leaving 1-inch border',
        'Tear mozzarella and distribute evenly',
        'Drizzle with olive oil',
        'Bake for 8-10 minutes until crust is golden and cheese bubbles',
        'Top with fresh basil leaves and serve immediately'
      ]),
      cuisineTags: JSON.stringify(['Italian']),
      dietaryTags: JSON.stringify(['Vegetarian']),
      cookTime: 20,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe2/800/600',
      source: 'curated',
      featured: false,
      category: 'Italian'
    },
    {
      id: crypto.randomUUID(),
      title: 'Chicken Parmigiana',
      description: 'Breaded chicken cutlets topped with marinara and melted mozzarella.',
      ingredients: JSON.stringify([
        { name: 'Chicken breasts', quantity: '4', unit: 'pieces' },
        { name: 'Breadcrumbs', quantity: '150', unit: 'g' },
        { name: 'Parmesan cheese', quantity: '100', unit: 'g' },
        { name: 'Marinara sauce', quantity: '400', unit: 'ml' },
        { name: 'Mozzarella cheese', quantity: '200', unit: 'g' },
        { name: 'Eggs', quantity: '2', unit: 'whole' },
        { name: 'Flour', quantity: '100', unit: 'g' }
      ]),
      instructions: JSON.stringify([
        'Pound chicken breasts to even thickness',
        'Set up breading station: flour, beaten eggs, breadcrumbs mixed with parmesan',
        'Coat each chicken piece in flour, egg, then breadcrumb mixture',
        'Fry in olive oil until golden brown on both sides',
        'Place in baking dish, top with marinara and mozzarella',
        'Bake at 375°F (190°C) for 15 minutes until cheese melts',
        'Serve with pasta or salad'
      ]),
      cuisineTags: JSON.stringify(['Italian']),
      dietaryTags: JSON.stringify([]),
      cookTime: 45,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe3/800/600',
      source: 'curated',
      featured: false,
      category: 'Italian'
    },
    {
      id: crypto.randomUUID(),
      title: 'Tiramisu',
      description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone cream.',
      ingredients: JSON.stringify([
        { name: 'Ladyfinger cookies', quantity: '24', unit: 'pieces' },
        { name: 'Mascarpone cheese', quantity: '500', unit: 'g' },
        { name: 'Eggs', quantity: '6', unit: 'whole' },
        { name: 'Sugar', quantity: '100', unit: 'g' },
        { name: 'Strong espresso', quantity: '300', unit: 'ml' },
        { name: 'Cocoa powder', quantity: '3', unit: 'tbsp' }
      ]),
      instructions: JSON.stringify([
        'Separate eggs, whisk yolks with sugar until pale',
        'Fold in mascarpone cheese until smooth',
        'Beat egg whites to stiff peaks, fold into mascarpone mixture',
        'Brew espresso and let cool slightly',
        'Quickly dip ladyfingers in espresso, arrange in dish',
        'Spread half the mascarpone cream over ladyfingers',
        'Repeat with another layer of dipped ladyfingers and cream',
        'Refrigerate 4 hours, dust with cocoa powder before serving'
      ]),
      cuisineTags: JSON.stringify(['Italian']),
      dietaryTags: JSON.stringify(['Vegetarian']),
      cookTime: 30,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe4/800/600',
      source: 'curated',
      featured: false,
      category: 'Italian'
    },
    {
      id: crypto.randomUUID(),
      title: 'Risotto alla Milanese',
      description: 'Creamy saffron risotto from Milan, rich and golden.',
      ingredients: JSON.stringify([
        { name: 'Arborio rice', quantity: '320', unit: 'g' },
        { name: 'Chicken stock', quantity: '1', unit: 'liter' },
        { name: 'White wine', quantity: '150', unit: 'ml' },
        { name: 'Saffron threads', quantity: '0.5', unit: 'g' },
        { name: 'Butter', quantity: '80', unit: 'g' },
        { name: 'Parmesan cheese', quantity: '80', unit: 'g' },
        { name: 'Onion', quantity: '1', unit: 'small' }
      ]),
      instructions: JSON.stringify([
        'Heat stock and steep saffron in it',
        'Sauté finely chopped onion in half the butter',
        'Add rice, toast for 2 minutes',
        'Add wine, stir until absorbed',
        'Add stock one ladle at a time, stirring constantly',
        'Cook for 18-20 minutes until rice is creamy but al dente',
        'Remove from heat, stir in remaining butter and parmesan',
        'Let rest 2 minutes, serve immediately'
      ]),
      cuisineTags: JSON.stringify(['Italian']),
      dietaryTags: JSON.stringify(['Vegetarian', 'Gluten-Free']),
      cookTime: 35,
      difficulty: 'hard',
      imageKey: 'https://picsum.photos/seed/recipe5/800/600',
      source: 'curated',
      featured: false,
      category: 'Italian'
    },

    // Mexican (5 recipes, 1 featured)
    {
      id: crypto.randomUUID(),
      title: 'Tacos al Pastor',
      description: 'Marinated pork tacos with pineapple, a Mexico City street food classic.',
      ingredients: JSON.stringify([
        { name: 'Pork shoulder', quantity: '1', unit: 'kg' },
        { name: 'Pineapple', quantity: '1', unit: 'whole' },
        { name: 'Dried guajillo chiles', quantity: '4', unit: 'pieces' },
        { name: 'Achiote paste', quantity: '2', unit: 'tbsp' },
        { name: 'Corn tortillas', quantity: '12', unit: 'pieces' },
        { name: 'Onion', quantity: '1', unit: 'medium' },
        { name: 'Cilantro', quantity: '1', unit: 'bunch' },
        { name: 'Lime', quantity: '2', unit: 'whole' }
      ]),
      instructions: JSON.stringify([
        'Rehydrate chiles in hot water, blend with achiote, vinegar, and spices',
        'Slice pork thinly, marinate in chile mixture for 4 hours',
        'Grill or pan-fry pork until charred and caramelized',
        'Grill pineapple slices until caramelized',
        'Warm tortillas on griddle',
        'Chop pork and pineapple into small pieces',
        'Fill tortillas with pork and pineapple',
        'Top with diced onion, cilantro, and lime juice'
      ]),
      cuisineTags: JSON.stringify(['Mexican']),
      dietaryTags: JSON.stringify([]),
      cookTime: 45,
      difficulty: 'medium',
      imageKey: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
      source: 'curated',
      featured: true,
      category: 'Mexican'
    },
    {
      id: crypto.randomUUID(),
      title: 'Chicken Enchiladas',
      description: 'Rolled tortillas filled with chicken and cheese, smothered in red sauce.',
      ingredients: JSON.stringify([
        { name: 'Chicken breast', quantity: '500', unit: 'g' },
        { name: 'Corn tortillas', quantity: '8', unit: 'pieces' },
        { name: 'Enchilada sauce', quantity: '400', unit: 'ml' },
        { name: 'Cheddar cheese', quantity: '300', unit: 'g' },
        { name: 'Sour cream', quantity: '150', unit: 'ml' },
        { name: 'Black beans', quantity: '200', unit: 'g' },
        { name: 'Jalapeño', quantity: '2', unit: 'pieces' }
      ]),
      instructions: JSON.stringify([
        'Poach chicken, shred when cool',
        'Mix shredded chicken with half the cheese and some sauce',
        'Warm tortillas to make pliable',
        'Fill each tortilla with chicken mixture, roll tightly',
        'Place seam-side down in baking dish',
        'Pour remaining sauce over enchiladas',
        'Top with remaining cheese',
        'Bake at 350°F (175°C) for 25 minutes',
        'Serve with sour cream, jalapeños, and black beans'
      ]),
      cuisineTags: JSON.stringify(['Mexican']),
      dietaryTags: JSON.stringify([]),
      cookTime: 50,
      difficulty: 'easy',
      imageKey: 'https://picsum.photos/seed/recipe7/800/600',
      source: 'curated',
      featured: false,
      category: 'Mexican'
    },
    {
      id: crypto.randomUUID(),
      title: 'Guacamole',
      description: 'Fresh avocado dip with lime, cilantro, and jalapeño.',
      ingredients: JSON.stringify([
        { name: 'Avocados', quantity: '4', unit: 'ripe' },
        { name: 'Lime', quantity: '2', unit: 'whole' },
        { name: 'Cilantro', quantity: '0.5', unit: 'cup' },
        { name: 'Red onion', quantity: '0.5', unit: 'small' },
        { name: 'Jalapeño', quantity: '1', unit: 'piece' },
        { name: 'Tomato', quantity: '1', unit: 'medium' },
        { name: 'Salt', quantity: '1', unit: 'tsp' }
      ]),
      instructions: JSON.stringify([
        'Halve avocados, remove pits, scoop flesh into bowl',
        'Mash with fork to desired consistency',
        'Add lime juice immediately to prevent browning',
        'Finely dice onion, jalapeño, and tomato',
        'Chop cilantro',
        'Mix all ingredients together',
        'Season with salt to taste',
        'Serve immediately with tortilla chips'
      ]),
      cuisineTags: JSON.stringify(['Mexican']),
      dietaryTags: JSON.stringify(['Vegan', 'Gluten-Free']),
      cookTime: 15,
      difficulty: 'easy',
      imageKey: 'https://picsum.photos/seed/recipe8/800/600',
      source: 'curated',
      featured: false,
      category: 'Mexican'
    },
    {
      id: crypto.randomUUID(),
      title: 'Churros',
      description: 'Crispy fried dough pastries coated in cinnamon sugar.',
      ingredients: JSON.stringify([
        { name: 'Water', quantity: '250', unit: 'ml' },
        { name: 'Butter', quantity: '60', unit: 'g' },
        { name: 'All-purpose flour', quantity: '150', unit: 'g' },
        { name: 'Eggs', quantity: '2', unit: 'whole' },
        { name: 'Sugar', quantity: '100', unit: 'g' },
        { name: 'Cinnamon', quantity: '2', unit: 'tsp' },
        { name: 'Vegetable oil', quantity: '1', unit: 'liter' }
      ]),
      instructions: JSON.stringify([
        'Bring water, butter, and pinch of salt to boil',
        'Add flour all at once, stir vigorously until dough forms',
        'Remove from heat, let cool 5 minutes',
        'Beat in eggs one at a time until smooth',
        'Heat oil to 375°F (190°C)',
        'Pipe dough into hot oil in 6-inch strips',
        'Fry until golden brown, about 2 minutes per side',
        'Drain on paper towels, roll in cinnamon sugar',
        'Serve warm with chocolate sauce for dipping'
      ]),
      cuisineTags: JSON.stringify(['Mexican']),
      dietaryTags: JSON.stringify(['Vegetarian']),
      cookTime: 30,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe9/800/600',
      source: 'curated',
      featured: false,
      category: 'Mexican'
    },
    {
      id: crypto.randomUUID(),
      title: 'Pozole',
      description: 'Traditional hominy soup with pork, chiles, and fresh toppings.',
      ingredients: JSON.stringify([
        { name: 'Pork shoulder', quantity: '1', unit: 'kg' },
        { name: 'Hominy', quantity: '800', unit: 'g' },
        { name: 'Dried ancho chiles', quantity: '3', unit: 'pieces' },
        { name: 'Garlic', quantity: '6', unit: 'cloves' },
        { name: 'Onion', quantity: '1', unit: 'large' },
        { name: 'Oregano', quantity: '2', unit: 'tsp' },
        { name: 'Cabbage', quantity: '1', unit: 'cup shredded' },
        { name: 'Radishes', quantity: '6', unit: 'sliced' },
        { name: 'Lime', quantity: '2', unit: 'whole' }
      ]),
      instructions: JSON.stringify([
        'Boil pork shoulder with onion and garlic for 2 hours until tender',
        'Toast and rehydrate chiles, blend into paste',
        'Shred pork, return to broth',
        'Add hominy and chile paste',
        'Simmer 30 minutes, season with oregano and salt',
        'Serve in bowls with fresh cabbage, radishes, lime, and oregano'
      ]),
      cuisineTags: JSON.stringify(['Mexican']),
      dietaryTags: JSON.stringify([]),
      cookTime: 180,
      difficulty: 'hard',
      imageKey: 'https://picsum.photos/seed/recipe10/800/600',
      source: 'curated',
      featured: false,
      category: 'Mexican'
    },

    // Asian (6 recipes, 1 featured)
    {
      id: crypto.randomUUID(),
      title: 'Pad Thai',
      description: 'Stir-fried rice noodles with tamarind, fish sauce, peanuts, and lime.',
      ingredients: JSON.stringify([
        { name: 'Rice noodles', quantity: '300', unit: 'g' },
        { name: 'Shrimp', quantity: '300', unit: 'g' },
        { name: 'Eggs', quantity: '2', unit: 'whole' },
        { name: 'Bean sprouts', quantity: '150', unit: 'g' },
        { name: 'Peanuts', quantity: '50', unit: 'g' },
        { name: 'Tamarind paste', quantity: '3', unit: 'tbsp' },
        { name: 'Fish sauce', quantity: '3', unit: 'tbsp' },
        { name: 'Palm sugar', quantity: '2', unit: 'tbsp' },
        { name: 'Lime', quantity: '2', unit: 'whole' },
        { name: 'Garlic', quantity: '3', unit: 'cloves' }
      ]),
      instructions: JSON.stringify([
        'Soak rice noodles in warm water for 30 minutes',
        'Mix tamarind paste, fish sauce, and palm sugar for sauce',
        'Heat wok, scramble eggs, set aside',
        'Stir-fry garlic and shrimp until pink',
        'Add drained noodles and sauce, toss to coat',
        'Add eggs back, toss with bean sprouts',
        'Serve topped with crushed peanuts, lime wedges, and extra bean sprouts'
      ]),
      cuisineTags: JSON.stringify(['Asian', 'Thai']),
      dietaryTags: JSON.stringify([]),
      cookTime: 35,
      difficulty: 'medium',
      imageKey: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
      source: 'curated',
      featured: true,
      category: 'Asian'
    },
    {
      id: crypto.randomUUID(),
      title: 'Chicken Teriyaki',
      description: 'Japanese grilled chicken with sweet and savory teriyaki glaze.',
      ingredients: JSON.stringify([
        { name: 'Chicken thighs', quantity: '6', unit: 'pieces' },
        { name: 'Soy sauce', quantity: '100', unit: 'ml' },
        { name: 'Mirin', quantity: '100', unit: 'ml' },
        { name: 'Sugar', quantity: '3', unit: 'tbsp' },
        { name: 'Ginger', quantity: '2', unit: 'cm piece' },
        { name: 'Garlic', quantity: '2', unit: 'cloves' },
        { name: 'Sesame seeds', quantity: '1', unit: 'tbsp' },
        { name: 'Green onions', quantity: '2', unit: 'stalks' }
      ]),
      instructions: JSON.stringify([
        'Mix soy sauce, mirin, sugar, grated ginger, and minced garlic',
        'Marinate chicken for 30 minutes',
        'Heat grill or grill pan to medium-high',
        'Grill chicken 6-7 minutes per side',
        'Brush with marinade while cooking',
        'Simmer remaining marinade until thickened',
        'Slice chicken, drizzle with reduced sauce',
        'Garnish with sesame seeds and sliced green onions'
      ]),
      cuisineTags: JSON.stringify(['Asian', 'Japanese']),
      dietaryTags: JSON.stringify([]),
      cookTime: 40,
      difficulty: 'easy',
      imageKey: 'https://picsum.photos/seed/recipe12/800/600',
      source: 'curated',
      featured: false,
      category: 'Asian'
    },
    {
      id: crypto.randomUUID(),
      title: 'California Roll',
      description: 'Inside-out sushi roll with crab, avocado, and cucumber.',
      ingredients: JSON.stringify([
        { name: 'Sushi rice', quantity: '400', unit: 'g' },
        { name: 'Nori sheets', quantity: '4', unit: 'pieces' },
        { name: 'Imitation crab', quantity: '200', unit: 'g' },
        { name: 'Avocado', quantity: '1', unit: 'whole' },
        { name: 'Cucumber', quantity: '1', unit: 'whole' },
        { name: 'Rice vinegar', quantity: '3', unit: 'tbsp' },
        { name: 'Sesame seeds', quantity: '2', unit: 'tbsp' },
        { name: 'Soy sauce', quantity: '4', unit: 'tbsp' }
      ]),
      instructions: JSON.stringify([
        'Cook sushi rice, season with rice vinegar and sugar',
        'Let rice cool to room temperature',
        'Place nori on bamboo mat, spread rice evenly',
        'Sprinkle sesame seeds on rice, flip over',
        'Place crab, avocado slices, and cucumber strips on nori',
        'Roll tightly using bamboo mat',
        'Slice into 8 pieces with wet knife',
        'Serve with soy sauce, wasabi, and pickled ginger'
      ]),
      cuisineTags: JSON.stringify(['Asian', 'Japanese']),
      dietaryTags: JSON.stringify([]),
      cookTime: 45,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe13/800/600',
      source: 'curated',
      featured: false,
      category: 'Asian'
    },
    {
      id: crypto.randomUUID(),
      title: 'Pho',
      description: 'Vietnamese beef noodle soup with aromatic broth and fresh herbs.',
      ingredients: JSON.stringify([
        { name: 'Beef bones', quantity: '1', unit: 'kg' },
        { name: 'Beef sirloin', quantity: '400', unit: 'g' },
        { name: 'Rice noodles', quantity: '400', unit: 'g' },
        { name: 'Star anise', quantity: '3', unit: 'pieces' },
        { name: 'Cinnamon stick', quantity: '1', unit: 'piece' },
        { name: 'Ginger', quantity: '5', unit: 'cm piece' },
        { name: 'Onion', quantity: '1', unit: 'large' },
        { name: 'Fish sauce', quantity: '4', unit: 'tbsp' },
        { name: 'Thai basil', quantity: '1', unit: 'bunch' },
        { name: 'Bean sprouts', quantity: '150', unit: 'g' },
        { name: 'Lime', quantity: '2', unit: 'whole' }
      ]),
      instructions: JSON.stringify([
        'Char ginger and onion under broiler',
        'Boil bones for 5 minutes, drain and rinse',
        'Cover bones with fresh water, add charred aromatics and spices',
        'Simmer broth for 6 hours, skimming impurities',
        'Strain broth, season with fish sauce and salt',
        'Soak rice noodles until soft',
        'Slice beef very thinly',
        'Place noodles in bowl, top with raw beef slices',
        'Ladle hot broth over (cooks the beef)',
        'Serve with basil, bean sprouts, lime, and chili'
      ]),
      cuisineTags: JSON.stringify(['Asian', 'Vietnamese']),
      dietaryTags: JSON.stringify([]),
      cookTime: 400,
      difficulty: 'hard',
      imageKey: 'https://picsum.photos/seed/recipe14/800/600',
      source: 'curated',
      featured: false,
      category: 'Asian'
    },
    {
      id: crypto.randomUUID(),
      title: 'Kung Pao Chicken',
      description: 'Spicy Sichuan stir-fry with chicken, peanuts, and dried chiles.',
      ingredients: JSON.stringify([
        { name: 'Chicken breast', quantity: '500', unit: 'g' },
        { name: 'Peanuts', quantity: '100', unit: 'g' },
        { name: 'Dried red chiles', quantity: '8', unit: 'pieces' },
        { name: 'Sichuan peppercorns', quantity: '1', unit: 'tsp' },
        { name: 'Soy sauce', quantity: '3', unit: 'tbsp' },
        { name: 'Rice vinegar', quantity: '2', unit: 'tbsp' },
        { name: 'Sugar', quantity: '1', unit: 'tbsp' },
        { name: 'Garlic', quantity: '4', unit: 'cloves' },
        { name: 'Ginger', quantity: '2', unit: 'cm piece' },
        { name: 'Green onions', quantity: '3', unit: 'stalks' }
      ]),
      instructions: JSON.stringify([
        'Cube chicken, marinate in soy sauce and cornstarch',
        'Toast peanuts and Sichuan peppercorns',
        'Mix sauce: soy sauce, vinegar, sugar, and chicken stock',
        'Heat wok very hot, stir-fry chicken until just cooked',
        'Remove chicken, add chiles to wok until fragrant',
        'Add garlic and ginger, stir briefly',
        'Return chicken, add sauce and peanuts',
        'Toss until sauce thickens',
        'Finish with green onions, serve with rice'
      ]),
      cuisineTags: JSON.stringify(['Asian', 'Chinese']),
      dietaryTags: JSON.stringify([]),
      cookTime: 30,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe15/800/600',
      source: 'curated',
      featured: false,
      category: 'Asian'
    },
    {
      id: crypto.randomUUID(),
      title: 'Miso Soup',
      description: 'Traditional Japanese soup with dashi, miso, tofu, and seaweed.',
      ingredients: JSON.stringify([
        { name: 'Dashi stock', quantity: '800', unit: 'ml' },
        { name: 'Miso paste', quantity: '4', unit: 'tbsp' },
        { name: 'Silken tofu', quantity: '200', unit: 'g' },
        { name: 'Wakame seaweed', quantity: '10', unit: 'g' },
        { name: 'Green onions', quantity: '2', unit: 'stalks' }
      ]),
      instructions: JSON.stringify([
        'Rehydrate wakame in cold water for 5 minutes',
        'Cube tofu into small pieces',
        'Heat dashi stock to just below boiling',
        'Dissolve miso paste in small amount of hot dashi',
        'Add miso mixture back to pot (do not boil after adding miso)',
        'Add tofu and drained wakame',
        'Heat through gently for 2 minutes',
        'Serve immediately garnished with sliced green onions'
      ]),
      cuisineTags: JSON.stringify(['Asian', 'Japanese']),
      dietaryTags: JSON.stringify(['Vegetarian', 'Vegan']),
      cookTime: 15,
      difficulty: 'easy',
      imageKey: 'https://picsum.photos/seed/recipe16/800/600',
      source: 'curated',
      featured: false,
      category: 'Asian'
    },

    // American (6 recipes, 1 featured)
    {
      id: crypto.randomUUID(),
      title: 'Classic Cheeseburger',
      description: 'Juicy beef patty with melted cheddar, lettuce, tomato, and special sauce.',
      ingredients: JSON.stringify([
        { name: 'Ground beef', quantity: '600', unit: 'g' },
        { name: 'Burger buns', quantity: '4', unit: 'pieces' },
        { name: 'Cheddar cheese', quantity: '4', unit: 'slices' },
        { name: 'Lettuce', quantity: '4', unit: 'leaves' },
        { name: 'Tomato', quantity: '1', unit: 'large' },
        { name: 'Onion', quantity: '1', unit: 'medium' },
        { name: 'Pickles', quantity: '8', unit: 'slices' },
        { name: 'Mayonnaise', quantity: '4', unit: 'tbsp' },
        { name: 'Ketchup', quantity: '2', unit: 'tbsp' },
        { name: 'Mustard', quantity: '1', unit: 'tbsp' }
      ]),
      instructions: JSON.stringify([
        'Form beef into 4 patties, season generously with salt and pepper',
        'Mix mayo, ketchup, and mustard for special sauce',
        'Heat grill or cast iron pan to high heat',
        'Cook burgers 3-4 minutes per side for medium',
        'Add cheese in last minute, cover to melt',
        'Toast buns on grill',
        'Spread sauce on both bun halves',
        'Assemble: bottom bun, lettuce, tomato, burger, pickles, onion, top bun',
        'Serve immediately with fries'
      ]),
      cuisineTags: JSON.stringify(['American']),
      dietaryTags: JSON.stringify([]),
      cookTime: 20,
      difficulty: 'easy',
      imageKey: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      source: 'curated',
      featured: true,
      category: 'American'
    },
    {
      id: crypto.randomUUID(),
      title: 'Mac and Cheese',
      description: 'Creamy baked macaroni with sharp cheddar cheese sauce.',
      ingredients: JSON.stringify([
        { name: 'Elbow macaroni', quantity: '400', unit: 'g' },
        { name: 'Sharp cheddar', quantity: '400', unit: 'g' },
        { name: 'Butter', quantity: '60', unit: 'g' },
        { name: 'Flour', quantity: '60', unit: 'g' },
        { name: 'Milk', quantity: '600', unit: 'ml' },
        { name: 'Breadcrumbs', quantity: '100', unit: 'g' },
        { name: 'Salt', quantity: '1', unit: 'tsp' },
        { name: 'Black pepper', quantity: '0.5', unit: 'tsp' }
      ]),
      instructions: JSON.stringify([
        'Cook macaroni until al dente, drain',
        'Make roux: melt butter, whisk in flour, cook 2 minutes',
        'Gradually add milk, whisking constantly',
        'Simmer until thickened, about 5 minutes',
        'Remove from heat, stir in 3/4 of the cheese until melted',
        'Season with salt and pepper',
        'Mix sauce with cooked macaroni',
        'Transfer to baking dish, top with remaining cheese and breadcrumbs',
        'Bake at 350°F (175°C) for 25 minutes until golden and bubbly'
      ]),
      cuisineTags: JSON.stringify(['American']),
      dietaryTags: JSON.stringify(['Vegetarian']),
      cookTime: 45,
      difficulty: 'easy',
      imageKey: 'https://picsum.photos/seed/recipe18/800/600',
      source: 'curated',
      featured: false,
      category: 'American'
    },
    {
      id: crypto.randomUUID(),
      title: 'BBQ Ribs',
      description: 'Fall-off-the-bone pork ribs with tangy barbecue sauce.',
      ingredients: JSON.stringify([
        { name: 'Pork ribs', quantity: '2', unit: 'racks' },
        { name: 'BBQ sauce', quantity: '400', unit: 'ml' },
        { name: 'Brown sugar', quantity: '100', unit: 'g' },
        { name: 'Paprika', quantity: '2', unit: 'tbsp' },
        { name: 'Garlic powder', quantity: '1', unit: 'tbsp' },
        { name: 'Onion powder', quantity: '1', unit: 'tbsp' },
        { name: 'Cayenne pepper', quantity: '1', unit: 'tsp' },
        { name: 'Salt', quantity: '1', unit: 'tbsp' },
        { name: 'Black pepper', quantity: '1', unit: 'tbsp' }
      ]),
      instructions: JSON.stringify([
        'Remove membrane from back of ribs',
        'Mix dry rub: brown sugar, paprika, garlic powder, onion powder, cayenne, salt, pepper',
        'Coat ribs generously with rub, refrigerate 2 hours',
        'Preheat oven to 275°F (135°C)',
        'Wrap ribs tightly in foil, place on baking sheet',
        'Bake for 3 hours until tender',
        'Remove foil, brush with BBQ sauce',
        'Broil or grill 5 minutes to caramelize sauce',
        'Brush with more sauce, let rest 10 minutes, slice and serve'
      ]),
      cuisineTags: JSON.stringify(['American']),
      dietaryTags: JSON.stringify([]),
      cookTime: 210,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe19/800/600',
      source: 'curated',
      featured: false,
      category: 'American'
    },
    {
      id: crypto.randomUUID(),
      title: 'Apple Pie',
      description: 'Classic double-crust pie with cinnamon-spiced apple filling.',
      ingredients: JSON.stringify([
        { name: 'Pie dough', quantity: '2', unit: 'discs' },
        { name: 'Granny Smith apples', quantity: '6', unit: 'large' },
        { name: 'Sugar', quantity: '150', unit: 'g' },
        { name: 'Flour', quantity: '3', unit: 'tbsp' },
        { name: 'Cinnamon', quantity: '2', unit: 'tsp' },
        { name: 'Nutmeg', quantity: '0.5', unit: 'tsp' },
        { name: 'Lemon juice', quantity: '2', unit: 'tbsp' },
        { name: 'Butter', quantity: '30', unit: 'g' }
      ]),
      instructions: JSON.stringify([
        'Peel, core, and slice apples thinly',
        'Toss apples with sugar, flour, cinnamon, nutmeg, and lemon juice',
        'Roll out bottom crust, place in 9-inch pie pan',
        'Fill with apple mixture, dot with butter',
        'Roll out top crust, place over filling',
        'Crimp edges, cut vents in top',
        'Brush with egg wash, sprinkle with sugar',
        'Bake at 425°F (220°C) for 20 minutes',
        'Reduce to 350°F (175°C), bake 40 more minutes until golden',
        'Cool completely before slicing'
      ]),
      cuisineTags: JSON.stringify(['American']),
      dietaryTags: JSON.stringify(['Vegetarian']),
      cookTime: 90,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe20/800/600',
      source: 'curated',
      featured: false,
      category: 'American'
    },
    {
      id: crypto.randomUUID(),
      title: 'New England Clam Chowder',
      description: 'Creamy white chowder with clams, potatoes, and bacon.',
      ingredients: JSON.stringify([
        { name: 'Fresh clams', quantity: '1', unit: 'kg' },
        { name: 'Bacon', quantity: '150', unit: 'g' },
        { name: 'Potatoes', quantity: '500', unit: 'g' },
        { name: 'Onion', quantity: '1', unit: 'large' },
        { name: 'Celery', quantity: '2', unit: 'stalks' },
        { name: 'Heavy cream', quantity: '400', unit: 'ml' },
        { name: 'Butter', quantity: '50', unit: 'g' },
        { name: 'Flour', quantity: '50', unit: 'g' },
        { name: 'Thyme', quantity: '1', unit: 'tsp' },
        { name: 'Bay leaf', quantity: '2', unit: 'pieces' }
      ]),
      instructions: JSON.stringify([
        'Steam clams until they open, reserve liquid, chop clam meat',
        'Dice bacon, cook until crispy, remove from pot',
        'Sauté diced onion and celery in bacon fat',
        'Add butter, stir in flour to make roux',
        'Add clam liquid and diced potatoes',
        'Add bay leaves and thyme, simmer until potatoes tender',
        'Stir in cream and chopped clams',
        'Heat through without boiling',
        'Remove bay leaves, garnish with bacon and fresh thyme'
      ]),
      cuisineTags: JSON.stringify(['American']),
      dietaryTags: JSON.stringify([]),
      cookTime: 60,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe21/800/600',
      source: 'curated',
      featured: false,
      category: 'American'
    },
    {
      id: crypto.randomUUID(),
      title: 'Buffalo Wings',
      description: 'Crispy chicken wings tossed in spicy buffalo sauce.',
      ingredients: JSON.stringify([
        { name: 'Chicken wings', quantity: '1', unit: 'kg' },
        { name: 'Hot sauce', quantity: '200', unit: 'ml' },
        { name: 'Butter', quantity: '100', unit: 'g' },
        { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
        { name: 'Blue cheese dressing', quantity: '200', unit: 'ml' },
        { name: 'Celery sticks', quantity: '8', unit: 'pieces' },
        { name: 'Vegetable oil', quantity: '1', unit: 'liter' }
      ]),
      instructions: JSON.stringify([
        'Pat wings dry, season with salt and pepper',
        'Heat oil to 375°F (190°C)',
        'Fry wings in batches for 10-12 minutes until golden and crispy',
        'Drain on paper towels',
        'Melt butter, mix with hot sauce and garlic powder',
        'Toss wings in buffalo sauce until coated',
        'Serve immediately with blue cheese dressing and celery sticks'
      ]),
      cuisineTags: JSON.stringify(['American']),
      dietaryTags: JSON.stringify([]),
      cookTime: 30,
      difficulty: 'easy',
      imageKey: 'https://picsum.photos/seed/recipe22/800/600',
      source: 'curated',
      featured: false,
      category: 'American'
    },

    // Mediterranean (5 recipes, 1 featured)
    {
      id: crypto.randomUUID(),
      title: 'Greek Salad',
      description: 'Fresh salad with tomatoes, cucumber, feta, olives, and oregano.',
      ingredients: JSON.stringify([
        { name: 'Tomatoes', quantity: '4', unit: 'large' },
        { name: 'Cucumber', quantity: '1', unit: 'large' },
        { name: 'Red onion', quantity: '1', unit: 'small' },
        { name: 'Feta cheese', quantity: '200', unit: 'g' },
        { name: 'Kalamata olives', quantity: '100', unit: 'g' },
        { name: 'Olive oil', quantity: '80', unit: 'ml' },
        { name: 'Red wine vinegar', quantity: '2', unit: 'tbsp' },
        { name: 'Dried oregano', quantity: '1', unit: 'tsp' }
      ]),
      instructions: JSON.stringify([
        'Cut tomatoes into wedges',
        'Slice cucumber into thick half-moons',
        'Thinly slice red onion',
        'Combine vegetables in large bowl',
        'Add olives',
        'Crumble feta over top',
        'Whisk olive oil, vinegar, and oregano',
        'Drizzle dressing over salad',
        'Season with salt and pepper, toss gently',
        'Let sit 10 minutes before serving'
      ]),
      cuisineTags: JSON.stringify(['Mediterranean', 'Greek']),
      dietaryTags: JSON.stringify(['Vegetarian', 'Gluten-Free']),
      cookTime: 15,
      difficulty: 'easy',
      imageKey: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
      source: 'curated',
      featured: true,
      category: 'Mediterranean'
    },
    {
      id: crypto.randomUUID(),
      title: 'Hummus',
      description: 'Creamy chickpea dip with tahini, lemon, and garlic.',
      ingredients: JSON.stringify([
        { name: 'Chickpeas', quantity: '400', unit: 'g' },
        { name: 'Tahini', quantity: '100', unit: 'g' },
        { name: 'Lemon juice', quantity: '60', unit: 'ml' },
        { name: 'Garlic', quantity: '3', unit: 'cloves' },
        { name: 'Olive oil', quantity: '60', unit: 'ml' },
        { name: 'Cumin', quantity: '1', unit: 'tsp' },
        { name: 'Salt', quantity: '1', unit: 'tsp' },
        { name: 'Paprika', quantity: '0.5', unit: 'tsp' }
      ]),
      instructions: JSON.stringify([
        'Drain chickpeas, reserve liquid',
        'Combine chickpeas, tahini, lemon juice, and garlic in food processor',
        'Blend until smooth, adding reserved liquid as needed',
        'Add olive oil in steady stream while blending',
        'Season with cumin and salt',
        'Blend until very smooth and creamy',
        'Transfer to serving bowl',
        'Drizzle with olive oil, sprinkle with paprika',
        'Serve with pita bread and vegetables'
      ]),
      cuisineTags: JSON.stringify(['Mediterranean', 'Middle Eastern']),
      dietaryTags: JSON.stringify(['Vegan', 'Gluten-Free']),
      cookTime: 15,
      difficulty: 'easy',
      imageKey: 'https://picsum.photos/seed/recipe24/800/600',
      source: 'curated',
      featured: false,
      category: 'Mediterranean'
    },
    {
      id: crypto.randomUUID(),
      title: 'Falafel',
      description: 'Crispy fried chickpea fritters with herbs and spices.',
      ingredients: JSON.stringify([
        { name: 'Dried chickpeas', quantity: '400', unit: 'g' },
        { name: 'Onion', quantity: '1', unit: 'medium' },
        { name: 'Garlic', quantity: '4', unit: 'cloves' },
        { name: 'Fresh parsley', quantity: '1', unit: 'cup' },
        { name: 'Fresh cilantro', quantity: '1', unit: 'cup' },
        { name: 'Cumin', quantity: '2', unit: 'tsp' },
        { name: 'Coriander', quantity: '1', unit: 'tsp' },
        { name: 'Baking powder', quantity: '1', unit: 'tsp' },
        { name: 'Vegetable oil', quantity: '1', unit: 'liter' }
      ]),
      instructions: JSON.stringify([
        'Soak dried chickpeas overnight in cold water',
        'Drain chickpeas well (do not use canned)',
        'Combine chickpeas, onion, garlic, herbs in food processor',
        'Pulse until coarse mixture forms (not paste)',
        'Add cumin, coriander, salt, pepper, and baking powder',
        'Refrigerate mixture for 1 hour',
        'Form into small patties or balls',
        'Heat oil to 350°F (175°C)',
        'Fry falafel until golden brown, about 3-4 minutes',
        'Drain on paper towels, serve in pita with tahini sauce'
      ]),
      cuisineTags: JSON.stringify(['Mediterranean', 'Middle Eastern']),
      dietaryTags: JSON.stringify(['Vegan']),
      cookTime: 30,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe25/800/600',
      source: 'curated',
      featured: false,
      category: 'Mediterranean'
    },
    {
      id: crypto.randomUUID(),
      title: 'Shakshuka',
      description: 'Eggs poached in spiced tomato sauce with peppers.',
      ingredients: JSON.stringify([
        { name: 'Eggs', quantity: '6', unit: 'whole' },
        { name: 'Tomatoes', quantity: '800', unit: 'g' },
        { name: 'Bell peppers', quantity: '2', unit: 'large' },
        { name: 'Onion', quantity: '1', unit: 'large' },
        { name: 'Garlic', quantity: '4', unit: 'cloves' },
        { name: 'Cumin', quantity: '1', unit: 'tsp' },
        { name: 'Paprika', quantity: '1', unit: 'tsp' },
        { name: 'Feta cheese', quantity: '100', unit: 'g' },
        { name: 'Fresh parsley', quantity: '0.5', unit: 'cup' }
      ]),
      instructions: JSON.stringify([
        'Sauté diced onion and bell peppers until soft',
        'Add minced garlic, cumin, and paprika',
        'Add crushed tomatoes, simmer 15 minutes',
        'Season sauce with salt and pepper',
        'Make 6 wells in sauce',
        'Crack an egg into each well',
        'Cover pan, cook until eggs set but yolks still runny',
        'Crumble feta over top',
        'Garnish with parsley, serve with crusty bread'
      ]),
      cuisineTags: JSON.stringify(['Mediterranean', 'Middle Eastern']),
      dietaryTags: JSON.stringify(['Vegetarian', 'Gluten-Free']),
      cookTime: 35,
      difficulty: 'easy',
      imageKey: 'https://picsum.photos/seed/recipe26/800/600',
      source: 'curated',
      featured: false,
      category: 'Mediterranean'
    },
    {
      id: crypto.randomUUID(),
      title: 'Lamb Gyros',
      description: 'Greek lamb wraps with tzatziki, tomatoes, and onions.',
      ingredients: JSON.stringify([
        { name: 'Lamb shoulder', quantity: '800', unit: 'g' },
        { name: 'Greek yogurt', quantity: '300', unit: 'ml' },
        { name: 'Cucumber', quantity: '1', unit: 'medium' },
        { name: 'Garlic', quantity: '4', unit: 'cloves' },
        { name: 'Oregano', quantity: '2', unit: 'tbsp' },
        { name: 'Lemon juice', quantity: '3', unit: 'tbsp' },
        { name: 'Pita bread', quantity: '6', unit: 'pieces' },
        { name: 'Tomatoes', quantity: '2', unit: 'medium' },
        { name: 'Red onion', quantity: '1', unit: 'small' }
      ]),
      instructions: JSON.stringify([
        'Marinate sliced lamb in oregano, garlic, lemon, olive oil for 2 hours',
        'Make tzatziki: grate cucumber, squeeze out liquid',
        'Mix cucumber with yogurt, minced garlic, and dill',
        'Grill or pan-fry lamb until charred and cooked through',
        'Warm pita bread',
        'Slice lamb thinly',
        'Fill pita with lamb, tzatziki, diced tomatoes, and sliced onion',
        'Wrap and serve immediately'
      ]),
      cuisineTags: JSON.stringify(['Mediterranean', 'Greek']),
      dietaryTags: JSON.stringify([]),
      cookTime: 30,
      difficulty: 'medium',
      imageKey: 'https://picsum.photos/seed/recipe27/800/600',
      source: 'curated',
      featured: false,
      category: 'Mediterranean'
    }
  ]

  const existingSlugs = new Set<string>()

  // Insert recipes
  for (const recipe of recipeData) {
    const { category, ...recipeFields } = recipe
    const slug = generateUniqueSlug(recipe.title, existingSlugs)

    // Insert recipe (slug required for /recipe/[slug] links)
    await db.insert(recipes).values({ ...recipeFields, slug })

    // Insert category junction
    await db.insert(recipeCategories).values({
      id: crypto.randomUUID(),
      recipeId: recipe.id,
      category: category
    })
  }

  // Invalidate featured cache so carousel shows new imageKeys immediately
  try {
    const kv = hubKV()
    await kv.del('recipes:featured')
  } catch {
    // KV not available in some environments; non-fatal
  }

  return {
    success: true,
    message: `Seeded ${recipeData.length} recipes across 5 categories`,
    stats: {
      totalRecipes: recipeData.length,
      featured: recipeData.filter(r => r.featured).length,
      categories: {
        Italian: recipeData.filter(r => r.category === 'Italian').length,
        Mexican: recipeData.filter(r => r.category === 'Mexican').length,
        Asian: recipeData.filter(r => r.category === 'Asian').length,
        American: recipeData.filter(r => r.category === 'American').length,
        Mediterranean: recipeData.filter(r => r.category === 'Mediterranean').length
      }
    }
  }
})
