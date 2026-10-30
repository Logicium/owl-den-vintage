<script setup lang="ts">
/**
 * Meal ordering checkout: contact, pickup or delivery (when the kitchen
 * offers it), the time, the order with per-dish notes, then payment (or
 * straight to the order page for pay-at-pickup).
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { contentClient, type DeliveryAddressDTO, type MenuItemDTO } from '../../platform/contentClient'
import { apiClient } from '../../platform/apiClient'
import { PLATFORM_SLUG, DEMO_MODE } from '../../platform/config'
import { useMealCart, formatMoney } from '../../platform/cartStore'
import PickupTimePicker from './PickupTimePicker.vue'

type Fulfillment = 'pickup' | 'delivery'

const props = withDefaults(defineProps<{
  menuPath?: string
  siteSlug?: string
  title?: string
}>(), { menuPath: '/menu', title: 'Checkout' })

const route = useRoute()
const router = useRouter()
const cart = useMealCart()

const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

const loading = ref(true)
const error = ref<string | null>(null)
const items = ref<MenuItemDTO[]>([])
const currency = ref('USD')
const timezone = ref('America/Denver')
const slots = ref<string[]>([])
const notice = ref<string | null>(null)

/* Handover options come from the kitchen's settings; older services send
   none, which reads as pickup only. */
const fulfillmentOptions = ref<Fulfillment[]>(['pickup'])
const deliveryFeeCents = ref(0)
const deliveryMinimumCents = ref(0)
const deliveryArea = ref('')

const form = reactive({
  name: '', email: '', phone: '', notes: '', pickupAt: '',
  fulfillment: 'pickup' as Fulfillment,
  delivery: { line1: '', line2: '', city: '', region: '', postalCode: '' } as DeliveryAddressDTO,
})
const submitting = ref(false)
const submitError = ref<string | null>(null)

const money = (cents: number) => formatMoney(cents, currency.value)

const lines = computed(() => cart.lines
  .map(l => ({ line: l, item: items.value.find(i => i.id === l.menuItemId) }))
  .filter((x): x is { line: typeof x.line; item: MenuItemDTO } => !!x.item))
const subtotalCents = computed(() => lines.value.reduce((s, x) => s + x.item.priceCents * x.line.quantity, 0))
const isDelivery = computed(() => form.fulfillment === 'delivery')
const feeCents = computed(() => isDelivery.value ? deliveryFeeCents.value : 0)
const totalCents = computed(() => subtotalCents.value + feeCents.value)
const belowMinimum = computed(() => isDelivery.value && deliveryMinimumCents.value > 0 && subtotalCents.value < deliveryMinimumCents.value)
const empty = computed(() => !loading.value && lines.value.length === 0)
const canSubmit = computed(() => !submitting.value && !!form.pickupAt && !belowMinimum.value)

async function load() {
  if (!slug.value) { error.value = 'Ordering unavailable: site not configured.'; loading.value = false; return }
  loading.value = true
  error.value = null
  try {
    const [menu, slotData] = await Promise.all([apiClient.orderingMenu(slug.value), apiClient.orderingSlots(slug.value)])
    items.value = menu.items
    currency.value = menu.currency
    timezone.value = slotData.timezone
    slots.value = slotData.slots
    fulfillmentOptions.value = menu.fulfillment?.length ? menu.fulfillment : ['pickup']
    deliveryFeeCents.value = menu.deliveryFeeCents ?? 0
    deliveryMinimumCents.value = menu.deliveryMinimumCents ?? 0
    deliveryArea.value = menu.deliveryArea ?? ''
    if (!fulfillmentOptions.value.includes(form.fulfillment)) form.fulfillment = fulfillmentOptions.value[0] ?? 'pickup'
    for (const l of [...cart.lines]) if (!items.value.some(i => i.id === l.menuItemId)) cart.remove(l.menuItemId)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!lines.value.length || !canSubmit.value) return
  submitting.value = true
  submitError.value = null
  try {
    const payload = {
      siteSlug: slug.value,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      pickupAt: form.pickupAt,
      fulfillment: form.fulfillment,
      deliveryAddress: isDelivery.value ? { ...form.delivery } : undefined,
      items: lines.value.map(x => ({ menuItemId: x.line.menuItemId, quantity: x.line.quantity, notes: x.line.notes })),
    }
    if (DEMO_MODE) {
      const order = await apiClient.orderingCreateOrder(payload)
      cart.clear()
      await router.push({ path: `/order/${order.id}`, query: { placed: '1' } })
      return
    }
    const res = await contentClient.orderingCheckout({ ...payload, returnPath: '/order' })
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl
      return
    }
    cart.clear()
    await router.push({ path: `/order/${res.order.id}`, query: { placed: '1' } })
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Could not place the order.'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (route.query.status === 'cancelled') {
    notice.value = 'Payment was cancelled. Your order is still here whenever you are ready.'
    void router.replace({ query: {} })
  }
  await load()
})
</script>

