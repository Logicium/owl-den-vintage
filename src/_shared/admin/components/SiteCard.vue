<script setup lang="ts">
/**
 * SiteCard — the admin dashboard's website card.
 *
 * Purely presentational: all data arrives via props, every action is an emit.
 * Layout: screenshot hero (status chip + deploy bar live on the image),
 * title + host row, a meta strip (template version · last deploy · shot age),
 * one contextual primary action, and a kebab menu for everything else.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, MoreHorizontal, Pencil, RefreshCw, RefreshCwOff, Rocket, Camera, Receipt, Wrench, Archive, ArchiveRestore, GitCommitHorizontal, Clock } from 'lucide-vue-next'

export interface SiteRow {
  id: string
  slug: string
  displayName: string | null
  archetype: string
  status: string
  productionUrl?: string
  customDomain?: string
  deactivatedAt?: string | null
  screenshotUrl?: string | null
  screenshotCapturedAt?: string | null
  addOns?: string[]
  templateCommitSha?: string | null
  lastDeployedAt?: string | null
}

export interface UpdateStatusRow {
  current: string | null
  latest: string | null
  hasUpdate: boolean
  neverChecked?: boolean
  autoUpdate?: boolean
  lastAutoUpdateAt?: string | null
}

export interface DeployProgressRow {
  state: string
  deploymentId: string | null
  startedAt: number
  label: string
  percent: number
  failed: boolean
}

export interface BillingRow {
  orderStatus: string
  stripeSessionId: string | null
  failureReason: string | null
  session?: { paymentStatus: string | null; amountTotal: number | null; currency: string | null; createdAt: string } | null
  paymentIntent?: { status: string; lastPaymentError: string | null } | null
  webhookEvents?: Array<{ id: string; type: string; created: number }>
  canResolve?: boolean
  notes?: string | null
  error?: string
}

const props = withDefaults(defineProps<{
  site: SiteRow
  updateStatus?: UpdateStatusRow | null
  updateChecking?: boolean
  updating?: boolean
  redeploying?: boolean
  reprovisioning?: boolean
  deactivating?: boolean
  renaming?: boolean
  refreshingScreenshot?: boolean
  screenshotError?: string | null
  deployProgress?: DeployProgressRow | null
  /** One-line status notice under the actions (queue confirmations, errors). */
  notice?: string
  billingOpen?: boolean
  billing?: BillingRow | null
  billingLoading?: boolean
  billingMsg?: string
  resolvingBilling?: boolean
}>(), {
  updateStatus: null,
  deployProgress: null,
  billing: null,
  notice: '',
  billingMsg: '',
})

const emit = defineEmits<{
  rename: [name: string]
  'check-update': []
  update: []
  'toggle-auto-update': [enabled: boolean]
  redeploy: []
  reprovision: []
  'refresh-screenshot': []
  'toggle-billing': []
  'refresh-billing': []
  'resolve-billing': []
  deactivate: []
  activate: []
}>()

// ── Derived display ──────────────────────────────────────────────────────

const title = computed(() => (props.site.displayName && props.site.displayName.trim()) || props.site.slug)
const liveUrl = computed(() =>
  props.site.customDomain ? `https://${props.site.customDomain}` : (props.site.productionUrl ?? ''))
