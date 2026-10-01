<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { contentClient } from '../../platform/contentClient'
import SiteCard from '../components/SiteCard.vue'

const sites = ref<Awaited<ReturnType<typeof contentClient.listSites>>>([])
const loading = ref(false)
const error = ref<string | null>(null)
const showDeactivated = ref(false)
const redeploying = ref<Record<string, boolean>>({})
const redeployMsg = ref<Record<string, string>>({})

// Rename (the card owns the inline editor; we own the request state)
const renaming = ref<Record<string, boolean>>({})

// Deactivate / activate
const deactivating = ref<Record<string, boolean>>({})
const updateStatus = ref<Record<string, { current: string | null; latest: string | null; hasUpdate: boolean; neverChecked?: boolean; autoUpdate?: boolean; lastAutoUpdateAt?: string | null } | null>>({})
const updateChecking = ref<Record<string, boolean>>({})
const updating = ref<Record<string, boolean>>({})
const updateMsg = ref<Record<string, string>>({})

// Reprovision (force fresh provisioning run for stuck sites)
const reprovisioning = ref<Record<string, boolean>>({})
const reprovisionMsg = ref<Record<string, string>>({})

// Live deployment progress per site (polled from Vercel via the backend)
type DeployPhase = 'QUEUED' | 'INITIALIZING' | 'BUILDING' | 'UPLOADING' | 'DEPLOYING' | 'READY' | 'ERROR' | 'CANCELED' | 'UNKNOWN'
interface DeployProgress {
  state: DeployPhase
  deploymentId: string | null
  startedAt: number
  label: string
  percent: number
  failed: boolean
}
const deployProgress = ref<Record<string, DeployProgress | null>>({})
const deployTimers: Record<string, ReturnType<typeof setTimeout> | null> = {}

const PHASE_LABEL: Record<DeployPhase, string> = {
  QUEUED: 'Queued — waiting for Vercel to pick up the build',
  INITIALIZING: 'Initializing build environment',
  BUILDING: 'Building site (installing deps, compiling)',
  UPLOADING: 'Uploading build output',
  DEPLOYING: 'Deploying to production',
  READY: 'Live ✓',
  ERROR: 'Build failed',
  CANCELED: 'Deployment canceled',
  UNKNOWN: 'Waiting for deployment to start',
}
const PHASE_PERCENT: Record<DeployPhase, number> = {
  UNKNOWN: 5, QUEUED: 10, INITIALIZING: 25, BUILDING: 55, UPLOADING: 80, DEPLOYING: 92, READY: 100, ERROR: 100, CANCELED: 100,
}

function startDeployTracking(
  siteId: string,
  deploymentId: string | null,
  initialLabel = 'Starting…',
  priorDeploymentId: string | null = null,
) {
  // Cancel any previous tracker for this site
  stopDeployTracking(siteId)
  const startedAt = Date.now()
  deployProgress.value[siteId] = {
    state: 'UNKNOWN',
    deploymentId,
    startedAt,
    label: initialLabel,
    percent: 5,
    failed: false,
  }
  const tick = async () => {
    try {
      const status = await contentClient.getDeploymentStatus(siteId, deployProgress.value[siteId]?.deploymentId ?? undefined)
      const state = (status.state || 'UNKNOWN') as DeployPhase
      const prev = deployProgress.value[siteId]
      if (!prev) return

      // Guard against reporting a deployment that already existed BEFORE the
      // user clicked Update/Redeploy. Until the worker triggers the new build,
      // Vercel keeps returning the previous deployment.
      //
      // Staleness is about WHICH deployment we're looking at, not which state
      // it happens to be in — so this applies to EVERY state, terminal ones
      // included. Previously ERROR/CANCELED skipped the guard, so a site whose
      // last build had failed reported "Build failed" a second after clicking
      // Update, even though the new build went on to succeed.
      //
      // Once we've latched onto a deployment that is demonstrably new, drop the
      // guard so genuine failures of THAT build still surface immediately.
      const latchedOntoNew =
        prev.deploymentId != null && prev.deploymentId !== priorDeploymentId
      const isStaleDeploy = !latchedOntoNew && (
        (priorDeploymentId != null && status.deploymentId === priorDeploymentId) ||
        (status.createdAt != null && status.createdAt < startedAt)
      )

      if (isStaleDeploy) {
        deployProgress.value[siteId] = {
          ...prev,
          state: 'UNKNOWN',
          // Don't latch onto the stale deploymentId — keep polling "latest".
          deploymentId: prev.deploymentId,
          label: 'Waiting for new deployment to start…',
          percent: Math.max(prev.percent, 8),
          failed: false,
        }
        deployTimers[siteId] = setTimeout(tick, 3_000)
        return
      }

      deployProgress.value[siteId] = {
        ...prev,
        state,
        deploymentId: status.deploymentId ?? prev.deploymentId,
        label: PHASE_LABEL[state] ?? state,
        percent: PHASE_PERCENT[state] ?? prev.percent,
        failed: state === 'ERROR' || state === 'CANCELED',
      }
      if (state === 'READY') {
        // Pull a fresh screenshot once the build is live
        void refreshScreenshot(siteId)
        // Refresh the site row so productionUrl/status reflect the new deploy
        try {
          sites.value = await contentClient.listSites()
        } catch { /* non-fatal */ }
        // Linger the READY state briefly, then clear
        deployTimers[siteId] = setTimeout(() => { deployProgress.value[siteId] = null }, 5_000)
        return
      }
      if (state === 'ERROR' || state === 'CANCELED') {
        // Linger longer so the user can read the failure
        deployTimers[siteId] = setTimeout(() => { deployProgress.value[siteId] = null }, 15_000)
        return
      }
      // Stop polling after 10 minutes to avoid runaway timers
      if (Date.now() - prev.startedAt > 10 * 60_000) {
        deployProgress.value[siteId] = null
        return
      }
      deployTimers[siteId] = setTimeout(tick, 3_000)
    } catch {
      // Transient API hiccup — keep polling
      deployTimers[siteId] = setTimeout(tick, 5_000)
    }
  }
  // Small initial delay so Vercel has a moment to register the new deployment
  deployTimers[siteId] = setTimeout(tick, 1_500)
}

