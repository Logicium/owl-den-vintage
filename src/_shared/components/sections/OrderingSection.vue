<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MenuItemDTO } from '../../platform/contentClient'
import { groupByBase, type SizedEntry } from '../../platform/menuSizes'
import { apiClient } from '../../platform/apiClient'
import { PLATFORM_SLUG, DEMO_MODE } from '../../platform/config'
import { useMealCart, formatMoney } from '../../platform/cartStore'
import DemoBadge from '../DemoBadge.vue'
import CartBar from '../commerce/CartBar.vue'

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    intro?: string
    siteSlug?: string
  }>(),
  { eyebrow: 'Order', title: 'Order for pickup' },
)

const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

const loading = ref(true)
const error = ref<string | null>(null)
const items = ref<MenuItemDTO[]>([])
const categories = ref<string[]>([])
const currency = ref('USD')

/* The order lives in a store shared with /checkout, where pickup time,
   contact details and payment happen; this page only fills it. */
const cart = useMealCart()
const route = useRoute()
const router = useRouter()

function money(cents: number, code = currency.value): string {
  return formatMoney(cents, code)
}

async function load() {
  if (!slug.value) {
    error.value = 'Ordering unavailable: site not configured.'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const menu = await apiClient.orderingMenu(slug.value)
    items.value = menu.items
    categories.value = menu.categories.length ? menu.categories : ['']
    currency.value = menu.currency
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function itemById(id: string) { return items.value.find(i => i.id === id) }
function itemsInCategory(cat: string) {
  return items.value.filter(i => (i.category || '') === cat)
}
/** Kitchens model sizes as separate items ("Pepperoni 12\"", "Pepperoni 16\"");
    render those as ONE dish with a size button each. Every button still adds
    its own real menu item, so pricing, checkout and tickets are unchanged. */
function entriesInCategory(cat: string): Array<SizedEntry<MenuItemDTO>> {
  return groupByBase(itemsInCategory(cat), i => i.name)
}
function sizedDescription(e: SizedEntry<MenuItemDTO>): string | undefined {
  return e.kind === 'sized' ? e.variants.map(v => v.item.description).find(Boolean) : undefined
}

function quantityOf(item: MenuItemDTO): number {
  return cart.lines.find(l => l.menuItemId === item.id)?.quantity ?? 0
}
function add(item: MenuItemDTO) { cart.add(item.id) }

const cartCount = computed(() => cart.count)
const totalCents = computed(() =>
  cart.lines.reduce((sum, l) => sum + ((itemById(l.menuItemId)?.priceCents ?? 0) * l.quantity), 0),
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
  <section class="ap-section ap-ordering" :aria-label="title">
    <div class="ap-container">
      <DemoBadge add-on="Meal ordering" />
      <header class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="intro" class="ap-ordering__intro">{{ intro }}</p>
      </header>

      <div>
        <p v-if="error" class="ap-ordering__error">{{ error }}</p>
        <p v-else-if="loading" class="ap-ordering__hint">Loading menu…</p>
        <p v-else-if="!items.length" class="ap-ordering__hint">No items available right now.</p>

        <div v-else class="ap-ordering__menu">
          <div v-for="cat in categories" :key="cat || '_all'" class="ap-ordering__cat">
            <h3 v-if="cat" class="ap-ordering__cat-title">{{ cat }}</h3>
            <ul class="ap-ordering__items">
              <li
                v-for="e in entriesInCategory(cat)"
                :key="e.kind === 'single' ? e.item.id : e.base"
                class="ap-ordering__item"
              >
                <template v-if="e.kind === 'single'">
                  <div class="ap-ordering__item-body">
                    <h4>{{ e.item.name }}</h4>
                    <p v-if="e.item.description" class="ap-ordering__item-desc">{{ e.item.description }}</p>
                    <span class="ap-ordering__item-price">{{ money(e.item.priceCents, e.item.currency) }}</span>
                  </div>
                  <button type="button" class="ap-btn ap-btn--sm" @click="add(e.item)">{{ quantityOf(e.item) ? `Add another (${quantityOf(e.item)})` : 'Add' }}</button>
                </template>
                <template v-else>
                  <div class="ap-ordering__item-body">
                    <h4>{{ e.base }}</h4>
                    <p v-if="sizedDescription(e)" class="ap-ordering__item-desc">{{ sizedDescription(e) }}</p>
                    <div class="ap-ordering__sizes">
                      <button
                        v-for="v in e.variants" :key="v.item.id" type="button"
                        class="ap-ordering__size"
                        @click="add(v.item)"
                      >
                        {{ v.label }}
                        <span class="ap-ordering__size-price">{{ money(v.item.priceCents, v.item.currency) }}</span>
                      </button>
                    </div>
                  </div>
                </template>
              </li>
            </ul>
          </div>
        </div>

        <CartBar :count="cartCount" :total="money(totalCents)" to="/checkout" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.ap-ordering__intro { color: var(--ap-ink-muted); }
.ap-ordering__error { color: var(--ap-danger, #b00020); }
.ap-ordering__hint { color: var(--ap-ink-muted); }
.ap-ordering__menu { margin-top: 2rem; display: flex; flex-direction: column; gap: 2rem; }
.ap-ordering__cat-title { margin: 0 0 0.5rem; font-size: 1.2rem; }
.ap-ordering__items { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.ap-ordering__item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--ap-line, #e5e5e5);
  border-radius: 6px;
  background: var(--ap-surface, #fff);
}
.ap-ordering__item-body { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
.ap-ordering__item-body h4 { margin: 0; font-size: 1rem; }
.ap-ordering__item-desc { margin: 0; color: var(--ap-ink-muted); font-size: 0.88rem; }
.ap-ordering__item-price { font-weight: 600; font-size: 0.95rem; }
/* Size buttons on a grouped dish: each one is its own "Add" */
.ap-ordering__sizes { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.35rem; }
.ap-ordering__size {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.32rem 0.7rem;
  border: 1px solid var(--ap-line);
  border-radius: 999px;
  background: transparent; color: var(--ap-ink);
  font: inherit; font-size: 0.82rem; font-weight: 600;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.ap-ordering__size:hover { border-color: var(--ap-primary); background: color-mix(in srgb, var(--ap-primary) 8%, transparent); }
.ap-ordering__size-price { font-weight: 500; color: var(--ap-ink-muted); font-size: 0.78rem; }
</style>
