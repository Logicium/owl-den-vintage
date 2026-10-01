<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { type BookingServiceDTO } from '../../platform/contentClient'
import { apiClient } from '../../platform/apiClient'
import { PLATFORM_SLUG, DEMO_MODE } from '../../platform/config'
import DemoBadge from '../DemoBadge.vue'

type PlatformBookingType = 'demo' | 'walkthrough' | 'photo-campaign'

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    intro?: string
    /** Override the site slug (defaults to this deployment's PLATFORM_SLUG). */
    siteSlug?: string
    /** Restrict offered platform types (ignored when the site has owner-defined services). */
    types?: PlatformBookingType[]
    /** Pre-select a type id (platform type or service id). */
    defaultType?: string
  }>(),
  { eyebrow: 'Book a session', title: 'Pick a time' },
)

interface TypeOption {
  id: string
  label: string
  description?: string
}

const PLATFORM_LABEL: Record<PlatformBookingType, string> = {
  demo: 'Demo',
  walkthrough: 'Walkthrough',
  'photo-campaign': 'Photo campaign',
}
const PLATFORM_DESC: Record<PlatformBookingType, string> = {
  demo: 'Quick guided tour of the platform.',
  walkthrough: 'Hands-on session tailored to your project.',
  'photo-campaign': 'On-site shoot to refresh your imagery.',
}

const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

// Wizard state
const type = ref<string>(props.defaultType || 'demo')
const slots = ref<string[]>([])
const durationMinutes = ref(30)
const timezone = ref<string>('')
const enabledTypes = ref<string[]>([])
const services = ref<BookingServiceDTO[]>([])
const loadingSlots = ref(false)
const loadError = ref<string | null>(null)

const selectedDate = ref<string | null>(null) // "YYYY-MM-DD" in display tz
const selectedSlot = ref<string | null>(null) // ISO UTC

const form = ref({ name: '', email: '', phone: '', notes: '' })
const submitting = ref(false)
const submitError = ref<string | null>(null)

interface Confirmed {
  id: string
  scheduledAt: string
  durationMinutes: number
  type: string
  serviceLabel?: string | null
  icsUrl: string
  timezone?: string
}
const confirmed = ref<Confirmed | null>(null)

const displayTz = computed(() => timezone.value || Intl.DateTimeFormat().resolvedOptions().timeZone)

/** When the site has owner-defined services, those replace the platform type list entirely. */
const offeredOptions = computed<TypeOption[]>(() => {
  if (services.value.length) {
    return services.value.map(s => ({ id: s.id, label: s.label, description: s.description }))
  }
  const fromServer = enabledTypes.value.length
    ? (enabledTypes.value.filter((t): t is PlatformBookingType => t in PLATFORM_LABEL))
    : (['demo', 'walkthrough', 'photo-campaign'] as PlatformBookingType[])
  const filtered = props.types && props.types.length
    ? fromServer.filter(t => props.types!.includes(t))
    : fromServer
  return filtered.map(t => ({ id: t, label: PLATFORM_LABEL[t], description: PLATFORM_DESC[t] }))
})

function labelFor(id: string): string {
  return offeredOptions.value.find(o => o.id === id)?.label || id
}

function localDayKey(iso: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: displayTz.value,
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return dtf.format(new Date(iso))
}

const slotsByDay = computed(() => {
  const out = new Map<string, string[]>()
  for (const iso of slots.value) {
    const key = localDayKey(iso)
    if (!out.has(key)) out.set(key, [])
    out.get(key)!.push(iso)
  }
  return out
})

const availableDays = computed(() => Array.from(slotsByDay.value.keys()))

const slotsForSelectedDay = computed(() =>
  selectedDate.value ? (slotsByDay.value.get(selectedDate.value) || []) : [],
)

