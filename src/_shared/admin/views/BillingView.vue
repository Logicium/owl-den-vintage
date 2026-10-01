<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { contentClient } from '../../platform/contentClient'

type Order = Awaited<ReturnType<typeof contentClient.listOrders>>[number]
type BillingInfo = Awaited<ReturnType<typeof contentClient.getOrderBillingStatus>>

const orders = ref<Order[]>([])
const error = ref<string | null>(null)
// Diagnostics keyed by order.id (works whether or not a siteId exists yet).
const billing = ref<Record<string, BillingInfo | null>>({})
const billingLoading = ref<Record<string, boolean>>({})
const billingMsg = ref<Record<string, string>>({})
const expanded = ref<string | null>(null)
const resolving = ref<Record<string, boolean>>({})

async function load() {
  error.value = null
  try { orders.value = await contentClient.listOrders() }
  catch (e) { error.value = e instanceof Error ? e.message : String(e) }
}

async function checkBilling(orderId: string) {
  if (!orderId) return
  billingLoading.value[orderId] = true
  billingMsg.value[orderId] = ''
  try {
    // Prefer the site-level endpoint when a siteId exists so we get the
    // exact same diagnostics as the Sites view; fall back to the order
    // endpoint for orders that never produced a site (webhook never fired).
    const order = orders.value.find(o => o.id === orderId)
    billing.value[orderId] = order?.siteId
      ? await contentClient.getBillingStatus(order.siteId)
      : await contentClient.getOrderBillingStatus(orderId)
    expanded.value = orderId
  } catch (e) {
    billingMsg.value[orderId] = e instanceof Error ? e.message : String(e)
  } finally {
    billingLoading.value[orderId] = false
  }
}

async function resolveBilling(orderId: string) {
  resolving.value[orderId] = true
  billingMsg.value[orderId] = ''
  try {
    const order = orders.value.find(o => o.id === orderId)
    const r = order?.siteId
      ? await contentClient.resolveBilling(order.siteId)
      : await contentClient.resolveOrderBilling(orderId)
    billingMsg.value[orderId] = `Resolved → order ${r.orderStatus}. Provisioning queued.`
    await load()
    await checkBilling(orderId)
  } catch (e) {
    billingMsg.value[orderId] = e instanceof Error ? e.message : String(e)
  } finally {
    resolving.value[orderId] = false
  }
}

async function retry(id: string) {
  await contentClient.retryOrder(id)
  await load()
}

function toggleExpand(orderId: string) {
  if (expanded.value === orderId) { expanded.value = null; return }
  void checkBilling(orderId)
}

function actionLabel(o: Order) {
  if (billingLoading.value[o.id]) return 'Checking…'
  if (expanded.value === o.id) return 'Hide'
  return o.siteId ? 'Stripe status' : 'Recheck Stripe'
}

