/**
 * Convert minutes to ISO 8601 duration format
 * Used for Recipe structured data (cookTime, totalTime)
 *
 * Examples:
 * - 30 -> 'PT30M'
 * - 90 -> 'PT1H30M'
 * - 120 -> 'PT2H'
 * - 0 -> 'PT0M'
 */
export function minutesToISO8601(minutes: number): string {
  if (minutes <= 0) {
    return 'PT0M'
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) {
    return `PT${minutes}M`
  }

  if (remainingMinutes === 0) {
    return `PT${hours}H`
  }

  return `PT${hours}H${remainingMinutes}M`
}