function stopDeployTracking(siteId: string) {
  const t = deployTimers[siteId]
  if (t) {
    clearTimeout(t)
    deployTimers[siteId] = null
  }
}

// Billing diagnostic (Stripe webhook resolution)
type BillingInfo = Awaited<ReturnType<typeof contentClient.getBillingStatus>>
const billing = ref<Record<string, BillingInfo | null>>({})
const billingLoading = ref<Record<string, boolean>>({})
const billingOpen = ref<Record<string, boolean>>({})
const billingMsg = ref<Record<string, string>>({})
const resolvingBilling = ref<Record<string, boolean>>({})

// Per-site screenshot refresh state. The screenshot URL itself lives on
// `s.screenshotUrl` (a public Vercel Blob URL the browser can cache); the
// frontend never fetches PNG bytes. We only track whether a manual refresh
// is in flight so the button can show a spinner.
const refreshingScreenshot = ref<Record<string, boolean>>({})
const screenshotErr = ref<Record<string, string | null>>({})

async function refreshScreenshot(siteId: string) {
  refreshingScreenshot.value[siteId] = true
  screenshotErr.value[siteId] = null
  try {
    const r = await contentClient.refreshScreenshot(siteId)
    if (r.error) {
      screenshotErr.value[siteId] = r.error
      return
    }
    const idx = sites.value.findIndex(x => x.id === siteId)
    if (idx >= 0) {
      sites.value[idx] = {
        ...sites.value[idx]!,
        screenshotUrl: r.url,
        screenshotCapturedAt: r.capturedAt,
      }
    }
  } catch (e) {
    screenshotErr.value[siteId] = e instanceof Error ? e.message : String(e)
  } finally {
    refreshingScreenshot.value[siteId] = false
  }
}

async function redeploy(siteId: string) {
  redeploying.value[siteId] = true
  redeployMsg.value[siteId] = ''
  // Snapshot the currently-live deployment so the tracker can ignore it and
  // wait for the genuinely new deployment to land before showing READY.
  let priorId: string | null = null
  try {
    const cur = await contentClient.getDeploymentStatus(siteId)
    priorId = cur.deploymentId
  } catch { /* non-fatal */ }
  try {
    const r = await contentClient.redeploySite(siteId)
    redeployMsg.value[siteId] = `Triggered (${r.deploymentId.slice(0, 12)}\u2026)`
    startDeployTracking(siteId, r.deploymentId, 'Redeploy queued', priorId)
  } catch (e) {
    redeployMsg.value[siteId] = e instanceof Error ? e.message : String(e)
  } finally {
    redeploying.value[siteId] = false
  }
}

async function checkUpdate(siteId: string) {
  updateChecking.value[siteId] = true
  updateMsg.value[siteId] = ''
  try {
    updateStatus.value[siteId] = await contentClient.getUpdateStatus(siteId)
  } catch (e) {
    updateMsg.value[siteId] = e instanceof Error ? e.message : String(e)
  } finally {
    updateChecking.value[siteId] = false
  }
}

