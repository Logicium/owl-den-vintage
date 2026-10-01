import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

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
