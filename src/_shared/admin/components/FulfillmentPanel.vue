<script setup lang="ts">
/**
 * Per-order fulfillment tracker for the shop dashboard. One primary action
 * (the next step), tracking fields when the order ships, an optional note, and
 * an "email the customer" switch that is on by default: every step sends.
 */
import { computed, reactive, ref, watch } from 'vue'
import { contentClient, type ShopOrderDTO, type ShopFulfillmentStatus } from '../../platform/contentClient'

const props = defineProps<{ order: ShopOrderDTO; siteId: string }>()
const emit = defineEmits<{ updated: [order: ShopOrderDTO] }>()

interface Step { key: ShopFulfillmentStatus; label: string; action: string }
const STEPS: Record<'shipping' | 'pickup', Step[]> = {
  shipping: [
    { key: 'received', label: 'Received', action: 'Mark received' },
    { key: 'label_printed', label: 'Label printed', action: 'Label printed' },
    { key: 'shipped', label: 'Shipped', action: 'Mark shipped' },
    { key: 'delivered', label: 'Delivered', action: 'Mark delivered' },
  ],
  pickup: [
    { key: 'received', label: 'Received', action: 'Mark received' },
    { key: 'ready_for_pickup', label: 'Ready for pickup', action: 'Ready for pickup' },
    { key: 'picked_up', label: 'Picked up', action: 'Picked up' },
  ],
}
const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other']

const steps = computed(() => STEPS[props.order.fulfillment])
const currentIndex = computed(() => Math.max(0, steps.value.findIndex(s => s.key === props.order.fulfillmentStatus)))
const next = computed<Step | null>(() => steps.value[currentIndex.value + 1] ?? null)
const closed = computed(() => props.order.status === 'cancelled')
const needsTracking = computed(() => props.order.fulfillment === 'shipping' && next.value?.key === 'shipped')
const showTracking = computed(() => props.order.fulfillment === 'shipping' && (needsTracking.value || !!props.order.trackingNumber || props.order.fulfillmentStatus === 'label_printed'))

const form = reactive({
  trackingCarrier: props.order.trackingCarrier ?? '',
  trackingNumber: props.order.trackingNumber ?? '',
  trackingUrl: props.order.trackingUrl ?? '',
  note: '',
  notify: true,
})
watch(() => props.order, o => {
  form.trackingCarrier = o.trackingCarrier ?? ''
  form.trackingNumber = o.trackingNumber ?? ''
  form.trackingUrl = o.trackingUrl ?? ''
})

const trackingDirty = computed(() =>
  form.trackingCarrier !== (props.order.trackingCarrier ?? '')
  || form.trackingNumber !== (props.order.trackingNumber ?? '')
  || form.trackingUrl !== (props.order.trackingUrl ?? ''))

const busy = ref(false)
const error = ref<string | null>(null)

