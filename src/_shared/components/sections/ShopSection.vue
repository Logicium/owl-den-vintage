<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { ShopProductDTO } from '../../platform/contentClient'
import { categoryHref, categorySlug, productMatches, splitProductCategory, type CatalogCategory } from '../../platform/catalogNav'
import { apiClient } from '../../platform/apiClient'
import { PLATFORM_SLUG, DEMO_MODE } from '../../platform/config'
import { useShopCart, formatMoney } from '../../platform/cartStore'
import DemoBadge from '../DemoBadge.vue'
import CartBar from '../commerce/CartBar.vue'

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    intro?: string
    siteSlug?: string
    /** Selected category / subcategory slugs (from ?category=&sub=). */
    category?: string
    subcategory?: string
    /** The site's curated categories, so chips keep the owner's order and names. */
    categories?: CatalogCategory[]
  }>(),
  { eyebrow: 'Shop', title: 'In the shop' },
)

/* Category chips come from the products themselves ("Apparel / Hats"), kept
   in the owner's category order where the names line up, so a product filed
   under a category that has no tile still gets a chip. */
const chipCategories = computed(() => {
  const seen = new Map<string, { name: string; subs: Map<string, string> }>()
  for (const c of props.categories ?? []) {
    if (!c.name?.trim()) continue
    seen.set(categorySlug(c.name), { name: c.name, subs: new Map((c.children ?? []).map(s => [categorySlug(s.name), s.name])) })
  }
  for (const p of products.value) {
    const parts = splitProductCategory(p.category)
    if (!parts) continue
    const key = categorySlug(parts.category)
    const entry = seen.get(key) ?? { name: parts.category, subs: new Map<string, string>() }
    if (parts.sub) entry.subs.set(categorySlug(parts.sub), parts.sub)
    seen.set(key, entry)
  }
  return [...seen.entries()].map(([slug, e]) => ({ slug, name: e.name, subs: [...e.subs.entries()].map(([s, n]) => ({ slug: s, name: n })) }))
})
const activeCategory = computed(() => chipCategories.value.find(c => c.slug === props.category))
const visibleProducts = computed(() => products.value.filter(p => productMatches(p.category, props.category, props.subcategory)))

const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

const loading = ref(true)
const error = ref<string | null>(null)
const products = ref<ShopProductDTO[]>([])
const currency = ref('USD')
const fulfillmentOptions = ref<Array<'pickup' | 'shipping'>>(['pickup'])
const shippingFlatCents = ref(0)

/* The cart lives in a store shared with /checkout; this page only fills it. */
const cart = useShopCart()
const route = useRoute()
const router = useRouter()

function money(cents: number, code = currency.value): string {
  return formatMoney(cents, code)
}

async function load() {
  if (!slug.value) {
    error.value = 'Shop unavailable: site not configured.'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const data = await apiClient.shopListProducts(slug.value)
    products.value = data.products
    currency.value = data.currency
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function productById(id: string) {
  return products.value.find(p => p.id === id)
}

function quantityOf(product: ShopProductDTO): number {
  return cart.lines.find(l => l.productId === product.id)?.quantity ?? 0
}

function add(product: ShopProductDTO) {
  if (product.inventory >= 0 && quantityOf(product) >= product.inventory) return
  cart.add(product.id)
}

const cartCount = computed(() => cart.count)
const cartTotalCents = computed(() =>
  cart.lines.reduce((sum, l) => sum + ((productById(l.productId)?.priceCents ?? 0) * l.quantity), 0),
)

onMounted(async () => {
  // Links from before the order page existed come back here with
  // ?order=&status=; hand them to the page that knows what to do with them.
  const legacy = route.query.order
  if (typeof legacy === 'string' && legacy) {
    const status = typeof route.query.status === 'string' ? route.query.status : undefined
    await router.replace({ path: `/order/${legacy}`, query: status ? { status } : {} })
    return
  }
  await load()
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

      <div>
        <p v-if="error" class="ap-shop__error">{{ error }}</p>
        <p v-else-if="loading" class="ap-shop__hint">Loading products…</p>
        <p v-else-if="!products.length" class="ap-shop__hint">No products available right now.</p>

        <template v-else>
          <nav v-if="chipCategories.length" class="ap-shop__chips" aria-label="Shop categories">
            <RouterLink to="/shop" class="ap-shop__chip" :class="{ 'is-active': !category }">All</RouterLink>
            <RouterLink
              v-for="c in chipCategories" :key="c.slug"
              :to="categoryHref(c.name)"
              class="ap-shop__chip" :class="{ 'is-active': category === c.slug }"
            >{{ c.name }}</RouterLink>
          </nav>
          <nav v-if="activeCategory && activeCategory.subs.length" class="ap-shop__chips ap-shop__chips--sub" aria-label="Subcategories">
            <RouterLink :to="categoryHref(activeCategory.name)" class="ap-shop__chip" :class="{ 'is-active': !subcategory }">All {{ activeCategory.name }}</RouterLink>
            <RouterLink
              v-for="s in activeCategory.subs" :key="s.slug"
              :to="categoryHref(activeCategory.name, s.name)"
              class="ap-shop__chip" :class="{ 'is-active': subcategory === s.slug }"
            >{{ s.name }}</RouterLink>
          </nav>
          <p v-if="!visibleProducts.length" class="ap-shop__hint">Nothing in this category yet.</p>
        </template>

        <div v-if="!error && !loading && visibleProducts.length" class="ap-shop__grid">
          <article v-for="p in visibleProducts" :key="p.id" class="ap-shop__card">
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
                >{{ p.inventory === 0 ? 'Sold out' : quantityOf(p) ? 'Add another' : 'Add' }}</button>
              </div>
              <p v-if="quantityOf(p)" class="ap-shop__incart">{{ quantityOf(p) }} in your cart</p>
              <p v-else-if="p.inventory > 0 && p.inventory <= 5" class="ap-shop__stock">Only {{ p.inventory }} left</p>
            </div>
          </article>
        </div>

        <CartBar :count="cartCount" :total="money(cartTotalCents)" to="/checkout" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.ap-shop__intro { color: var(--ap-ink-muted); }
.ap-shop__error { color: var(--ap-danger, #b00020); }
.ap-shop__hint { color: var(--ap-ink-muted); }
/* Category chips: a quiet filter rail above the grid */
.ap-shop__chips { display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 1.4rem 0 0.2rem; }
.ap-shop__chips--sub { margin-top: 0.5rem; padding-left: 0.2rem; }
.ap-shop__chip {
  display: inline-flex; align-items: center;
  padding: 0.38rem 0.85rem;
  border: 1px solid var(--ap-line); border-radius: 999px;
  font-size: 0.82rem; font-weight: 600; color: var(--ap-ink);
  transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}
.ap-shop__chip:hover { border-color: var(--ap-primary); }
.ap-shop__chip.is-active { background: var(--ap-ink); color: var(--ap-surface); border-color: var(--ap-ink); }
.ap-shop__chips--sub .ap-shop__chip { font-weight: 500; font-size: 0.78rem; }
.ap-shop__chips + .ap-shop__grid, .ap-shop__chips--sub + .ap-shop__grid { margin-top: 1.2rem; }

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
.ap-shop__incart { color: var(--ap-ink-muted); font-size: 0.85rem; margin: 0; }
</style>
