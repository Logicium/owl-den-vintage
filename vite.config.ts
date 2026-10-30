import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'


/* Shared Vite helpers sit beside this template in the monorepo and inside
   src/_shared on a published site; load whichever is present. Plain JS so
   Node can run it from vite.config without a TypeScript step. */
async function loadSeoPlugin(): Promise<(options?: Record<string, unknown>) => Plugin> {
  const candidates = ['./src/_shared/vite/seo.mjs', '../archetype-shared/src/vite/seo.mjs']
    .map(p => fileURLToPath(new URL(p, import.meta.url)))
  const found = candidates.find(p => existsSync(p))
  if (!found) return () => ({ name: 'archetype-seo-missing' })
  const mod = (await import(pathToFileURL(found).href)) as { archetypeSeo: (options?: Record<string, unknown>) => Plugin }
  return mod.archetypeSeo
}

// https://vite.dev/config/
export default defineConfig(async () => {
  const archetypeSeo = await loadSeoPlugin()
  return {
  plugins: [
    vue(),
    archetypeSeo({ routes: ['/', '/shop', '/visit', '/gallery'], fallback: { brand: 'Vault', tagline: 'Archetype Shop', description: 'A shop website template by Apotome Archetypes.' } }),
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
  }
})
