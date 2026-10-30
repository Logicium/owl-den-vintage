<script setup lang="ts">
/**
 * The diner's order page: pickup time, what they ordered, whether it is paid,
 * and where the kitchen has it. Linked from every email.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { contentClient, type MealOrderDTO } from '../../platform/contentClient'
import { apiClient } from '../../platform/apiClient'
import { DEMO_MODE } from '../../platform/config'
import { useMealCart, formatMoney } from '../../platform/cartStore'
import OrderTimeline, { type TimelineStep } from './OrderTimeline.vue'

const props = withDefaults(defineProps<{
  orderId: string
  menuPath?: string
}>(), { menuPath: '/menu' })

const route = useRoute()
const router = useRouter()
const cart = useMealCart()

const order = ref<MealOrderDTO | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirming = ref(false)

const money = (cents: number) => formatMoney(cents, order.value?.currency ?? 'USD')

const isDelivery = computed(() => order.value?.fulfillment === 'delivery')

const steps = computed<TimelineStep[]>(() => {
  const o = order.value
  if (!o) return []
  return isDelivery.value
    ? [
      { key: 'pending', label: 'Order received', at: o.createdAt },
      { key: 'confirmed', label: 'Kitchen confirmed' },
      { key: 'ready', label: 'On its way', hint: o.deliveryInstructions || undefined },
      { key: 'completed', label: 'Delivered' },
    ]
    : [
      { key: 'pending', label: 'Order received', at: o.createdAt },
      { key: 'confirmed', label: 'Kitchen confirmed' },
      { key: 'ready', label: 'Ready for pickup', hint: o.pickupInstructions || undefined },
      { key: 'completed', label: 'Picked up' },
    ]
})

const cancelled = computed(() => order.value?.status === 'cancelled')
const awaitingPayment = computed(() => order.value?.paymentStatus === 'awaiting' && !DEMO_MODE)
const firstName = computed(() => (order.value?.name ?? '').trim().split(/\s+/)[0] || '')
const shortId = computed(() => (order.value?.id ?? '').replace(/-/g, '').slice(-8).toUpperCase())

function pickupLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: order.value?.timezone || undefined,
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

async function load() {
  loading.value = true
  error.value = null
  try {
    if (route.query.status === 'success' && !DEMO_MODE) {
      confirming.value = true
      let o = await contentClient.orderingConfirmOrder(props.orderId)
      for (let i = 0; i < 4 && o.paymentStatus === 'awaiting'; i++) {
        await new Promise(r => setTimeout(r, 1500))
        o = await contentClient.orderingConfirmOrder(props.orderId)
      }
      order.value = o
      confirming.value = false
      cart.clear()
    } else {
      order.value = await apiClient.orderingGetOrder(props.orderId)
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
        <RouterLink :to="menuPath" class="ap-btn ap-btn--ghost">Back to the menu</RouterLink>
      </div>

      <template v-else>
        <header class="ap-order__head">
          <p class="ap-order__meta">Order {{ shortId }}</p>
          <h1 id="ap-order-title">
            <template v-if="cancelled">This order was cancelled.</template>
            <template v-else-if="awaitingPayment">Almost there{{ firstName ? ', ' + firstName : '' }}.</template>
            <template v-else-if="isDelivery">Thanks{{ firstName ? ', ' + firstName : '' }}. Arriving around <span class="ap-order__time">{{ pickupLabel(order.pickupAt) }}</span>.</template>
            <template v-else>Thanks{{ firstName ? ', ' + firstName : '' }}. See you at <span class="ap-order__time">{{ pickupLabel(order.pickupAt) }}</span>.</template>
          </h1>
          <p class="ap-order__lede">
            <template v-if="cancelled">If you paid online, the refund is on its way back to your card.</template>
            <template v-else-if="awaitingPayment">We are waiting on the payment confirmation. This page updates on its own once it lands.</template>
            <template v-else>We emailed a copy to <strong>{{ order.email }}</strong> and will write again when the kitchen confirms and when it is {{ isDelivery ? 'on its way' : 'ready' }}.</template>
          </p>
        </header>

        <div class="ap-order__grid">
          <article class="ap-order__card">
            <h2>Progress</h2>
            <OrderTimeline :steps="steps" :current="order.status" :cancelled="cancelled" />
          </article>

          <article class="ap-order__card">
            <h2>Your order</h2>
            <ul class="ap-order__lines">
              <li v-for="it in order.items" :key="it.menuItemId">
                <span>
                  {{ it.name }} <span class="ap-order__qty">× {{ it.quantity }}</span>
                  <em v-if="it.notes" class="ap-order__linenote">{{ it.notes }}</em>
                </span>
                <span>{{ money(it.lineTotalCents) }}</span>
              </li>
            </ul>
            <dl class="ap-order__totals">
              <template v-if="isDelivery">
                <div><dt>Subtotal</dt><dd>{{ money(order.subtotalCents) }}</dd></div>
                <div><dt>Delivery</dt><dd>{{ order.deliveryFeeCents ? money(order.deliveryFeeCents) : 'Free' }}</dd></div>
              </template>
              <div class="ap-order__grand"><dt>Total</dt><dd>{{ money(order.totalCents) }}</dd></div>
            </dl>
            <p class="ap-order__pay">
              <template v-if="cancelled">Cancelled</template>
              <template v-else-if="order.paymentStatus === 'paid'">Paid online</template>
              <template v-else-if="order.paymentStatus === 'awaiting'">Payment pending</template>
              <template v-else-if="isDelivery">Pay on delivery</template>
              <template v-else>Pay at pickup</template>
            </p>
          </article>

          <article class="ap-order__card">
            <h2>{{ isDelivery ? 'Delivery' : 'Pickup' }}</h2>
            <p class="ap-order__when">{{ pickupLabel(order.pickupAt) }}</p>
            <address v-if="isDelivery && order.deliveryAddress" class="ap-order__address">
              {{ order.deliveryAddress.line1 }}<br />
              <template v-if="order.deliveryAddress.line2">{{ order.deliveryAddress.line2 }}<br /></template>
              {{ order.deliveryAddress.city }}<template v-if="order.deliveryAddress.region">, {{ order.deliveryAddress.region }}</template> {{ order.deliveryAddress.postalCode }}
            </address>
            <p class="ap-order__pickup">{{ isDelivery ? (order.deliveryInstructions || 'We will email you when it leaves the kitchen.') : (order.pickupInstructions || 'Come to the counter and give your name.') }}</p>
            <p v-if="order.notes" class="ap-order__yournote"><span>Your note</span>{{ order.notes }}</p>
          </article>
        </div>

        <footer class="ap-order__foot">
          <RouterLink :to="menuPath" class="ap-btn ap-btn--ghost">Order again</RouterLink>
          <p class="ap-order__hint">Need to change something? Reply to your confirmation email or call the restaurant.</p>
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
.ap-order__head { margin-bottom: 2rem; max-width: 680px; }
.ap-order__meta { margin: 0 0 0.4rem; font-family: var(--ap-font-mono, monospace); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ap-ink-muted); }
.ap-order__head h1 { margin: 0 0 0.6rem; font-size: clamp(1.7rem, 3.6vw, 2.4rem); line-height: 1.15; }
.ap-order__time { white-space: nowrap; }
.ap-order__lede { margin: 0; color: var(--ap-ink-muted); line-height: 1.55; }

.ap-order__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }
.ap-order__card { padding: 1.4rem 1.4rem 1.5rem; border: 1px solid var(--ap-line); border-radius: var(--ap-radius, 10px); background: var(--ap-surface); }
.ap-order__card h2 { margin: 0 0 1rem; font-size: 1.05rem; }
.ap-order__lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; font-size: 0.93rem; }
.ap-order__lines li { display: flex; justify-content: space-between; gap: 1rem; }
.ap-order__qty { color: var(--ap-ink-muted); }
.ap-order__linenote { display: block; font-size: 0.82rem; color: var(--ap-ink-muted); }
.ap-order__totals { margin: 1rem 0 0; padding-top: 0.9rem; border-top: 1px solid var(--ap-line); display: grid; gap: 0.35rem; font-size: 0.9rem; }
.ap-order__totals div { display: flex; justify-content: space-between; gap: 1rem; }
.ap-order__totals dt { color: var(--ap-ink-muted); }
.ap-order__totals dd { margin: 0; }
.ap-order__address { font-style: normal; line-height: 1.55; font-size: 0.93rem; margin: 0 0 0.6rem; }
.ap-order__grand { font-size: 1rem; }
.ap-order__grand dt { font-weight: 600; }
.ap-order__grand dd { font-weight: 700; }
.ap-order__pay { margin: 0.8rem 0 0; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ap-ink-muted); }
.ap-order__when { margin: 0 0 0.5rem; font-weight: 600; }
.ap-order__pickup { margin: 0; color: var(--ap-ink-muted); line-height: 1.5; font-size: 0.93rem; }
.ap-order__yournote { margin: 1rem 0 0; font-size: 0.9rem; color: var(--ap-ink-muted); }
.ap-order__yournote span { display: block; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.2rem; }
.ap-order__foot { margin-top: 2rem; display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
.ap-order__foot p { margin: 0; font-size: 0.88rem; }
</style>