async function updateNow(siteId: string) {
  updating.value[siteId] = true
  updateMsg.value[siteId] = ''
  // Snapshot the latest deployment so the tracker knows to ignore it while the
  // worker is still syncing template files into the repo. Without this guard
  // the poller sees the previous READY deployment and reports "Live" instantly.
  let priorId: string | null = null
  try {
    const cur = await contentClient.getDeploymentStatus(siteId)
    priorId = cur.deploymentId
  } catch { /* non-fatal */ }
  try {
    const r = await contentClient.updateSite(siteId)
    updateMsg.value[siteId] = `Update queued (${r.jobId})`
    // Update is async (worker syncs template files then redeploys). Start tracking;
    // the poller will discover the new deployment id on its first non-stale tick.
    startDeployTracking(siteId, null, 'Syncing template files\u2026', priorId)
  } catch (e) {
    updateMsg.value[siteId] = e instanceof Error ? e.message : String(e)
  } finally {
    updating.value[siteId] = false
  }
}

async function toggleAutoUpdate(siteId: string, enabled: boolean) {
  // Optimistic: reflect the new state immediately, roll back on failure.
  const prev = updateStatus.value[siteId]
  if (prev) updateStatus.value[siteId] = { ...prev, autoUpdate: enabled }
  try {
    await contentClient.setAutoUpdate(siteId, enabled)
  } catch (e) {
    if (prev) updateStatus.value[siteId] = prev
    updateMsg.value[siteId] = e instanceof Error ? e.message : String(e)
  }
}

async function reprovision(siteId: string) {
  reprovisioning.value[siteId] = true
  reprovisionMsg.value[siteId] = ''
  try {
    const r = await contentClient.reprovisionSite(siteId)
    reprovisionMsg.value[siteId] = `Reprovisioning queued (order ${r.orderId.slice(0, 8)}\u2026)`
    // The new deploy will produce a new URL; clear the current screenshot URL
    // locally so the placeholder shows until the post-READY auto-refresh
    // captures the new site. The backend keeps the old blob until then.
    const idx = sites.value.findIndex(x => x.id === siteId)
    if (idx >= 0) {
      sites.value[idx] = { ...sites.value[idx]!, screenshotUrl: null, screenshotCapturedAt: null }
    }
    // Track the new deployment as soon as the provisioning processor creates it.
    // The tracker auto-refreshes the screenshot when the build reaches READY.
    startDeployTracking(siteId, null, 'Reprovisioning \u2014 creating repo + Vercel project\u2026')
  } catch (e) {
    reprovisionMsg.value[siteId] = e instanceof Error ? e.message : String(e)
  } finally {
    reprovisioning.value[siteId] = false
  }
}

async function toggleBilling(siteId: string) {
  billingOpen.value[siteId] = !billingOpen.value[siteId]
  if (!billingOpen.value[siteId]) return
  if (billing.value[siteId]) return
  billingLoading.value[siteId] = true
  billingMsg.value[siteId] = ''
  try {
    billing.value[siteId] = await contentClient.getBillingStatus(siteId)
  } catch (e) {
    billingMsg.value[siteId] = e instanceof Error ? e.message : String(e)
  } finally {
    billingLoading.value[siteId] = false
  }
}

async function refreshBilling(siteId: string) {
  billingLoading.value[siteId] = true
  billingMsg.value[siteId] = ''
  try {
    billing.value[siteId] = await contentClient.getBillingStatus(siteId)
  } catch (e) {
    billingMsg.value[siteId] = e instanceof Error ? e.message : String(e)
  } finally {
    billingLoading.value[siteId] = false
  }
}

async function resolveBilling(siteId: string) {
  resolvingBilling.value[siteId] = true
  billingMsg.value[siteId] = ''
  try {
    const r = await contentClient.resolveBilling(siteId)
    billingMsg.value[siteId] = `Marked paid (${r.orderStatus}) \u2014 provisioning queued`
    // Refresh diagnostics so the canResolve flag clears
    billing.value[siteId] = await contentClient.getBillingStatus(siteId).catch(() => billing.value[siteId] ?? null)
  } catch (e) {
    billingMsg.value[siteId] = e instanceof Error ? e.message : String(e)
  } finally {
    resolvingBilling.value[siteId] = false
  }
}

function siteTitle(s: { slug: string; displayName?: string | null }) {
  return (s.displayName && s.displayName.trim()) || s.slug
}