const host = computed(() => {
  try { return new URL(liveUrl.value).host } catch { return liveUrl.value.replace(/^https?:\/\//, '') }
})

const screenshotSrc = computed(() => {
  if (!props.site.screenshotUrl) return null
  const v = props.site.screenshotCapturedAt ? encodeURIComponent(props.site.screenshotCapturedAt) : Date.now().toString()
  return `${props.site.screenshotUrl}?v=${v}`
})

type StatusTone = 'live' | 'busy' | 'failed' | 'muted'
const statusInfo = computed<{ label: string; tone: StatusTone }>(() => {
  if (props.site.deactivatedAt) return { label: 'Deactivated', tone: 'muted' }
  const s = props.site.status.toLowerCase()
  if (s === 'live' || s === 'ready') return { label: 'Live', tone: 'live' }
  if (s === 'failed') return { label: 'Failed', tone: 'failed' }
  if (s === 'provisioning' || s === 'pending' || s === 'queued' || s === 'building') return { label: s[0]!.toUpperCase() + s.slice(1), tone: 'busy' }
  return { label: props.site.status, tone: 'muted' }
})

const isStuck = computed(() => ['provisioning', 'failed', 'pending', 'draft'].includes(props.site.status.toLowerCase()))

/** Short template version — prefer the freshly-checked value, fall back to the stored one. */
const versionSha = computed(() => {
  const sha = props.updateStatus?.current ?? props.site.templateCommitSha
  return sha ? sha.slice(0, 7) : null
})

function timeAgo(iso?: string | null): string | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const deployedAgo = computed(() => timeAgo(props.site.lastDeployedAt))
const shotAgo = computed(() => timeAgo(props.site.screenshotCapturedAt))

function formatElapsed(startedAt: number) {
  const s = Math.max(0, Math.round((Date.now() - startedAt) / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function formatTimestamp(unixSec: number) {
  try { return new Date(unixSec * 1000).toLocaleString() } catch { return String(unixSec) }
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || !currency) return ''
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100) }
  catch { return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}` }
}

// ── Rename ───────────────────────────────────────────────────────────────

const editing = ref(false)
const nameDraft = ref('')
function startRename() {
  nameDraft.value = title.value
  editing.value = true
  menuOpen.value = false
}
function saveRename() {
  const v = nameDraft.value.trim()
  if (v && v !== title.value) emit('rename', v)
  editing.value = false
}

// ── Kebab menu ───────────────────────────────────────────────────────────

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (menuOpen.value && menuRef.value && !menuRef.value.contains(e.target as Node)) menuOpen.value = false
}
function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { menuOpen.value = false; editing.value = false }
}
onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onDocKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onDocKey)
})

function menuAction(fn: () => void) {
  menuOpen.value = false
  fn()
}
</script>

<template>
  <article class="sc" :class="{ 'sc--deactivated': !!site.deactivatedAt }">
    <!-- ── Hero: screenshot + floating chips + live deploy bar ── -->
    <component
      :is="liveUrl ? 'a' : 'div'"
      class="sc__hero"
      v-bind="liveUrl ? { href: liveUrl, target: '_blank', rel: 'noopener', title: `Open ${host} in a new tab` } : {}"
    >
      <img v-if="screenshotSrc" :src="screenshotSrc" :alt="`${site.slug} preview`" loading="lazy" />
      <div v-else class="sc__hero-empty">
        <span v-if="screenshotError">Preview unavailable</span>
        <span v-else-if="liveUrl">Capturing preview…</span>
        <span v-else>Not deployed yet</span>
      </div>

      <span class="sc__status" :data-tone="statusInfo.tone">
        <span class="sc__status-dot" aria-hidden="true" />{{ statusInfo.label }}
      </span>

      <span v-if="liveUrl" class="sc__open">Open <ExternalLink :size="11" /></span>

      <!-- In-flight deploy: glass strip pinned to the hero's bottom edge. -->
      <div
        v-if="deployProgress"
        class="sc__deploy"
        :class="{ 'sc__deploy--ok': deployProgress.state === 'READY', 'sc__deploy--err': deployProgress.failed }"
      >
        <div class="sc__deploy-row">
          <span class="sc__deploy-label">{{ deployProgress.label }}</span>
          <span class="sc__deploy-time">{{ formatElapsed(deployProgress.startedAt) }}</span>
        </div>
        <div class="sc__deploy-bar" role="progressbar" :aria-valuenow="deployProgress.percent" aria-valuemin="0" aria-valuemax="100">
          <div
            class="sc__deploy-fill"
            :class="{ 'is-indeterminate': !deployProgress.failed && deployProgress.state !== 'READY' }"
            :style="{ width: `${deployProgress.percent}%` }"
          />
        </div>
      </div>
    </component>

    <!-- ── Body ── -->
    <div class="sc__body">
      <div class="sc__head">
        <div class="sc__title-wrap">
          <div v-if="editing" class="sc__rename">
            <input
              v-model="nameDraft"
              class="adm-input"
              type="text"
              maxlength="80"
              placeholder="Business name"
              @keyup.enter="saveRename"
              @keyup.esc="editing = false"
            />
            <button type="button" class="adm-btn adm-btn--sm adm-btn--primary" :disabled="renaming" @click="saveRename">{{ renaming ? '…' : 'Save' }}</button>
          </div>
          <h2 v-else class="sc__title">
            {{ title }}
            <button type="button" class="sc__icon-btn sc__title-edit" title="Rename" @click="startRename"><Pencil :size="13" /></button>
          </h2>
          <div class="sc__sub">
            <a v-if="liveUrl" :href="liveUrl" target="_blank" rel="noopener" class="sc__host">{{ host }}</a>
            <span v-else class="sc__host sc__host--none">no URL yet</span>
            <span class="sc__arch">{{ site.archetype }}</span>
          </div>
        </div>

        <div ref="menuRef" class="sc__menu-wrap">
          <button type="button" class="sc__icon-btn sc__kebab" :class="{ 'is-open': menuOpen }" title="More actions" aria-haspopup="menu" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
            <MoreHorizontal :size="17" />
          </button>
          <div v-if="menuOpen" class="sc__menu" role="menu">
            <button v-if="liveUrl" type="button" role="menuitem" :disabled="updateChecking" @click="menuAction(() => emit('check-update'))">
              <RefreshCw :size="13" /> {{ updateChecking ? 'Checking…' : 'Check for updates' }}
            </button>
            <button v-if="liveUrl" type="button" role="menuitem" @click="menuAction(() => emit('toggle-auto-update', !(updateStatus?.autoUpdate ?? true)))">
              <component :is="(updateStatus?.autoUpdate ?? true) ? RefreshCwOff : RefreshCw" :size="13" />
              {{ (updateStatus?.autoUpdate ?? true) ? 'Turn off auto-updates' : 'Turn on auto-updates' }}
            </button>
            <button v-if="liveUrl" type="button" role="menuitem" :disabled="redeploying" @click="menuAction(() => emit('redeploy'))">
              <Rocket :size="13" /> {{ redeploying ? 'Triggering…' : 'Redeploy' }}
            </button>
            <button v-if="liveUrl" type="button" role="menuitem" :disabled="refreshingScreenshot" @click="menuAction(() => emit('refresh-screenshot'))">
              <Camera :size="13" /> {{ refreshingScreenshot ? 'Capturing…' : 'Refresh screenshot' }}
            </button>
            <button type="button" role="menuitem" @click="menuAction(() => emit('toggle-billing'))">
              <Receipt :size="13" /> {{ billingOpen ? 'Hide billing' : 'Billing diagnostic' }}
            </button>
            <button v-if="isStuck" type="button" role="menuitem" :disabled="reprovisioning" @click="menuAction(() => emit('reprovision'))">
              <Wrench :size="13" /> {{ reprovisioning ? 'Queuing…' : 'Reprovision' }}
            </button>
            <button type="button" role="menuitem" @click="startRename">
              <Pencil :size="13" /> Rename
            </button>
            <div class="sc__menu-divider" role="separator" />
            <button v-if="!site.deactivatedAt" type="button" role="menuitem" class="sc__menu-danger" :disabled="deactivating" @click="menuAction(() => emit('deactivate'))">
              <Archive :size="13" /> {{ deactivating ? '…' : 'Deactivate' }}
            </button>
            <button v-else type="button" role="menuitem" :disabled="deactivating" @click="menuAction(() => emit('activate'))">
              <ArchiveRestore :size="13" /> {{ deactivating ? '…' : 'Reactivate' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Meta strip: version · last deploy · screenshot age ── -->
      <div class="sc__meta">
        <span class="sc__meta-item sc__meta-version" :title="updateStatus?.current ?? site.templateCommitSha ?? 'Template version unknown'">
          <GitCommitHorizontal :size="13" />
          <code v-if="versionSha">{{ versionSha }}</code>
          <span v-else>version —</span>
        </span>
        <span class="sc__meta-item" :title="site.lastDeployedAt ? `Last deployed ${new Date(site.lastDeployedAt).toLocaleString()}` : 'No deploy recorded yet'">
          <Clock :size="13" />
          <span>{{ deployedAgo ? `deployed ${deployedAgo}` : 'deployed —' }}</span>
        </span>
        <span v-if="shotAgo" class="sc__meta-item sc__meta-quiet" :title="`Screenshot captured ${shotAgo}`">
          <Camera :size="13" />
          <span>{{ shotAgo }}</span>
        </span>
      </div>

      <!-- ── Contextual primary action ── -->
      <div class="sc__cta">
        <template v-if="liveUrl">
          <span v-if="updateChecking" class="sc__update-note sc__update-note--muted">Checking for updates…</span>
          <template v-else-if="updateStatus?.hasUpdate || updateStatus?.neverChecked">
            <button type="button" class="adm-btn adm-btn--sm adm-btn--primary" :disabled="updating" @click="emit('update')">
              {{ updating ? 'Queuing…' : 'Update to latest' }}
            </button>
            <span v-if="updateStatus?.hasUpdate && updateStatus.latest" class="sc__update-note">
              <span class="sc__pulse" aria-hidden="true" /> {{ (updateStatus.current ?? '').slice(0, 7) || '?' }} → {{ updateStatus.latest.slice(0, 7) }}
            </span>
            <span v-else class="sc__update-note sc__update-note--muted">version unverified</span>
            <span v-if="(updateStatus?.autoUpdate ?? true)" class="sc__update-note sc__update-note--auto" title="This site updates itself automatically when the template advances — updating now is optional.">
              <RefreshCw :size="11" /> auto
            </span>
          </template>
          <template v-else-if="updateStatus">
            <span class="sc__update-note sc__update-note--ok">✓ Up to date</span>
            <span v-if="(updateStatus?.autoUpdate ?? true)" class="sc__update-note sc__update-note--auto" title="This site updates itself automatically when the template advances.">
              <RefreshCw :size="11" /> auto
            </span>
          </template>
        </template>
        <button
          v-else-if="isStuck"
          type="button" class="adm-btn adm-btn--sm adm-btn--primary"
          :disabled="reprovisioning"
          @click="emit('reprovision')"
        >{{ reprovisioning ? 'Queuing…' : 'Reprovision' }}</button>
      </div>

      <p v-if="notice" class="sc__notice">{{ notice }}</p>
      <p v-if="screenshotError" class="sc__notice sc__notice--err">{{ screenshotError }}</p>

      <!-- ── Billing diagnostic (collapsible) ── -->
      <div v-if="billingOpen" class="sc__billing">
        <div class="sc__billing-head">
          <strong>Billing diagnostic</strong>
          <button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" :disabled="billingLoading" @click="emit('refresh-billing')">⟳</button>
        </div>
        <p v-if="billingLoading" class="sc__notice">Loading Stripe data…</p>
        <p v-if="billingMsg" class="sc__notice">{{ billingMsg }}</p>
        <template v-if="billing">
          <dl class="sc__bill-grid">
            <dt>Order status</dt><dd>{{ billing.orderStatus }}</dd>
            <dt>Stripe session</dt><dd>{{ billing.stripeSessionId || '—' }}</dd>
            <template v-if="billing.session">
              <dt>Payment status</dt><dd>{{ billing.session.paymentStatus || '—' }}</dd>
              <dt>Amount</dt><dd>{{ formatMoney(billing.session.amountTotal, billing.session.currency) || '—' }}</dd>
              <dt>Created</dt><dd>{{ billing.session.createdAt }}</dd>
            </template>
            <template v-if="billing.paymentIntent">
              <dt>Payment intent</dt><dd>{{ billing.paymentIntent.status }}</dd>
              <template v-if="billing.paymentIntent.lastPaymentError">
                <dt>Last error</dt><dd class="sc__err">{{ billing.paymentIntent.lastPaymentError }}</dd>
              </template>
            </template>
            <dt>Webhook events</dt>
            <dd>
              <template v-if="billing.webhookEvents?.length">
                <div v-for="ev in billing.webhookEvents" :key="ev.id" class="sc__mono">{{ ev.type }} · {{ formatTimestamp(ev.created) }}</div>
              </template>
              <span v-else class="sc__warn">No checkout.session.completed event found — webhook likely never fired.</span>
            </dd>
            <template v-if="billing.failureReason">
              <dt>Failure</dt><dd class="sc__err">{{ billing.failureReason }}</dd>
            </template>
          </dl>
          <p v-if="billing.notes" class="sc__warn">{{ billing.notes }}</p>
          <p v-if="billing.error" class="sc__err">{{ billing.error }}</p>
          <div v-if="billing.canResolve" class="sc__billing-actions">
            <button type="button" class="adm-btn adm-btn--sm adm-btn--primary" :disabled="resolvingBilling" @click="emit('resolve-billing')">
              {{ resolvingBilling ? 'Resolving…' : 'Mark paid & provision' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </article>
</template>

<style scoped>
.sc {
  display: flex; flex-direction: column;
  background: var(--adm-surface);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius-lg);
  /* No overflow clip here: the kebab menu must be able to extend past the
     card. The hero clips itself; the top corners are rounded on it below. */
  overflow: visible;
  box-shadow: var(--adm-shadow);
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}
.sc:hover {
  transform: translateY(-2px);
  border-color: var(--adm-border-strong);
  box-shadow: var(--adm-shadow-lg);
}
.sc--deactivated { opacity: 0.6; filter: grayscale(0.5); }
/* While the kebab menu is open, paint this card above its grid siblings so
   the popover isn't covered by the next card. */
.sc { position: relative; }
.sc:has(.sc__menu) { z-index: 40; }

/* ── Hero ── */
.sc__hero {
  position: relative; display: block;
  aspect-ratio: 16 / 10;
  background:
    radial-gradient(120% 90% at 20% 0%, color-mix(in srgb, var(--adm-accent) 7%, transparent), transparent 60%),
    var(--adm-surface-2);
  overflow: hidden;
  /* The card no longer clips children, so round our own top corners. */
  border-radius: calc(var(--adm-radius-lg) - 1px) calc(var(--adm-radius-lg) - 1px) 0 0;
  border-bottom: 1px solid var(--adm-border);
}
.sc__hero img {
  width: 100%; height: 100%; object-fit: cover; object-position: top; display: block;
  transition: transform 700ms cubic-bezier(0.2, 0.7, 0.3, 1);
}
.sc:hover .sc__hero img { transform: scale(1.035); }
.sc__hero-empty {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  color: var(--adm-text-subtle);
  font-size: 0.82rem; letter-spacing: 0.06em;
}

.sc__status {
  position: absolute; top: 0.65rem; left: 0.65rem;
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.28rem 0.65rem 0.28rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem; font-weight: 650; letter-spacing: 0.05em;
  color: #fff;
  background: rgba(12, 13, 16, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px) saturate(1.3);
  -webkit-backdrop-filter: blur(8px) saturate(1.3);
}
.sc__status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor;
}
.sc__status[data-tone='live'] .sc__status-dot { background: #34d399; box-shadow: 0 0 8px #34d39988; }
.sc__status[data-tone='busy'] .sc__status-dot { background: #fbbf24; animation: sc-blink 1.4s ease infinite; }
.sc__status[data-tone='failed'] .sc__status-dot { background: #f87171; }
.sc__status[data-tone='muted'] .sc__status-dot { background: #9ca3af; }
@keyframes sc-blink { 50% { opacity: 0.35; } }

.sc__open {
  position: absolute; top: 0.65rem; right: 0.65rem;
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em;
  color: #fff;
  background: rgba(12, 13, 16, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  opacity: 0; transform: translateY(-3px);
  transition: opacity 180ms ease, transform 180ms ease;
}
.sc__hero:hover .sc__open { opacity: 1; transform: none; }

/* Deploy strip pinned to the hero's bottom edge */
.sc__deploy {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 0.5rem 0.7rem 0.6rem;
  background: linear-gradient(to top, rgba(10, 11, 14, 0.88), rgba(10, 11, 14, 0.55) 70%, transparent);
  color: #fff;
  display: flex; flex-direction: column; gap: 0.35rem;
}
.sc__deploy-row { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; }
.sc__deploy-label { font-size: 0.74rem; font-weight: 550; }
.sc__deploy-time { font-size: 0.7rem; opacity: 0.75; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.sc__deploy-bar {
  height: 4px; border-radius: 999px; overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
}
.sc__deploy-fill {
  height: 100%; border-radius: 999px;
  background: var(--adm-accent);
  transition: width 600ms ease;
}
.sc__deploy--ok .sc__deploy-fill { background: #34d399; }
.sc__deploy--err .sc__deploy-fill { background: #f87171; }
.sc__deploy-fill.is-indeterminate {
  background: linear-gradient(90deg, var(--adm-accent), color-mix(in srgb, var(--adm-accent) 35%, transparent) 50%, var(--adm-accent));
  background-size: 200% 100%;
  animation: sc-shimmer 1.6s linear infinite;
}
@keyframes sc-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* ── Body ── */
.sc__body { padding: 0.95rem 1.05rem 1.05rem; display: flex; flex-direction: column; gap: 0.65rem; }

.sc__head { display: flex; align-items: flex-start; gap: 0.5rem; }
.sc__title-wrap { flex: 1; min-width: 0; }
.sc__title {
  font-family: var(--adm-font-serif);
  font-size: 1.35rem; font-weight: 500;
  letter-spacing: -0.01em; line-height: 1.15;
  margin: 0;
  color: var(--adm-text);
  display: flex; align-items: baseline; gap: 0.3rem;
  min-width: 0;
}
.sc__title-edit { opacity: 0; transition: opacity 140ms ease; flex-shrink: 0; }
.sc:hover .sc__title-edit { opacity: 1; }

.sc__sub {
  display: flex; align-items: center; gap: 0.55rem;
  margin-top: 0.2rem; min-width: 0;
}
.sc__host {
  font-size: 0.8rem; color: var(--adm-text-muted);
  text-decoration: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sc__host:hover { color: var(--adm-accent); text-decoration: underline; }
.sc__host--none { font-style: italic; }
.sc__arch {
  flex-shrink: 0;
  font-family: var(--adm-font-mono);
  font-size: 0.62rem; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--adm-text-muted);
  padding: 0.14rem 0.5rem;
  border: 1px solid var(--adm-border);
  border-radius: 999px;
  background: var(--adm-surface-2);
}

.sc__icon-btn {
  display: inline-grid; place-items: center;
  background: none; border: none; cursor: pointer;
  color: var(--adm-text-muted);
  padding: 0.3rem; border-radius: 8px;
  transition: color 140ms ease, background 140ms ease;
}
.sc__icon-btn:hover { color: var(--adm-text); background: var(--adm-surface-2); }

/* ── Kebab menu ── */
.sc__menu-wrap { position: relative; flex-shrink: 0; }
.sc__kebab.is-open { color: var(--adm-text); background: var(--adm-surface-2); }
.sc__menu {
  position: absolute; top: calc(100% + 0.35rem); right: 0; z-index: 30;
  min-width: 205px;
  background: var(--adm-surface);
  border: 1px solid var(--adm-border-strong);
  border-radius: 12px;
  box-shadow: var(--adm-shadow-lg);
  padding: 0.3rem;
  display: flex; flex-direction: column;
  animation: sc-pop 130ms ease both;
}
@keyframes sc-pop { from { opacity: 0; transform: translateY(-4px) scale(0.98); } }
.sc__menu button {
  display: flex; align-items: center; gap: 0.55rem;
  width: 100%;
  background: none; border: none; cursor: pointer;
  color: var(--adm-text);
  font: inherit; font-size: 0.82rem;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  text-align: left;
  transition: background 120ms ease;
}
.sc__menu button:hover:not(:disabled) { background: var(--adm-surface-2); }
.sc__menu button:disabled { opacity: 0.5; cursor: default; }
.sc__menu button :deep(svg) { color: var(--adm-text-muted); flex-shrink: 0; }
.sc__menu-divider { height: 1px; background: var(--adm-border); margin: 0.3rem 0.4rem; }
.sc__menu-danger { color: #f87171 !important; }
.sc__menu-danger :deep(svg) { color: #f87171 !important; }

.sc__rename { display: flex; gap: 0.35rem; align-items: stretch; }
.sc__rename .adm-input { flex: 1; }

/* ── Meta strip ── */
.sc__meta {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: 0.4rem;
}
.sc__meta-item {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--adm-text-muted);
  padding: 0.24rem 0.55rem;
  border: 1px solid var(--adm-border);
  border-radius: 8px;
  background: var(--adm-surface-2);
  white-space: nowrap;
}
.sc__meta-item :deep(svg) { color: var(--adm-text-subtle); }
.sc__meta-item code {
  font-family: var(--adm-font-mono);
  font-size: 0.7rem;
  color: var(--adm-text);
}
.sc__meta-quiet { border-style: dashed; }

/* ── CTA row ── */
.sc__cta { display: flex; align-items: center; gap: 0.6rem; min-height: 1.6rem; flex-wrap: wrap; }
.sc__update-note {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.75rem;
  font-family: var(--adm-font-mono);
  color: var(--adm-accent);
}
.sc__update-note--ok { color: #34d399; font-family: inherit; }
.sc__update-note--muted { color: var(--adm-text-subtle); font-family: inherit; }
.sc__update-note--auto {
  display: inline-flex; align-items: center; gap: 0.25rem;
  color: var(--adm-accent); font-family: inherit;
  padding: 0.1rem 0.45rem; border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--adm-accent) 35%, transparent);
  background: color-mix(in srgb, var(--adm-accent) 10%, transparent);
  text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.64rem; font-weight: 600;
}
.sc__pulse {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--adm-accent);
  animation: sc-blink 1.4s ease infinite;
}

.sc__notice { margin: 0; font-size: 0.76rem; color: var(--adm-text-muted); }
.sc__notice--err { color: #f87171; }
.sc__err { color: #f87171; }
.sc__warn { color: var(--adm-accent); font-size: 0.78rem; }
.sc__mono { font-family: var(--adm-font-mono); font-size: 0.74rem; }

/* ── Billing panel ── */
.sc__billing {
  padding: 0.7rem 0.8rem;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius);
  font-size: 0.8rem;
  display: flex; flex-direction: column; gap: 0.45rem;
}
.sc__billing-head { display: flex; justify-content: space-between; align-items: center; }
.sc__billing-actions { display: flex; justify-content: flex-end; }
.sc__bill-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.22rem 0.75rem;
  margin: 0;
}
.sc__bill-grid dt { color: var(--adm-text-muted); }
.sc__bill-grid dd { margin: 0; word-break: break-all; }
</style>