<template>
  <section class="ap-section ap-checkout" aria-labelledby="ap-checkout-title">
    <div class="ap-container ap-checkout__wrap">
      <header class="ap-checkout__head">
        <RouterLink :to="menuPath" class="ap-checkout__back">← Back to the menu</RouterLink>
        <h1 id="ap-checkout-title">{{ title }}</h1>
      </header>

      <p v-if="notice" class="ap-checkout__notice">{{ notice }}</p>
      <p v-if="error" class="ap-checkout__error">{{ error }}</p>
      <p v-else-if="loading" class="ap-checkout__hint">Loading your order…</p>

      <div v-else-if="empty" class="ap-checkout__empty">
        <p>Nothing in your order yet.</p>
        <RouterLink :to="menuPath" class="ap-btn">See the menu</RouterLink>
      </div>

      <div v-else class="ap-checkout__grid">
        <form id="ap-checkout-form" class="ap-checkout__form" @submit.prevent="submit">
          <fieldset class="ap-checkout__block">
            <legend>Contact</legend>
            <div class="ap-checkout__fields">
              <label class="ap-field">
                <span>Name</span>
                <input v-model="form.name" class="ap-input" required maxlength="200" autocomplete="name" />
              </label>
              <label class="ap-field">
                <span>Email</span>
                <input v-model="form.email" class="ap-input" type="email" required autocomplete="email" />
              </label>
              <label class="ap-field">
                <span>Phone <em>{{ isDelivery ? 'for the driver' : 'optional' }}</em></span>
                <input v-model="form.phone" class="ap-input" type="tel" maxlength="50" autocomplete="tel" :required="isDelivery" />
              </label>
            </div>
            <p class="ap-checkout__fine">We email you when the kitchen confirms and again when it is {{ isDelivery ? 'on its way' : 'ready' }}.</p>
          </fieldset>

          <fieldset v-if="fulfillmentOptions.length > 1" class="ap-checkout__block">
            <legend>Pickup or delivery</legend>
            <div class="ap-checkout__choices">
              <label v-for="f in fulfillmentOptions" :key="f" class="ap-checkout__choice" :class="{ 'is-active': form.fulfillment === f }">
                <input v-model="form.fulfillment" type="radio" name="fulfillment" :value="f" />
                <span class="ap-checkout__choice-name">{{ f === 'pickup' ? 'Pickup' : 'Delivery' }}</span>
                <span class="ap-checkout__choice-price">{{ f === 'pickup' ? 'Free' : (deliveryFeeCents ? money(deliveryFeeCents) : 'Free') }}</span>
              </label>
            </div>
            <p v-if="isDelivery && deliveryArea" class="ap-checkout__fine">We deliver {{ deliveryArea }}.</p>
          </fieldset>

          <fieldset v-if="isDelivery" class="ap-checkout__block">
            <legend>Delivery address</legend>
            <p v-if="fulfillmentOptions.length === 1 && deliveryArea" class="ap-checkout__fine ap-checkout__fine--top">Delivery only, {{ deliveryArea }}.</p>
            <div class="ap-checkout__fields">
              <label class="ap-field ap-field--full">
                <span>Street address</span>
                <input v-model="form.delivery.line1" class="ap-input" required maxlength="200" autocomplete="shipping address-line1" />
              </label>
              <label class="ap-field ap-field--full">
                <span>Apartment, unit, gate code <em>optional</em></span>
                <input v-model="form.delivery.line2" class="ap-input" maxlength="200" autocomplete="shipping address-line2" />
              </label>
              <label class="ap-field">
                <span>City</span>
                <input v-model="form.delivery.city" class="ap-input" required maxlength="120" autocomplete="shipping address-level2" />
              </label>
              <label class="ap-field">
                <span>Postal code</span>
                <input v-model="form.delivery.postalCode" class="ap-input" required maxlength="20" autocomplete="shipping postal-code" />
              </label>
            </div>
          </fieldset>

          <fieldset class="ap-checkout__block">
            <legend>{{ isDelivery ? 'Delivery time' : 'Pickup time' }}</legend>
            <PickupTimePicker v-model="form.pickupAt" :slots="slots" :timezone="timezone" />
          </fieldset>

          <fieldset class="ap-checkout__block">
            <legend>Anything else? <em>optional</em></legend>
            <textarea v-model="form.notes" class="ap-textarea" rows="3" maxlength="2000" :placeholder="isDelivery ? 'Allergies, where to leave it, how to find the door…' : 'Allergies, how you would like it packed…'" />
          </fieldset>
        </form>

        <aside class="ap-checkout__summary" aria-label="Order summary">
          <h2>Your order</h2>
          <ul class="ap-checkout__lines">
            <li v-for="x in lines" :key="x.item.id" class="ap-checkout__line">
              <div class="ap-checkout__line-body">
                <span class="ap-checkout__line-name">{{ x.item.name }}</span>
                <span class="ap-checkout__line-unit">{{ money(x.item.priceCents) }} each</span>
                <div class="ap-checkout__qty" aria-label="Quantity">
                  <button type="button" @click="cart.setQuantity(x.item.id, x.line.quantity - 1)" aria-label="One fewer">−</button>
                  <span>{{ x.line.quantity }}</span>
                  <button type="button" @click="cart.setQuantity(x.item.id, x.line.quantity + 1)" aria-label="One more">+</button>
                  <button type="button" class="ap-checkout__remove" @click="cart.remove(x.item.id)">Remove</button>
                </div>
                <input
                  :value="x.line.notes ?? ''"
                  class="ap-input ap-checkout__linenote"
                  placeholder="Special instructions (optional)"
                  maxlength="300"
                  @input="cart.setNotes(x.item.id, ($event.target as HTMLInputElement).value)"
                />
              </div>
              <span class="ap-checkout__line-total">{{ money(x.item.priceCents * x.line.quantity) }}</span>
            </li>
          </ul>

          <dl class="ap-checkout__totals">
            <template v-if="isDelivery">
              <div><dt>Subtotal</dt><dd>{{ money(subtotalCents) }}</dd></div>
              <div><dt>Delivery</dt><dd>{{ feeCents ? money(feeCents) : 'Free' }}</dd></div>
            </template>
            <div class="ap-checkout__grand"><dt>Total</dt><dd>{{ money(totalCents) }}</dd></div>
          </dl>

          <p v-if="belowMinimum" class="ap-checkout__error">Delivery orders start at {{ money(deliveryMinimumCents) }}. Add {{ money(deliveryMinimumCents - subtotalCents) }} more, or switch to pickup.</p>
          <p v-if="submitError" class="ap-checkout__error">{{ submitError }}</p>

          <button type="submit" form="ap-checkout-form" class="ap-btn ap-checkout__pay" :disabled="!canSubmit">
            {{ submitting ? 'One moment…' : 'Place order' }}
          </button>
          <p class="ap-checkout__fine">
            <template v-if="!form.pickupAt">Choose a {{ isDelivery ? 'delivery' : 'pickup' }} time to continue.</template>
            <template v-else-if="DEMO_MODE">Demo checkout: no payment is taken.</template>
            <template v-else-if="isDelivery">If this kitchen takes payment online you will be sent to a secure payment page next; otherwise you pay on delivery.</template>
            <template v-else>If this kitchen takes payment online you will be sent to a secure payment page next; otherwise you pay at pickup.</template>
          </p>
        </aside>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ap-checkout__wrap { max-width: 1080px; }
