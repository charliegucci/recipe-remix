import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter } from 'k6/metrics'

/**
 * k6 load test for the recipe generation endpoint.
 *
 * Tests the D1 write path under load to validate retry behavior.
 * Ramps to 50 VUs over 2 minutes, sustains for 3 minutes, then ramps down.
 *
 * Prerequisites:
 *   - k6 installed (https://k6.io/docs/getting-started/installation/)
 *   - App running locally or on preview
 *   - Valid auth cookie/token set in AUTH_COOKIE env var
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 --env AUTH_COOKIE="better-auth.session_token=xxx" loadtest/generation-stress.js
 */

const successfulGenerations = new Counter('successful_generations')
const failedGenerations = new Counter('failed_generations')

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs
    { duration: '1m', target: 25 },   // Ramp to 25 VUs
    { duration: '1m', target: 50 },   // Ramp to 50 VUs
    { duration: '3m', target: 50 },   // Sustain 50 VUs
    { duration: '30s', target: 0 }    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests under 10s (generation is slow)
    http_req_failed: ['rate<0.1']       // Less than 10% failure rate
  }
}

const INGREDIENT_POOLS = [
  ['chicken', 'rice', 'garlic'],
  ['pasta', 'tomatoes', 'basil'],
  ['tofu', 'soy sauce', 'ginger'],
  ['beef', 'potatoes', 'onions'],
  ['salmon', 'lemon', 'dill'],
  ['eggs', 'cheese', 'spinach']
]

const CUISINES = ['Italian', 'Japanese', 'Thai', 'Mexican', 'Indian', 'French']

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'
  const authCookie = __ENV.AUTH_COOKIE || ''

  // Pick random ingredients and cuisine
  const ingredients = INGREDIENT_POOLS[Math.floor(Math.random() * INGREDIENT_POOLS.length)]
  const cuisine = CUISINES[Math.floor(Math.random() * CUISINES.length)]

  const payload = JSON.stringify({
    ingredients,
    cuisines: [cuisine]
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie
    },
    timeout: '30s'
  }

  const res = http.post(`${baseUrl}/api/recipes/generate`, payload, params)

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'has recipe id': (r) => {
      try {
        const body = JSON.parse(r.body)
        return !!body.recipe?.id
      } catch {
        return false
      }
    }
  })

  if (passed) {
    successfulGenerations.add(1)
  } else {
    failedGenerations.add(1)
  }

  // Wait between requests to avoid overwhelming the AI service
  sleep(Math.random() * 2 + 1)
}

export function handleSummary(data) {
  const total = data.metrics.successful_generations?.values?.count || 0
  const failed = data.metrics.failed_generations?.values?.count || 0

  return {
    stdout: `\n=== Generation Load Test Summary ===\n` +
      `Successful generations: ${total}\n` +
      `Failed generations: ${failed}\n` +
      `Success rate: ${total + failed > 0 ? ((total / (total + failed)) * 100).toFixed(1) : 0}%\n` +
      `\nVerify DB row count matches successful_generations (${total}) to confirm retry reliability.\n` +
      `Query: SELECT COUNT(*) FROM recipes WHERE source = 'ai_generated';\n`
  }
}
