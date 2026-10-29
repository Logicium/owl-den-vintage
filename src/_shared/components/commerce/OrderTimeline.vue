<script setup lang="ts">
/**
 * Minimal fulfillment tracker: the steps an order walks through, with the
 * ones already reached filled in and a timestamp where we know it.
 */
import { computed } from 'vue'

export interface TimelineStep {
  key: string
  label: string
  /** ISO timestamp when this step was reached, if known. */
  at?: string | null
  /** One short line under the label (tracking link, instructions). */
  hint?: string
}

const props = withDefaults(defineProps<{
  steps: TimelineStep[]
  current: string
  cancelled?: boolean
}>(), { cancelled: false })

const currentIndex = computed(() => Math.max(0, props.steps.findIndex(s => s.key === props.current)))

function when(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d)
}
</script>

<template>
  <ol class="ap-timeline" :class="{ 'is-cancelled': cancelled }">
    <li
      v-for="(s, i) in steps" :key="s.key"
      class="ap-timeline__step"
      :class="{ 'is-done': !cancelled && i < currentIndex, 'is-current': !cancelled && i === currentIndex, 'is-next': cancelled || i > currentIndex }"
      :aria-current="!cancelled && i === currentIndex ? 'step' : undefined"
    >
      <span class="ap-timeline__dot" aria-hidden="true" />
      <div class="ap-timeline__body">
        <span class="ap-timeline__label">{{ s.label }}</span>
        <span v-if="!cancelled && i <= currentIndex && when(s.at)" class="ap-timeline__when">{{ when(s.at) }}</span>
        <span v-if="s.hint && !cancelled && i <= currentIndex" class="ap-timeline__hint">{{ s.hint }}</span>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.ap-timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
.ap-timeline__step {
  position: relative;
  display: grid; grid-template-columns: 1.1rem 1fr; column-gap: 0.9rem;
  padding: 0 0 1.15rem;
}
.ap-timeline__step:last-child { padding-bottom: 0; }
/* the rail */
.ap-timeline__step::before {
  content: ''; position: absolute; left: calc(0.55rem - 1px); top: 1.05rem; bottom: -0.1rem;
  width: 2px; background: var(--ap-line, #e5e5e5);
}
.ap-timeline__step:last-child::before { display: none; }
.ap-timeline__step.is-done::before { background: var(--ap-ink, #111); }
.ap-timeline__dot {
  width: 1.1rem; height: 1.1rem; margin-top: 0.1rem;
  border-radius: 50%; border: 2px solid var(--ap-line, #d4d4d4);
  background: var(--ap-surface, #fff);
  box-sizing: border-box;
}
.is-done .ap-timeline__dot { background: var(--ap-ink, #111); border-color: var(--ap-ink, #111); }
.is-current .ap-timeline__dot {
  border-color: var(--ap-ink, #111);
  box-shadow: inset 0 0 0 3px var(--ap-surface, #fff), inset 0 0 0 1.1rem var(--ap-ink, #111);
}
.ap-timeline__body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.ap-timeline__label { font-weight: 600; font-size: 0.95rem; }
.is-next .ap-timeline__label { color: var(--ap-ink-muted, #666); font-weight: 500; }
.ap-timeline__when, .ap-timeline__hint { font-size: 0.82rem; color: var(--ap-ink-muted, #666); }
.ap-timeline__hint { overflow-wrap: anywhere; }
.is-cancelled .ap-timeline__dot { opacity: 0.5; }
</style>
