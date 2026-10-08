<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'

/**
 * A large index numeral that ticks over as the sections of a page pass the
 * middle of the viewport, the way a gallery slider counts works. It reads
 * the page for `[data-index]` elements (or any `selector`) and shows
 * `01 / 05`. Positioning is left to the theme CSS; this renders the digits.
 */
const props = withDefaults(defineProps<{ selector?: string; pad?: number }>(), {
  selector: '[data-index]',
  pad: 2,
})

const active = ref(0)
const count = ref(0)
let io: IntersectionObserver | null = null
let mo: MutationObserver | null = null

function pad(n: number) {
  return String(n).padStart(props.pad, '0')
}
const current = computed(() => pad(active.value + 1))
const total = computed(() => pad(count.value))

function scan() {
  io?.disconnect()
  const els = Array.from(document.querySelectorAll<HTMLElement>(props.selector))
  count.value = els.length
  if (!els.length) return
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const i = els.indexOf(e.target as HTMLElement)
          if (i >= 0) active.value = i
        }
      }
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  )
  els.forEach((el, i) => {
    el.dataset.indexN = pad(i + 1)
    io?.observe(el)
  })
}

onMounted(() => {
  scan()
  // sections mount after data lands; rescan on structural changes
  mo = new MutationObserver(() => scan())
  mo.observe(document.body, { childList: true, subtree: false })
  window.setTimeout(scan, 800)
})
onBeforeUnmount(() => {
  io?.disconnect()
  mo?.disconnect()
})
</script>

<template>
  <div v-if="count > 0" class="ap-index-counter" aria-hidden="true">
    <span class="ap-index-counter__digits">
      <transition name="ap-tick" mode="out-in">
        <span :key="current" class="ap-index-counter__num">{{ current }}</span>
      </transition>
    </span>
    <span class="ap-index-counter__of">/{{ total }}</span>
  </div>
</template>

<style scoped>
.ap-index-counter {
  /* display is owned by the theme partials (.ap-index-rail) */
  align-items: baseline;
  gap: 0.08em;
  font-family: var(--ap-font-heading);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--ap-ink);
}
.ap-index-counter__digits {
  display: inline-block;
  overflow: hidden;
}
.ap-index-counter__num {
  display: inline-block;
}
.ap-index-counter__of {
  font-size: 0.4em;
  color: var(--ap-ink-muted);
  font-weight: 300;
}
.ap-tick-enter-active,
.ap-tick-leave-active {
  transition: transform 0.5s var(--ap-ease), opacity 0.5s var(--ap-ease);
}
.ap-tick-enter-from { transform: translateY(60%); opacity: 0; }
.ap-tick-leave-to { transform: translateY(-60%); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .ap-tick-enter-active, .ap-tick-leave-active { transition: none; }
}
</style>
