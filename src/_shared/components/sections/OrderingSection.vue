<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { type MenuItemDTO } from '../../platform/contentClient'
import { groupByBase, type SizedEntry } from '../../platform/menuSizes'
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
  { eyebrow: 'Order', title: 'Order for pickup' },
)

const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

const loading = ref(true)
const error = ref<string | null>(null)
const items = ref<MenuItemDTO[]>([])
const categories = ref<string[]>([])
const currency = ref('USD')
const timezone = ref('America/Denver')
const slots = ref<string[]>([])

interface CartLine { menuItemId: string; quantity: number; notes?: string }
const cart = ref<CartLine[]>([])
const cartOpen = ref(false)

const form = reactive({
  name: '', email: '', phone: '', notes: '',
  pickupAt: '' as string,
})
const submitting = ref(false)
const submitError = ref<string | null>(null)

interface Confirmed { id: string; pickupAt: string; totalCents: number; currency: string }
const confirmed = ref<Confirmed | null>(null)

function money(cents: number, code = currency.value): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(cents / 100)
}

function formatSlot(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone.value,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

const slotsByDay = computed(() => {
  const groups = new Map<string, string[]>()
  for (const s of slots.value) {
    const key = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone.value,
      weekday: 'short', month: 'short', day: 'numeric',
    }).format(new Date(s))
    const arr = groups.get(key) ?? []
    arr.push(s)
    groups.set(key, arr)
  }
  return [...groups.entries()]
})

/* ── Pickup time picker ──
   A week of 15-minute slots is ~90 pills, which testers read as a wall of
   noise. Show one day at a time, and split a busy day into parts of the day,
   so the customer scans a handful of times instead of the whole schedule.
   Most people just want the next available slot, so that gets a one-tap chip. */

const selectedDay = ref<string | null>(null)
const selectedPeriod = ref<string | null>(null)

/** Hour (0-23) of a slot in the shop's timezone, not the browser's. */
function hourIn(iso: string): number {
  return parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone.value, hour: 'numeric', hour12: false,
  }).format(new Date(iso)), 10)
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone.value, hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

/** Short day label for the day chips: "Fri Aug 14" -> { top: 'Fri', sub: 'Aug 14' }. */
function dayChip(day: string): { top: string; sub: string } {
  const [weekday, ...rest] = day.split(', ')
  return { top: weekday ?? day, sub: rest.join(', ') }
}

const days = computed(() => slotsByDay.value.map(([day]) => day))

/** Slots for the chosen day (falling back to the first day with any). */
const daySlots = computed<string[]>(() => {
  const entry = slotsByDay.value.find(([day]) => day === selectedDay.value)
  return entry?.[1] ?? slotsByDay.value[0]?.[1] ?? []
})

const PERIODS: Array<{ id: string; label: string; test: (h: number) => boolean }> = [
  { id: 'morning', label: 'Morning', test: h => h < 12 },
  { id: 'afternoon', label: 'Afternoon', test: h => h >= 12 && h < 17 },
  { id: 'evening', label: 'Evening', test: h => h >= 17 },
]

/** Only the parts of the day this day actually has slots in. */
const periods = computed(() =>
  PERIODS.map(p => ({ ...p, slots: daySlots.value.filter(s => p.test(hourIn(s))) }))
    .filter(p => p.slots.length))

/** A short day needs no second level of chips — don't add clicks for 6 times. */
const PERIOD_THRESHOLD = 12
const usePeriods = computed(() => daySlots.value.length > PERIOD_THRESHOLD && periods.value.length > 1)

const visibleSlots = computed<string[]>(() => {
  if (!usePeriods.value) return daySlots.value
  const active = periods.value.find(p => p.id === selectedPeriod.value) ?? periods.value[0]
  return active?.slots ?? []
})

/** The next available pickup, for the one-tap chip. */
const soonest = computed<string | null>(() => slots.value[0] ?? null)

function pickSoonest() {
  const s = soonest.value
  if (!s) return
  form.pickupAt = s
  // Move the picker to that slot so the selection is visible in context.
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone.value, weekday: 'short', month: 'short', day: 'numeric',
  }).format(new Date(s))
  selectedDay.value = day
  selectedPeriod.value = PERIODS.find(p => p.test(hourIn(s)))?.id ?? null
}

function selectDay(day: string) {
  selectedDay.value = day
  // Land on the first part of that day that has times.
  selectedPeriod.value = null
  selectedPeriod.value = periods.value[0]?.id ?? null
}