function formatDay(key: string): string {
  // key is "YYYY-MM-DD" already in display tz
  const [yStr, mStr, dStr] = key.split('-')
  const date = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr), 12))
  return new Intl.DateTimeFormat('en-US', {
    timeZone: displayTz.value,
    weekday: 'short', month: 'short', day: 'numeric',
  }).format(date)
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: displayTz.value,
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

function formatLong(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: displayTz.value,
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(iso))
}

async function loadAvailability() {
  if (!slug.value) {
    loadError.value = 'Booking unavailable — site not configured.'
    return
  }
  loadingSlots.value = true
  loadError.value = null
  try {
    const res = await apiClient.bookingAvailability(slug.value, type.value)
    slots.value = res.slots
    durationMinutes.value = res.durationMinutes
    timezone.value = res.timezone
    enabledTypes.value = res.enabledTypes
    services.value = res.services || []
    // If services exist and the current type isn't one of them, switch.
    if (services.value.length && !services.value.some(s => s.id === type.value)) {
      type.value = services.value[0]!.id
      // Will re-trigger via watcher; abort this load.
      return
    }
    // Reset selection
    selectedDate.value = availableDays.value[0] || null
    selectedSlot.value = null
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    slots.value = []
  } finally {
    loadingSlots.value = false
  }
}

async function submit() {
  if (!selectedSlot.value) return
  submitError.value = null
  submitting.value = true
  try {
    const res = await apiClient.createBooking({
      siteSlug: slug.value,
      type: type.value,
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim() || undefined,
      notes: form.value.notes.trim() || undefined,
      scheduledAt: selectedSlot.value,
      timezone: displayTz.value,
    })
    confirmed.value = {
      id: res.id,
      scheduledAt: res.scheduledAt,
      durationMinutes: res.durationMinutes,
      type: res.type,
      serviceLabel: res.serviceLabel,
      icsUrl: res.icsUrl,
      timezone: res.timezone,
    }
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Could not complete booking. Please try again.'
  } finally {
    submitting.value = false
  }
}

function reset() {
  confirmed.value = null
  selectedSlot.value = null
  form.value = { name: '', email: '', phone: '', notes: '' }
  loadAvailability()
}

watch(type, () => { loadAvailability() })
onMounted(() => { loadAvailability() })
</script>

