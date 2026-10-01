<script setup lang="ts">
/**
 * Two-series area+line over time — visitors and pageviews, one shared axis
 * (both are counts). Follows the dataviz marks spec: 2px lines, 10% area
 * wash, ≥8px end markers with a 2px surface ring, hairline gridlines, a
 * legend (identity never color-alone), and a crosshair+tooltip on hover.
 */
import { computed, ref } from 'vue'

interface Point { date: string; visitors: number; pageviews: number }
const props = defineProps<{ data: Point[] }>()

const W = 720, H = 260
const PAD = { top: 18, right: 16, bottom: 26, left: 40 }
const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

const yMax = computed(() => {
  const m = Math.max(1, ...props.data.map(d => d.pageviews))
  // Round up to a clean tick.
  const pow = Math.pow(10, Math.floor(Math.log10(m)))
  return Math.ceil(m / pow) * pow
})

function x(i: number) {
  if (props.data.length <= 1) return PAD.left + plotW / 2
  return PAD.left + (i / (props.data.length - 1)) * plotW
}
function y(v: number) {
  return PAD.top + plotH - (v / yMax.value) * plotH
}

function linePath(key: 'visitors' | 'pageviews') {
  return props.data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
}
function areaPath(key: 'visitors' | 'pageviews') {
  if (!props.data.length) return ''
  const top = props.data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  return `${top} L${x(props.data.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
}

const yTicks = computed(() => {
  const n = 4
  return Array.from({ length: n + 1 }, (_, i) => Math.round((yMax.value / n) * i))
})
const xTicks = computed(() => {
  const n = Math.min(5, props.data.length)
  if (n <= 1) return props.data.map((d, i) => ({ i, label: fmtDay(d.date) }))
  const step = (props.data.length - 1) / (n - 1)
  return Array.from({ length: n }, (_, k) => {
    const i = Math.round(k * step)
    return { i, label: fmtDay(props.data[i]!.date) }
  })
})

function fmtDay(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function fmtFull(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// ── Hover / crosshair ──
const svgEl = ref<SVGSVGElement | null>(null)
const hoverI = ref<number | null>(null)

function onMove(e: MouseEvent) {
  if (!svgEl.value || !props.data.length) return
  const rect = svgEl.value.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * W
  const rel = (px - PAD.left) / plotW
  const i = Math.round(rel * (props.data.length - 1))
  hoverI.value = Math.max(0, Math.min(props.data.length - 1, i))
}
function onLeave() { hoverI.value = null }

const hover = computed(() => (hoverI.value == null ? null : props.data[hoverI.value] ?? null))
const tipX = computed(() => (hoverI.value == null ? 0 : x(hoverI.value)))
// Flip the tooltip to the left of the crosshair near the right edge.
const tipLeft = computed(() => tipX.value > W * 0.62)

const lastVisitors = computed(() => props.data.at(-1)?.visitors ?? 0)
const lastPageviews = computed(() => props.data.at(-1)?.pageviews ?? 0)
</script>

<template>
  <div class="tc">
    <div class="tc__legend">
      <span class="tc__key"><span class="tc__dot" style="background: var(--adm-chart-2)" />Pageviews</span>
      <span class="tc__key"><span class="tc__dot" style="background: var(--adm-chart-1)" />Visitors</span>
    </div>

    <svg
      ref="svgEl"
      class="tc__svg"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      role="img"
      aria-label="Visitors and pageviews over time"
      @mousemove="onMove"
      @mouseleave="onLeave"
    >
      <!-- gridlines + y ticks -->
      <g>
        <line
          v-for="t in yTicks" :key="`g${t}`"
          :x1="PAD.left" :x2="W - PAD.right" :y1="y(t)" :y2="y(t)"
          class="tc__grid"
        />
        <text
          v-for="t in yTicks" :key="`yt${t}`"
          :x="PAD.left - 8" :y="y(t) + 3"
          class="tc__axis-txt" text-anchor="end"
        >{{ t.toLocaleString() }}</text>
      </g>

      <!-- areas (pageviews behind visitors) -->
      <path :d="areaPath('pageviews')" class="tc__area tc__area--2" />
      <path :d="areaPath('visitors')" class="tc__area tc__area--1" />

      <!-- lines -->
      <path :d="linePath('pageviews')" class="tc__line tc__line--2" />
      <path :d="linePath('visitors')" class="tc__line tc__line--1" />

      <!-- endpoint markers (surface ring via stroke) -->
      <circle v-if="data.length" :cx="x(data.length - 1)" :cy="y(lastPageviews)" r="4" class="tc__end tc__end--2" />
      <circle v-if="data.length" :cx="x(data.length - 1)" :cy="y(lastVisitors)" r="4" class="tc__end tc__end--1" />

      <!-- x ticks -->
      <text
        v-for="t in xTicks" :key="`xt${t.i}`"
        :x="x(t.i)" :y="H - 8"
        class="tc__axis-txt" text-anchor="middle"
      >{{ t.label }}</text>

      <!-- crosshair -->
      <g v-if="hover">
        <line :x1="tipX" :x2="tipX" :y1="PAD.top" :y2="PAD.top + plotH" class="tc__crosshair" />
        <circle :cx="tipX" :cy="y(hover.pageviews)" r="4.5" class="tc__end tc__end--2" />
        <circle :cx="tipX" :cy="y(hover.visitors)" r="4.5" class="tc__end tc__end--1" />
      </g>
    </svg>

    <!-- tooltip (HTML, positioned over the crosshair) -->
    <div
      v-if="hover"
      class="tc__tip"
      :class="{ 'tc__tip--left': tipLeft }"
      :style="{ left: `${(tipX / W) * 100}%` }"
    >
      <div class="tc__tip-date">{{ fmtFull(hover.date) }}</div>
      <div class="tc__tip-row"><span class="tc__dot" style="background: var(--adm-chart-1)" />Visitors<b>{{ hover.visitors.toLocaleString() }}</b></div>
      <div class="tc__tip-row"><span class="tc__dot" style="background: var(--adm-chart-2)" />Pageviews<b>{{ hover.pageviews.toLocaleString() }}</b></div>
    </div>
  </div>
</template>

<style scoped>
.tc { position: relative; }
.tc__legend {
  display: flex; gap: 1.1rem; justify-content: flex-end;
  margin-bottom: 0.4rem;
}
.tc__key {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.72rem; color: var(--adm-text-muted);
}
.tc__dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.tc__svg { width: 100%; height: auto; display: block; overflow: visible; }

.tc__grid { stroke: var(--adm-chart-grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
.tc__axis-txt { fill: var(--adm-text-subtle); font-size: 10px; font-family: var(--adm-font-mono); }

.tc__area { stroke: none; }
.tc__area--1 { fill: color-mix(in srgb, var(--adm-chart-1) 14%, transparent); }
.tc__area--2 { fill: color-mix(in srgb, var(--adm-chart-2) 10%, transparent); }
.tc__line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.tc__line--1 { stroke: var(--adm-chart-1); }
.tc__line--2 { stroke: var(--adm-chart-2); }
.tc__end { stroke: var(--adm-surface); stroke-width: 2; }
.tc__end--1 { fill: var(--adm-chart-1); }
.tc__end--2 { fill: var(--adm-chart-2); }
.tc__crosshair { stroke: var(--adm-chart-axis); stroke-width: 1; vector-effect: non-scaling-stroke; }

.tc__tip {
  position: absolute; top: 0.2rem;
  transform: translateX(-50%);
  background: var(--adm-surface-3);
  border: 1px solid var(--adm-border-strong);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  box-shadow: var(--adm-shadow-lg);
  pointer-events: none;
  min-width: 148px;
  z-index: 5;
}
.tc__tip--left { transform: translateX(-100%) translateX(-12px); }
.tc__tip-date { font-size: 0.72rem; color: var(--adm-text-muted); margin-bottom: 0.35rem; }
.tc__tip-row {
  display: flex; align-items: center; gap: 0.45rem;
  font-size: 0.8rem; color: var(--adm-text);
}
.tc__tip-row b { margin-left: auto; font-variant-numeric: tabular-nums; }
</style>
