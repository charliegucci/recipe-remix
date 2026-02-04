// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  future: {
    compatibilityVersion: 4
  },

  modules: ['@nuxthub/core'],

  hub: {
    database: true,
    kv: true,
    blob: true
  },

  devtools: { enabled: true }
})
