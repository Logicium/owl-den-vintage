<script setup lang="ts">
/**
 * KPI stat tile — label · compact value · signed delta vs previous period ·
 * optional 12+ point sparkline. Value stays in text tokens; the sparkline
 * carries the one series color. Delta color = direction (green up / red down),
 * which for these metrics (visitors, pageviews, uptime) always means up = good.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: number | null
  /** Value for the same-length previous period; enables the delta. */
  prev?: number | null
  /** Sparkline points (current period). */
  spark?: number[]
  unit?: string
  /** 'count' → 1,284 / 12.9K; 'pct' → 99.7%; 'ms' → 142 ms. */
  format?: 'count' | 'pct' | 'ms'
  accent?: string
}>(), {
  prev: null,
  spark: () => [],
  format: 'count',
  accent: 'var(--adm-chart-1)',
})

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(0)}K`
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

const display = computed(() => {
  if (props.value == null) return '—'
  if (props.format === 'pct') return `${props.value}%`
  if (props.format === 'ms') return `${props.value.toLocaleString()}`
  return compact(props.value)
})

const delta = computed(() => {
  if (props.value == null || props.prev == null || props.prev === 0) return null
  const pct = ((props.value - props.prev) / props.prev) * 100
  if (!Number.isFinite(pct)) return null
  return Math.round(pct)
})

// Sparkline geometry
const SW = 120, SH = 32
const sparkPath = computed(() => {
  const s = props.spark
  if (s.length < 2) return ''
  const max = Math.max(1, ...s), min = Math.min(...s)
  const span = max - min || 1
  return s.map((v, i) => {
    const px = (i / (s.length - 1)) * SW
    const py = SH - 2 - ((v - min) / span) * (SH - 4)
    return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`
  }).join(' ')
})
</script>

<template>
  <div class="st">
    <div class="st__top">
      <span class="st__label">{{ label }}</span>
      <span
        v-if="delta !== null"
        class="st__delta"
        :class="delta >= 0 ? 'st__delta--up' : 'st__delta--down'"
      >{{ delta >= 0 ? '▲' : '▼' }} {{ Math.abs(delta) }}%</span>
    </div>
    <div class="st__value">
      {{ display }}<span v-if="unit" class="st__unit">{{ unit }}</span>
    </div>
    <svg v-if="sparkPath" class="st__spark" :viewBox="`0 0 ${SW} ${SH}`" preserveAspectRatio="none" aria-hidden="true">
      <path :d="sparkPath" :style="{ stroke: accent }" />
    </svg>
    <div v-else class="st__spark-empty" aria-hidden="true" />
  </div>
</template>

<style scoped>
.st {
  display: flex; flex-direction: column; gap: 0.5rem;
  padding: 1.15rem 1.25rem 1.1rem;
  background: var(--adm-surface);
  border: 1px solid var(--adm-border);
  border-radius: 16px;
  min-width: 0;
}
.st__top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.st__label {
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--adm-text-muted);
}
.st__delta {
  display: inline-flex; align-items: center; gap: 0.2rem;
  font-size: 0.7rem; font-weight: 700;
  padding: 0.1rem 0.4rem; border-radius: 999px;
}
.st__delta--up { color: var(--adm-chart-good); background: color-mix(in srgb, var(--adm-chart-good) 12%, transparent); }
.st__delta--down { color: var(--adm-chart-bad); background: color-mix(in srgb, var(--adm-chart-bad) 12%, transparent); }
.st__value {
  font-family: var(--adm-font-sans);
  font-size: 2.05rem; font-weight: 600; line-height: 1;
  color: var(--adm-text);
  letter-spacing: -0.02em;
}
.st__unit { font-size: 0.9rem; font-weight: 500; color: var(--adm-text-muted); margin-left: 0.25rem; }
.st__spark { width: 100%; height: 30px; display: block; overflow: visible; }
.st__spark path { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.st__spark-empty { height: 30px; }
</style>
