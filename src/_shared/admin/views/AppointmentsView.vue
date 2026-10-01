<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { contentClient, type BookingConfigDTO, type BookingServiceDTO } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import NumberInput from '../components/inputs/NumberInput.vue'
import TimezoneSelect from '../components/inputs/TimezoneSelect.vue'

/** Service ids are derived from the label — owners never hand-write slugs. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)

const loading = ref(false)
const error = ref<string | null>(null)
const saving = ref(false)
const savedAt = ref<string | null>(null)

const resolved = ref<Required<BookingConfigDTO> | null>(null)
const services = ref<BookingServiceDTO[]>([])
const addOnEnabled = ref(false)
const bookings = ref<Awaited<ReturnType<typeof contentClient.listSiteBookings>>>([])
const syncStatus = ref<string | null>(null)

const DAYS = [
  { idx: 1, label: 'Mon' },
  { idx: 2, label: 'Tue' },
  { idx: 3, label: 'Wed' },
  { idx: 4, label: 'Thu' },
  { idx: 5, label: 'Fri' },
  { idx: 6, label: 'Sat' },
  { idx: 0, label: 'Sun' },
] as const

/** Editable hours mirror: day -> "HH:MM-HH:MM, HH:MM-HH:MM" string */
const hoursDraft = ref<Record<number, string>>({})

