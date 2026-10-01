<script setup lang="ts">
/**
 * Device breakdown — up to 3 categories (desktop/mobile/tablet) as a single
 * 100%-stacked bar with 2px surface gaps between segments, plus a labelled
 * legend beneath (dot + name + count + share). The direct labels satisfy the
 * light-mode relief rule for the aqua/yellow slots.
 */
import { computed } from 'vue'

const props = defineProps<{ data: Array<{ label: string; views: number }> }>()

const COLORS = ['var(--adm-chart-1)', 'var(--adm-chart-2)', 'var(--adm-chart-3)']
const ICON: Record<string, string> = { desktop: '🖥', mobile: '📱', tablet: '▢' }

const total = computed(() => props.data.reduce((a, d) => a + d.views, 0))
const rows = computed(() =>
  props.data.map((d, i) => ({
    ...d,
    color: COLORS[i % COLORS.length]!,
    pct: total.value ? Math.round((d.views / total.value) * 100) : 0,
    name: d.label ? d.label[0]!.toUpperCase() + d.label.slice(1) : 'Unknown',
  })),
)
</script>

<template>
  <div class="dv">
    <div v-if="total" class="dv__bar">
      <div
        v-for="r in rows" :key="r.label"
        class="dv__seg"
        :style="{ width: `${r.pct}%`, background: r.color }"
        :title="`${r.name} — ${r.views.toLocaleString()} (${r.pct}%)`"
      />
    </div>
    <div v-if="total" class="dv__legend">
      <div v-for="r in rows" :key="r.label" class="dv__row">
        <span class="dv__dot" :style="{ background: r.color }" />
        <span class="dv__name">{{ ICON[r.label] || '•' }} {{ r.name }}</span>
        <span class="dv__pct">{{ r.pct }}%</span>
        <span class="dv__count">{{ r.views.toLocaleString() }}</span>
      </div>
    </div>
    <p v-else class="dv__empty">No visits recorded in this range yet.</p>
  </div>
</template>

<style scoped>
.dv { display: flex; flex-direction: column; gap: 1rem; }
.dv__bar {
  display: flex; gap: 2px;                 /* 2px surface gap between segments */
  height: 30px; border-radius: 8px; overflow: hidden;
  background: var(--adm-surface-2);
}
.dv__seg { height: 100%; transition: width 480ms cubic-bezier(0.2, 0.7, 0.3, 1); min-width: 2px; }
.dv__seg:first-child { border-radius: 8px 0 0 8px; }
.dv__seg:last-child { border-radius: 0 8px 8px 0; }
.dv__legend { display: flex; flex-direction: column; gap: 0.55rem; }
.dv__row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; }
.dv__dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.dv__name { color: var(--adm-text); }
.dv__pct { margin-left: auto; font-weight: 600; color: var(--adm-text); font-variant-numeric: tabular-nums; }
.dv__count { width: 3.5rem; text-align: right; color: var(--adm-text-muted); font-variant-numeric: tabular-nums; }
.dv__empty { color: var(--adm-text-subtle); font-size: 0.85rem; margin: 0; }
</style>
