<script setup lang="ts">
/**
 * POS connection panel (Mesa ordering).
 *
 * Connecting is an OAuth round-trip: we ask the API for the vendor's
 * authorize URL and send the owner there. The vendor redirects back to the
 * service, which stores the tokens and bounces the browser to
 * /admin/ordering?pos=connected — so on mount we look for that flag and
 * refresh, rather than trying to hold state across the redirect.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { Printer, Plug, Unplug, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-vue-next'
import { contentClient, type PosStatusDTO } from '../../platform/contentClient'
import ToggleInput from './inputs/ToggleInput.vue'
import { useToast } from '../composables/useToast'

const props = defineProps<{ siteId: string | null }>()

const toast = useToast()
const status = ref<PosStatusDTO | null>(null)
const loading = ref(false)
const busy = ref<string | null>(null)
const error = ref<string | null>(null)

const connected = computed(() => !!status.value?.connected)
const providers = computed(() => status.value?.providers ?? [])
/** Vendors we can actually offer right now; the rest show as coming soon. */
const available = computed(() => providers.value.filter(p => p.configured))
const comingSoon = computed(() => providers.value.filter(p => !p.configured))

async function load() {
  if (!props.siteId) return
  loading.value = true
  error.value = null
  try {
    status.value = await contentClient.posStatus(props.siteId)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function connect(provider: string) {
  if (!props.siteId) return
  busy.value = provider
  try {
    const { url } = await contentClient.posConnectUrl(props.siteId, provider)
    window.location.href = url
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    busy.value = null
  }
}

async function disconnect() {
  if (!props.siteId) return
  busy.value = 'disconnect'
  try {
    await contentClient.posDisconnect(props.siteId)
    await load()
    toast.success('POS disconnected.')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = null
  }
}

async function saveConfig(patch: Partial<{ autoSend: boolean; autoPrint: boolean }>) {
  if (!props.siteId || !status.value) return
  const next = { ...status.value.config, ...patch }
  status.value.config = next
  try {
    await contentClient.posSaveConfig(props.siteId, next)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
    await load()
  }
}

/** The service redirects back here with ?pos=connected|error after OAuth. */
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const result = params.get('pos')
  if (result === 'connected') toast.success('POS connected. Online orders will print in your kitchen.')
  else if (result === 'error') toast.error(params.get('detail') || 'Could not connect your POS.')
  if (result) {
    params.delete('pos')
    params.delete('detail')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }
  void load()
})
watch(() => props.siteId, load)

defineExpose({ reload: load })
</script>

<template>
  <section class="adm-card pos">
    <div class="pos__head">
      <div>
        <h2 class="adm-h2">Kitchen printing</h2>
        <p class="adm-muted">
          Connect your point of sale and every online order prints a ticket, the same
          as an order rung up at the counter.
        </p>
      </div>
      <span v-if="connected" class="adm-badge adm-badge--ok pos__badge">
        <CheckCircle2 :size="13" /> Connected
      </span>
    </div>

    <p v-if="error" class="adm-msg-err">{{ error }}</p>
    <p v-if="loading" class="adm-muted">Loading…</p>

    <!-- Refresh token died: the owner has to authorise again. -->
    <div v-if="status?.needsReconnect" class="pos__warn">
      <AlertTriangle :size="14" />
      <span>Your POS connection expired. Reconnect to keep tickets printing.</span>
    </div>

    <!-- Connected state -->
    <template v-if="connected && status">
      <dl class="pos__meta">
        <div>
          <dt>Provider</dt>
          <dd>{{ providers.find(p => p.id === status!.provider)?.label ?? status.provider }}</dd>
        </div>
        <div v-if="status.merchantName || status.merchantId">
          <dt>Merchant</dt>
          <dd>{{ status.merchantName || status.merchantId }}</dd>
        </div>
        <div v-if="status.connectedAt">
          <dt>Connected</dt>
          <dd>{{ new Date(status.connectedAt).toLocaleDateString() }}</dd>
        </div>
      </dl>

      <div class="pos__opts">
        <ToggleInput
          :model-value="status.config.autoSend"
          label="Send new orders automatically"
          @update:model-value="(v: boolean) => saveConfig({ autoSend: v })"
        />
        <ToggleInput
          :model-value="status.config.autoPrint"
          label="Print a kitchen ticket on arrival"
          @update:model-value="(v: boolean) => saveConfig({ autoPrint: v })"
        />
      </div>

      <div class="pos__actions">
        <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" :disabled="busy === 'disconnect'" @click="disconnect">
          <Unplug :size="14" /> {{ busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect' }}
        </button>
      </div>
    </template>

    <!-- Disconnected state -->
    <template v-else-if="!loading">
      <div class="pos__connect">
        <button
          v-for="p in available"
          :key="p.id"
          type="button"
          class="adm-btn adm-btn--primary"
          :disabled="!!busy"
          @click="connect(p.id)"
        >
          <component :is="busy === p.id ? Loader2 : Plug" :size="14" :class="{ 'pos__spin': busy === p.id }" />
          {{ busy === p.id ? 'Opening…' : `Connect ${p.label}` }}
        </button>
        <p v-if="!available.length" class="adm-muted">
          No POS provider is configured on the server yet.
        </p>
      </div>
      <p v-if="comingSoon.length" class="pos__soon">
        <Printer :size="12" />
        {{ comingSoon.map(p => p.label).join(' and ') }} coming soon.
      </p>
    </template>
  </section>
</template>

<style scoped>
.pos__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.pos__head .adm-muted { margin: 0.25rem 0 0; max-width: 56ch; }
.pos__badge { display: inline-flex; align-items: center; gap: 0.3rem; flex-shrink: 0; }

.pos__warn {
  display: flex; align-items: center; gap: 0.5rem;
  margin: 0.9rem 0 0;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--adm-warn, #b7791f);
  border-radius: var(--adm-radius);
  background: color-mix(in srgb, var(--adm-warn, #b7791f) 10%, transparent);
  font-size: 0.85rem;
}

.pos__meta { display: flex; flex-wrap: wrap; gap: 1.5rem; margin: 1rem 0 0; }
.pos__meta dt {
  font-family: var(--adm-font-mono);
  font-size: 0.6rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--adm-text-subtle);
}
.pos__meta dd { margin: 0.2rem 0 0; font-size: 0.9rem; }

.pos__opts { display: flex; flex-direction: column; gap: 0.5rem; margin: 1.1rem 0 0; }
.pos__actions { margin-top: 1.1rem; }
.pos__connect { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
.pos__soon {
  display: inline-flex; align-items: center; gap: 0.35rem;
  margin: 0.7rem 0 0;
  font-size: 0.78rem; color: var(--adm-text-subtle);
}
.pos__spin { animation: pos-spin 0.9s linear infinite; }
@keyframes pos-spin { to { transform: rotate(360deg); } }
</style>
