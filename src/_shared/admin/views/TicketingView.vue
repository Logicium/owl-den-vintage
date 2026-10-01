<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  contentClient,
  type EventDTO,
  type EventStatusDTO,
  type TicketDTO,
  type TicketTierDTO,
} from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import MoneyInput from '../components/inputs/MoneyInput.vue'
import NumberInput from '../components/inputs/NumberInput.vue'
import ToggleInput from '../components/inputs/ToggleInput.vue'
import SelectInput from '../components/inputs/SelectInput.vue'

/** Tier ids derive from the label — owners never hand-write slugs. */
function slugifyTier(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'tier'
}

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)

const loading = ref(false)
const error = ref<string | null>(null)
const addOnEnabled = ref(false)

const events = ref<EventDTO[]>([])
const expanded = ref<string | null>(null)
const ticketsByEvent = ref<Record<string, TicketDTO[]>>({})

function defaultStart() {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  return d.toISOString().slice(0, 16) // for datetime-local
}

function toLocalInput(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}
function fromLocalInput(local: string): string {
  return new Date(local).toISOString()
}

async function load() {
  if (!siteId.value) return
  loading.value = true
  error.value = null
  try {
    const [list, sites] = await Promise.all([
      contentClient.ticketingListSiteEvents(siteId.value).catch(() => [] as EventDTO[]),
      contentClient.listSites(),
    ])
    events.value = list
    addOnEnabled.value = !!sites.find(s => s.id === siteId.value)?.addOns?.includes('ticketing')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
  void syncFromContent()
}

/* ── Events link ──
   Ticketed events ARE the site's Events content: everything on the Events
   page lands here automatically as a draft (General Admission tier, price
   parsed from its label). Tiers, capacity, and publishing happen here. */
const syncStatus = ref<string | null>(null)
async function syncFromContent() {
  if (!siteId.value) return
  try {
    const d = await contentClient.getDraft(siteId.value)
    const list = (d.payload.events as Array<{ title?: string; date?: string; startTime?: string; priceLabel?: string; image?: string; blurb?: string }> | undefined) ?? []
    const existing = new Set(events.value.map(e => e.title.toLowerCase()))
    let added = 0
    for (const ev of list) {
      const title = (ev.title ?? '').trim()
      if (!title || existing.has(title.toLowerCase())) continue
      const startsRaw = ev.date ? new Date(`${ev.date}T${(ev.startTime || '19:00').padStart(5, '0')}`) : null
      const startsAt = startsRaw && !Number.isNaN(startsRaw.getTime()) ? startsRaw.toISOString() : fromLocalInput(defaultStart())
      const priceCents = Math.round((parseFloat(String(ev.priceLabel ?? '').replace(/[^0-9.]/g, '')) || 0) * 100)
      const created = await contentClient.ticketingCreateEvent(siteId.value, {
        title,
        description: ev.blurb?.trim() || '',
        startsAt,
        venue: '',
        imageUrl: ev.image?.trim() || '',
        capacity: -1,
        currency: 'USD',
        tiers: [{ id: 'general', label: 'General Admission', priceCents, capacity: -1, active: true }],
        status: 'draft',
      })
      events.value.push(created)
      existing.add(title.toLowerCase())
      added++
    }
    if (added) {
      events.value.sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))
      syncStatus.value = `Synced ${added} event${added === 1 ? '' : 's'} from your Events page — drafts until you publish them.`
    }
  } catch { /* content draft unavailable — leave list as-is */ }
}

