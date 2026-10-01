<script setup lang="ts">
/**
 * Horizontal ranked bar list — top pages, referrers, etc. One series →
 * sequential single hue, no legend. The label rides inside/over each bar and
 * the value sits at the tip (direct labels, since a single-hue bar list reads
 * by length + text, satisfying the light-mode relief rule). Per-row hover.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  rows: Array<{ label: string; views: number }>
  /** Optional mono treatment for path-like labels. */
  mono?: boolean
  emptyText?: string
}>(), { mono: false, emptyText: 'No data in this range yet.' })

const max = computed(() => Math.max(1, ...props.rows.map(r => r.views)))
function pct(v: number) { return `${Math.max(2, (v / max.value) * 100)}%` }
</script>

<template>
  <div v-if="rows.length" class="bl">
    <div v-for="(r, i) in rows" :key="i" class="bl__row" :title="`${r.label} — ${r.views.toLocaleString()}`">
      <div class="bl__track">
        <div class="bl__fill" :style="{ width: pct(r.views) }" />
        <span class="bl__label" :class="{ 'bl__label--mono': mono }">{{ r.label }}</span>
      </div>
      <span class="bl__val">{{ r.views.toLocaleString() }}</span>
    </div>
  </div>
  <p v-else class="bl__empty">{{ emptyText }}</p>
</template>

<style scoped>
.bl { display: flex; flex-direction: column; gap: 0.5rem; }
.bl__row { display: flex; align-items: center; gap: 0.85rem; }
.bl__track {
  position: relative; flex: 1; min-width: 0;
  height: 30px; border-radius: 8px;
  background: color-mix(in srgb, var(--adm-chart-1) 8%, transparent);
  overflow: hidden;
}
.bl__fill {
  position: absolute; inset: 0 auto 0 0;
  /* 4px rounded data-end, square at the baseline (left) */
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, var(--adm-chart-1) 55%, transparent);
  transition: width 480ms cubic-bezier(0.2, 0.7, 0.3, 1);
}
.bl__row:hover .bl__fill { background: color-mix(in srgb, var(--adm-chart-1) 72%, transparent); }
.bl__label {
  position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%);
  right: 0.7rem;
  font-size: 0.8rem; color: var(--adm-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  pointer-events: none;
}
.bl__label--mono { font-family: var(--adm-font-mono); font-size: 0.76rem; }
.bl__val {
  flex-shrink: 0; width: 3.6rem; text-align: right;
  font-size: 0.82rem; font-variant-numeric: tabular-nums;
  color: var(--adm-text-muted);
}
.bl__empty { color: var(--adm-text-subtle); font-size: 0.85rem; margin: 0.5rem 0; }
</style>
