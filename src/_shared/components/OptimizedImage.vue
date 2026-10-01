<script setup lang="ts">
/**
 * OptimizedImage — drop-in replacement for <img>.
 *
 * Adds `decoding="async"` on every image to keep the UI thread
 * free while the browser decodes large photos (great for high-DPI
 * displays). Defaults `loading` to "lazy"; pass loading="eager"
 * for above-the-fold images like the hero.
 *
 * Build-time compression is handled by ViteImageOptimizer in
 * vite.config.ts — images are compressed once at `npm run build`
 * so the static host serves lightweight assets at no ongoing cost.
 */
withDefaults(defineProps<{
  src: string
  alt?: string
  loading?: 'lazy' | 'eager'
}>(), {
  loading: 'eager',
})
</script>

<template>
  <img
    :src="src"
    :alt="alt || ''"
    :loading="loading"
    decoding="async"
  />
</template>
