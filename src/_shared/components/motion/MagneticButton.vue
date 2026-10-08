<script setup lang="ts">
import { ref } from 'vue'

/**
 * Wraps a CTA and lets it lean gently toward the cursor. Pure transform,
 * resets on leave; inert on touch and under reduced motion.
 */
const props = withDefaults(defineProps<{ strength?: number }>(), { strength: 1 })
const el = ref<HTMLElement | null>(null)
const reduced =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onMove(e: MouseEvent) {
  if (reduced || !el.value) return
  const r = el.value.getBoundingClientRect()
  const x = (e.clientX - r.left - r.width / 2) / r.width
  const y = (e.clientY - r.top - r.height / 2) / r.height
  el.value.style.transform = `translate(${(x * 10 * props.strength).toFixed(1)}px, ${(y * 8 * props.strength).toFixed(1)}px)`
}
function onLeave() {
  if (el.value) el.value.style.transform = ''
}
</script>

<template>
  <span ref="el" class="ap-magnet" @mousemove="onMove" @mouseleave="onLeave">
    <slot />
  </span>
</template>

<style scoped>
.ap-magnet {
  display: inline-block;
  transition: transform 0.35s var(--ap-ease, ease-out);
  will-change: transform;
}
</style>
