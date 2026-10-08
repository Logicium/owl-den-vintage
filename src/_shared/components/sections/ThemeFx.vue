<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useSiteTheme } from '../../composables/useSiteTheme'

/**
 * The theme's signature backdrop effect, mounted by the hero and footer.
 * Each effect is a lazy chunk (three.js inside), so a theme without one
 * ships nothing extra. Themes:
 *   atlas    → DitherField (Bayer-quantized tile weather on the paper)
 *   vibrant  → TileFlip (flat primary/accent tiles that flip under the pointer)
 *   ironwood → IsoGrid (one-ink isometric lattice)
 *   heritage → GrainOverlay (paper grain over the whole page, hero mount only)
 * Studio stays quiet on purpose.
 */
const props = withDefaults(defineProps<{ where?: 'hero' | 'footer' }>(), { where: 'hero' })

const DitherField = defineAsyncComponent(() => import('../../fx/DitherField.vue'))
const TileFlip = defineAsyncComponent(() => import('../../fx/TileFlip.vue'))
const IsoGrid = defineAsyncComponent(() => import('../../fx/IsoGrid.vue'))
const GrainOverlay = defineAsyncComponent(() => import('../motion/GrainOverlay.vue'))

const { themeName, swatch } = useSiteTheme()
const kind = computed(() => {
  switch (themeName.value) {
    case 'atlas': return 'dither'
    case 'heritage': return props.where === 'hero' ? 'grain' : null
    case 'vibrant': return 'tiles'
    case 'ironwood': return 'iso'
    default: return null
  }
})
</script>

<template>
  <div v-if="kind" class="ap-fx" :class="`ap-fx--${props.where}`" :data-fx="kind" aria-hidden="true">
    <DitherField v-if="kind === 'dither'" :cell="props.where === 'footer' ? 20 : 16" :density="props.where === 'footer' ? 0.24 : 0.22" />
    <TileFlip v-else-if="kind === 'tiles'" />
    <IsoGrid v-else-if="kind === 'iso'" />
    <GrainOverlay v-else-if="kind === 'grain'" fixed :opacity="swatch.mode === 'dark' ? 0.09 : 0.07" :blend="swatch.mode === 'dark' ? 'screen' : 'multiply'" />
  </div>
</template>

<style scoped>
/* Position and size are set per theme in styles/elevate/_<theme>.scss. */
.ap-fx {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  display: none;
}
</style>