function reachedAt(key: ShopFulfillmentStatus): string {
  const ev = (props.order.fulfillmentHistory ?? []).find(h => h.status === key)
  const iso = ev?.at ?? (key === 'received' ? props.order.createdAt : null)
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

async function send(status: ShopFulfillmentStatus, notify = form.notify) {
  busy.value = true
  error.value = null
  try {
    const updated = await contentClient.shopUpdateFulfillment(props.siteId, props.order.id, {
      status,
      trackingNumber: form.trackingNumber.trim() || undefined,
      trackingCarrier: form.trackingCarrier || undefined,
      trackingUrl: form.trackingUrl.trim() || undefined,
      note: form.note.trim() || undefined,
      notify,
    })
    form.note = ''
    emit('updated', updated)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

function advance() { if (next.value) void send(next.value.key) }
/** Tracking edits without moving the step; the customer is only emailed if asked. */
function saveTracking() { void send(props.order.fulfillmentStatus, form.notify && !!form.note.trim()) }

async function setStatus(status: ShopOrderDTO['status']) {
  busy.value = true
  error.value = null
  try {
    emit('updated', await contentClient.shopUpdateOrder(props.siteId, props.order.id, status))
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

function cancelOrder() {
  if (!window.confirm('Cancel this order? The customer will be emailed. Refunds are issued from your payment provider.')) return
  void setStatus('cancelled')
}
</script>

<template>
  <div class="ff" :class="{ 'is-closed': closed }">
    <ol class="ff__steps" aria-label="Fulfillment progress">
      <li
        v-for="(s, i) in steps" :key="s.key"
        class="ff__step"
        :class="{ 'is-done': !closed && i < currentIndex, 'is-current': !closed && i === currentIndex }"
      >
        <span class="ff__dot" aria-hidden="true" />
        <span class="ff__label">{{ s.label }}</span>
        <small v-if="!closed && i <= currentIndex && reachedAt(s.key)" class="ff__at">{{ reachedAt(s.key) }}</small>
      </li>
    </ol>

    <p v-if="closed" class="ff__hint">Cancelled. Nothing further to do here.</p>

    <template v-else>
      <div v-if="showTracking" class="ff__tracking">
        <select v-model="form.trackingCarrier" class="ff__input" aria-label="Carrier">
          <option value="">Carrier</option>
          <option v-for="c in CARRIERS" :key="c" :value="c">{{ c }}</option>
        </select>
        <input v-model="form.trackingNumber" class="ff__input" placeholder="Tracking number" maxlength="120" />
        <input v-model="form.trackingUrl" class="ff__input ff__input--url" placeholder="Tracking link (optional; filled in for USPS, UPS, FedEx, DHL)" maxlength="1000" />
      </div>

      <input v-model="form.note" class="ff__input ff__note" placeholder="Note to the customer with this step (optional)" maxlength="1000" />

      <div class="ff__actions">
        <button v-if="order.status === 'pending'" type="button" class="adm-btn adm-btn--sm" :disabled="busy" @click="setStatus('paid')">Mark paid</button>
        <button
          v-if="next"
          type="button"
          class="adm-btn adm-btn--primary adm-btn--sm"
          :disabled="busy || (needsTracking && !form.trackingNumber.trim())"
          @click="advance"
        >{{ busy ? 'Saving…' : next.action }}</button>
        <span v-else class="adm-badge adm-badge--ok">Complete</span>
        <button v-if="trackingDirty && !needsTracking" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" :disabled="busy" @click="saveTracking">Save tracking</button>
        <label class="ff__notify"><input v-model="form.notify" type="checkbox" /> Email the customer</label>
        <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm ff__cancel" :disabled="busy" @click="cancelOrder">Cancel order</button>
      </div>

      <p v-if="needsTracking && !form.trackingNumber.trim()" class="ff__hint">Add the tracking number to mark it shipped. The customer gets the link in their email.</p>
      <p v-if="order.trackingNumber && order.trackingUrl" class="ff__hint">
        Tracking: <a :href="order.trackingUrl" target="_blank" rel="noopener">{{ order.trackingCarrier ? order.trackingCarrier + ' ' : '' }}{{ order.trackingNumber }}</a>
      </p>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
    </template>
  </div>
</template>

<style scoped>
.ff { display: grid; gap: 0.7rem; padding-top: 0.85rem; border-top: 1px dashed var(--adm-border); }
.ff__steps { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem 1.1rem; }
.ff__step { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--adm-text-muted); }
.ff__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1.5px solid var(--adm-border); background: transparent; }
.ff__step.is-done .ff__dot { background: var(--adm-success); border-color: var(--adm-success); }
.ff__step.is-current .ff__dot { border-color: var(--adm-accent); box-shadow: inset 0 0 0 2px var(--adm-accent); }
.ff__step.is-done .ff__label, .ff__step.is-current .ff__label { color: var(--adm-text); }
.ff__step.is-current .ff__label { font-weight: 600; }
.ff__at { color: var(--adm-text-muted); font-size: 0.72rem; }
.ff__tracking { display: grid; grid-template-columns: 7.5rem minmax(10rem, 1fr); gap: 0.4rem; }
.ff__input {
  padding: 0.4rem 0.55rem; font: inherit; font-size: 0.85rem;
  border: 1px solid var(--adm-border); border-radius: var(--adm-radius-sm, 8px);
  background: var(--adm-surface-2); color: var(--adm-text);
}
.ff__input--url { grid-column: 1 / -1; }
.ff__note { width: 100%; box-sizing: border-box; }
.ff__actions { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
.ff__notify { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--adm-text-muted); margin-left: 0.25rem; }
.ff__cancel { margin-left: auto; color: var(--adm-danger); }
.ff__hint { margin: 0; font-size: 0.8rem; color: var(--adm-text-muted); }
.ff__hint a { color: var(--adm-accent-deep); text-decoration: underline; text-underline-offset: 2px; }
.ff.is-closed .ff__steps { opacity: 0.55; }
</style>
