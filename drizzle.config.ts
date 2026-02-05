import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/database/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    // These are only used for remote migrations
    // Local dev uses NuxtHub's automatic D1 stubbing
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!
  }
})