onMounted(load)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow">Account</span>
        <h1 class="adm-title">Billing</h1>
        <p class="adm-subtitle">
          Order history with live Stripe reconciliation. If an order is stuck on
          <em>pending</em> but Stripe shows it paid (webhook never landed),
          click <em>Recheck Stripe</em> on the row to resolve it manually.
          For build/deploy logs see <RouterLink to="/admin/deployments">Deployments</RouterLink>.
        </p>
      </div>
    </header>

    <p v-if="error" class="adm-msg-err">{{ error }}</p>

    <div v-if="!orders.length" class="adm-empty">
      <p class="adm-empty__body">No orders yet.</p>
    </div>
    <div v-else class="adm-card bl-card">
      <div class="bl-table-wrap">
        <table class="adm-table bl-table">
          <thead>
            <tr><th>Created</th><th>Archetype</th><th>Plan</th><th>Status</th><th>Notes</th><th /></tr>
          </thead>
          <tbody>
            <template v-for="o in orders" :key="o.id">
              <tr>
                <td class="adm-muted">{{ new Date(o.createdAt).toLocaleString() }}</td>
                <td>{{ o.archetype }}</td>
                <td>{{ o.plan }}</td>
                <td>
                  <span
                    class="adm-badge"
                    :class="{
                      'adm-badge--live': o.status === 'live',
                      'adm-badge--failed': o.status === 'failed',
                      'adm-badge--pending': o.status !== 'live' && o.status !== 'failed',
                    }"
                  >{{ o.status }}</span>
                </td>
                <td class="adm-muted">{{ o.failureReason || '' }}</td>
                <td class="bl-actions">
                  <button
                    type="button"
                    class="adm-btn adm-btn--ghost adm-btn--sm"
                    :disabled="!!billingLoading[o.id]"
                    @click="toggleExpand(o.id)"
                  >{{ actionLabel(o) }}</button>
                  <button
                    v-if="o.status === 'failed'"
                    type="button"
                    class="adm-btn adm-btn--danger adm-btn--sm"
                    @click="retry(o.id)"
                  >Retry</button>
                </td>
              </tr>
              <tr v-if="expanded === o.id" class="bl-detail-row">
                <td colspan="6">
                  <p v-if="billingMsg[o.id]" class="adm-msg">{{ billingMsg[o.id] }}</p>

                  <template v-if="billing[o.id]">
                    <dl class="bl-grid">
                      <div><dt>Order status</dt><dd>{{ billing[o.id]!.orderStatus }}</dd></div>
                      <div><dt>Stripe configured</dt><dd>{{ billing[o.id]!.stripeConfigured ? 'yes' : 'no' }}</dd></div>
                      <div v-if="billing[o.id]!.stripeSessionId">
                        <dt>Checkout session</dt>
                        <dd class="adm-mono">{{ billing[o.id]!.stripeSessionId }}</dd>
                      </div>
                      <div v-if="billing[o.id]!.session">
                        <dt>Payment status</dt>
                        <dd>{{ billing[o.id]!.session?.paymentStatus || '—' }}</dd>
                      </div>
                      <div v-if="billing[o.id]!.paymentIntent">
                        <dt>PaymentIntent</dt>
                        <dd>{{ billing[o.id]!.paymentIntent?.status || '—' }}</dd>
                      </div>
                      <div v-if="billing[o.id]!.failureReason">
                        <dt>Failure reason</dt>
                        <dd>{{ billing[o.id]!.failureReason }}</dd>
                      </div>
                    </dl>

                    <p v-if="billing[o.id]!.notes" class="adm-muted">{{ billing[o.id]!.notes }}</p>

                    <div class="bl-detail-actions">
                      <button
                        v-if="billing[o.id]!.canResolve"
                        type="button"
                        class="adm-btn adm-btn--primary adm-btn--sm"
                        :disabled="!!resolving[o.id]"
                        @click="resolveBilling(o.id)"
                      >{{ resolving[o.id] ? 'Resolving…' : 'Mark paid & provision' }}</button>
                      <button
                        type="button"
                        class="adm-btn adm-btn--ghost adm-btn--sm"
                        :disabled="!!billingLoading[o.id]"
                        @click="checkBilling(o.id)"
                      >Re-check</button>
                    </div>

                    <details v-if="billing[o.id]!.webhookEvents?.length" class="bl-events">
                      <summary>Recent webhook events ({{ billing[o.id]!.webhookEvents!.length }})</summary>
                      <ul>
                        <li v-for="ev in billing[o.id]!.webhookEvents!" :key="ev.id">
                          <span class="adm-mono">{{ ev.type }}</span>
                          <span class="adm-muted"> · {{ new Date(ev.created * 1000).toLocaleString() }}</span>
                        </li>
                      </ul>
                    </details>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bl-card { padding: 0; overflow: hidden; }
/* overflow-x:auto forces overflow-y to compute to `auto` too, so when the
   horizontal scrollbar appears it opens a tiny vertical scroll range that
   traps the wheel over the table ("won't scroll past" bug). Pinning
   overflow-y:hidden keeps horizontal scrolling without the vertical trap;
   the wrap has no fixed height so nothing is ever clipped. */
.bl-table-wrap { overflow-x: auto; overflow-y: hidden; }
.bl-table { min-width: 720px; }
.bl-actions { display: flex; gap: 0.4rem; justify-content: flex-end; }
.bl-detail-row > td { background: var(--adm-surface-3); padding: 1rem 1.25rem; }
.bl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.6rem 1.25rem; margin: 0 0 0.75rem; }
.bl-grid dt { color: var(--adm-text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
.bl-grid dd { margin: 0.1rem 0 0; font-size: 0.85rem; word-break: break-all; }
.adm-mono { font-family: var(--adm-font-mono); font-size: 0.8rem; }
.bl-detail-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.bl-events { margin-top: 0.75rem; font-size: 0.82rem; }
.bl-events summary { cursor: pointer; color: var(--adm-text-muted); }
.bl-events ul { margin: 0.4rem 0 0; padding-left: 1rem; }
</style>
