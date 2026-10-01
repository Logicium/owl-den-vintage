<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { apiClient } from '../../platform/apiClient'
import type { EventDTO, TicketOrderDTO, TicketTierDTO } from '../../platform/contentClient'
import { PLATFORM_SLUG, DEMO_MODE } from '../../platform/config'
import DemoBadge from '../DemoBadge.vue'

const props = withDefaults(
  defineProps<{ siteSlug?: string }>(),
  {},
)
const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

const events = ref<EventDTO[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const selectedEventId = ref<string | null>(null)
const qty = reactive<Record<string, number>>({})
const buyer = reactive({ name: '', email: '', phone: '' })
const submitting = ref(false)
const submitError = ref<string | null>(null)
const order = ref<TicketOrderDTO | null>(null)

async function load() {
  if (!slug.value) return
  loading.value = true
  loadError.value = null
  try {
    events.value = await apiClient.ticketingListEvents(slug.value)
  } catch (e) {
    loadError.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
void load()

const selectedEvent = computed<EventDTO | null>(() =>
  events.value.find(e => e.id === selectedEventId.value) ?? null,
)

function selectEvent(id: string) {
  selectedEventId.value = id
  Object.keys(qty).forEach(k => delete qty[k])
  order.value = null
  submitError.value = null
}

function tierKey(eventId: string, tierId: string) {
  return `${eventId}::${tierId}`
}
function getQty(eventId: string, tierId: string) {
  return qty[tierKey(eventId, tierId)] ?? 0
}
function setQty(eventId: string, tierId: string, n: number) {
  qty[tierKey(eventId, tierId)] = Math.max(0, Math.floor(n))
}
function maxFor(tier: TicketTierDTO) {
  return tier.remaining === undefined || tier.remaining < 0 ? 99 : tier.remaining
}

const totalCents = computed(() => {
  if (!selectedEvent.value) return 0
  let sum = 0
  for (const t of selectedEvent.value.tiers) {
    sum += getQty(selectedEvent.value.id, t.id) * t.priceCents
  }
  return sum
})

function fmt(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

async function submit() {
  if (!selectedEvent.value || !slug.value) return
  const items = selectedEvent.value.tiers
    .map(t => ({ tierId: t.id, quantity: getQty(selectedEvent.value!.id, t.id) }))
    .filter(i => i.quantity > 0)
  if (!items.length) {
    submitError.value = 'Choose at least one ticket.'
    return
  }
  submitting.value = true
  submitError.value = null
  try {
    order.value = await apiClient.ticketingPurchase({
      siteSlug: slug.value,
      eventId: selectedEvent.value.id,
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone || undefined,
      items,
    })
    await load()
  } catch (e) {
    submitError.value = (e as Error).message
  } finally {
    submitting.value = false
  }
}

function startOver() {
  order.value = null
  selectedEventId.value = null
  Object.keys(qty).forEach(k => delete qty[k])
  buyer.name = ''; buyer.email = ''; buyer.phone = ''
}
</script>

<template>
  <section class="ap-ticketing ap-container">
    <DemoBadge add-on="Event ticketing" />
    <p v-if="loading" class="ap-ticketing__status">Loading events…</p>
    <p v-else-if="loadError" class="ap-ticketing__status ap-ticketing__status--error">{{ loadError }}</p>

    <div v-else-if="order" class="ap-ticketing__confirm">
      <h2>You're in.</h2>
      <p>Confirmation for <strong>{{ order.eventTitle }}</strong> sent to {{ order.tickets[0]?.email }}.</p>
      <p>Order <code>{{ order.orderId.slice(0, 8) }}</code> · {{ order.tickets.length }} ticket(s) · {{ fmt(order.totalCents, order.currency) }}</p>
      <ul class="ap-ticketing__tickets">
        <li v-for="t in order.tickets" :key="t.id">
          {{ t.tierLabel }} — {{ t.name }} <span class="ap-ticketing__ticket-id">#{{ t.id.slice(0, 8) }}</span>
        </li>
      </ul>
      <button type="button" class="ap-btn" @click="startOver">Buy more</button>
    </div>

    <template v-else-if="!selectedEvent">
      <p v-if="!events.length" class="ap-ticketing__status">No events on sale right now.</p>
      <ul v-else class="ap-ticketing__events">
        <li v-for="e in events" :key="e.id" class="ap-ticketing__event">
          <img v-if="e.imageUrl" :src="e.imageUrl" :alt="e.title" class="ap-ticketing__event-img" />
          <div class="ap-ticketing__event-body">
            <p class="ap-ticketing__event-date">{{ fmtDate(e.startsAt) }}</p>
            <h3>{{ e.title }}</h3>
            <p v-if="e.venue" class="ap-ticketing__event-venue">{{ e.venue }}</p>
            <p v-if="e.description" class="ap-ticketing__event-desc">{{ e.description }}</p>
            <p class="ap-ticketing__event-from">
              From {{ fmt(Math.min(...e.tiers.map(t => t.priceCents)), e.currency) }}
            </p>
            <button
              type="button" class="ap-btn"
              :disabled="e.status === 'sold_out'"
              @click="selectEvent(e.id)"
            >
              {{ e.status === 'sold_out' ? 'Sold out' : 'Get tickets' }}
            </button>
          </div>
        </li>
      </ul>
    </template>

    <div v-else class="ap-ticketing__buy">
      <button type="button" class="ap-ticketing__back" @click="selectEvent('')">← All events</button>
      <h2>{{ selectedEvent.title }}</h2>
      <p class="ap-ticketing__event-date">{{ fmtDate(selectedEvent.startsAt) }}</p>
      <p v-if="selectedEvent.venue" class="ap-ticketing__event-venue">{{ selectedEvent.venue }}</p>

      <table class="ap-ticketing__tiers">
        <thead>
          <tr><th>Ticket</th><th>Price</th><th>Qty</th></tr>
        </thead>
        <tbody>
          <tr v-for="tier in selectedEvent.tiers" :key="tier.id" :class="{ 'is-out': tier.remaining === 0 }">
            <td>
              <strong>{{ tier.label }}</strong>
              <p v-if="tier.description" class="ap-ticketing__tier-desc">{{ tier.description }}</p>
              <p v-if="tier.remaining !== undefined && tier.remaining >= 0 && tier.remaining < 10" class="ap-ticketing__tier-remaining">
                {{ tier.remaining === 0 ? 'Sold out' : `${tier.remaining} left` }}
              </p>
            </td>
            <td>{{ fmt(tier.priceCents, selectedEvent.currency) }}</td>
            <td>
              <input
                type="number" min="0" :max="maxFor(tier)"
                :value="getQty(selectedEvent.id, tier.id)"
                :disabled="tier.active === false || tier.remaining === 0"
                @input="setQty(selectedEvent.id, tier.id, Number(($event.target as HTMLInputElement).value))"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <p class="ap-ticketing__total">Total: <strong>{{ fmt(totalCents, selectedEvent.currency) }}</strong></p>

      <form class="ap-ticketing__form" @submit.prevent="submit">
        <label>Name<input v-model="buyer.name" required maxlength="200" /></label>
        <label>Email<input v-model="buyer.email" type="email" required /></label>
        <label>Phone (optional)<input v-model="buyer.phone" type="tel" maxlength="50" /></label>
        <p v-if="submitError" class="ap-ticketing__error">{{ submitError }}</p>
        <button type="submit" class="ap-btn" :disabled="submitting || totalCents <= 0 && !selectedEvent.tiers.some(t => t.priceCents === 0)">
          {{ submitting ? 'Reserving…' : 'Reserve tickets' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.ap-ticketing { padding: clamp(1.5rem, 4vw, 3rem) 0; display: grid; gap: 1.5rem; }
.ap-ticketing__status { color: var(--ap-ink-muted); }
.ap-ticketing__status--error { color: #b00020; }
.ap-ticketing__events { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.ap-ticketing__event { border: 1px solid var(--ap-line, #ddd); border-radius: 12px; overflow: hidden; display: grid; }
.ap-ticketing__event-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
.ap-ticketing__event-body { padding: 1rem; display: grid; gap: 0.5rem; }
.ap-ticketing__event-date { margin: 0; color: var(--ap-ink-muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
.ap-ticketing__event-venue { margin: 0; color: var(--ap-ink-muted); font-size: 0.9rem; }
.ap-ticketing__event-desc { margin: 0; font-size: 0.95rem; }
.ap-ticketing__event-from { margin: 0; font-weight: 600; }
.ap-ticketing__back { background: none; border: none; cursor: pointer; padding: 0; color: var(--ap-ink-muted); font: inherit; justify-self: start; }
.ap-ticketing__buy { display: grid; gap: 0.85rem; max-width: 640px; }
.ap-ticketing__tiers { width: 100%; border-collapse: collapse; }
.ap-ticketing__tiers th, .ap-ticketing__tiers td { padding: 0.6rem; text-align: left; border-bottom: 1px solid var(--ap-line, #eee); vertical-align: top; }
.ap-ticketing__tiers input { width: 5rem; }
.ap-ticketing__tier-desc { margin: 0.25rem 0 0; color: var(--ap-ink-muted); font-size: 0.85rem; }
.ap-ticketing__tier-remaining { margin: 0.25rem 0 0; font-size: 0.8rem; color: #b00020; }
.ap-ticketing__total { font-size: 1.1rem; margin: 0.5rem 0; }
.ap-ticketing__form { display: grid; gap: 0.6rem; }
.ap-ticketing__form label { display: grid; gap: 0.25rem; font-size: 0.9rem; }
.ap-ticketing__form input { padding: 0.55rem; border: 1px solid var(--ap-line, #ccc); border-radius: 6px; }
.ap-ticketing__error { color: #b00020; margin: 0; }
.ap-ticketing__confirm { display: grid; gap: 0.5rem; }
.ap-ticketing__tickets { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.35rem; }
.ap-ticketing__ticket-id { color: var(--ap-ink-muted); font-family: monospace; font-size: 0.85rem; }
.is-out td { opacity: 0.55; }
</style>