<template>
  <section class="ap-section ap-booking" :aria-label="title">
    <div class="ap-container">
      <DemoBadge add-on="Appointments" note="Everything below is fully interactive — bookings are simulated and no calendar invite is sent." />
      <header class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="intro" class="ap-booking__intro">{{ intro }}</p>
      </header>

      <!-- ── Confirmation panel ── -->
      <div v-if="confirmed" class="ap-booking__confirmation">
        <div class="ap-booking__confirmation-icon" aria-hidden="true">✓</div>
        <h3>You're booked.</h3>
        <p class="ap-booking__confirmation-when">
          {{ formatLong(confirmed.scheduledAt) }}
        </p>
        <p class="ap-booking__confirmation-sub">
          {{ confirmed.serviceLabel || labelFor(confirmed.type) }} · {{ confirmed.durationMinutes }} min
        </p>
        <p class="ap-booking__confirmation-sub">
          A confirmation was sent to your email.
        </p>
        <div class="ap-booking__confirmation-actions">
          <a :href="confirmed.icsUrl" class="ap-btn" download>Add to calendar</a>
          <button type="button" class="ap-btn ap-btn--ghost" @click="reset">Book another</button>
        </div>
      </div>

      <!-- ── Booking wizard ── -->
      <div v-else class="ap-booking__grid">
        <!-- Type selector -->
        <div class="ap-booking__types" role="radiogroup" aria-label="Session type">
          <button
            v-for="opt in offeredOptions"
            :key="opt.id"
            type="button"
            role="radio"
            :aria-checked="type === opt.id"
            class="ap-booking__type"
            :class="{ 'is-active': type === opt.id }"
            @click="type = opt.id"
          >
            <span class="ap-booking__type-label">{{ opt.label }}</span>
            <span v-if="opt.description" class="ap-booking__type-desc">{{ opt.description }}</span>
          </button>
        </div>

        <!-- Date picker -->
        <div class="ap-booking__pane">
          <p class="ap-booking__pane-label">Choose a day</p>
          <div v-if="loadingSlots" class="ap-booking__hint">Loading availability…</div>
          <div v-else-if="loadError" class="ap-booking__error">{{ loadError }}</div>
          <div v-else-if="availableDays.length === 0" class="ap-booking__hint">
            No openings in the next few weeks. Please check back soon.
          </div>
          <div v-else class="ap-booking__days">
            <button
              v-for="day in availableDays"
              :key="day"
              type="button"
              class="ap-booking__day"
              :class="{ 'is-active': selectedDate === day }"
              @click="selectedDate = day; selectedSlot = null"
            >
              {{ formatDay(day) }}
              <small>{{ slotsByDay.get(day)?.length || 0 }} slots</small>
            </button>
          </div>
        </div>

        <!-- Time picker -->
        <div class="ap-booking__pane">
          <p class="ap-booking__pane-label">Choose a time
            <small v-if="timezone" class="ap-booking__tz">({{ displayTz }})</small>
          </p>
          <div v-if="!selectedDate" class="ap-booking__hint">Pick a day first.</div>
          <div v-else-if="slotsForSelectedDay.length === 0" class="ap-booking__hint">No times on this day.</div>
          <div v-else class="ap-booking__times">
            <button
              v-for="iso in slotsForSelectedDay"
              :key="iso"
              type="button"
              class="ap-booking__time"
              :class="{ 'is-active': selectedSlot === iso }"
              @click="selectedSlot = iso"
            >
              {{ formatTime(iso) }}
            </button>
          </div>
        </div>

        <!-- Details form -->
        <form
          class="ap-booking__form"
          :class="{ 'is-disabled': !selectedSlot }"
          @submit.prevent="submit"
        >
          <p class="ap-booking__pane-label">Your details</p>
          <div class="ap-field">
            <label for="ap-bk-name">Name</label>
            <input id="ap-bk-name" v-model="form.name" required class="ap-input" autocomplete="name" />
          </div>
          <div class="ap-field">
            <label for="ap-bk-email">Email</label>
            <input id="ap-bk-email" v-model="form.email" required type="email" class="ap-input" autocomplete="email" />
          </div>
          <div class="ap-field">
            <label for="ap-bk-phone">Phone <small>(optional)</small></label>
            <input id="ap-bk-phone" v-model="form.phone" type="tel" class="ap-input" autocomplete="tel" />
          </div>
          <div class="ap-field">
            <label for="ap-bk-notes">Notes <small>(optional)</small></label>
            <textarea id="ap-bk-notes" v-model="form.notes" rows="3" class="ap-textarea" />
          </div>
          <p v-if="submitError" class="ap-booking__error">{{ submitError }}</p>
          <button
            type="submit"
            class="ap-btn"
            :disabled="!selectedSlot || submitting || !form.name || !form.email"
          >
            {{ submitting ? 'Booking…' : selectedSlot ? `Confirm ${formatTime(selectedSlot)}` : 'Pick a time first' }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ap-booking { padding: 4rem 0; }
.ap-booking__intro { max-width: 38rem; margin: 0.75rem 0 0; color: var(--ap-ink-muted); }

.ap-booking__grid {
  display: grid;
  gap: 1.5rem;
  margin-top: 2rem;
  grid-template-columns: 1fr;
  grid-template-areas:
    "types"
    "days"
    "times"
    "form";
}
@media (min-width: 900px) {
  .ap-booking__grid {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "types types"
      "days  times"
      "form  form";
  }
}
@media (min-width: 1200px) {
  .ap-booking__grid {
    grid-template-columns: 1.2fr 1fr 1.2fr;
    grid-template-areas:
      "types days  times"
      "form  form  form";
  }
}
.ap-booking__types {
  grid-area: types;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}
.ap-booking__type {
  text-align: left;
  padding: 1rem 1.25rem;
  border: 1px solid var(--ap-line, #d8d4cc);
  background: var(--ap-paper, #fff);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.05s;
  color: inherit;
  font: inherit;
}
.ap-booking__type:hover { border-color: var(--ap-primary, #333); }
.ap-booking__type.is-active {
  border-color: var(--ap-primary, #333);
  box-shadow: 0 0 0 2px var(--ap-primary, #333) inset;
}
.ap-booking__type-label { font-weight: 600; }
.ap-booking__type-desc { font-size: 0.85rem; color: var(--ap-ink-muted, #666); }

.ap-booking__pane {
  background: var(--ap-paper, #fff);
  border: 1px solid var(--ap-line, #d8d4cc);
  border-radius: 10px;
  padding: 1.25rem;
}
.ap-booking__pane:nth-of-type(1) { grid-area: days; }
.ap-booking__pane:nth-of-type(2) { grid-area: times; }

.ap-booking__pane-label {
  margin: 0 0 0.75rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}
.ap-booking__tz { font-weight: 400; color: var(--ap-ink-muted, #666); font-size: 0.8rem; }

.ap-booking__days,
.ap-booking__times {
  display: grid;
  gap: 0.5rem;
  max-height: 22rem;
  overflow: auto;
  padding-right: 0.25rem;
}
.ap-booking__days { grid-template-columns: 1fr; }
.ap-booking__times { grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); }

.ap-booking__day,
.ap-booking__time {
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--ap-line, #d8d4cc);
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  color: inherit;
  font: inherit;
  transition: background 0.1s, border-color 0.1s;
}
.ap-booking__day small { color: var(--ap-ink-muted, #666); font-size: 0.75rem; }
.ap-booking__time { justify-content: center; }
.ap-booking__day:hover,
.ap-booking__time:hover { border-color: var(--ap-primary, #333); }
.ap-booking__day.is-active,
.ap-booking__time.is-active {
  background: var(--ap-primary, #333);
  color: var(--ap-on-primary, #fff);
  border-color: var(--ap-primary, #333);
}
.ap-booking__day.is-active small,
.ap-booking__time.is-active small { color: inherit; opacity: 0.85; }

.ap-booking__form {
  grid-area: form;
  background: var(--ap-paper, #fff);
  border: 1px solid var(--ap-line, #d8d4cc);
  border-radius: 10px;
  padding: 1.5rem;
  display: grid;
  gap: 0.75rem;
}
.ap-booking__form.is-disabled { opacity: 0.85; }
.ap-booking__form .ap-btn { justify-self: start; margin-top: 0.5rem; }

.ap-booking__hint { color: var(--ap-ink-muted, #666); font-size: 0.9rem; padding: 0.5rem 0; }
.ap-booking__error {
  color: #c0392b;
  background: #fdf2f2;
  border: 1px solid #f5c6c6;
  border-radius: 6px;
  padding: 0.6rem 0.85rem;
  font-size: 0.85rem;
}

.ap-booking__confirmation {
  margin-top: 2rem;
  text-align: center;
  padding: 2.5rem 1.5rem;
  border: 1px solid var(--ap-line, #d8d4cc);
  border-radius: 12px;
  background: var(--ap-paper, #fff);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.ap-booking__confirmation-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--ap-primary, #333);
  color: var(--ap-on-primary, #fff);
  display: grid; place-items: center;
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
}
.ap-booking__confirmation h3 { margin: 0; font-size: 1.5rem; }
.ap-booking__confirmation-when { font-size: 1.1rem; font-weight: 600; margin: 0.25rem 0 0; }
.ap-booking__confirmation-sub { color: var(--ap-ink-muted, #666); margin: 0; }
.ap-booking__confirmation-actions {
  display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; justify-content: center;
}
</style>
