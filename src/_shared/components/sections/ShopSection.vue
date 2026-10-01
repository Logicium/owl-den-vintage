<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { contentClient, type ShopProductDTO, type ShippingAddressDTO } from '../../platform/contentClient'
import { apiClient } from '../../platform/apiClient'
import { PLATFORM_SLUG, DEMO_MODE } from '../../platform/config'
import DemoBadge from '../DemoBadge.vue'

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    intro?: string
    siteSlug?: string
  }>(),
  { eyebrow: 'Shop', title: 'In the shop' },
)

const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

const loading = ref(true)
const error = ref<string | null>(null)
const products = ref<ShopProductDTO[]>([])
const currency = ref('USD')
const fulfillmentOptions = ref<Array<'pickup' | 'shipping'>>(['pickup'])
const shippingFlatCents = ref(0)

interface CartLine { productId: string; quantity: number }
const cart = ref<CartLine[]>([])
const cartOpen = ref(false)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  notes: '',
  fulfillment: 'pickup' as 'pickup' | 'shipping',
  shipping: { line1: '', line2: '', city: '', region: '', postalCode: '', country: '' } as ShippingAddressDTO,
})
const submitting = ref(false)
const submitError = ref<string | null>(null)

interface Confirmed { id: string; totalCents: number; currency: string }
const confirmed = ref<Confirmed | null>(null)

function money(cents: number, code = currency.value): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(cents / 100)
}

async function load() {
  if (!slug.value) {
    error.value = 'Shop unavailable — site not configured.'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const data = await apiClient.shopListProducts(slug.value)
    products.value = data.products
    currency.value = data.currency
    fulfillmentOptions.value = data.fulfillment
    shippingFlatCents.value = data.shippingFlatCents
    if (!fulfillmentOptions.value.includes(form.fulfillment)) {
      form.fulfillment = fulfillmentOptions.value[0] || 'pickup'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function productById(id: string) { return products.value.find(p => p.id === id) }

function add(product: ShopProductDTO) {
  const existing = cart.value.find(l => l.productId === product.id)
  if (existing) existing.quantity += 1
  else cart.value.push({ productId: product.id, quantity: 1 })
  cartOpen.value = true
}

function setQty(line: CartLine, qty: number) {
  if (qty <= 0) cart.value = cart.value.filter(l => l !== line)
  else line.quantity = qty
}

const cartCount = computed(() => cart.value.reduce((n, l) => n + l.quantity, 0))
const subtotalCents = computed(() =>
  cart.value.reduce((sum, l) => sum + ((productById(l.productId)?.priceCents ?? 0) * l.quantity), 0),
)
const shippingCents = computed(() => form.fulfillment === 'shipping' ? shippingFlatCents.value : 0)
const totalCents = computed(() => subtotalCents.value + shippingCents.value)

async function checkout() {
  if (!cart.value.length) return
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
      items: cart.value.map(l => ({ productId: l.productId, quantity: l.quantity })),
    }

    // Live sites route through Stripe Checkout (destination charge to the
    // owner). Demo mode has no backend session, so it places the order
    // directly and shows the simulated confirmation.
    if (!DEMO_MODE) {
      const res = await contentClient.shopCheckout(payload)
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl
        return
      }
      // Owner not payment-onboarded yet — order is placed, no charge.
      confirmed.value = { id: res.order.id, totalCents: res.order.totalCents, currency: res.order.currency }
    } else {
      const res = await apiClient.shopCreateOrder(payload)
      confirmed.value = { id: res.id, totalCents: res.totalCents, currency: res.currency }
    }
    cart.value = []
    cartOpen.value = false
    await load()
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Could not place order.'
  } finally {
    submitting.value = false
  }
}

function reset() {
  confirmed.value = null
  form.name = ''
  form.email = ''
  form.phone = ''
  form.notes = ''
}

/** After returning from Stripe Checkout, verify payment and show confirmation. */
async function handleCheckoutReturn() {
  if (DEMO_MODE) return
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get('order')
  const status = params.get('status')
  if (!orderId || status !== 'success') return
  try {
    const order = await contentClient.shopConfirmOrder(orderId)
    confirmed.value = { id: order.id, totalCents: order.totalCents, currency: order.currency }
  } catch { /* leave the storefront as-is if confirmation fails */ }
  // Strip the query so a refresh doesn't re-confirm.
  window.history.replaceState({}, '', window.location.pathname)
}

