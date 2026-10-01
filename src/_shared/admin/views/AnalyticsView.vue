<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { contentClient, type AnalyticsDTO } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import StatTile from '../components/charts/StatTile.vue'
import TrendChart from '../components/charts/TrendChart.vue'
import BarList from '../components/charts/BarList.vue'
import HourColumns from '../components/charts/HourColumns.vue'
import DeviceSplit from '../components/charts/DeviceSplit.vue'

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)

const data = ref<AnalyticsDTO | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const range = ref<7 | 30 | 90>(30)
const showTable = ref(false)

const RANGES: Array<{ v: 7 | 30 | 90; label: string }> = [
  { v: 7, label: '7 days' },
  { v: 30, label: '30 days' },
  { v: 90, label: '90 days' },
]

async function load() {
  if (!siteId.value) { data.value = null; return }
  loading.value = true
  error.value = null
  try {
    data.value = await contentClient.getAnalytics(siteId.value, range.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch([siteId, range], load)

const visitorsSpark = computed(() => data.value?.series.map(s => s.visitors) ?? [])
const pageviewsSpark = computed(() => data.value?.series.map(s => s.pageviews) ?? [])
const latencySpark = computed(() => data.value?.series.filter(s => s.latencyMs > 0).map(s => s.latencyMs) ?? [])

const hasTraffic = computed(() => (data.value?.totals.pageviews ?? 0) > 0)

// Uptime strip: one cell per day, colored by up/down/unprobed.
const uptimeCells = computed(() =>
  (data.value?.series ?? []).map(s => ({
    date: s.date,
    state: s.up === null ? 'none' : s.up ? 'up' : 'down',
    latencyMs: s.latencyMs,
  })),
)
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <section class="adm-page an">
    <header class="adm-page__head an__head">
      <div>
        <span class="adm-eyebrow">Performance</span>
        <h1 class="adm-title">Analytics</h1>
        <p class="adm-subtitle">Traffic, audience, and uptime — privacy-friendly, no cookies.</p>
      </div>
      <div v-if="siteId" class="an__controls">
        <div class="an__range" role="tablist" aria-label="Date range">
          <button
            v-for="r in RANGES" :key="r.v"
            type="button" role="tab"
            class="an__range-btn" :class="{ 'is-active': range === r.v }"
            :aria-selected="range === r.v"
            @click="range = r.v"
          >{{ r.label }}</button>
        </div>
        <button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" @click="showTable = !showTable">
          {{ showTable ? 'Charts' : 'Table' }}
        </button>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <p class="adm-empty__body">Select a site from the header to see its analytics.</p>
    </div>

    <template v-else>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
      <div v-if="loading && !data" class="an__loading">Loading analytics…</div>

      <template v-if="data">
        <!-- ── KPI row ── -->
        <div class="an__kpis">
          <StatTile
            label="Visitors" :value="data.totals.visitors" :prev="data.totals.prevVisitors"
            :spark="visitorsSpark" accent="var(--adm-chart-1)"
          />
          <StatTile
            label="Pageviews" :value="data.totals.pageviews" :prev="data.totals.prevPageviews"
            :spark="pageviewsSpark" accent="var(--adm-chart-2)"
          />
          <StatTile
            label="Avg load" :value="data.avgLatencyMs" unit="ms" format="ms"
            :spark="latencySpark" accent="var(--adm-chart-3)"
          />
          <StatTile
            label="Uptime" :value="data.uptimePct" format="pct"
            accent="var(--adm-chart-good)"
          />
        </div>

        <!-- ── Toggled region — a single stable, full-width column so
             switching Table ⇄ Charts can never leave a card mis-sized. ── -->
        <div class="an__body">
          <!-- Table view (accessibility fallback / relief) -->
          <div v-if="showTable" key="table" class="adm-card an__table-wrap">
            <table class="adm-table an__table">
              <thead><tr><th>Date</th><th>Visitors</th><th>Pageviews</th><th>Load (ms)</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="s in data.series" :key="s.date">
                  <td class="adm-muted">{{ fmtDate(s.date) }}</td>
                  <td>{{ s.visitors.toLocaleString() }}</td>
                  <td>{{ s.pageviews.toLocaleString() }}</td>
                  <td>{{ s.latencyMs || '—' }}</td>
                  <td>{{ s.up === null ? '—' : s.up ? 'Up' : 'Down' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Charts -->
          <div v-else key="charts" class="an__charts">
            <div class="adm-card an__trend">
              <div class="an__card-head">
                <h2 class="an__card-title">Traffic over time</h2>
              </div>
              <TrendChart :data="data.series" />
            </div>

            <div class="an__split">
              <div class="adm-card">
                <div class="an__card-head"><h2 class="an__card-title">Top pages</h2></div>
                <BarList :rows="data.topPages" mono />
              </div>
              <div class="adm-card">
                <div class="an__card-head"><h2 class="an__card-title">Traffic sources</h2></div>
                <BarList :rows="data.sources" empty-text="Mostly direct visits so far." />
              </div>
            </div>

            <div class="an__split">
              <div class="adm-card">
                <div class="an__card-head"><h2 class="an__card-title">Devices</h2></div>
                <DeviceSplit :data="data.devices" />
              </div>
              <div class="adm-card">
                <div class="an__card-head"><h2 class="an__card-title">When visitors come by</h2></div>
                <HourColumns :data="data.byHour" />
              </div>
            </div>

            <!-- Uptime strip -->
            <div class="adm-card">
              <div class="an__card-head">
                <h2 class="an__card-title">Uptime</h2>
                <span v-if="data.uptimePct !== null" class="an__uptime-pct" :class="data.uptimePct >= 99 ? 'is-good' : data.uptimePct >= 95 ? 'is-warn' : 'is-bad'">
                  {{ data.uptimePct }}% up
                </span>
              </div>
              <div class="an__uptime">
                <span
                  v-for="c in uptimeCells" :key="c.date"
                  class="an__uptime-cell"
                  :class="`is-${c.state}`"
                  :title="`${fmtDate(c.date)} — ${c.state === 'none' ? 'not checked' : c.state === 'up' ? `up (${c.latencyMs}ms)` : 'down'}`"
                />
              </div>
              <p v-if="!hasTraffic" class="an__hint">
                Traffic charts fill in as visitors arrive. Uptime is checked every 5 minutes automatically.
              </p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.an__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.an__controls { display: flex; align-items: center; gap: 0.6rem; }
.an__range {
  display: inline-flex; padding: 0.2rem; gap: 0.15rem;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border);
  border-radius: 999px;
}
.an__range-btn {
  border: none; background: none; cursor: pointer;
  padding: 0.35rem 0.85rem; border-radius: 999px;
  font: inherit; font-size: 0.78rem; color: var(--adm-text-muted);
  transition: background 140ms ease, color 140ms ease;
}
.an__range-btn:hover { color: var(--adm-text); }
.an__range-btn.is-active { background: var(--adm-surface); color: var(--adm-text); box-shadow: var(--adm-shadow); }

.an__loading { color: var(--adm-text-muted); padding: 2rem 0; }

.an__kpis {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 1.1rem;
}
/* Toggled region: always a full-width single column. Both branches (table /
   charts) stretch to 100% so a chart card can never be squeezed narrow when
   switching views. min-width:0 keeps SVG/table children from forcing overflow. */
.an__body { width: 100%; }
.an__charts { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }
.an__charts > * { min-width: 0; }
.an__trend { padding: 1.4rem 1.5rem 1.2rem; width: 100%; }
.an__split {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.3rem;
}
.an__split > * { min-width: 0; }
.an__card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.1rem; }
.an__card-title {
  font-family: var(--adm-font-serif); font-weight: 500;
  font-size: 1.1rem; margin: 0; color: var(--adm-text);
}
.an__uptime-pct { font-size: 0.78rem; font-weight: 600; }
.an__uptime-pct.is-good { color: var(--adm-chart-good); }
.an__uptime-pct.is-warn { color: var(--adm-warn); }
.an__uptime-pct.is-bad { color: var(--adm-chart-bad); }

.an__uptime { display: flex; gap: 3px; flex-wrap: wrap; }
.an__uptime-cell {
  flex: 1; min-width: 6px; height: 34px; border-radius: 3px;
  background: var(--adm-surface-2);
}
.an__uptime-cell.is-up { background: color-mix(in srgb, var(--adm-chart-good) 60%, transparent); }
.an__uptime-cell.is-down { background: var(--adm-chart-bad); }
.an__uptime-cell.is-none { background: color-mix(in srgb, var(--adm-text) 8%, transparent); }

.an__hint { color: var(--adm-text-subtle); font-size: 0.8rem; margin: 0.9rem 0 0; }

.an__table-wrap { padding: 0; overflow-x: auto; overflow-y: hidden; }
.an__table { min-width: 520px; }

@media (max-width: 720px) {
  .an__head { align-items: flex-start; }
}
</style>
