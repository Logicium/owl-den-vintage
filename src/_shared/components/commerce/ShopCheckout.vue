<script setup lang="ts">
/**
 * The shop's checkout page. Contact, delivery choice, address when shipping,
 * a note, and the order summary with editable quantities; then off to the
 * owner's payment provider (or straight to the order page when the shop takes
 * no online payment yet).
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { contentClient, type ShopProductDTO, type ShippingAddressDTO } from '../../platform/contentClient'
import { apiClient } from '../../platform/apiClient'
import { PLATFORM_SLUG, DEMO_MODE } from '../../platform/config'
import { useShopCart, formatMoney } from '../../platform/cartStore'

const props = withDefaults(defineProps<{
  shopPath?: string
  siteSlug?: string
  title?: string
}>(), { shopPath: '/shop', title: 'Checkout' })

const route = useRoute()
const router = useRouter()
const cart = useShopCart()

const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

const loading = ref(true)
const error = ref<string | null>(null)
const products = ref<ShopProductDTO[]>([])
const currency = ref('USD')
const fulfillmentOptions = ref<Array<'pickup' | 'shipping'>>(['pickup'])
const shippingFlatCents = ref(0)
const notice = ref<string | null>(null)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  notes: '',
  fulfillment: 'pickup' as 'pickup' | 'shipping',
  shipping: { line1: '', line2: '', city: '', region: '', postalCode: '', country: 'United States' } as ShippingAddressDTO,
})
const submitting = ref(false)
const submitError = ref<string | null>(null)

const money = (cents: number) => formatMoney(cents, currency.value)

/** Cart lines joined to live products; lines whose product vanished are dropped. */
const lines = computed(() => cart.lines
  .map(l => ({ line: l, product: products.value.find(p => p.id === l.productId) }))
  .filter((x): x is { line: typeof x.line; product: ShopProductDTO } => !!x.product))

const subtotalCents = computed(() => lines.value.reduce((s, x) => s + x.product.priceCents * x.line.quantity, 0))
const shippingCents = computed(() => form.fulfillment === 'shipping' ? shippingFlatCents.value : 0)
const totalCents = computed(() => subtotalCents.value + shippingCents.value)
const empty = computed(() => !loading.value && lines.value.length === 0)