onMounted(async () => {
  await load()
  await handleCheckoutReturn()
})
</script>

<template>
  <section class="ap-section ap-shop" :aria-label="title">
    <div class="ap-container">
      <DemoBadge add-on="E-Shop" />
      <header class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="intro" class="ap-shop__intro">{{ intro }}</p>
      </header>

      <div v-if="confirmed" class="ap-shop__confirmation">
        <div class="ap-shop__confirmation-icon" aria-hidden="true">✓</div>
        <h3>Order placed.</h3>
        <p>Total: <strong>{{ money(confirmed.totalCents, confirmed.currency) }}</strong></p>
        <p class="ap-shop__hint">A receipt was emailed to you. We'll be in touch with next steps.</p>
        <button type="button" class="ap-btn ap-btn--ghost" @click="reset">Keep shopping</button>
      </div>

      <template v-else>
        <p v-if="error" class="ap-shop__error">{{ error }}</p>
        <p v-else-if="loading" class="ap-shop__hint">Loading products…</p>
        <p v-else-if="!products.length" class="ap-shop__hint">No products available right now.</p>

        <div v-else class="ap-shop__grid">
          <article v-for="p in products" :key="p.id" class="ap-shop__card">
            <div class="ap-shop__media">
              <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.name" />
            </div>
            <div class="ap-shop__body">
              <h3>{{ p.name }}</h3>
              <p v-if="p.description" class="ap-shop__desc">{{ p.description }}</p>
              <div class="ap-shop__row">
                <span class="ap-shop__price">{{ money(p.priceCents, p.currency) }}</span>
                <button
                  type="button"
                  class="ap-btn ap-btn--sm"
                  :disabled="p.inventory === 0"
                  @click="add(p)"
                >{{ p.inventory === 0 ? 'Sold out' : 'Add' }}</button>
              </div>
              <p v-if="p.inventory > 0 && p.inventory <= 5" class="ap-shop__stock">Only {{ p.inventory }} left</p>
            </div>
          </article>
        </div>

        <button
          v-if="cartCount > 0"
          type="button"
          class="ap-shop__cart-fab"
          @click="cartOpen = !cartOpen"
        >Cart ({{ cartCount }}) — {{ money(subtotalCents) }}</button>

        <div v-if="cartOpen && cartCount > 0" class="ap-shop__cart">
          <h3>Your cart</h3>
          <ul class="ap-shop__cart-items">
            <li v-for="line in cart" :key="line.productId">
              <span class="ap-shop__cart-name">{{ productById(line.productId)?.name }}</span>
              <input
                type="number" min="0"
                :value="line.quantity"
                @input="setQty(line, parseInt(($event.target as HTMLInputElement).value || '0', 10))"
                class="ap-shop__cart-qty"
              />
              <span class="ap-shop__cart-price">{{ money((productById(line.productId)?.priceCents ?? 0) * line.quantity) }}</span>
            </li>
          </ul>

          <form class="ap-shop__checkout" @submit.prevent="checkout">
            <div class="ap-shop__fields">
              <label class="ap-shop__field">
                <span>Name</span>
                <input v-model="form.name" required maxlength="200" />
              </label>
              <label class="ap-shop__field">
                <span>Email</span>
                <input v-model="form.email" type="email" required />
              </label>
              <label class="ap-shop__field">
                <span>Phone (optional)</span>
                <input v-model="form.phone" type="tel" maxlength="50" />
              </label>
              <label v-if="fulfillmentOptions.length > 1" class="ap-shop__field">
                <span>Fulfillment</span>
                <select v-model="form.fulfillment">
                  <option v-for="f in fulfillmentOptions" :key="f" :value="f">{{ f === 'pickup' ? 'Local pickup' : 'Ship to me' }}</option>
                </select>
              </label>
            </div>

            <template v-if="form.fulfillment === 'shipping'">
              <div class="ap-shop__fields">
                <label class="ap-shop__field">
                  <span>Address line 1</span>
                  <input v-model="form.shipping.line1" required />
                </label>
                <label class="ap-shop__field">
                  <span>Address line 2</span>
                  <input v-model="form.shipping.line2" />
                </label>
                <label class="ap-shop__field">
                  <span>City</span>
                  <input v-model="form.shipping.city" required />
                </label>
                <label class="ap-shop__field">
                  <span>State / region</span>
                  <input v-model="form.shipping.region" />
                </label>
                <label class="ap-shop__field">
                  <span>Postal code</span>
                  <input v-model="form.shipping.postalCode" required />
                </label>
                <label class="ap-shop__field">
                  <span>Country</span>
                  <input v-model="form.shipping.country" required />
                </label>
              </div>
            </template>

            <label class="ap-shop__field ap-shop__field--full">
              <span>Notes (optional)</span>
              <textarea v-model="form.notes" rows="2" maxlength="2000" />
            </label>

            <div class="ap-shop__totals">
              <div>Subtotal <strong>{{ money(subtotalCents) }}</strong></div>
              <div v-if="shippingCents">Shipping <strong>{{ money(shippingCents) }}</strong></div>
              <div class="ap-shop__total">Total <strong>{{ money(totalCents) }}</strong></div>
            </div>

            <p v-if="submitError" class="ap-shop__error">{{ submitError }}</p>

            <button type="submit" class="ap-btn" :disabled="submitting">
              {{ submitting ? 'Placing order…' : 'Place order' }}
            </button>
          </form>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.ap-shop__intro { color: var(--ap-ink-muted); }
