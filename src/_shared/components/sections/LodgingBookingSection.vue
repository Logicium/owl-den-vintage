<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { contentClient } from '../../platform/contentClient'
import { apiClient } from '../../platform/apiClient'
import { PLATFORM_SLUG, DEMO_MODE } from '../../platform/config'
import DemoBadge from '../DemoBadge.vue'

type RoomAvailability = Awaited<ReturnType<typeof contentClient.lodgingAvailability>>['rooms'][number]

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    intro?: string
    siteSlug?: string
  }>(),
  { eyebrow: 'Reserve', title: 'Book your stay' },
)

const slug = computed(() => props.siteSlug || PLATFORM_SLUG || (DEMO_MODE ? 'demo' : ''))

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const checkIn = ref<string>(todayPlus(1))
const checkOut = ref<string>(todayPlus(3))
const partySize = ref(2)

const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<Awaited<ReturnType<typeof contentClient.lodgingAvailability>> | null>(null)
const selected = ref<RoomAvailability | null>(null)
const form = ref({ name: '', email: '', phone: '', notes: '' })
const submitting = ref(false)
const submitError = ref<string | null>(null)

interface Confirmed {
  id: string
  roomLabel: string
  checkIn: string
  checkOut: string
  nights: number
  totalCents?: number
  currency?: string
}
const confirmed = ref<Confirmed | null>(null)

const nights = computed(() => result.value?.nights ?? 0)
const currency = computed(() => result.value?.currency ?? 'USD')

function money(cents?: number): string {
  if (cents == null) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.value }).format(cents / 100)
}

