import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// SEO (head, JSON-LD, sitemap, robots, llms.txt, prerendered pages) is the
// postbuild step in scripts/prerender.ts, not a Vite plugin: see src/routes.ts.

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    ViteImageOptimizer({
      jpeg: { quality: 80 },
      webp: { quality: 80 },
      avif: { quality: 70 },
      png: { quality: 80 },
    }),
  ],
  // Read .env.local from the monorepo root so all templates share one file.
  envDir: '..',
  // VERCEL_PROJECT_PRODUCTION_URL reaches the app so the runtime head claims
  // the same origin as the prerender when VITE_SITE_URL is not set.
  envPrefix: ['VITE_', 'VERCEL_PROJECT_PRODUCTION_URL'],
  css: {
    preprocessorOptions: {
      scss: {
        // Resolve bare '@use "core"' in BOTH layouts: the monorepo sibling
        // package, and a published site where archetype-shared is vendored
        // into src/_shared/. Sass skips load paths that don't exist, so the
        // same config works in either place with no rewriting.
        loadPaths: [
          fileURLToPath(new URL('./src/_shared/styles', import.meta.url)),
          fileURLToPath(new URL('../archetype-shared/src/styles', import.meta.url)),
        ],
      },
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: /^@apotome\/archetype-shared\/(.*)$/, replacement: fileURLToPath(new URL('./src/_shared/', import.meta.url)) + '$1' },
      { find: /^@apotome\/archetype-shared$/, replacement: fileURLToPath(new URL('./src/_shared/index.ts', import.meta.url)) },
    ],
  },
})