.ap-shop__error { color: var(--ap-danger, #b00020); }
.ap-shop__hint { color: var(--ap-ink-muted); }
.ap-shop__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}
.ap-shop__card {
  background: var(--ap-surface, #fff);
  border: 1px solid var(--ap-line, #e5e5e5);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ap-shop__media {
  aspect-ratio: 4 / 3;
  background: var(--ap-mute, #f4f4f4);
  overflow: hidden;
}
.ap-shop__media img { width: 100%; height: 100%; object-fit: cover; }
.ap-shop__body { padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
.ap-shop__body h3 { margin: 0; font-size: 1.05rem; }
.ap-shop__desc { color: var(--ap-ink-muted); font-size: 0.9rem; margin: 0; }
.ap-shop__row { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.ap-shop__price { font-weight: 600; }
.ap-shop__stock { color: var(--ap-warn, #b75900); font-size: 0.85rem; margin: 0; }
.ap-shop__cart-fab {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 50;
  background: var(--ap-ink, #111);
  color: var(--ap-surface, #fff);
  padding: 0.85rem 1.25rem;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}
.ap-shop__cart {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--ap-line, #e5e5e5);
  border-radius: 8px;
  background: var(--ap-surface, #fff);
}
.ap-shop__cart h3 { margin: 0 0 1rem 0; }
.ap-shop__cart-items { list-style: none; padding: 0; margin: 0 0 1rem 0; display: flex; flex-direction: column; gap: 0.5rem; }
.ap-shop__cart-items li { display: grid; grid-template-columns: 1fr 80px 100px; gap: 0.75rem; align-items: center; }
.ap-shop__cart-qty { width: 72px; padding: 0.35rem 0.5rem; }
.ap-shop__cart-price { text-align: right; font-weight: 500; }
.ap-shop__checkout { display: flex; flex-direction: column; gap: 1rem; }
.ap-shop__fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
.ap-shop__field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
.ap-shop__field--full { grid-column: 1 / -1; }
.ap-shop__field input, .ap-shop__field select, .ap-shop__field textarea {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--ap-line, #d4d4d4);
  border-radius: 4px;
  font: inherit;
}
.ap-shop__totals { display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-end; }
.ap-shop__total { border-top: 1px solid var(--ap-line, #e5e5e5); padding-top: 0.5rem; font-size: 1.1rem; }
.ap-shop__confirmation {
  text-align: center;
  padding: 3rem 1rem;
  background: var(--ap-surface, #fff);
  border: 1px solid var(--ap-line, #e5e5e5);
  border-radius: 8px;
}
.ap-shop__confirmation-icon {
  width: 56px; height: 56px; line-height: 56px;
  border-radius: 50%;
  margin: 0 auto 1rem;
  background: var(--ap-success, #1f7a4d);
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
}
</style>
