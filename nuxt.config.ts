import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  future: {
    compatibilityVersion: 4
  },

  modules: ['@nuxthub/core', '@nuxtjs/sitemap', 'nuxt-schema-org'],

  site: {
    url: 'https://recipe-remix-9fd.pages.dev',
    name: 'Recipe Remix'
  },

  sitemap: {
    sources: ['/api/__sitemap__/urls']
  },

  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Recipe Remix',
      url: 'https://recipe-remix-9fd.pages.dev'
    }
  },

  hub: {
    database: true,
    kv: true,
    blob: true,
    ai: true
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()]
  },

  devtools: { enabled: true }
})
