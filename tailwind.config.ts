import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './app/**/*.{vue,ts}'
  ],
  theme: {
    extend: {
      // Mobile-first: default breakpoints are sufficient
      // sm: 640px, md: 768px, lg: 1024px, xl: 1280px
    }
  },
  plugins: []
} satisfies Config
