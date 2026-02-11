/**
 * Exponential backoff retry wrapper for D1 write operations.
 *
 * D1 auto-retries reads (2 attempts) but NOT writes.
 * This utility provides application-level retry for critical writes
 * that may fail due to transient D1 errors (overload, timeout, SQLITE_BUSY).
 */

const RETRYABLE_ERRORS = ['overloaded', 'timeout', 'SQLITE_BUSY']

const MAX_ATTEMPTS = 5
const INITIAL_DELAY_MS = 100

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return RETRYABLE_ERRORS.some(e => msg.includes(e.toLowerCase()))
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a D1 write operation with exponential backoff retry.
 *
 * @param fn - Async function performing the D1 write
 * @param label - Optional label for logging/monitoring
 * @returns The result of the write operation
 * @throws The last error if all retries are exhausted
 */
export async function retryD1Write<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
        const backoff = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
        await delay(backoff)
        continue
      }

      throw error
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError
}
