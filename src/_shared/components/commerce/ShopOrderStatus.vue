<script setup lang="ts">
/**
 * The customer's order page: thanks, what they bought, where it is going,
 * and the fulfillment tracker the owner advances from the dashboard. Linked
 * from every email, so it has to stand on its own for a cold visit too.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { contentClient, type ShopOrderDTO } from '../../platform/contentClient'
import { apiClient } from '../../platform/apiClient'
import { DEMO_MODE } from '../../platform/config'
import { useShopCart, formatMoney } from '../../platform/cartStore'
import OrderTimeline, { type TimelineStep } from './OrderTimeline.vue'

const props = withDefaults(defineProps<{
  orderId: string
  shopPath?: string
}>(), { shopPath: '/shop' })

const route = useRoute()
const router = useRouter()
const cart = useShopCart()

const order = ref<ShopOrderDTO | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirming = ref(false)

const money = (cents: number) => formatMoney(cents, order.value?.currency ?? 'USD')

const STEP_LABELS: Record<string, string> = {
  received: 'Order received',
  label_printed: 'Label printed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
}

const steps = computed<TimelineStep[]>(() => {
  const o = order.value
  if (!o) return []
  const keys = o.fulfillment === 'shipping'
    ? ['received', 'label_printed', 'shipped', 'delivered']
    : ['received', 'ready_for_pickup', 'picked_up']
  const history = o.fulfillmentHistory ?? []
  return keys.map(key => {
    const ev = history.find(h => h.status === key)
    const at = key === 'received' ? (ev?.at ?? o.createdAt) : ev?.at ?? null
    let hint: string | undefined
    if (key === 'shipped' && o.trackingNumber) hint = `${o.trackingCarrier ? o.trackingCarrier + ' ' : ''}${o.trackingNumber}`
    if (key === 'ready_for_pickup' && o.pickupInstructions) hint = o.pickupInstructions
    return { key, label: STEP_LABELS[key] ?? key, at, hint }
  })
})

const cancelled = computed(() => order.value?.status === 'cancelled')
const awaitingPayment = computed(() => !!order.value && order.value.status === 'pending' && !DEMO_MODE)
const firstName = computed(() => (order.value?.name ?? '').trim().split(/\s+/)[0] || '')
const shortId = computed(() => (order.value?.id ?? '').replace(/-/g, '').slice(-8).toUpperCase())

function placedOn(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}

async function load() {
  loading.value = true
  error.value = null
  try {
    if (route.query.status === 'success' && !DEMO_MODE) {
      // Back from the payment provider: confirm, then poll briefly in case
      // the provider's webhook has not landed yet either.
      confirming.value = true
      let o = await contentClient.shopConfirmOrder(props.orderId)
      for (let i = 0; i < 4 && o.status === 'pending'; i++) {
        await new Promise(r => setTimeout(r, 1500))
        o = await contentClient.shopConfirmOrder(props.orderId)
      }
      order.value = o
      confirming.value = false
      cart.clear()
    } else {
      order.value = await apiClient.shopGetOrder(props.orderId)
      if (route.query.placed) cart.clear()
    }
    if (route.query.status || route.query.placed) void router.replace({ query: {} })
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
    confirming.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="ap-section ap-order" aria-labelledby="ap-order-title">
    <div class="ap-container ap-order__wrap">
      <p v-if="loading" class="ap-order__hint">{{ confirming ? 'Confirming your payment…' : 'Loading your order…' }}</p>
      <div v-else-if="error || !order" class="ap-order__missing">
        <h1 id="ap-order-title">We couldn't find that order.</h1>
        <p class="ap-order__hint">{{ error || 'The link may be incomplete.' }}</p>
        <RouterLink :to="shopPath" class="ap-btn ap-btn--ghost">Back to the shop</RouterLink>
      </div>

      <template v-else>
        <header class="ap-order__head">
          <p class="ap-order__meta">Order {{ shortId }} · {{ placedOn(order.createdAt) }}</p>
          <h1 id="ap-order-title">
            <template v-if="cancelled">This order was cancelled.</template>
            <template v-else-if="awaitingPayment">Almost there{{ firstName ? ', ' + firstName : '' }}.</template>
            <template v-else>Thank you{{ firstName ? ', ' + firstName : '' }}.</template>
          </h1>
          <p class="ap-order__lede">
            <template v-if="cancelled">If you were charged, the refund is on its way back to your card.</template>
            <template v-else-if="awaitingPayment">We are waiting on the payment confirmation. This page updates on its own once it lands; your email receipt follows.</template>
            <template v-else>We emailed a receipt to <strong>{{ order.email }}</strong> and will write again at every step below.</template>
          </p>
        </header>

        <div class="ap-order__grid">
          <article class="ap-order__card">
            <h2>{{ order.fulfillment === 'shipping' ? 'Delivery' : 'Pickup' }}</h2>
            <OrderTimeline :steps="steps" :current="order.fulfillmentStatus" :cancelled="cancelled" />
            <p v-if="order.trackingNumber && !cancelled" class="ap-order__tracking">
              Tracking{{ order.trackingCarrier ? ` (${order.trackingCarrier})` : '' }}:
              <a v-if="order.trackingUrl" :href="order.trackingUrl" target="_blank" rel="noopener">{{ order.trackingNumber }}</a>
              <strong v-else>{{ order.trackingNumber }}</strong>
            </p>
            <p v-if="order.fulfillmentNote && !cancelled" class="ap-order__note">“{{ order.fulfillmentNote }}”</p>
          </article>

          <article class="ap-order__card">
            <h2>Items</h2>
            <ul class="ap-order__lines">
              <li v-for="it in order.items" :key="it.productId">
                <span>{{ it.name }} <span class="ap-order__qty">× {{ it.quantity }}</span></span>
                <span>{{ money(it.lineTotalCents) }}</span>
              </li>
            </ul>
            <dl class="ap-order__totals">
              <div><dt>Subtotal</dt><dd>{{ money(order.subtotalCents) }}</dd></div>
              <div><dt>{{ order.fulfillment === 'shipping' ? 'Shipping' : 'Pickup' }}</dt><dd>{{ order.shippingCents ? money(order.shippingCents) : 'Free' }}</dd></div>
              <div class="ap-order__grand"><dt>Total</dt><dd>{{ money(order.totalCents) }}</dd></div>
            </dl>
            <p class="ap-order__pay">
              <template v-if="cancelled">Cancelled</template>
              <template v-else-if="order.status === 'pending'">Payment pending</template>
              <template v-else>Paid</template>
            </p>
          </article>

          <article class="ap-order__card">
            <h2>{{ order.fulfillment === 'shipping' ? 'Shipping to' : 'Pickup details' }}</h2>
            <address v-if="order.fulfillment === 'shipping' && order.shippingAddress" class="ap-order__address">
              {{ order.name }}<br />
              {{ order.shippingAddress.line1 }}<br />
              <template v-if="order.shippingAddress.line2">{{ order.shippingAddress.line2 }}<br /></template>
              {{ order.shippingAddress.city }}<template v-if="order.shippingAddress.region">, {{ order.shippingAddress.region }}</template> {{ order.shippingAddress.postalCode }}<br />
              {{ order.shippingAddress.country }}
            </address>
            <p v-else class="ap-order__pickup">{{ order.pickupInstructions || 'We will email you the moment it is ready to collect.' }}</p>
            <p v-if="order.notes" class="ap-order__yournote"><span>Your note</span>{{ order.notes }}</p>
          </article>
        </div>

        <footer class="ap-order__foot">
          <RouterLink :to="shopPath" class="ap-btn ap-btn--ghost">Keep shopping</RouterLink>
          <p class="ap-order__hint">Questions about this order? Reply to your confirmation email.</p>
        </footer>
      </template>
    </div>
  </section>
</template>

<style scoped>
.ap-order__wrap { max-width: 1080px; }
.ap-order__hint { color: var(--ap-ink-muted); }
.ap-order__missing { display: grid; gap: 0.8rem; justify-items: start; }
.ap-order__missing h1 { margin: 0; }
.ap-order__head { margin-bottom: 2rem; max-width: 640px; }
.ap-order__meta { margin: 0 0 0.4rem; font-family: var(--ap-font-mono, monospace); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ap-ink-muted); }
.ap-order__head h1 { margin: 0 0 0.6rem; font-size: clamp(1.9rem, 4vw, 2.6rem); }
.ap-order__lede { margin: 0; color: var(--ap-ink-muted); line-height: 1.55; }

.ap-order__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }
.ap-order__card {
  padding: 1.4rem 1.4rem 1.5rem;
  border: 1px solid var(--ap-line); border-radius: var(--ap-radius, 10px);
  background: var(--ap-surface);
}
.ap-order__card h2 { margin: 0 0 1rem; font-size: 1.05rem; }
.ap-order__tracking { margin: 1.1rem 0 0; font-size: 0.9rem; overflow-wrap: anywhere; }
.ap-order__tracking a { color: var(--ap-primary); text-decoration: underline; text-underline-offset: 2px; }
.ap-order__note { margin: 0.9rem 0 0; padding: 0.75rem 0.9rem; border-left: 3px solid var(--ap-line); color: var(--ap-ink-muted); font-style: italic; font-size: 0.92rem; }

.ap-order__lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; font-size: 0.93rem; }
.ap-order__lines li { display: flex; justify-content: space-between; gap: 1rem; }
.ap-order__qty { color: var(--ap-ink-muted); }
.ap-order__totals { margin: 1rem 0 0; padding-top: 0.9rem; border-top: 1px solid var(--ap-line); display: grid; gap: 0.35rem; font-size: 0.9rem; }
.ap-order__totals div { display: flex; justify-content: space-between; gap: 1rem; }
.ap-order__totals dt { color: var(--ap-ink-muted); }
.ap-order__totals dd { margin: 0; }
.ap-order__grand { padding-top: 0.45rem; border-top: 1px solid var(--ap-line); font-size: 1rem; }
.ap-order__grand dt { color: var(--ap-ink); font-weight: 600; }
.ap-order__grand dd { font-weight: 700; }
.ap-order__pay { margin: 0.8rem 0 0; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ap-ink-muted); }
.ap-order__address { font-style: normal; line-height: 1.55; font-size: 0.93rem; }
.ap-order__pickup { margin: 0; color: var(--ap-ink-muted); line-height: 1.5; font-size: 0.93rem; }
.ap-order__yournote { margin: 1rem 0 0; font-size: 0.9rem; color: var(--ap-ink-muted); }
.ap-order__yournote span { display: block; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.2rem; }
.ap-order__foot { margin-top: 2rem; display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
.ap-order__foot p { margin: 0; font-size: 0.88rem; }
</style>
