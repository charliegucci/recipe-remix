import { getAuth } from '../../lib/auth'
import { toWebRequest } from 'h3'

/**
 * Better Auth API handler.
 * Handles all routes under /api/auth/*:
 *   - POST /api/auth/sign-in/email
 *   - POST /api/auth/sign-up/email
 *   - POST /api/auth/sign-in/anonymous
 *   - POST /api/auth/sign-out
 *   - GET  /api/auth/session
 *   - etc.
 */
export default defineEventHandler(async (event) => {
  // Get auth instance (lazily initialized on first request)
  const auth = getAuth()
  // Convert H3 event to Web Request for Better Auth
  return auth.handler(toWebRequest(event))
})
