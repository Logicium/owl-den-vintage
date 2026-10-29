<script setup lang="ts">
/**
 * Pickup time picker. A week of 15-minute slots is ~90 pills, which testers
 * read as a wall of noise, so: one day at a time, a busy day split into parts
 * of the day, and the next available slot as a single tap.
 */
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  slots: string[]
  timezone: string
}>()

const model = defineModel<string>({ default: '' })

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: props.timezone, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso))
}

const slotsByDay = computed(() => {
  const groups = new Map<string, string[]>()
  for (const s of props.slots) {
    const key = dayKey(s)
    const arr = groups.get(key) ?? []
    arr.push(s)
    groups.set(key, arr)
  }
  return [...groups.entries()]
})

const selectedDay = ref<string | null>(null)
const selectedPeriod = ref<string | null>(null)

/** Hour (0-23) of a slot in the shop's timezone, not the browser's. */
function hourIn(iso: string): number {
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: props.timezone, hour: 'numeric', hour12: false }).format(new Date(iso)), 10)
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: props.timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

function formatSlot(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: props.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

/** "Fri, Aug 14" -> { top: 'Fri', sub: 'Aug 14' } */
function dayChip(day: string): { top: string; sub: string } {
  const [weekday, ...rest] = day.split(', ')
  return { top: weekday ?? day, sub: rest.join(', ') }
}

const days = computed(() => slotsByDay.value.map(([day]) => day))

const daySlots = computed<string[]>(() => {
  const entry = slotsByDay.value.find(([day]) => day === selectedDay.value)
  return entry?.[1] ?? slotsByDay.value[0]?.[1] ?? []
})

const PERIODS: Array<{ id: string; label: string; test: (h: number) => boolean }> = [
  { id: 'morning', label: 'Morning', test: h => h < 12 },
  { id: 'afternoon', label: 'Afternoon', test: h => h >= 12 && h < 17 },
  { id: 'evening', label: 'Evening', test: h => h >= 17 },
]

const periods = computed(() =>
  PERIODS.map(p => ({ ...p, slots: daySlots.value.filter(s => p.test(hourIn(s))) })).filter(p => p.slots.length))

const PERIOD_THRESHOLD = 12
const usePeriods = computed(() => daySlots.value.length > PERIOD_THRESHOLD && periods.value.length > 1)

const visibleSlots = computed<string[]>(() => {
  if (!usePeriods.value) return daySlots.value
  const active = periods.value.find(p => p.id === selectedPeriod.value) ?? periods.value[0]
  return active?.slots ?? []
})

const soonest = computed<string | null>(() => props.slots[0] ?? null)

function pickSoonest() {
  const s = soonest.value
  if (!s) return
  model.value = s
  selectedDay.value = dayKey(s)
  selectedPeriod.value = PERIODS.find(p => p.test(hourIn(s)))?.id ?? null
}

function selectDay(day: string) {
  selectedDay.value = day
  selectedPeriod.value = null
  selectedPeriod.value = periods.value[0]?.id ?? null
}

watch(() => props.slots, () => {
  if (!props.slots.length) { selectedDay.value = null; selectedPeriod.value = null; return }
  // Land on the chosen slot's day when one is already picked (back from payment).
  const anchor = model.value && props.slots.includes(model.value) ? model.value : null
  selectedDay.value = anchor ? dayKey(anchor) : (days.value[0] ?? null)
  selectedPeriod.value = anchor ? (PERIODS.find(p => p.test(hourIn(anchor)))?.id ?? null) : (periods.value[0]?.id ?? null)
}, { immediate: true })

defineExpose({ formatSlot })
</script>

<template>
  <div class="ap-pick">
    <p v-if="!slots.length" class="ap-pick__empty">No pickup times available right now.</p>

    <template v-else>
      <button
        v-if="soonest"
        type="button"
        class="ap-pick__soonest"
        :class="{ 'is-active': model === soonest }"
        @click="pickSoonest"
      >
        <span class="ap-pick__soonest-label">Soonest</span>
        <span class="ap-pick__soonest-time">{{ formatSlot(soonest) }}</span>
      </button>

      <div class="ap-pick__days" role="tablist" aria-label="Pickup day">
        <button
          v-for="day in days" :key="day"
          type="button" role="tab"
          class="ap-pick__day" :class="{ 'is-active': day === selectedDay }"
          :aria-selected="day === selectedDay"
          @click="selectDay(day)"
        >
          <span class="ap-pick__day-top">{{ dayChip(day).top }}</span>
          <span class="ap-pick__day-sub">{{ dayChip(day).sub }}</span>
        </button>
      </div>

      <div v-if="usePeriods" class="ap-pick__periods" role="tablist" aria-label="Time of day">
        <button
          v-for="p in periods" :key="p.id"
          type="button" role="tab"
          class="ap-pick__period" :class="{ 'is-active': p.id === selectedPeriod }"
          :aria-selected="p.id === selectedPeriod"
          @click="selectedPeriod = p.id"
        >
          {{ p.label }} <span class="ap-pick__period-count">{{ p.slots.length }}</span>
        </button>
      </div>

      <div class="ap-pick__grid">
        <label v-for="s in visibleSlots" :key="s" class="ap-pick__slot">
          <input v-model="model" type="radio" name="pickup" :value="s" required />
          <span>{{ timeLabel(s) }}</span>
        </label>
      </div>

      <p v-if="model" class="ap-pick__chosen">Pickup <strong>{{ formatSlot(model) }}</strong></p>
    </template>
  </div>
</template>

<style scoped>
.ap-pick__empty { color: var(--ap-ink-muted); margin: 0; }
.ap-pick__soonest {
  display: flex; align-items: baseline; gap: 0.6rem;
  width: 100%;
  margin: 0 0 0.9rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--ap-line, #ddd);
  border-radius: var(--ap-radius, 10px);
  background: var(--ap-surface-alt, #fafafa);
  color: var(--ap-ink, #111);
  font: inherit; cursor: pointer; text-align: left;
  transition: border-color 140ms ease, background 140ms ease;
}
.ap-pick__soonest:hover { border-color: var(--ap-ink, #111); }
.ap-pick__soonest.is-active { background: var(--ap-ink, #111); border-color: var(--ap-ink, #111); color: var(--ap-surface, #fff); }
.ap-pick__soonest-label {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.62rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.7;
}
.ap-pick__soonest-time { font-size: 0.95rem; font-weight: 600; }
.ap-pick__days { display: flex; gap: 0.35rem; overflow-x: auto; padding-bottom: 0.35rem; margin-bottom: 0.6rem; scrollbar-width: none; }
.ap-pick__days::-webkit-scrollbar { display: none; }
.ap-pick__day {
  display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
  flex: 0 0 auto; min-width: 4.6rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--ap-line, #ddd);
  border-radius: var(--ap-radius, 10px);
  background: var(--ap-surface, #fff); color: var(--ap-ink, #111);
  font: inherit; cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}
.ap-pick__day:hover { border-color: var(--ap-ink, #111); }
.ap-pick__day.is-active { background: var(--ap-ink, #111); border-color: var(--ap-ink, #111); color: var(--ap-surface, #fff); }
.ap-pick__day-top { font-size: 0.82rem; font-weight: 600; }
.ap-pick__day-sub { font-size: 0.68rem; opacity: 0.72; white-space: nowrap; }
.ap-pick__periods { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.6rem; }
.ap-pick__period {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border: 0; border-bottom: 2px solid transparent; background: none;
  color: var(--ap-ink-muted, #666);
  font: inherit; font-size: 0.82rem; cursor: pointer;
  transition: color 140ms ease, border-color 140ms ease;
}
.ap-pick__period:hover { color: var(--ap-ink, #111); }
.ap-pick__period.is-active { color: var(--ap-ink, #111); border-bottom-color: var(--ap-primary, #111); font-weight: 600; }
.ap-pick__period-count { font-family: var(--ap-font-mono, monospace); font-size: 0.62rem; opacity: 0.6; }
.ap-pick__grid { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.ap-pick__slot {
  display: inline-flex; align-items: center;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--ap-line, #ddd); border-radius: 999px;
  font-size: 0.85rem; cursor: pointer;
  background: var(--ap-mute, #fafafa);
}
.ap-pick__slot input { margin: 0; appearance: none; width: 0; height: 0; }
.ap-pick__slot:has(input:checked) { background: var(--ap-ink, #111); color: var(--ap-surface, #fff); border-color: var(--ap-ink, #111); }
.ap-pick__chosen { margin: 0.7rem 0 0; font-size: 0.85rem; color: var(--ap-ink-muted, #666); }
.ap-pick__chosen strong { color: var(--ap-ink, #111); }
</style>
