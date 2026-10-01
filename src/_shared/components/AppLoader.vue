<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  brand: string
  visible: boolean
  /** 0-100. When undefined, the bar falls back to its indeterminate animation. */
  progress?: number
  /** Optional caption rendered under the bar (e.g. "Loading 4/12 images"). */
  label?: string
  loaded?: number
  total?: number
}>(), {
  progress: undefined,
  label: '',
  loaded: 0,
  total: 0,
})

const isDeterminate = computed(() => typeof props.progress === 'number')
const clamped = computed(() =>
  isDeterminate.value ? Math.max(0, Math.min(100, props.progress as number)) : 0
)
const showCount = computed(() => props.total > 0)
const captionText = computed(() => {
  if (props.label) return props.label
  if (showCount.value) return `Loading assets`
  return ''
})
</script>

<template>
  <Transition name="loader-fade">
    <div v-if="visible" class="ap-loader" role="status" aria-live="polite" :aria-label="`Loading ${brand}`">
      <div class="ap-loader__inner">
        <span class="ap-loader__brand">{{ brand }}</span>
        <span
          class="ap-loader__bar"
          :class="{ 'ap-loader__bar--indeterminate': !isDeterminate }"
          role="progressbar"
          :aria-valuenow="isDeterminate ? clamped : undefined"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span
            class="ap-loader__fill"
            :style="isDeterminate ? { width: clamped + '%' } : undefined"
          />
        </span>
        <span v-if="captionText || showCount" class="ap-loader__meta">
          <span class="ap-loader__caption">{{ captionText }}</span>
          <span v-if="showCount" class="ap-loader__count">{{ loaded }}/{{ total }}</span>
          <span v-else-if="isDeterminate" class="ap-loader__count">{{ clamped }}%</span>
        </span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ap-loader {
  position: fixed; inset: 0; z-index: 9999;
  background: var(--ap-surface);
  display: flex; align-items: center; justify-content: center;
}
.ap-loader__inner {
  display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
  min-width: clamp(180px, 28vw, 280px);
}
.ap-loader__brand {
  font-family: var(--ap-font-head, inherit);
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  color: var(--ap-ink);
  letter-spacing: -0.02em;
}
.ap-loader__bar {
  position: relative;
  display: block;
  width: clamp(180px, 28vw, 280px);
  height: 3px;
  background: var(--ap-line);
  border-radius: 999px;
  overflow: hidden;
}
.ap-loader__fill {
  display: block;
  height: 100%;
  width: 0%;
  background: var(--ap-brand);
  border-radius: 999px;
  transition: width 220ms ease;
}
.ap-loader__bar--indeterminate .ap-loader__fill {
  width: 40%;
  animation: ap-loader-slide 1s ease-in-out infinite alternate;
}
@keyframes ap-loader-slide {
  from { transform: translateX(-100%); }
  to   { transform: translateX(300%); }
}
.ap-loader__meta {
  display: flex; align-items: baseline; justify-content: space-between;
  width: clamp(180px, 28vw, 280px);
  font-size: 0.78rem;
  color: var(--ap-ink-soft, var(--ap-ink));
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}
.ap-loader__caption {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 70%;
}
.ap-loader__count { font-weight: 600; }

/* Fade-out transition. pointer-events must die the moment the leave starts:
   if the transition stalls (throttled/hidden renderer), a stuck overlay must
   never keep blocking clicks on the page underneath. */
.loader-fade-leave-active { transition: opacity 0.4s ease; pointer-events: none; }
.loader-fade-leave-to    { opacity: 0; }
</style>
