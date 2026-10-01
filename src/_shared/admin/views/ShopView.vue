<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { contentClient, type ShopConfigDTO, type ShopProductDTO, type ShopProductInput, type ShopOrderDTO } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import MoneyInput from '../components/inputs/MoneyInput.vue'
import NumberInput from '../components/inputs/NumberInput.vue'
import ToggleInput from '../components/inputs/ToggleInput.vue'
import SelectInput from '../components/inputs/SelectInput.vue'
import ImageInput from '../components/inputs/ImageInput.vue'

const CURRENCY_OPTIONS = ['USD', 'CAD', 'EUR', 'GBP', 'MXN'].map(c => ({ value: c, label: c }))

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)

const loading = ref(false)
const error = ref<string | null>(null)
const saving = ref(false)
const savedAt = ref<string | null>(null)

const resolved = ref<Required<ShopConfigDTO> | null>(null)
const products = ref<ShopProductDTO[]>([])
const orders = ref<ShopOrderDTO[]>([])
const addOnEnabled = ref(false)

const newProduct = ref<ShopProductInput>({
  sku: '', name: '', description: '', priceCents: 0, currency: 'USD', imageUrl: '', inventory: -1, active: true, sortOrder: 0,
})

async function load() {
  if (!siteId.value) return
  loading.value = true
  error.value = null
  try {
    const [cfg, prods, ords, sites] = await Promise.all([
      contentClient.getShopConfig(siteId.value),
      contentClient.shopListSiteProducts(siteId.value).catch(() => [] as ShopProductDTO[]),
      contentClient.shopListOrders(siteId.value).catch(() => [] as ShopOrderDTO[]),
      contentClient.listSites(),
    ])
    resolved.value = cfg.resolved
    products.value = prods
    orders.value = ords
    addOnEnabled.value = !!sites.find(s => s.id === siteId.value)?.addOns?.includes('eshop')
    if (cfg.resolved.currency) newProduct.value.currency = cfg.resolved.currency
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/* ── Products link ──
   The shop catalog IS the site's Products content: the cards on the shop page
   feed this list automatically, so owners don't retype what they already
   wrote. Idempotent — matches on name, so re-running only adds what's new.
   Prices/inventory are refined here. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const syncing = ref(false)
const syncStatus = ref<string | null>(null)

async function syncFromContent() {
  if (!siteId.value || syncing.value) return
  syncing.value = true
  syncStatus.value = null
  try {
    const d = await contentClient.getDraft(siteId.value)
    // Current content stores these under `featured`; older vault drafts used
    // `products: { items: [...] }`.
    const payload = d.payload as {
      featured?: Array<{ name?: string; price?: string; blurb?: string; image?: string }>
      products?: { items?: Array<{ name?: string; price?: string; description?: string; photo?: string }> }
    }
    const list: Array<{ name?: string; price?: string; blurb?: string; image?: string }> =
      payload.featured?.length
        ? payload.featured
        : (payload.products?.items ?? []).map(p => ({
            name: p.name, price: p.price, blurb: p.description, image: p.photo,
          }))

    const existing = new Set(products.value.map(p => p.name.toLowerCase()))
    let added = 0
    for (const item of list) {
      const name = (item.name ?? '').trim()
      if (!name || existing.has(name.toLowerCase())) continue
      const priceCents = Math.round((parseFloat(String(item.price ?? '').replace(/[^0-9.]/g, '')) || 0) * 100)
      const created = await contentClient.shopCreateProduct(siteId.value, {
        sku: (slugify(name) || `product-${added + 1}`).slice(0, 40),
        name,
        description: item.blurb?.trim() || undefined,
        priceCents,
        currency: resolved.value?.currency || 'USD',
        imageUrl: item.image?.trim() || undefined,
        inventory: -1,
        active: true,
        sortOrder: products.value.length + added,
      })
      products.value.push(created)
      existing.add(name.toLowerCase())
      added++
    }
    syncStatus.value = added
      ? `Imported ${added} product${added === 1 ? '' : 's'} from your Products page.`
      : 'Everything on your Products page is already sellable here.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    syncing.value = false
  }
}

async function addProduct() {
  if (!siteId.value) return
  const p = newProduct.value
  if (!p.sku.trim() || !p.name.trim()) return
  try {
    const created = await contentClient.shopCreateProduct(siteId.value, {
      sku: p.sku.trim(),
      name: p.name.trim(),
      description: p.description?.trim() || undefined,
      priceCents: Math.max(0, Math.round(p.priceCents)),
      currency: p.currency || resolved.value?.currency || 'USD',
      imageUrl: p.imageUrl?.trim() || undefined,
      inventory: p.inventory ?? -1,
      active: p.active ?? true,
      sortOrder: p.sortOrder ?? 0,
    })
    products.value.push(created)
    newProduct.value = { sku: '', name: '', description: '', priceCents: 0, currency: resolved.value?.currency || 'USD', imageUrl: '', inventory: -1, active: true, sortOrder: 0 }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function saveProduct(p: ShopProductDTO) {
  if (!siteId.value) return
  try {
    const updated = await contentClient.shopUpdateProduct(siteId.value, p.id, {
      sku: p.sku.trim(),
      name: p.name.trim(),
      description: p.description?.trim() || undefined,
      priceCents: Math.max(0, Math.round(p.priceCents)),
      currency: p.currency,
      imageUrl: p.imageUrl?.trim() || undefined,
      inventory: p.inventory,
      active: p.active,
      sortOrder: p.sortOrder,
    })
    const i = products.value.findIndex(x => x.id === updated.id)
    if (i >= 0) products.value[i] = updated
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function deleteProduct(p: ShopProductDTO) {
  if (!siteId.value) return
  if (!confirm(`Delete product "${p.name}"?`)) return
  try {
    await contentClient.shopDeleteProduct(siteId.value, p.id)
    products.value = products.value.filter(x => x.id !== p.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function saveConfig() {
  if (!siteId.value || !resolved.value) return
  saving.value = true
  error.value = null
  try {
    const payload: ShopConfigDTO = {
      currency: resolved.value.currency,
      fulfillment: resolved.value.fulfillment,
      pickupInstructions: resolved.value.pickupInstructions,
      shippingFlatCents: Math.max(0, Math.round(resolved.value.shippingFlatCents)),
      notifyEmail: resolved.value.notifyEmail || undefined,
    }
    const next = await contentClient.saveShopConfig(siteId.value, payload)
    resolved.value = next.resolved
    savedAt.value = new Date().toISOString()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

async function toggleAddOn() {
  if (!siteId.value) return
  try {
    const res = await contentClient.setSiteAddOn(siteId.value, 'eshop', !addOnEnabled.value)
    addOnEnabled.value = res.addOns.includes('eshop')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function setOrderStatus(o: ShopOrderDTO, status: ShopOrderDTO['status']) {
  if (!siteId.value) return
  try {
    const updated = await contentClient.shopUpdateOrder(siteId.value, o.id, status)
    const i = orders.value.findIndex(x => x.id === o.id)
    if (i >= 0) orders.value[i] = updated
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function toggleFulfillment(method: 'pickup' | 'shipping') {
  if (!resolved.value) return
  const list = resolved.value.fulfillment.includes(method)
    ? resolved.value.fulfillment.filter(f => f !== method)
    : [...resolved.value.fulfillment, method]
  resolved.value.fulfillment = list.length ? list : ['pickup']
}

function money(cents?: number, currency?: string) {
  if (cents == null) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || resolved.value?.currency || 'USD' }).format(cents / 100)
}

/* Products -> Shop is a live link: after load, silently pull in anything on
   the Products page that isn't sellable yet. The button in the catalog header
   stays as a manual re-sync. */
async function loadAndSync() {
  await load()
  await syncFromContent()
}
onMounted(loadAndSync)
watch(siteId, loadAndSync)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow adm-eyebrow--premium">★ Premium add-on</span>
        <h1 class="adm-title">Shop</h1>
        <p class="adm-subtitle">
          Sell products from your site. Manage your catalog, fulfillment, and orders.
        </p>
      </div>
      <div class="head-actions">
        <button
          type="button"
          class="adm-btn"
          :class="addOnEnabled ? 'adm-btn--ghost' : 'adm-btn--primary'"
          @click="toggleAddOn"
        >{{ addOnEnabled ? 'Disable add-on' : 'Enable shop' }}</button>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <p class="adm-empty__body">Select a site from the header to manage its shop.</p>
    </div>

    <template v-else>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
      <p v-if="loading" class="adm-muted">Loading…</p>

      <div v-if="!addOnEnabled" class="adm-card adm-card--soft addon-gate">
        <p>
          The Shop add-on is currently <strong>off</strong> for this site. Enable it above
          to start selling.
        </p>
      </div>

      <section class="adm-card">
        <div class="shop-cat-head">
          <div>
            <h2 class="adm-h2">Products</h2>
            <p class="adm-muted">Each product appears as a card on your shop page.</p>
          </div>
          <button type="button" class="adm-btn adm-btn--sm" :disabled="syncing" @click="syncFromContent">
            {{ syncing ? 'Importing…' : 'Import from your Products page' }}
          </button>
        </div>
        <p v-if="syncStatus" class="adm-muted adm-mb">{{ syncStatus }}</p>

        <ul v-if="products.length" class="rm-list">
          <li v-for="p in products" :key="p.id" class="rm-row">
            <input class="adm-input rm-row__sku" v-model="p.sku" placeholder="SKU" />
            <input class="adm-input rm-row__name" v-model="p.name" placeholder="Name" />
            <input class="adm-input rm-row__desc" v-model="p.description" placeholder="Description" />
            <div class="rm-row__price"><MoneyInput v-model="p.priceCents" :currency="resolved?.currency || 'USD'" /></div>
            <div class="rm-row__inv"><NumberInput v-model="p.inventory" :min="-1" unit="stock" /></div>
            <div class="rm-row__img"><ImageInput :model-value="p.imageUrl ?? ''" :site-id="siteId" aspect="1 / 1" @update:model-value="(v: string) => p.imageUrl = v" /></div>
            <div class="rm-row__active"><ToggleInput v-model="p.active" label="Live" /></div>
            <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" @click="saveProduct(p)">Save</button>
            <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="deleteProduct(p)">×</button>
          </li>
        </ul>
        <p v-else class="adm-muted adm-mb">No products yet.</p>

        <div class="rm-row rm-row--new">
          <input class="adm-input rm-row__sku" v-model="newProduct.sku" placeholder="SKU" />
          <input class="adm-input rm-row__name" v-model="newProduct.name" placeholder="Name" />
          <input class="adm-input rm-row__desc" v-model="newProduct.description" placeholder="Description" />
          <div class="rm-row__price"><MoneyInput v-model="newProduct.priceCents" :currency="resolved?.currency || 'USD'" /></div>
          <div class="rm-row__inv"><NumberInput v-model="newProduct.inventory" :min="-1" unit="stock" /></div>
          <div class="rm-row__img"><ImageInput :model-value="newProduct.imageUrl ?? ''" :site-id="siteId" aspect="1 / 1" @update:model-value="(v: string) => newProduct.imageUrl = v" /></div>
          <div class="rm-row__active"><ToggleInput v-model="newProduct.active" label="Live" /></div>
          <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" @click="addProduct">Add</button>
          <span />
        </div>
        <p class="adm-muted" style="font-size: 0.75rem; margin-top: 0.5rem;">
          Inventory <code>-1</code> = unlimited.
        </p>
      </section>

      <section v-if="resolved" class="adm-card">
        <h2 class="adm-h2">Shop settings</h2>
        <div class="meta-grid">
          <SelectInput v-model="resolved.currency" label="Currency" :options="CURRENCY_OPTIONS" />
          <MoneyInput v-model="resolved.shippingFlatCents" label="Shipping flat rate" :currency="resolved.currency || 'USD'" />
          <div class="adm-field adm-field--full">
            <span>Fulfillment offered</span>
            <div class="fulfill-toggles">
              <ToggleInput :model-value="resolved.fulfillment.includes('pickup')" label="Local pickup" @update:model-value="() => toggleFulfillment('pickup')" />
              <ToggleInput :model-value="resolved.fulfillment.includes('shipping')" label="Ship to customer" @update:model-value="() => toggleFulfillment('shipping')" />
            </div>
          </div>
          <label class="adm-field adm-field--full">
            <span>Pickup instructions (shown after pickup orders)</span>
            <textarea class="adm-input" rows="2" v-model="resolved.pickupInstructions" />
          </label>
          <label class="adm-field adm-field--full">
            <span>Notification email (optional — defaults to your account email)</span>
            <input class="adm-input" type="email" v-model="resolved.notifyEmail" />
          </label>
        </div>
      </section>

      <div class="save-bar">
        <button type="button" class="adm-btn adm-btn--primary" :disabled="saving" @click="saveConfig">
          {{ saving ? 'Saving…' : 'Save settings' }}
        </button>
        <span v-if="savedAt" class="adm-muted">Saved {{ new Date(savedAt).toLocaleTimeString() }}</span>
      </div>

      <section class="adm-card">
        <h2 class="adm-h2">Orders</h2>
        <p v-if="!orders.length" class="adm-muted">No orders yet.</p>
        <table v-else class="adm-table">
          <thead>
            <tr><th>Placed</th><th>Customer</th><th>Items</th><th>Fulfillment</th><th>Total</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id">
              <td>{{ new Date(o.createdAt).toLocaleString() }}</td>
              <td>
                {{ o.name }}<br />
                <small><a :href="`mailto:${o.email}`">{{ o.email }}</a><template v-if="o.phone"> · {{ o.phone }}</template></small>
              </td>
              <td>
                <div v-for="it in o.items" :key="it.productId">{{ it.name }} × {{ it.quantity }}</div>
              </td>
              <td>{{ o.fulfillment }}</td>
              <td>{{ money(o.totalCents, o.currency) }}</td>
              <td>
                <span class="adm-badge" :class="o.status === 'cancelled' ? 'adm-badge--warn' : (o.status === 'fulfilled' ? 'adm-badge--ok' : 'adm-badge--info')">{{ o.status }}</span>
              </td>
              <td class="order-actions">
                <button v-if="o.status === 'pending'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="setOrderStatus(o, 'paid')">Mark paid</button>
                <button v-if="o.status === 'paid'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="setOrderStatus(o, 'fulfilled')">Fulfill</button>
                <button v-if="o.status !== 'cancelled' && o.status !== 'fulfilled'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="setOrderStatus(o, 'cancelled')">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </section>
</template>

<style scoped>
.head-actions { margin-left: auto; }
.adm-h2 { margin: 0 0 0.4rem; font-size: 1.05rem; }
.adm-mb { margin-bottom: 0.75rem; }
.addon-gate { padding: 1rem 1.1rem; margin-bottom: 1rem; }
.shop-cat-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem;
}
.shop-cat-head .adm-muted { margin: 0; }

.rm-list { list-style: none; padding: 0; margin: 0 0 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
.rm-row { display: grid; grid-template-columns: 7rem 10rem 1fr 6rem 5rem 1.3fr 3rem auto auto; gap: 0.3rem; align-items: center; }
.rm-row--new { padding-top: 0.5rem; border-top: 1px dashed var(--adm-border); }
.rm-row__active { display: flex; align-items: center; gap: 0.25rem; font-size: 0.78rem; color: var(--adm-text-subtle); }

.meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
.adm-field { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.8rem; color: var(--adm-text-subtle); }
.adm-field--full { grid-column: 1 / -1; }
.fulfill-toggles { display: flex; gap: 1.25rem; padding-top: 0.25rem; font-size: 0.9rem; color: var(--adm-text); }

.save-bar { display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0 1.25rem; }

.adm-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.adm-table th, .adm-table td { text-align: left; padding: 0.55rem 0.5rem; border-bottom: 1px solid var(--adm-border); vertical-align: top; }
.adm-table th { color: var(--adm-text-subtle); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
.order-actions { display: flex; flex-direction: column; gap: 0.25rem; }
</style>