async function rename(siteId: string, name: string) {
  renaming.value[siteId] = true
  try {
    const r = await contentClient.renameSite(siteId, name)
    const idx = sites.value.findIndex(x => x.id === siteId)
    if (idx >= 0) sites.value[idx] = { ...sites.value[idx]!, displayName: r.displayName }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    renaming.value[siteId] = false
  }
}

async function reloadSites() {
  sites.value = await contentClient.listSites({ includeDeactivated: showDeactivated.value })
}

async function toggleShowDeactivated() {
  showDeactivated.value = !showDeactivated.value
  try { await reloadSites() } catch (e) { error.value = e instanceof Error ? e.message : String(e) }
}

async function confirmDeactivate(s: { id: string; slug: string; displayName?: string | null }) {
  const name = siteTitle(s)
  if (!confirm(`Deactivate “${name}”?\n\nThe site stays online for visitors but is hidden from the admin list. You can reactivate it later from “Show deactivated.”`)) return
  deactivating.value[s.id] = true
  try {
    await contentClient.deactivateSite(s.id)
    await reloadSites()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    deactivating.value[s.id] = false
  }
}

async function confirmActivate(s: { id: string }) {
  deactivating.value[s.id] = true
  try {
    await contentClient.activateSite(s.id)
    await reloadSites()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    deactivating.value[s.id] = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    sites.value = await contentClient.listSites({ includeDeactivated: showDeactivated.value })
    for (const s of sites.value) {
      if (liveUrl(s)) {
        void checkUpdate(s.id)
      }
    }
  }
  catch (e) { error.value = e instanceof Error ? e.message : String(e) }
  finally { loading.value = false }
})

function liveUrl(s: { customDomain?: string; productionUrl?: string }) {
  return s.customDomain ? `https://${s.customDomain}` : s.productionUrl ?? ''
}

const liveCount = computed(() => sites.value.filter(s => liveUrl(s)).length)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div class="adm-page__title-block">
        <span class="adm-eyebrow">Studio</span>
        <h1 class="adm-title">Your sites</h1>
        <p class="adm-subtitle">
          <template v-if="loading">Loading…</template>
          <template v-else-if="!sites.length">Nothing here yet — your first site will appear once it’s provisioned.</template>
          <template v-else>{{ liveCount }} of {{ sites.length }} live · click a card to open it in a new tab.</template>
        </p>
      </div>
      <div class="adm-page__head-actions">
        <button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" @click="toggleShowDeactivated">
          {{ showDeactivated ? 'Hide deactivated' : 'Show deactivated' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="adm-msg-err">{{ error }}</p>

    <div v-if="sites.length" class="site-grid">
      <SiteCard
        v-for="s in sites"
        :key="s.id"
        :site="s"
        :update-status="updateStatus[s.id]"
        :update-checking="updateChecking[s.id]"
        :updating="updating[s.id]"
        :redeploying="redeploying[s.id]"
        :reprovisioning="reprovisioning[s.id]"
        :deactivating="deactivating[s.id]"
        :renaming="renaming[s.id]"
        :refreshing-screenshot="refreshingScreenshot[s.id]"
        :screenshot-error="screenshotErr[s.id]"
        :deploy-progress="deployProgress[s.id]"
        :notice="[redeployMsg[s.id], updateMsg[s.id], reprovisionMsg[s.id]].filter(Boolean).join(' · ')"
        :billing-open="billingOpen[s.id]"
        :billing="billing[s.id]"
        :billing-loading="billingLoading[s.id]"
        :billing-msg="billingMsg[s.id]"
        :resolving-billing="resolvingBilling[s.id]"
        @rename="(name: string) => rename(s.id, name)"
        @check-update="checkUpdate(s.id)"
        @update="updateNow(s.id)"
        @toggle-auto-update="toggleAutoUpdate(s.id, $event)"
        @redeploy="redeploy(s.id)"
        @reprovision="reprovision(s.id)"
        @refresh-screenshot="refreshScreenshot(s.id)"
        @toggle-billing="toggleBilling(s.id)"
        @refresh-billing="refreshBilling(s.id)"
        @resolve-billing="resolveBilling(s.id)"
        @deactivate="confirmDeactivate(s)"
        @activate="confirmActivate(s)"
      />
    </div>

    <div v-else-if="!loading && !error" class="adm-empty">
      <div class="adm-empty__icon">◇</div>
      <h2 class="adm-empty__title">No sites yet</h2>
      <p class="adm-empty__body">Your sites will appear here as they finish provisioning.</p>
    </div>
  </section>
</template>

<style scoped>
.site-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.4rem;
}
</style>