async function load() {
  if (!siteId.value) return
  loading.value = true
  error.value = null
  try {
    const [config, list, sites] = await Promise.all([
      contentClient.getBookingConfig(siteId.value),
      contentClient.listSiteBookings(siteId.value).catch(() => []),
      contentClient.listSites(),
    ])
    resolved.value = config.resolved
    services.value = (config.override?.services ?? config.resolved.services ?? []).map(s => ({ ...s }))
    bookings.value = list
    addOnEnabled.value = !!sites.find(s => s.id === siteId.value)?.addOns?.includes('appointments')
    hoursDraft.value = {}
    for (const d of DAYS) {
      hoursDraft.value[d.idx] = (config.resolved.hours?.[d.idx] || []).join(', ')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
  void syncFromContent()
}

/* ── Services link ──
   Bookable services ARE the site's Services content — no second list to
   maintain. On load, anything on the Services page that isn't bookable yet
   is added automatically (default 30 min; tune durations below). */
async function syncFromContent() {
  if (!siteId.value) return
  try {
    const d = await contentClient.getDraft(siteId.value)
    const list = (d.payload.services as Array<{ name?: string; description?: string }> | undefined) ?? []
    const existing = new Set(services.value.map(s => s.label.toLowerCase()))
    let added = 0
    for (const svc of list) {
      const name = (svc.name ?? '').trim()
      if (!name || existing.has(name.toLowerCase())) continue
      services.value.push({
        id: slugify(name) || `service-${services.value.length + 1}`,
        label: name,
        description: svc.description?.trim() || undefined,
        durationMinutes: 30,
      })
      existing.add(name.toLowerCase())
      added++
    }
    if (added) {
      await saveConfig()
      syncStatus.value = `Synced ${added} service${added === 1 ? '' : 's'} from your Services page.`
    }
  } catch { /* content draft unavailable — leave manual list as-is */ }
}

function parseHours(s: string): string[] {
  return s.split(',').map(x => x.trim()).filter(Boolean)
}

async function saveConfig() {
  if (!siteId.value || !resolved.value) return
  saving.value = true
  error.value = null
  try {
    const hours: Record<number, string[]> = {}
    for (const d of DAYS) {
      const ranges = parseHours(hoursDraft.value[d.idx] || '')
      if (ranges.length) hours[d.idx] = ranges
    }
    const payload: BookingConfigDTO = {
      timezone: resolved.value.timezone,
      hours,
      slotMinutes: resolved.value.slotMinutes,
      minLeadHours: resolved.value.minLeadHours,
      windowDays: resolved.value.windowDays,
      services: services.value
        .filter(s => s.id.trim() && s.label.trim())
        .map(s => ({
          id: s.id.trim(),
          label: s.label.trim(),
          description: s.description?.trim() || undefined,
          durationMinutes: Math.max(5, Number(s.durationMinutes) || 30),
        })),
      enabledTypes: services.value.length ? ['service'] : resolved.value.enabledTypes,
    }
    const next = await contentClient.saveBookingConfig(siteId.value, payload)
    resolved.value = next.resolved
    savedAt.value = new Date().toISOString()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

function removeService(i: number) {
  services.value.splice(i, 1)
}

async function toggleAddOn() {
  if (!siteId.value) return
  try {
    const res = await contentClient.setSiteAddOn(siteId.value, 'appointments', !addOnEnabled.value)
    addOnEnabled.value = res.addOns.includes('appointments')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function cancelBooking(id: string) {
  if (!confirm('Cancel this booking? The customer will be notified.')) return
  try {
    await contentClient.adminCancelBooking(id)
    bookings.value = bookings.value.map(b => b.id === id ? { ...b, status: 'cancelled' } : b)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function fmtWhen(iso: string, tz?: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz || resolved.value?.timezone || 'America/Denver',
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso))
}

onMounted(load)
watch(siteId, load)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow adm-eyebrow--premium">★ Premium add-on</span>
        <h1 class="adm-title">Appointments</h1>
        <p class="adm-subtitle">
          Let visitors self-book services on your contact page. Define your services, set your hours,
          and manage incoming appointments.
        </p>
      </div>
      <div class="head-actions">
        <button
          type="button"
          class="adm-btn"
          :class="addOnEnabled ? 'adm-btn--ghost' : 'adm-btn--primary'"
          @click="toggleAddOn"
        >{{ addOnEnabled ? 'Disable add-on' : 'Enable appointments' }}</button>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <p class="adm-empty__body">Select a site from the header to manage its appointments.</p>
    </div>

    <template v-else>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
      <p v-if="loading" class="adm-muted">Loading…</p>

      <div v-if="!addOnEnabled" class="adm-card adm-card--soft addon-gate">
        <p>
          The Appointments add-on is currently <strong>off</strong> for this site. Enable it above
          to start accepting bookings on your contact page.
        </p>
      </div>

      <div class="adm-grid">
        <!-- Services -->
        <section class="adm-card">
          <h2 class="adm-h2">Services</h2>
          <p class="adm-muted adm-mb">
            Linked to your <RouterLink to="/admin/catalog" class="adm-link">Services page</RouterLink> —
            everything listed there is bookable automatically. Set durations here.
          </p>
          <p v-if="syncStatus" class="adm-muted adm-mb">{{ syncStatus }}</p>

          <ul v-if="services.length" class="svc-list">
            <li v-for="(s, i) in services" :key="i" class="svc-row">
              <input class="adm-input svc-row__label" v-model="s.label" placeholder="Label (e.g. Haircut)" @change="!s.id && (s.id = slugify(s.label))" />
              <input class="adm-input svc-row__desc" v-model="s.description" placeholder="Short description" />
              <div class="svc-row__dur"><NumberInput :model-value="s.durationMinutes" :min="5" :step="5" unit="min" @update:model-value="(v: number) => s.durationMinutes = v" /></div>
              <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="removeService(i)">Remove</button>
            </li>
          </ul>
          <p v-else class="adm-muted adm-mb">
            No services yet — add them on your
            <RouterLink to="/admin/catalog" class="adm-link">Services page</RouterLink> and they'll appear here.
          </p>
        </section>

        <!-- Hours -->
        <section class="adm-card">
          <h2 class="adm-h2">Hours</h2>
          <p class="adm-muted adm-mb">
            Use 24-hour ranges separated by commas. Example: <code>09:00-12:00, 13:00-17:00</code>.
            Leave a day blank to mark it closed.
          </p>
          <div v-if="resolved" class="hours-grid">
            <label v-for="d in DAYS" :key="d.idx" class="hours-row">
              <span class="hours-row__day">{{ d.label }}</span>
              <input class="adm-input" v-model="hoursDraft[d.idx]" placeholder="closed" />
            </label>
          </div>
          <div v-if="resolved" class="hours-meta">
            <TimezoneSelect v-model="resolved.timezone" label="Timezone" />
            <NumberInput v-model="resolved.slotMinutes" label="Slot granularity" :min="5" :step="5" unit="min" />
            <NumberInput v-model="resolved.minLeadHours" label="Min lead" :min="0" unit="hrs" />
            <NumberInput v-model="resolved.windowDays" label="Booking window" :min="1" :max="180" unit="days" />
          </div>
        </section>
      </div>

      <div class="save-bar">
        <button type="button" class="adm-btn adm-btn--primary" :disabled="saving" @click="saveConfig">
          {{ saving ? 'Saving…' : 'Save settings' }}
        </button>
        <span v-if="savedAt" class="adm-muted">Saved {{ new Date(savedAt).toLocaleTimeString() }}</span>
      </div>

      <!-- Bookings list -->
      <section class="adm-card">
        <h2 class="adm-h2">Upcoming appointments</h2>
        <p v-if="!bookings.length" class="adm-muted">No appointments yet.</p>
        <table v-else class="adm-table">
          <thead>
            <tr><th>When</th><th>Service</th><th>Customer</th><th>Contact</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="b in bookings" :key="b.id">
              <td>{{ fmtWhen(b.scheduledAt, b.timezone) }}</td>
              <td>{{ b.serviceLabel || b.type }} <small class="adm-muted">({{ b.durationMinutes }}m)</small></td>
              <td>{{ b.name }}</td>
              <td>
                <a :href="`mailto:${b.email}`">{{ b.email }}</a>
                <template v-if="b.phone"> · {{ b.phone }}</template>
              </td>
              <td>
                <span class="adm-badge" :class="b.status === 'cancelled' ? 'adm-badge--warn' : 'adm-badge--info'">{{ b.status }}</span>
              </td>
              <td>
                <button v-if="b.status !== 'cancelled'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="cancelBooking(b.id)">Cancel</button>
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
.adm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
@media (max-width: 900px) { .adm-grid { grid-template-columns: 1fr; } }
.adm-h2 { margin: 0 0 0.4rem; font-size: 1.05rem; }
.adm-mb { margin-bottom: 0.75rem; }
.addon-gate { padding: 1rem 1.1rem; margin-bottom: 1rem; }

.svc-list { list-style: none; padding: 0; margin: 0 0 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
.svc-row { display: grid; grid-template-columns: 8rem 10rem 1fr 5rem auto; gap: 0.4rem; align-items: center; }
.svc-row--new { padding-top: 0.5rem; border-top: 1px dashed var(--adm-border); }

.hours-grid { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.85rem; }
.hours-row { display: grid; grid-template-columns: 3rem 1fr; gap: 0.6rem; align-items: center; }
.hours-row__day { color: var(--adm-text-subtle); font-weight: 600; font-size: 0.85rem; }
.hours-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
.adm-field { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.8rem; color: var(--adm-text-subtle); }

.save-bar { display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0 1.25rem; }

.adm-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.adm-table th, .adm-table td { text-align: left; padding: 0.55rem 0.5rem; border-bottom: 1px solid var(--adm-border); }
.adm-table th { color: var(--adm-text-subtle); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
</style>