.ap-checkout__head { margin-bottom: 1.75rem; }
.ap-checkout__head h1 { margin: 0.4rem 0 0; font-size: clamp(1.8rem, 3.5vw, 2.4rem); }
.ap-checkout__back { font-size: 0.9rem; color: var(--ap-ink-muted); }
.ap-checkout__back:hover { color: var(--ap-ink); }
.ap-checkout__notice { padding: 0.75rem 1rem; border: 1px solid var(--ap-line); border-radius: var(--ap-radius, 8px); background: var(--ap-surface-alt); margin: 0 0 1.25rem; }
.ap-checkout__error { color: var(--ap-danger, #b00020); margin: 0.5rem 0; }
.ap-checkout__hint { color: var(--ap-ink-muted); }
.ap-checkout__empty { padding: 3rem 0; display: grid; gap: 1rem; justify-items: start; }
.ap-checkout__empty p { margin: 0; color: var(--ap-ink-muted); }

.ap-checkout__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 400px); gap: 2.5rem; align-items: start; }
@media (max-width: 860px) { .ap-checkout__grid { grid-template-columns: 1fr; } .ap-checkout__summary { order: -1; } }

.ap-checkout__form { display: grid; gap: 1.75rem; }
.ap-checkout__block { border: 0; padding: 0; margin: 0; min-width: 0; }
.ap-checkout__block legend { font-weight: 600; font-size: 1.05rem; margin-bottom: 0.9rem; padding: 0; }
.ap-checkout__block legend em, .ap-field span em { font-style: normal; font-weight: 400; color: var(--ap-ink-muted); font-size: 0.85em; margin-left: 0.3rem; }
.ap-checkout__fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem 1rem; }
.ap-checkout__fields .ap-field { margin-bottom: 0; }
.ap-field--full { grid-column: 1 / -1; }
.ap-field > span { font-size: 0.85rem; color: var(--ap-ink-muted); }
.ap-checkout__fine { margin: 0.6rem 0 0; font-size: 0.82rem; color: var(--ap-ink-muted); }
.ap-checkout__fine--top { margin: 0 0 0.8rem; }

