import { fileURLToPath, URL } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    authKey: 'secretkey',
  },
  vite: {
    resolve: {
      alias: {
        'zero-vue': fileURLToPath(new URL('../src/index.ts', import.meta.url).href),
      },
    },
  },
})
