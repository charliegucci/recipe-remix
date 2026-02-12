import slugify from 'slugify'

/**
 * Generate a base slug from a recipe title
 * @param title Recipe title
 * @returns URL-friendly slug
 */
export function generateSlug(title: string): string {
  let slug = slugify(title, { lower: true, strict: true })

  // Truncate to 60 chars max, breaking at word boundary
  if (slug.length > 60) {
    slug = slug.substring(0, 60)
    const lastDash = slug.lastIndexOf('-')
    if (lastDash > 0) {
      slug = slug.substring(0, lastDash)
    }
  }

  return slug
}

/**
 * Generate a unique slug by appending numbers if needed
 * @param title Recipe title
 * @param existingSlugs Set of already-used slugs
 * @returns Unique URL-friendly slug
 */
export function generateUniqueSlug(title: string, existingSlugs: Set<string>): string {
  const baseSlug = generateSlug(title)

  if (!existingSlugs.has(baseSlug)) {
    existingSlugs.add(baseSlug)
    return baseSlug
  }

  // Append -2, -3, etc. for duplicates
  let counter = 2
  let uniqueSlug = `${baseSlug}-${counter}`

  while (existingSlugs.has(uniqueSlug)) {
    counter++
    uniqueSlug = `${baseSlug}-${counter}`
  }

  existingSlugs.add(uniqueSlug)
  return uniqueSlug
}