async function load() {
  if (!slug.value) { error.value = 'Shop unavailable: site not configured.'; loading.value = false; return }
  loading.value = true
  error.value = null
  try {
    const data = await apiClient.shopListProducts(slug.value)
    products.value = data.products
    currency.value = data.currency
    fulfillmentOptions.value = data.fulfillment
    shippingFlatCents.value = data.shippingFlatCents
    if (!fulfillmentOptions.value.includes(form.fulfillment)) form.fulfillment = fulfillmentOptions.value[0] || 'pickup'
    // Products that disappeared since they were added
    for (const l of [...cart.lines]) if (!products.value.some(p => p.id === l.productId)) cart.remove(l.productId)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function maxFor(p: ShopProductDTO): number | undefined {
  return p.inventory >= 0 ? p.inventory : undefined
}

function bump(p: ShopProductDTO, delta: number) {
  const current = cart.lines.find(l => l.productId === p.id)?.quantity ?? 0
  const next = current + delta
  const max = maxFor(p)
  cart.setQuantity(p.id, max !== undefined ? Math.min(next, max) : next)
}

async function submit() {
  if (!lines.value.length) return
  submitting.value = true
  submitError.value = null
  try {
    const payload = {
      siteSlug: slug.value,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      fulfillment: form.fulfillment,
      shippingAddress: form.fulfillment === 'shipping' ? { ...form.shipping } : undefined,
      items: lines.value.map(x => ({ productId: x.line.productId, quantity: x.line.quantity })),
    }
    if (DEMO_MODE) {
      const order = await apiClient.shopCreateOrder(payload)
      cart.clear()
      await router.push({ path: `/order/${order.id}`, query: { placed: '1' } })
      return
    }
    const res = await contentClient.shopCheckout({ ...payload, returnPath: '/order' })
    if (res.checkoutUrl) {
      // The cart stays until the payment provider sends the buyer back paid.
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
    notice.value = 'Payment was cancelled. Your cart is still here whenever you are ready.'
    void router.replace({ query: {} })
  }
  await load()
})
</script>

<template>
  <section class="ap-section ap-checkout" aria-labelledby="ap-checkout-title">
    <div class="ap-container ap-checkout__wrap">
      <header class="ap-checkout__head">
        <RouterLink :to="shopPath" class="ap-checkout__back">← Back to the shop</RouterLink>
        <h1 id="ap-checkout-title">{{ title }}</h1>
      </header>

      <p v-if="notice" class="ap-checkout__notice">{{ notice }}</p>
      <p v-if="error" class="ap-checkout__error">{{ error }}</p>
      <p v-else-if="loading" class="ap-checkout__hint">Loading your cart…</p>

      <div v-else-if="empty" class="ap-checkout__empty">
        <p>Your cart is empty.</p>
        <RouterLink :to="shopPath" class="ap-btn">Browse the shop</RouterLink>
      </div>

      <div v-else class="ap-checkout__grid">
        <form id="ap-checkout-form" class="ap-checkout__form" @submit.prevent="submit">
          <fieldset class="ap-checkout__block">
            <legend>Contact</legend>
            <div class="ap-checkout__fields">
              <label class="ap-field">
                <span>Full name</span>
                <input v-model="form.name" class="ap-input" required maxlength="200" autocomplete="name" />
              </label>
              <label class="ap-field">
                <span>Email</span>
                <input v-model="form.email" class="ap-input" type="email" required autocomplete="email" />
              </label>
              <label class="ap-field">
                <span>Phone <em>optional</em></span>
                <input v-model="form.phone" class="ap-input" type="tel" maxlength="50" autocomplete="tel" />
              </label>
            </div>
            <p class="ap-checkout__fine">Your receipt and every update on this order go to this email.</p>
          </fieldset>

          <fieldset v-if="fulfillmentOptions.length > 1" class="ap-checkout__block">
            <legend>Delivery</legend>
            <div class="ap-checkout__choices">
              <label v-for="f in fulfillmentOptions" :key="f" class="ap-checkout__choice" :class="{ 'is-active': form.fulfillment === f }">
                <input v-model="form.fulfillment" type="radio" name="fulfillment" :value="f" />
                <span class="ap-checkout__choice-name">{{ f === 'pickup' ? 'Local pickup' : 'Ship to me' }}</span>
                <span class="ap-checkout__choice-price">{{ f === 'pickup' ? 'Free' : (shippingFlatCents ? money(shippingFlatCents) : 'Free') }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset v-if="form.fulfillment === 'shipping'" class="ap-checkout__block">
            <legend>Shipping address</legend>
            <div class="ap-checkout__fields">
              <label class="ap-field ap-field--full">
                <span>Street address</span>
                <input v-model="form.shipping.line1" class="ap-input" required maxlength="200" autocomplete="shipping address-line1" />
              </label>
              <label class="ap-field ap-field--full">
                <span>Apartment, suite <em>optional</em></span>
                <input v-model="form.shipping.line2" class="ap-input" maxlength="200" autocomplete="shipping address-line2" />
              </label>
              <label class="ap-field">
                <span>City</span>
                <input v-model="form.shipping.city" class="ap-input" required maxlength="120" autocomplete="shipping address-level2" />
              </label>
              <label class="ap-field">
                <span>State / region</span>
                <input v-model="form.shipping.region" class="ap-input" maxlength="120" autocomplete="shipping address-level1" />
              </label>
              <label class="ap-field">
                <span>Postal code</span>
                <input v-model="form.shipping.postalCode" class="ap-input" required maxlength="20" autocomplete="shipping postal-code" />
              </label>
              <label class="ap-field">
                <span>Country</span>
                <input v-model="form.shipping.country" class="ap-input" required maxlength="80" autocomplete="shipping country-name" />
              </label>
            </div>
          </fieldset>

          <fieldset class="ap-checkout__block">
            <legend>Anything we should know? <em>optional</em></legend>
            <textarea v-model="form.notes" class="ap-textarea" rows="3" maxlength="2000" placeholder="Gift note, delivery instructions, sizing…" />
          </fieldset>
        </form>

        <aside class="ap-checkout__summary" aria-label="Order summary">
          <h2>Your order</h2>
          <ul class="ap-checkout__lines">
            <li v-for="x in lines" :key="x.product.id" class="ap-checkout__line">
              <div v-if="x.product.imageUrl" class="ap-checkout__thumb"><img :src="x.product.imageUrl" :alt="x.product.name" /></div>
              <div class="ap-checkout__line-body">
                <span class="ap-checkout__line-name">{{ x.product.name }}</span>
                <span class="ap-checkout__line-unit">{{ money(x.product.priceCents) }} each</span>
                <div class="ap-checkout__qty" aria-label="Quantity">
                  <button type="button" @click="bump(x.product, -1)" aria-label="One fewer">−</button>
                  <span>{{ x.line.quantity }}</span>
                  <button type="button" :disabled="maxFor(x.product) !== undefined && x.line.quantity >= (maxFor(x.product) as number)" @click="bump(x.product, 1)" aria-label="One more">+</button>
                  <button type="button" class="ap-checkout__remove" @click="cart.remove(x.product.id)">Remove</button>
                </div>
              </div>
              <span class="ap-checkout__line-total">{{ money(x.product.priceCents * x.line.quantity) }}</span>
            </li>
          </ul>

          <dl class="ap-checkout__totals">
            <div><dt>Subtotal</dt><dd>{{ money(subtotalCents) }}</dd></div>
            <div><dt>{{ form.fulfillment === 'shipping' ? 'Shipping' : 'Pickup' }}</dt><dd>{{ shippingCents ? money(shippingCents) : 'Free' }}</dd></div>
            <div class="ap-checkout__grand"><dt>Total</dt><dd>{{ money(totalCents) }}</dd></div>
          </dl>

          <p v-if="submitError" class="ap-checkout__error">{{ submitError }}</p>

          <button type="submit" form="ap-checkout-form" class="ap-btn ap-checkout__pay" :disabled="submitting">
            {{ submitting ? 'One moment…' : (DEMO_MODE ? 'Place order' : 'Continue to payment') }}
          </button>
          <p class="ap-checkout__fine">{{ DEMO_MODE ? 'Demo checkout: no payment is taken.' : 'Payment is handled on a secure page. You will be brought back here when it is done.' }}</p>
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
.ap-checkout__lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.9rem; }
.ap-checkout__line { display: grid; grid-template-columns: auto 1fr auto; gap: 0.8rem; align-items: start; }
.ap-checkout__thumb { width: 52px; aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: var(--ap-mute, #f4f4f4); }
.ap-checkout__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ap-checkout__line-body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.ap-checkout__line-name { font-weight: 600; font-size: 0.95rem; }
.ap-checkout__line-unit { font-size: 0.8rem; color: var(--ap-ink-muted); }
.ap-checkout__line-total { font-weight: 600; font-size: 0.95rem; white-space: nowrap; }
.ap-checkout__qty { display: inline-flex; align-items: center; gap: 0.1rem; margin-top: 0.35rem; }
.ap-checkout__qty > span { min-width: 1.8rem; text-align: center; font-size: 0.9rem; font-weight: 600; }
.ap-checkout__qty button {
  width: 1.7rem; height: 1.7rem; border-radius: 50%;
  border: 1px solid var(--ap-line); background: var(--ap-surface); color: var(--ap-ink);
  font: inherit; line-height: 1; cursor: pointer;
}
.ap-checkout__qty button:hover:not(:disabled) { border-color: var(--ap-ink); }
.ap-checkout__qty button:disabled { opacity: 0.4; cursor: not-allowed; }
.ap-checkout__qty .ap-checkout__remove { width: auto; height: auto; border: 0; border-radius: 0; margin-left: 0.5rem; padding: 0; background: none; color: var(--ap-ink-muted); font-size: 0.8rem; text-decoration: underline; text-underline-offset: 2px; }
.ap-checkout__qty .ap-checkout__remove:hover { color: var(--ap-ink); }

.ap-checkout__totals { margin: 1.25rem 0 0; padding-top: 1rem; border-top: 1px solid var(--ap-line); display: grid; gap: 0.4rem; }
.ap-checkout__totals div { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.92rem; }
.ap-checkout__totals dt { color: var(--ap-ink-muted); }
.ap-checkout__totals dd { margin: 0; }
.ap-checkout__grand { padding-top: 0.5rem; margin-top: 0.2rem; border-top: 1px solid var(--ap-line); font-size: 1.05rem !important; }
.ap-checkout__grand dt { color: var(--ap-ink); font-weight: 600; }
.ap-checkout__grand dd { font-weight: 700; }
.ap-checkout__pay { width: 100%; justify-content: center; margin-top: 1.1rem; }
</style>