// Default to the first day/period once slots arrive.
watch(slots, () => {
  if (!slots.value.length) { selectedDay.value = null; selectedPeriod.value = null; return }
  selectedDay.value = days.value[0] ?? null
  selectedPeriod.value = periods.value[0]?.id ?? null
})

async function load() {
  if (!slug.value) {
    error.value = 'Ordering unavailable — site not configured.'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const [menu, slotData] = await Promise.all([
      apiClient.orderingMenu(slug.value),
      apiClient.orderingSlots(slug.value),
    ])
    items.value = menu.items
    categories.value = menu.categories.length ? menu.categories : ['']
    currency.value = menu.currency
    timezone.value = slotData.timezone
    slots.value = slotData.slots
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

function add(item: MenuItemDTO) {
  const existing = cart.value.find(l => l.menuItemId === item.id)
  if (existing) existing.quantity += 1
  else cart.value.push({ menuItemId: item.id, quantity: 1 })
  cartOpen.value = true
}

function setQty(line: CartLine, qty: number) {
  if (qty <= 0) cart.value = cart.value.filter(l => l !== line)
  else line.quantity = qty
}

const cartCount = computed(() => cart.value.reduce((n, l) => n + l.quantity, 0))
const totalCents = computed(() =>
  cart.value.reduce((sum, l) => sum + ((itemById(l.menuItemId)?.priceCents ?? 0) * l.quantity), 0),
)

async function checkout() {
  if (!cart.value.length || !form.pickupAt) return
  submitting.value = true
  submitError.value = null
  try {
    const res = await apiClient.orderingCreateOrder({
      siteSlug: slug.value,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      pickupAt: form.pickupAt,
      items: cart.value.map(l => ({ menuItemId: l.menuItemId, quantity: l.quantity, notes: l.notes })),
    })
    confirmed.value = { id: res.id, pickupAt: res.pickupAt, totalCents: res.totalCents, currency: res.currency }
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
  form.pickupAt = ''
}

onMounted(load)
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

      <div v-if="confirmed" class="ap-ordering__confirmation">
        <div class="ap-ordering__confirmation-icon" aria-hidden="true">✓</div>
        <h3>Order received.</h3>
        <p>Pickup at <strong>{{ formatSlot(confirmed.pickupAt) }}</strong></p>
        <p>Total: <strong>{{ money(confirmed.totalCents, confirmed.currency) }}</strong></p>
        <p class="ap-ordering__hint">We emailed you a copy. See you soon.</p>
        <button type="button" class="ap-btn ap-btn--ghost" @click="reset">Order again</button>
      </div>

      <template v-else>
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
                  <button type="button" class="ap-btn ap-btn--sm" @click="add(e.item)">Add</button>
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

        <button
          v-if="cartCount > 0"
          type="button"
          class="ap-ordering__cart-fab"
          @click="cartOpen = !cartOpen"
        >Order ({{ cartCount }}) — {{ money(totalCents) }}</button>

        <div v-if="cartOpen && cartCount > 0" class="ap-ordering__cart">
          <h3>Your order</h3>
          <ul class="ap-ordering__cart-items">
            <li v-for="line in cart" :key="line.menuItemId">
              <div class="ap-ordering__cart-row">
                <span class="ap-ordering__cart-name">{{ itemById(line.menuItemId)?.name }}</span>
                <input
                  type="number" min="0"
                  :value="line.quantity"
                  @input="setQty(line, parseInt(($event.target as HTMLInputElement).value || '0', 10))"
                  class="ap-ordering__cart-qty"
                />
                <span class="ap-ordering__cart-price">{{ money((itemById(line.menuItemId)?.priceCents ?? 0) * line.quantity) }}</span>
              </div>
              <input
                v-model="line.notes"
                class="ap-ordering__cart-note"
                placeholder="Special instructions (optional)"
                maxlength="300"
              />
            </li>
          </ul>

          <form class="ap-ordering__checkout" @submit.prevent="checkout">
            <div class="ap-ordering__fields">
              <label class="ap-ordering__field">
                <span>Name</span>
                <input v-model="form.name" required maxlength="200" />
              </label>
              <label class="ap-ordering__field">
                <span>Email</span>
                <input v-model="form.email" type="email" required />
              </label>
              <label class="ap-ordering__field">
                <span>Phone (optional)</span>
                <input v-model="form.phone" type="tel" maxlength="50" />
              </label>
            </div>

            <fieldset class="ap-ordering__slots">
              <legend>Choose a pickup time</legend>
              <p v-if="!slots.length" class="ap-ordering__hint">No pickup times available right now.</p>

              <template v-else>
                <!-- Most people want the next one; make that a single tap. -->
                <button
                  v-if="soonest"
                  type="button"
                  class="ap-ordering__soonest"
                  :class="{ 'is-active': form.pickupAt === soonest }"
                  @click="pickSoonest"
                >
                  <span class="ap-ordering__soonest-label">Soonest</span>
                  <span class="ap-ordering__soonest-time">{{ formatSlot(soonest) }}</span>
                </button>

                <!-- Day pagination: one day of times at a time. -->
                <div class="ap-ordering__days" role="tablist" aria-label="Pickup day">
                  <button
                    v-for="day in days"
                    :key="day"
                    type="button"
                    role="tab"
                    class="ap-ordering__day"
                    :class="{ 'is-active': day === selectedDay }"
                    :aria-selected="day === selectedDay"
                    @click="selectDay(day)"
                  >
                    <span class="ap-ordering__day-top">{{ dayChip(day).top }}</span>
                    <span class="ap-ordering__day-sub">{{ dayChip(day).sub }}</span>
                  </button>
                </div>

                <!-- Second level only when a day is genuinely busy. -->
                <div v-if="usePeriods" class="ap-ordering__periods" role="tablist" aria-label="Time of day">
                  <button
                    v-for="p in periods"
                    :key="p.id"
                    type="button"
                    role="tab"
                    class="ap-ordering__period"
                    :class="{ 'is-active': p.id === selectedPeriod }"
                    :aria-selected="p.id === selectedPeriod"
                    @click="selectedPeriod = p.id"
                  >
                    {{ p.label }}
                    <span class="ap-ordering__period-count">{{ p.slots.length }}</span>
                  </button>
                </div>

                <div class="ap-ordering__slot-grid">
                  <label v-for="s in visibleSlots" :key="s" class="ap-ordering__slot">
                    <input type="radio" name="pickup" :value="s" v-model="form.pickupAt" required />
                    <span>{{ timeLabel(s) }}</span>
                  </label>
                </div>

                <p v-if="form.pickupAt" class="ap-ordering__slot-chosen">
                  Pickup <strong>{{ formatSlot(form.pickupAt) }}</strong>
                </p>
              </template>
            </fieldset>

            <label class="ap-ordering__field ap-ordering__field--full">
              <span>Order notes (optional)</span>
              <textarea v-model="form.notes" rows="2" maxlength="2000" />
            </label>

            <div class="ap-ordering__total">Total <strong>{{ money(totalCents) }}</strong></div>

            <p v-if="submitError" class="ap-ordering__error">{{ submitError }}</p>

            <button type="submit" class="ap-btn" :disabled="submitting || !form.pickupAt">
              {{ submitting ? 'Placing order…' : 'Place order' }}
            </button>
          </form>
        </div>
      </template>
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
.ap-ordering__cart-fab {
  position: fixed;
  right: 1.25rem; bottom: 1.25rem;
  z-index: 50;
  background: var(--ap-ink, #111); color: var(--ap-surface, #fff);
  padding: 0.85rem 1.25rem;
  border-radius: 999px;
  border: none; font-weight: 600; cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}
.ap-ordering__cart {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--ap-line, #e5e5e5);
  border-radius: 8px;
  background: var(--ap-surface, #fff);
}
.ap-ordering__cart h3 { margin: 0 0 1rem; }
.ap-ordering__cart-items { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-direction: column; gap: 0.65rem; }
.ap-ordering__cart-row { display: grid; grid-template-columns: 1fr 80px 100px; gap: 0.75rem; align-items: center; }
.ap-ordering__cart-qty { width: 72px; padding: 0.35rem 0.5rem; }
.ap-ordering__cart-price { text-align: right; font-weight: 500; }
.ap-ordering__cart-note {
  margin-top: 0.25rem;
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--ap-line, #e5e5e5);
  border-radius: 4px;
  font: inherit;
  font-size: 0.88rem;
}
.ap-ordering__checkout { display: flex; flex-direction: column; gap: 1rem; }
.ap-ordering__fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
.ap-ordering__field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
.ap-ordering__field--full { grid-column: 1 / -1; }
.ap-ordering__field input, .ap-ordering__field textarea {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--ap-line, #d4d4d4);
  border-radius: 4px;
  font: inherit;
}
.ap-ordering__slots {
  border: 1px solid var(--ap-line, #e5e5e5);
  border-radius: 6px;
  padding: 0.85rem 1rem;
}
.ap-ordering__slots legend { font-size: 0.9rem; padding: 0 0.4rem; }
.ap-ordering__slot-day { margin-top: 0.6rem; }
.ap-ordering__slot-day-label { font-size: 0.78rem; color: var(--ap-ink-muted); margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }

/* ── Soonest: the one-tap path most customers want ── */
.ap-ordering__soonest {
  display: flex; align-items: baseline; gap: 0.6rem;
  width: 100%;
  margin: 0.5rem 0 0.9rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--ap-line, #ddd);
  border-radius: var(--ap-radius, 10px);
  background: var(--ap-surface-alt, #fafafa);
  color: var(--ap-ink, #111);
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 140ms ease, background 140ms ease;
}
.ap-ordering__soonest:hover { border-color: var(--ap-ink, #111); }
.ap-ordering__soonest.is-active {
  background: var(--ap-ink, #111);
  border-color: var(--ap-ink, #111);
  color: var(--ap-surface, #fff);
}
.ap-ordering__soonest-label {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.62rem; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  opacity: 0.7;
}
.ap-ordering__soonest-time { font-size: 0.95rem; font-weight: 600; }

/* ── Day pagination ── */
.ap-ordering__days {
  display: flex; gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.35rem;
  margin-bottom: 0.6rem;
  scrollbar-width: none;
}
.ap-ordering__days::-webkit-scrollbar { display: none; }
.ap-ordering__day {
  display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
  flex: 0 0 auto;
  min-width: 4.6rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--ap-line, #ddd);
  border-radius: var(--ap-radius, 10px);
  background: var(--ap-surface, #fff);
  color: var(--ap-ink, #111);
  font: inherit;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}
.ap-ordering__day:hover { border-color: var(--ap-ink, #111); }
.ap-ordering__day.is-active {
  background: var(--ap-ink, #111);
  border-color: var(--ap-ink, #111);
  color: var(--ap-surface, #fff);
}
.ap-ordering__day-top { font-size: 0.82rem; font-weight: 600; }
.ap-ordering__day-sub { font-size: 0.68rem; opacity: 0.72; white-space: nowrap; }

/* ── Time of day ── */
.ap-ordering__periods { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.6rem; }
.ap-ordering__period {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--ap-ink-muted, #666);
  font: inherit; font-size: 0.82rem;
  cursor: pointer;
  transition: color 140ms ease, border-color 140ms ease;
}
.ap-ordering__period:hover { color: var(--ap-ink, #111); }
.ap-ordering__period.is-active { color: var(--ap-ink, #111); border-bottom-color: var(--ap-primary, #111); font-weight: 600; }
.ap-ordering__period-count {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.62rem;
  opacity: 0.6;
}

.ap-ordering__slot-chosen {
  margin: 0.7rem 0 0;
  font-size: 0.85rem;
  color: var(--ap-ink-muted, #666);
}
.ap-ordering__slot-chosen strong { color: var(--ap-ink, #111); }

.ap-ordering__slot-grid { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.ap-ordering__slot {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--ap-line, #ddd);
  border-radius: 999px;
  font-size: 0.85rem;
  cursor: pointer;
  background: var(--ap-mute, #fafafa);
}
.ap-ordering__slot input { margin: 0; appearance: none; width: 0; height: 0; }
.ap-ordering__slot:has(input:checked) {
  background: var(--ap-ink, #111);
  color: var(--ap-surface, #fff);
  border-color: var(--ap-ink, #111);
}
.ap-ordering__total { display: flex; justify-content: flex-end; gap: 0.75rem; font-size: 1.1rem; padding-top: 0.5rem; border-top: 1px solid var(--ap-line, #e5e5e5); }
.ap-ordering__confirmation {
  text-align: center;
  padding: 3rem 1rem;
  background: var(--ap-surface, #fff);
  border: 1px solid var(--ap-line, #e5e5e5);
  border-radius: 8px;
}
.ap-ordering__confirmation-icon {
  width: 56px; height: 56px; line-height: 56px;
  border-radius: 50%;
  margin: 0 auto 1rem;
  background: var(--ap-success, #1f7a4d);
  color: #fff;
  font-size: 1.6rem;
  font-weight: 700;
}
</style>
