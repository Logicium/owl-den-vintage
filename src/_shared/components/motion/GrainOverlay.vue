<script setup lang="ts">
import { computed } from 'vue'

/**
 * Paper / film grain as an inline SVG turbulence tile. Sits over its
 * positioned parent (or the whole page with `fixed`) and multiplies in, so
 * it reads as paper rather than a grey wash. No image assets.
 */
const props = withDefaults(
  defineProps<{
    opacity?: number
    frequency?: number
    octaves?: number
    /** tile size in px; larger = coarser grain */
    size?: number
    fixed?: boolean
    /** blend mode; 'multiply' for light surfaces, 'screen' for dark */
    blend?: 'multiply' | 'screen' | 'overlay' | 'soft-light'
  }>(),
  { opacity: 0.06, frequency: 0.9, octaves: 3, size: 240, fixed: false, blend: 'multiply' },
)

const url = computed(() => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${props.size}' height='${props.size}'>` +
    `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='${props.frequency}' numOctaves='${props.octaves}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#g)'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})
</script>

<template>
  <div
    class="ap-grain"
    :class="{ 'ap-grain--fixed': fixed }"
    :style="{ backgroundImage: url, opacity, mixBlendMode: blend, backgroundSize: `${size}px ${size}px` }"
    aria-hidden="true"
  />
</template>

<style scoped>
.ap-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.ap-grain--fixed {
  position: fixed;
  z-index: 9;
}
</style>