async function search() {
  if (!slug.value) {
    error.value = 'Booking unavailable — site not configured.'
    return
  }
  if (checkOut.value <= checkIn.value) {
    error.value = 'Check-out must be after check-in.'
    return
  }
  loading.value = true
  error.value = null
  selected.value = null
  try {
    result.value = await apiClient.lodgingAvailability(
      slug.value, checkIn.value, checkOut.value, partySize.value,
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    result.value = null
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!selected.value || !result.value) return
  submitting.value = true
  submitError.value = null
  try {
    const res = await apiClient.createReservation({
      siteSlug: slug.value,
      roomId: selected.value.id,
      checkIn: result.value.checkIn,
      checkOut: result.value.checkOut,
      partySize: partySize.value,
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim() || undefined,
      notes: form.value.notes.trim() || undefined,
    })
    confirmed.value = {
      id: res.id,
      roomLabel: res.roomLabel,
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      nights: res.nights,
      totalCents: res.totalCents,
      currency: res.currency,
    }
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Could not complete reservation.'
  } finally {
    submitting.value = false
  }
}

function reset() {
  confirmed.value = null
  selected.value = null
  result.value = null
  form.value = { name: '', email: '', phone: '', notes: '' }
}

onMounted(search)
watch([checkIn, checkOut, partySize], () => { selected.value = null })
</script>

<template>
  <section class="ap-section ap-lodging" :aria-label="title">
    <div class="ap-container">
      <DemoBadge add-on="Room reservations" />
      <header class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="intro" class="ap-lodging__intro">{{ intro }}</p>
      </header>

      <div v-if="confirmed" class="ap-lodging__confirmation">
        <div class="ap-lodging__confirmation-icon" aria-hidden="true">✓</div>
        <h3>Reservation confirmed.</h3>
        <p class="ap-lodging__confirmation-when">
          <strong>{{ confirmed.roomLabel }}</strong> · {{ confirmed.nights }} night{{ confirmed.nights === 1 ? '' : 's' }}
        </p>
        <p class="ap-lodging__confirmation-sub">
          {{ confirmed.checkIn }} → {{ confirmed.checkOut }}
        </p>
        <p v-if="confirmed.totalCents != null && confirmed.currency" class="ap-lodging__confirmation-sub">
          Total: <strong>{{ new Intl.NumberFormat('en-US', { style: 'currency', currency: confirmed.currency }).format(confirmed.totalCents / 100) }}</strong>
        </p>
        <p class="ap-lodging__confirmation-sub">A confirmation was sent to your email.</p>
        <button type="button" class="ap-btn ap-btn--ghost" @click="reset">Book another stay</button>
      </div>

      <template v-else>
        <form class="ap-lodging__search" @submit.prevent="search">
          <label class="ap-lodging__field">
            <span>Check-in</span>
            <input type="date" v-model="checkIn" :min="todayPlus(0)" required />
          </label>
          <label class="ap-lodging__field">
            <span>Check-out</span>
            <input type="date" v-model="checkOut" :min="todayPlus(1)" required />
          </label>
          <label class="ap-lodging__field">
            <span>Guests</span>
            <input type="number" min="1" max="20" v-model.number="partySize" required />
          </label>
          <button type="submit" class="ap-btn" :disabled="loading">
            {{ loading ? 'Searching…' : 'Find rooms' }}
          </button>
        </form>

        <p v-if="error" class="ap-lodging__error">{{ error }}</p>

        <div v-if="result" class="ap-lodging__rooms">
          <p v-if="!result.rooms.length" class="ap-lodging__hint">
            No rooms fit those dates and party size. Try adjusting the search.
          </p>
          <article
            v-for="room in result.rooms"
            :key="room.id"
            class="ap-lodging__room"
            :class="{ 'is-active': selected?.id === room.id, 'is-unavailable': !room.available }"
          >
            <img v-if="room.imageUrl" :src="room.imageUrl" :alt="room.label" class="ap-lodging__room-img" />
            <div class="ap-lodging__room-body">
              <h3>{{ room.label }}</h3>
              <p v-if="room.description" class="ap-lodging__room-desc">{{ room.description }}</p>
              <p class="ap-lodging__room-meta">Sleeps {{ room.capacity }}</p>
              <p v-if="room.totalCents != null" class="ap-lodging__room-price">
                <strong>{{ money(room.totalCents) }}</strong>
                <small>total · {{ nights }} night{{ nights === 1 ? '' : 's' }}</small>
              </p>
              <button
                v-if="room.available"
                type="button"
                class="ap-btn ap-btn--sm"
                :class="{ 'ap-btn--ghost': selected?.id !== room.id }"
                @click="selected = room"
              >{{ selected?.id === room.id ? 'Selected' : 'Select' }}</button>
              <span v-else class="ap-lodging__room-na">Not available</span>
            </div>
          </article>
        </div>

        <form
          v-if="result && selected"
          class="ap-lodging__form"
          @submit.prevent="submit"
        >
          <h3>Your details</h3>
          <div class="ap-lodging__form-grid">
            <label>
              <span>Name</span>
              <input v-model="form.name" required maxlength="200" />
            </label>
            <label>
              <span>Email</span>
              <input type="email" v-model="form.email" required />
            </label>
            <label>
              <span>Phone (optional)</span>
              <input v-model="form.phone" maxlength="50" />
            </label>
            <label class="ap-lodging__form-notes">
              <span>Anything we should know? (optional)</span>
              <textarea v-model="form.notes" rows="3" maxlength="2000" />
            </label>
          </div>
          <p v-if="submitError" class="ap-lodging__error">{{ submitError }}</p>
          <button type="submit" class="ap-btn" :disabled="submitting">
            {{ submitting ? 'Reserving…' : 'Confirm reservation' }}
          </button>
        </form>
      </template>
    </div>
  </section>
</template>

<style scoped>
.ap-lodging__search {
  display: grid;
  grid-template-columns: repeat(3, 1fr) auto;
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 1.5rem;
}
@media (max-width: 720px) { .ap-lodging__search { grid-template-columns: 1fr 1fr; } }
.ap-lodging__field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
.ap-lodging__field input { padding: 0.55rem 0.7rem; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; }

.ap-lodging__rooms { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.ap-lodging__room { display: flex; flex-direction: column; border: 1px solid currentColor; border-radius: 10px; overflow: hidden; opacity: 1; transition: opacity 0.15s, transform 0.15s; }
.ap-lodging__room.is-unavailable { opacity: 0.55; }
.ap-lodging__room.is-active { outline: 2px solid currentColor; transform: translateY(-2px); }
.ap-lodging__room-img { width: 100%; height: 160px; object-fit: cover; display: block; }
.ap-lodging__room-body { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
.ap-lodging__room-body h3 { margin: 0; font-size: 1.05rem; }
.ap-lodging__room-desc { margin: 0; font-size: 0.85rem; opacity: 0.8; }
.ap-lodging__room-meta { margin: 0; font-size: 0.8rem; opacity: 0.7; }
.ap-lodging__room-price { margin: 0.2rem 0; display: flex; flex-direction: column; }
.ap-lodging__room-price small { font-size: 0.7rem; opacity: 0.7; }
.ap-lodging__room-na { font-size: 0.85rem; opacity: 0.7; }

.ap-lodging__form { display: flex; flex-direction: column; gap: 0.75rem; max-width: 640px; margin-top: 1.5rem; }
.ap-lodging__form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.ap-lodging__form-notes { grid-column: 1 / -1; }
.ap-lodging__form label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
.ap-lodging__form input, .ap-lodging__form textarea { padding: 0.55rem 0.7rem; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; font: inherit; }

.ap-lodging__error { color: #b00; margin: 0.5rem 0; }
.ap-lodging__hint { opacity: 0.7; }

.ap-lodging__confirmation { text-align: center; padding: 2rem 0; }
.ap-lodging__confirmation-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.ap-lodging__confirmation-when { font-size: 1.15rem; }
.ap-lodging__confirmation-sub { opacity: 0.85; margin: 0.25rem 0; }
</style>
