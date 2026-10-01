<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { contentClient } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'

type Site = Awaited<ReturnType<typeof contentClient.listSites>>[number]
type LogEntry = { step: string; status: string; message?: string; durationMs?: number; createdAt: string }
type DeployState = Awaited<ReturnType<typeof contentClient.getDeploymentStatus>>

const activeSites = useActiveSiteStore()
const selectedSiteId = ref<string>('')
const logs = ref<LogEntry[]>([])
const logsError = ref<string | null>(null)
const logsLoading = ref(false)
const deployState = ref<DeployState | null>(null)
const deployLoading = ref(false)
const deployError = ref<string | null>(null)

const sites = computed<Site[]>(() => activeSites.sites)
const activeSite = computed<Site | null>(() => sites.value.find(s => s.id === selectedSiteId.value) ?? null)

async function loadLogs(siteId: string) {
  if (!siteId) return
  logsLoading.value = true
  logsError.value = null
  try { logs.value = await contentClient.getDeployLogs(siteId) }
  catch (e) { logsError.value = e instanceof Error ? e.message : String(e) }
  finally { logsLoading.value = false }
}

async function loadDeployState(siteId: string) {
  if (!siteId) return
  deployLoading.value = true
  deployError.value = null
  try { deployState.value = await contentClient.getDeploymentStatus(siteId) }
  catch (e) { deployError.value = e instanceof Error ? e.message : String(e) }
  finally { deployLoading.value = false }
}

async function selectSite(id: string) {
  selectedSiteId.value = id
  await Promise.all([loadLogs(id), loadDeployState(id)])
}

onMounted(async () => {
  await activeSites.refresh()
  const first = activeSites.activeId || sites.value[0]?.id
  if (first) await selectSite(first)
})

// Follow the header's site switcher.
watch(() => activeSites.activeId, (id) => { if (id && id !== selectedSiteId.value) void selectSite(id) })
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow">Operations</span>
        <h1 class="adm-title">Deployments</h1>
        <p class="adm-subtitle">Live build status and step-by-step deploy logs for each site.</p>
      </div>
    </header>

    <div v-if="!sites.length" class="adm-empty">
      <p class="adm-empty__body">No sites yet.</p>
    </div>

    <template v-else>
      <div class="dep-toolbar">
        <span v-if="activeSite" class="dep-active">
          <span class="dep-active__mark" aria-hidden="true">◇</span>
          <span class="dep-active__name">{{ activeSite.slug }}</span>
          <span class="dep-active__meta">{{ activeSite.archetype }}</span>
        </span>
        <button
          type="button"
          class="adm-btn adm-btn--ghost adm-btn--sm"
          :disabled="logsLoading || deployLoading || !selectedSiteId"
          @click="selectSite(selectedSiteId)"
        >Refresh</button>
      </div>

      <div class="adm-card dep-summary" v-if="deployState">
        <dl class="dep-grid">
          <div><dt>Latest state</dt><dd>
            <span class="adm-badge"
              :class="{
                'adm-badge--live': deployState.state === 'READY',
                'adm-badge--failed': deployState.state === 'ERROR' || deployState.state === 'CANCELED',
                'adm-badge--pending': deployState.state !== 'READY' && deployState.state !== 'ERROR' && deployState.state !== 'CANCELED',
              }"
            >{{ deployState.state }}</span>
          </dd></div>
          <div><dt>Site status</dt><dd>{{ deployState.siteStatus || '—' }}</dd></div>
          <div><dt>Deployment</dt><dd class="adm-mono">{{ deployState.deploymentId || '—' }}</dd></div>
          <div><dt>Production URL</dt><dd>
            <a v-if="deployState.productionUrl" :href="deployState.productionUrl" target="_blank" rel="noopener">{{ deployState.productionUrl }}</a>
            <span v-else class="adm-muted">—</span>
          </dd></div>
        </dl>
      </div>
      <p v-if="deployError" class="adm-msg-err">{{ deployError }}</p>

      <div class="adm-card dep-logs">
        <header class="dep-logs__head">
          <h2 class="adm-h3">Build log</h2>
          <span v-if="logsLoading" class="adm-muted">Loading…</span>
        </header>
        <p v-if="logsError" class="adm-msg-err">{{ logsError }}</p>
        <table v-else-if="logs.length" class="adm-table dep-log-table">
          <thead><tr><th>Step</th><th>Status</th><th>Duration</th><th>Message</th><th>When</th></tr></thead>
          <tbody>
            <tr v-for="l in logs" :key="l.createdAt + l.step" :class="{ 'is-fail': l.status === 'failure' }">
              <td>{{ l.step }}</td>
              <td>{{ l.status }}</td>
              <td class="adm-muted">{{ l.durationMs != null ? l.durationMs + 'ms' : '—' }}</td>
              <td class="dep-log-msg">{{ l.message || '' }}</td>
              <td class="adm-muted">{{ new Date(l.createdAt).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="adm-muted">No deploy logs yet.</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dep-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
/* No site picker here — Deployments follows the site selected in the header. */
.dep-active {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.35rem 0.7rem;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border);
  border-radius: 999px;
  font-size: 0.85rem;
}
.dep-active__mark { color: var(--adm-accent); }
.dep-active__name { font-weight: 600; }
.dep-active__meta { color: var(--adm-text-muted); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.06em; }
.dep-summary { padding: 1rem 1.25rem; margin-bottom: 1rem; }
.dep-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem 1.25rem; margin: 0; }
.dep-grid dt { color: var(--adm-text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
.dep-grid dd { margin: 0.15rem 0 0; font-size: 0.9rem; word-break: break-all; }
.adm-mono { font-family: var(--adm-font-mono); font-size: 0.82rem; }
.dep-logs { padding: 1rem 1.25rem; }
.dep-logs__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.75rem; }
.dep-log-table { font-size: 0.82rem; }
.dep-log-table tr.is-fail td { color: var(--adm-danger); }
.dep-log-msg { max-width: 480px; white-space: pre-wrap; word-break: break-all; font-family: var(--adm-font-mono); font-size: 0.78rem; }
</style>
