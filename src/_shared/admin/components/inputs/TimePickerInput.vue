<script setup lang="ts">
/**
 * TimePickerInput — a bespoke, Material-Android-style time selector.
 * v-model holds a 24-hour "HH:MM" string ('' when empty).
 *
 * Owners can still TYPE the time (e.g. "5:30 pm", "17:30", "1730") into the
 * field — it's parsed on blur/Enter. Clicking the clock icon opens an analog
 * dial: tap the hour, then tap the minute, flip AM/PM. Far friendlier than
 * asking a restaurant owner to hand-type 24-hour timeslots.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Clock } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  /** Minute granularity offered on the dial. */
  step?: number
  ariaLabel?: string
}>(), { step: 5, ariaLabel: 'Time' })

const model = defineModel<string>({ default: '' })

const open = ref(false)
const mode = ref<'hour' | 'minute'>('hour')
const rootEl = ref<HTMLElement | null>(null)
const typed = ref('')

// ── Parse the model into hour24 / minute ──
function parse24(v: string): { h: number; m: number } | null {
  const mt = /^(\d{1,2}):(\d{2})$/.exec((v || '').trim())
  if (!mt) return null
  const h = Number(mt[1]), m = Number(mt[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

const parsed = computed(() => parse24(model.value))
const hour24 = computed(() => parsed.value?.h ?? 9)
const minute = computed(() => parsed.value?.m ?? 0)
const ampm = computed<'AM' | 'PM'>(() => (hour24.value >= 12 ? 'PM' : 'AM'))
const hour12 = computed(() => {
  const h = hour24.value % 12
  return h === 0 ? 12 : h
})

/** Human display for the closed trigger / typed field. */
const display = computed(() => {
  if (!parsed.value) return ''
  return `${hour12.value}:${String(minute.value).padStart(2, '0')} ${ampm.value}`
})

watch([open, display], () => { if (open.value) typed.value = display.value })

// ── Commit helpers ──
function commit(h24: number, m: number) {
  model.value = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function to24(h12: number, m: number, ap: 'AM' | 'PM') {
  let h = h12 % 12
  if (ap === 'PM') h += 12
  return { h, m }
}

function setHour(h12: number) {
  const { h } = to24(h12, minute.value, ampm.value)
  commit(h, minute.value)
  mode.value = 'minute'
}
function setMinute(m: number) {
  commit(hour24.value, m)
}
function setAmPm(ap: 'AM' | 'PM') {
  if (ap === ampm.value) return
  const { h } = to24(hour12.value, minute.value, ap)
  commit(h, minute.value)
}

// ── Typed entry — accept "5:30pm", "17:30", "1730", "5 pm" ──
function commitTyped() {
  const raw = typed.value.trim().toLowerCase()
  if (!raw) { model.value = ''; return }
  const ap = /p/.test(raw) ? 'PM' : /a/.test(raw) ? 'AM' : null
  const digits = raw.replace(/[^\d:]/g, '')
  let h = NaN, m = 0
  if (digits.includes(':')) {
    const [hs, ms] = digits.split(':')
    h = Number(hs); m = Number(ms ?? '0')
  } else if (digits.length <= 2) {
    h = Number(digits)
  } else {
    h = Number(digits.slice(0, digits.length - 2))
    m = Number(digits.slice(-2))
  }
  if (Number.isNaN(h) || Number.isNaN(m) || m > 59) { typed.value = display.value; return }
  if (ap) {
    const c = to24(((h % 12) || 12), m, ap)
    commit(c.h, c.m)
  } else {
    commit(Math.min(23, h), m)
  }
}

// ── Dial geometry ──
const hourNumbers = Array.from({ length: 12 }, (_, i) => i + 1) // 1..12
const minuteNumbers = computed(() => {
  const out: number[] = []
  for (let m = 0; m < 60; m += props.step) out.push(m)
  return out
})
/** Position on the dial from a 0..1 fraction measured CLOCKWISE from the top
    (fraction 0 / 1 = 12 o'clock, 0.25 = 3 o'clock, 0.5 = 6 o'clock). */
function pos(fraction: number) {
  const a = fraction * 2 * Math.PI
  return { left: `${50 + 40 * Math.sin(a)}%`, top: `${50 - 40 * Math.cos(a)}%` }
}
// Hand rotation in degrees, clockwise from straight-up (0° = 12 / :00).
const handAngle = computed(() => {
  if (mode.value === 'hour') return (hour12.value % 12) * 30
  return minute.value * 6
})

function onDocClick(e: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) { commitTyped(); open.value = false }
}
function toggle() {
  open.value = !open.value
  if (open.value) mode.value = 'hour'
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="rootEl" class="tp">
    <div class="tp__control" :class="{ 'is-open': open }">
      <input
        class="tp__input"
        :value="open ? typed : display"
        :placeholder="'--:--'"
        :aria-label="ariaLabel"
        inputmode="numeric"
        @focus="open = true"
        @input="typed = ($event.target as HTMLInputElement).value"
        @keydown.enter.prevent="commitTyped(); open = false"
      />
      <button type="button" class="tp__toggle" :aria-label="`Open clock for ${ariaLabel}`" @click="toggle">
        <Clock :size="15" />
      </button>
    </div>

    <div v-if="open" class="tp__pop">
      <!-- digital header -->
      <div class="tp__digits">
        <button type="button" class="tp__seg" :class="{ 'is-active': mode === 'hour' }" @click="mode = 'hour'">{{ String(hour12).padStart(2, '0') }}</button>
        <span class="tp__colon">:</span>
        <button type="button" class="tp__seg" :class="{ 'is-active': mode === 'minute' }" @click="mode = 'minute'">{{ String(minute).padStart(2, '0') }}</button>
        <div class="tp__ampm">
          <button type="button" :class="{ 'is-active': ampm === 'AM' }" @click="setAmPm('AM')">AM</button>
          <button type="button" :class="{ 'is-active': ampm === 'PM' }" @click="setAmPm('PM')">PM</button>
        </div>
      </div>

      <!-- analog dial -->
      <div class="tp__dial">
        <span class="tp__center" />
        <span class="tp__hand" :style="{ transform: `rotate(${handAngle}deg)` }" />
        <template v-if="mode === 'hour'">
          <button
            v-for="h in hourNumbers" :key="`h${h}`"
            type="button" class="tp__num" :class="{ 'is-active': h === hour12 }"
            :style="pos(h / 12)" @click="setHour(h)"
          >{{ h }}</button>
        </template>
        <template v-else>
          <button
            v-for="m in minuteNumbers" :key="`m${m}`"
            type="button" class="tp__num" :class="{ 'is-active': m === minute }"
            :style="pos(m / 60)" @click="setMinute(m)"
          >{{ String(m).padStart(2, '0') }}</button>
        </template>
      </div>

      <div class="tp__actions">
        <button type="button" class="tp__done" @click="commitTyped(); open = false">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tp { position: relative; min-width: 0; }
.tp__control {
  display: flex; align-items: center; gap: 0.2rem;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius-sm);
  padding: 0 0.2rem 0 0.55rem;
  min-height: 2.4rem;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.tp__control.is-open, .tp__control:focus-within {
  border-color: var(--adm-accent);
  box-shadow: 0 0 0 3px var(--adm-accent-glow);
}
.tp__input {
  flex: 1; min-width: 0; width: 100%;
  background: none; border: none; outline: none; margin: 0;
  color: var(--adm-text); font: inherit; font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  padding: 0.45rem 0;
}
.tp__toggle {
  display: grid; place-items: center;
  width: 1.9rem; height: 1.9rem; flex-shrink: 0;
  background: none; border: none; cursor: pointer;
  color: var(--adm-text-muted); border-radius: var(--adm-radius-sm);
}
.tp__toggle:hover { color: var(--adm-accent); background: var(--adm-surface-3); }

.tp__pop {
  position: absolute; z-index: 60; top: calc(100% + 0.35rem); left: 0;
  width: 264px; padding: 0.9rem;
  background: var(--adm-surface);
  border: 1px solid var(--adm-border-strong);
  border-radius: var(--adm-radius);
  box-shadow: var(--adm-shadow-lg);
  animation: tp-pop 130ms ease both;
}
@keyframes tp-pop { from { opacity: 0; transform: translateY(-4px); } }

.tp__digits { display: flex; align-items: center; gap: 0.15rem; margin-bottom: 0.85rem; }
.tp__seg {
  font-family: var(--adm-font-mono); font-size: 1.9rem; line-height: 1;
  background: var(--adm-surface-2); color: var(--adm-text-muted);
  border: 1px solid transparent; border-radius: var(--adm-radius-sm);
  padding: 0.25rem 0.55rem; cursor: pointer; font-variant-numeric: tabular-nums;
  transition: color 120ms ease, background 120ms ease, border-color 120ms ease;
}
.tp__seg.is-active { color: var(--adm-accent); background: color-mix(in srgb, var(--adm-accent) 14%, transparent); border-color: color-mix(in srgb, var(--adm-accent) 40%, transparent); }
.tp__colon { font-size: 1.6rem; color: var(--adm-text-muted); padding: 0 0.1rem; }
.tp__ampm { display: flex; flex-direction: column; gap: 0.2rem; margin-left: auto; }
.tp__ampm button {
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em;
  padding: 0.2rem 0.5rem; cursor: pointer;
  background: var(--adm-surface-2); color: var(--adm-text-muted);
  border: 1px solid var(--adm-border); border-radius: var(--adm-radius-sm);
}
.tp__ampm button.is-active { color: var(--adm-on-accent); background: var(--adm-accent); border-color: var(--adm-accent); }

.tp__dial {
  position: relative;
  width: 208px; height: 208px; margin: 0 auto;
  border-radius: 50%;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border);
}
.tp__center {
  position: absolute; left: 50%; top: 50%; width: 8px; height: 8px;
  transform: translate(-50%, -50%); border-radius: 50%;
  background: var(--adm-accent); z-index: 2;
}
.tp__hand {
  position: absolute; left: 50%; bottom: 50%;
  width: 2px; height: 40%;
  background: var(--adm-accent);
  /* Pivot at the dial centre (the hand's bottom edge) so rotate(0deg) points
     straight up to 12 / :00, and rotates clockwise from there. */
  transform-origin: bottom center;
  translate: -50% 0;
  z-index: 1;
}
.tp__num {
  position: absolute; transform: translate(-50%, -50%);
  width: 2rem; height: 2rem; display: grid; place-items: center;
  border-radius: 50%; border: none; cursor: pointer;
  background: transparent; color: var(--adm-text);
  font: inherit; font-size: 0.82rem; font-variant-numeric: tabular-nums;
  z-index: 3; transition: background 110ms ease, color 110ms ease;
}
.tp__num:hover { background: var(--adm-surface-3); }
.tp__num.is-active { background: var(--adm-accent); color: var(--adm-on-accent); font-weight: 700; }

.tp__actions { display: flex; justify-content: flex-end; margin-top: 0.7rem; }
.tp__done {
  background: var(--adm-accent); color: var(--adm-on-accent);
  border: none; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 0.8rem; font-weight: 700;
  padding: 0.4rem 1.1rem;
}
.tp__done:hover { background: var(--adm-accent-soft); }
</style>