.ap-checkout__choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.6rem; }
.ap-checkout__choice {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--ap-line); border-radius: var(--ap-radius, 8px);
  background: var(--ap-surface); cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.ap-checkout__choice:hover { border-color: var(--ap-ink); }
.ap-checkout__choice.is-active { border-color: var(--ap-ink); box-shadow: inset 0 0 0 1px var(--ap-ink); }
.ap-checkout__choice input { position: absolute; opacity: 0; width: 0; height: 0; }
.ap-checkout__choice-name { font-weight: 600; }
.ap-checkout__choice-price { color: var(--ap-ink-muted); font-size: 0.9rem; }

.ap-checkout__summary {
  position: sticky; top: 5.5rem;
  padding: 1.4rem 1.4rem 1.5rem;
  border: 1px solid var(--ap-line); border-radius: var(--ap-radius, 10px);
  background: var(--ap-surface);
}
.ap-checkout__summary h2 { margin: 0 0 1rem; font-size: 1.1rem; }
.ap-checkout__lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
.ap-checkout__line { display: grid; grid-template-columns: 1fr auto; gap: 0.8rem; align-items: start; }
.ap-checkout__line-body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.ap-checkout__line-name { font-weight: 600; font-size: 0.95rem; }
.ap-checkout__line-unit { font-size: 0.8rem; color: var(--ap-ink-muted); }
.ap-checkout__line-total { font-weight: 600; font-size: 0.95rem; white-space: nowrap; }
.ap-checkout__linenote { margin-top: 0.45rem; font-size: 0.85rem; padding: 0.4rem 0.6rem; }
.ap-checkout__qty { display: inline-flex; align-items: center; gap: 0.1rem; margin-top: 0.35rem; }
.ap-checkout__qty > span { min-width: 1.8rem; text-align: center; font-size: 0.9rem; font-weight: 600; }
.ap-checkout__qty button {
  width: 1.7rem; height: 1.7rem; border-radius: 50%;
  border: 1px solid var(--ap-line); background: var(--ap-surface); color: var(--ap-ink);
  font: inherit; line-height: 1; cursor: pointer;
}
.ap-checkout__qty button:hover { border-color: var(--ap-ink); }
.ap-checkout__qty .ap-checkout__remove { width: auto; height: auto; border: 0; border-radius: 0; margin-left: 0.5rem; padding: 0; background: none; color: var(--ap-ink-muted); font-size: 0.8rem; text-decoration: underline; text-underline-offset: 2px; }
.ap-checkout__qty .ap-checkout__remove:hover { color: var(--ap-ink); }

.ap-checkout__totals { margin: 1.25rem 0 0; padding-top: 1rem; border-top: 1px solid var(--ap-line); display: grid; gap: 0.4rem; }
.ap-checkout__totals div { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.92rem; }
.ap-checkout__totals dt { color: var(--ap-ink-muted); }
.ap-checkout__totals dd { margin: 0; }
.ap-checkout__grand { font-size: 1.05rem !important; }
.ap-checkout__grand dt { color: var(--ap-ink); font-weight: 600; }
.ap-checkout__grand dd { font-weight: 700; }
.ap-checkout__pay { width: 100%; justify-content: center; margin-top: 1.1rem; }
</style>
