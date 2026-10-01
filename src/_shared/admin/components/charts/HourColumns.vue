<script setup lang="ts">
/**
 * Hour-of-day column chart (24 buckets). One series → sequential blue, no
 * legend. Columns cap thickness via the flex track, 4px rounded caps square
 * at the baseline, hairline baseline, per-column hover tooltip.
 */
import { computed, ref } from 'vue'

const props = defineProps<{ data: Array<{ hour: number; views: number }> }>()

const max = computed(() => Math.max(1, ...props.data.map(d => d.views)))
const total = computed(() => props.data.reduce((a, d) => a + d.views, 0))
function h(v: number) { return `${Math.max(v > 0 ? 3 : 0, (v / max.value) * 100)}%` }

const hoverH = ref<number | null>(null)
function label(hr: number) {
  const ampm = hr < 12 ? 'am' : 'pm'
  const h12 = hr % 12 === 0 ? 12 : hr % 12
  return `${h12}${ampm}`
}
</script>

<template>
  <div class="hc">
    <div class="hc__plot">
      <div
        v-for="d in data" :key="d.hour"
        class="hc__col"
        @mouseenter="hoverH = d.hour"
        @mouseleave="hoverH = null"
      >
        <div class="hc__bar-wrap">
          <div class="hc__tip" v-if="hoverH === d.hour">
            <b>{{ d.views.toLocaleString() }}</b> {{ d.views === 1 ? 'view' : 'views' }}
            <span>{{ label(d.hour) }}</span>
          </div>
          <div class="hc__bar" :class="{ 'is-hover': hoverH === d.hour }" :style="{ height: h(d.views) }" />
        </div>
      </div>
    </div>
    <div class="hc__axis">
      <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
    </div>
    <p v-if="total === 0" class="hc__empty">No visits recorded in this range yet.</p>
  </div>
</template>

<style scoped>
.hc { display: flex; flex-direction: column; gap: 0.4rem; position: relative; }
.hc__plot {
  display: flex; align-items: flex-end; gap: 2px;
  height: 150px;
  border-bottom: 1px solid var(--adm-chart-axis);
  padding-bottom: 1px;
}
.hc__col { flex: 1; height: 100%; display: flex; align-items: flex-end; min-width: 0; }
.hc__bar-wrap { position: relative; width: 100%; max-width: 18px; margin: 0 auto; height: 100%; display: flex; align-items: flex-end; }
.hc__bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: color-mix(in srgb, var(--adm-chart-1) 45%, transparent);
  transition: height 480ms cubic-bezier(0.2, 0.7, 0.3, 1), background 140ms ease;
}
.hc__bar.is-hover { background: var(--adm-chart-1); }
.hc__tip {
  position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center;
  background: var(--adm-surface-3);
  border: 1px solid var(--adm-border-strong);
  border-radius: 8px; padding: 0.3rem 0.5rem;
  font-size: 0.72rem; color: var(--adm-text);
  white-space: nowrap; z-index: 5;
  box-shadow: var(--adm-shadow-lg);
}
.hc__tip span { color: var(--adm-text-subtle); font-size: 0.66rem; }
.hc__axis {
  display: flex; justify-content: space-between;
  font-size: 0.66rem; font-family: var(--adm-font-mono);
  color: var(--adm-text-subtle);
}
.hc__empty { color: var(--adm-text-subtle); font-size: 0.85rem; margin: 0.25rem 0 0; }
</style>