async function toggleAddOn() {
  if (!siteId.value) return
  try {
    const res = await contentClient.setSiteAddOn(siteId.value, 'ticketing', !addOnEnabled.value)
    addOnEnabled.value = res.addOns.includes('ticketing')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function saveEvent(e: EventDTO) {
  if (!siteId.value) return
  try {
    const updated = await contentClient.ticketingUpdateEvent(siteId.value, e.id, {
      title: e.title,
      description: e.description,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      venue: e.venue,
      imageUrl: e.imageUrl,
      capacity: e.capacity,
      currency: e.currency,
      tiers: e.tiers.map(t => ({
        id: t.id, label: t.label, description: t.description,
        priceCents: t.priceCents, capacity: t.capacity, active: t.active,
      })),
      status: e.status,
    })
    const idx = events.value.findIndex(x => x.id === e.id)
    if (idx >= 0) events.value[idx] = updated
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

async function deleteEvent(e: EventDTO) {
  if (!siteId.value) return
  if (!confirm(`Delete event "${e.title}"?`)) return
  try {
    await contentClient.ticketingDeleteEvent(siteId.value, e.id)
    events.value = events.value.filter(x => x.id !== e.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

function addTier(e: EventDTO) {
  const idx = e.tiers.length + 1
  e.tiers.push({ id: `tier-${idx}`, label: `Tier ${idx}`, priceCents: 0, capacity: -1, active: true })
}
function removeTier(tiers: TicketTierDTO[], id: string) {
  const i = tiers.findIndex(t => t.id === id)
  if (i >= 0) tiers.splice(i, 1)
}

async function toggleExpand(e: EventDTO) {
  if (expanded.value === e.id) {
    expanded.value = null
    return
  }
  expanded.value = e.id
  if (!ticketsByEvent.value[e.id] && siteId.value) {
    try {
      ticketsByEvent.value[e.id] = await contentClient.ticketingListEventTickets(siteId.value, e.id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }
}

async function checkIn(eventId: string, t: TicketDTO) {
  if (!siteId.value) return
  try {
    const updated = await contentClient.ticketingCheckIn(siteId.value, t.id)
    const list = ticketsByEvent.value[eventId]
    if (list) {
      const i = list.findIndex(x => x.id === t.id)
      if (i >= 0) list[i] = updated
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

async function cancelTicket(eventId: string, t: TicketDTO) {
  if (!siteId.value) return
  if (!confirm(`Cancel ticket for ${t.name}?`)) return
  try {
    const updated = await contentClient.ticketingCancelTicket(siteId.value, t.id)
    const list = ticketsByEvent.value[eventId]
    if (list) {
      const i = list.findIndex(x => x.id === t.id)
      if (i >= 0) list[i] = updated
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

function money(cents?: number, currency = 'USD') {
  if (cents == null) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

function fmtDate(iso?: string) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso))
}

const statusOptions: EventStatusDTO[] = ['draft', 'on_sale', 'sold_out', 'cancelled', 'past']

onMounted(load)
watch(siteId, load)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow adm-eyebrow--premium">★ Premium add-on</span>
        <h1 class="adm-title">Ticketing</h1>
        <p class="adm-subtitle">Sell event tickets — set tiers, track capacity, and check guests in at the door.</p>
      </div>
      <div class="head-actions">
        <button
          type="button"
          class="adm-btn"
          :class="addOnEnabled ? 'adm-btn--ghost' : 'adm-btn--primary'"
          @click="toggleAddOn"
        >{{ addOnEnabled ? 'Disable add-on' : 'Enable ticketing' }}</button>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <p class="adm-empty__body">Select a site from the header to manage its events.</p>
    </div>

    <template v-else>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
      <p v-if="loading" class="adm-muted">Loading…</p>

      <div v-if="!addOnEnabled" class="adm-card adm-card--soft addon-gate">
        <p>The Ticketing add-on is currently <strong>off</strong>. Enable it above to start selling.</p>
      </div>

      <section class="adm-card">
        <h2 class="adm-h2">Events</h2>
        <p class="adm-muted adm-mb">
          Linked to your <RouterLink to="/admin/catalog" class="adm-link">Events page</RouterLink> —
          new events land here automatically as drafts. Set tiers and publish them below.
        </p>
        <p v-if="syncStatus" class="adm-muted adm-mb">{{ syncStatus }}</p>
        <p v-if="!events.length" class="adm-muted">
          No events yet — add them on your
          <RouterLink to="/admin/catalog" class="adm-link">Events page</RouterLink> and they'll appear here.
        </p>
        <ul v-else class="event-list">
          <li v-for="e in events" :key="e.id" class="event-row">
            <div class="event-head">
              <div class="grid">
                <label>Title<input class="adm-input" v-model="e.title" /></label>
                <label>Venue<input class="adm-input" v-model="e.venue" /></label>
                <label>Starts
                  <input class="adm-input" type="datetime-local"
                         :value="toLocalInput(e.startsAt)"
                         @input="e.startsAt = fromLocalInput(($event.target as HTMLInputElement).value)" />
                </label>
                <div><NumberInput v-model="e.capacity" label="Capacity" :min="-1" unit="seats · -1 = ∞" /></div>
                <SelectInput v-model="e.status" label="Status" :options="statusOptions.map(s => ({ value: s, label: s.replace('_', ' ') }))" />
                <p class="adm-muted">Sold: {{ e.sold }}{{ e.capacity === -1 ? '' : ` / ${e.capacity}` }}</p>
              </div>
              <h4 class="adm-h3">Tiers</h4>
              <ul class="rm-list">
                <li v-for="t in e.tiers" :key="t.id" class="rm-row">
                  <input class="adm-input rm-row__name" v-model="t.label" @change="t.id = t.id || slugifyTier(t.label)" />
                  <div class="rm-row__price"><MoneyInput v-model="t.priceCents" :currency="e.currency || 'USD'" /></div>
                  <div class="rm-row__inv"><NumberInput v-model="t.capacity" :min="-1" unit="seats" /></div>
                  <div class="rm-row__active"><ToggleInput :model-value="t.active ?? true" label="Live" @update:model-value="(v: boolean) => t.active = v" /></div>
                  <span class="adm-muted rm-row__sold">{{ t.sold ?? 0 }} sold</span>
                  <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="removeTier(e.tiers, t.id)">✕</button>
                </li>
              </ul>
              <div class="adm-row-actions">
                <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="addTier(e)">+ Tier</button>
                <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" @click="saveEvent(e)">Save event</button>
                <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="toggleExpand(e)">
                  {{ expanded === e.id ? 'Hide tickets' : 'View tickets' }}
                </button>
                <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="deleteEvent(e)">Delete</button>
              </div>
            </div>

            <div v-if="expanded === e.id" class="tickets">
              <h4 class="adm-h3">Tickets ({{ (ticketsByEvent[e.id] || []).length }})</h4>
              <p v-if="!ticketsByEvent[e.id]?.length" class="adm-muted">No tickets sold yet.</p>
              <table v-else class="adm-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Tier</th><th>Price</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="t in ticketsByEvent[e.id]" :key="t.id">
                    <td>{{ t.name }}</td>
                    <td>{{ t.email }}</td>
                    <td>{{ t.tierLabel }}</td>
                    <td>{{ money(t.unitPriceCents, t.currency) }}</td>
                    <td>{{ t.status }}</td>
                    <td>
                      <button v-if="t.status === 'confirmed'" type="button" class="adm-btn adm-btn--primary adm-btn--sm" @click="checkIn(e.id, t)">Check in</button>
                      <button v-if="t.status !== 'cancelled'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="cancelTicket(e.id, t)">Cancel</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.6rem 0.8rem; align-items: end; }
.grid__full { grid-column: 1 / -1; }
.adm-h3 { margin: 1rem 0 0.4rem; font-size: 0.95rem; }
.adm-row-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.6rem; }
.event-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 1rem; }
.event-row { border: 1px solid var(--adm-line, #e5e7eb); border-radius: 8px; padding: 0.9rem; }
.tickets { margin-top: 0.8rem; padding-top: 0.6rem; border-top: 1px dashed var(--adm-line, #e5e7eb); }
.adm-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.adm-table th, .adm-table td { padding: 0.4rem 0.5rem; text-align: left; border-bottom: 1px solid var(--adm-line, #eee); }
.addon-gate { padding: 1rem 1.2rem; }
.rm-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; }
.rm-row { display: grid; grid-template-columns: 100px 1fr 90px 90px auto auto auto; gap: 0.4rem; align-items: center; }
.rm-row__sold { white-space: nowrap; font-size: 0.85rem; }
</style>
