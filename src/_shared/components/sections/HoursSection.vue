<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  eyebrow?: string
  title?: string
  hours: Array<{ day: string; open: string }>
  note?: string
  /** Marquee variant labels. Owner-editable. */
  todayLabelText?: string
  closedLabel?: string
}>(), { title: 'Hours', todayLabelText: 'Today', closedLabel: '— closed —' })

// Naive "open now" hint for marquee variant — uses today's row only.
const todayLabel = computed(() => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]!
})
const todayRow = computed(() =>
  props.hours.find(h => h.day.toLowerCase().startsWith(todayLabel.value.slice(0, 3).toLowerCase())),
)
</script>

<!--
  Hours section with five selectable layouts (data-hours-style on <html>):
  Style 1 · Ledger   — original 2-col list with hairline rows
  Style 2 · Marquee  — full-width "open now" headline + horizontal day strip
  Style 3 · Pillar   — single tall card with vertical day rail, dot timeline aesthetic
  Style 4 · Tiles    — 7 day tiles with today highlighted in primary color
  Style 5 · Ribbon   — compressed inline ribbon across full width
-->
<template>
  <section class="ap-section ap-section--alt ap-hours">
    <!-- ── Style 1 · Ledger ───────────────────────────── -->
    <div class="ap-container ap-hours__ledger">
      <div class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="note" class="ap-hours__note">{{ note }}</p>
      </div>
      <ul class="ap-hours__list">
        <li v-for="row in hours" :key="row.day">
          <span class="ap-hours__day">{{ row.day }}</span>
          <span class="ap-hours__dot" />
          <span class="ap-hours__time">{{ row.open }}</span>
        </li>
      </ul>
    </div>

    <!-- ── Style 2 · Marquee ──────────────────────────── -->
    <div class="ap-container ap-hours__marquee">
      <div class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="note" class="ap-hours__note">{{ note }}</p>
      </div>
      <div class="ap-hours__marquee-today">
        <p class="ap-hours__marquee-today-label">{{ todayLabelText }}</p>
        <p class="ap-hours__marquee-title">
          <span class="ap-hours__marquee-day">{{ todayRow?.day || todayLabel }}</span>
          <span class="ap-hours__marquee-time">{{ todayRow?.open || closedLabel }}</span>
        </p>
      </div>
      <ul class="ap-hours__strip">
        <li v-for="row in hours" :key="row.day">
          <span class="ap-hours__strip-day">{{ row.day.slice(0, 3) }}</span>
          <span class="ap-hours__strip-time">{{ row.open }}</span>
        </li>
      </ul>
    </div>

    <!-- ── Style 3 · Pillar ───────────────────────────── -->
    <div class="ap-container ap-hours__pillar">
      <div class="ap-section-head ap-hours__pillar-aside">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="note" class="ap-hours__note">{{ note }}</p>
      </div>
      <ol class="ap-hours__rail">
        <li v-for="row in hours" :key="row.day">
          <span class="ap-hours__rail-marker" aria-hidden="true" />
          <div class="ap-hours__rail-body">
            <span class="ap-hours__rail-day">{{ row.day }}</span>
            <span class="ap-hours__rail-time">{{ row.open }}</span>
          </div>
        </li>
      </ol>
    </div>
    <!-- ── Style 4 · Tiles ────────────────── -->
    <div class="ap-container ap-hours__tiles">
      <div class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="note" class="ap-hours__note">{{ note }}</p>
      </div>
      <ul class="ap-hours__tiles-grid">
        <li v-for="row in hours" :key="row.day"
            class="ap-hours__tile"
            :class="{ 'is-today': row.day.toLowerCase().startsWith(todayLabel.slice(0, 3).toLowerCase()) }">
          <span class="ap-hours__tile-day">{{ row.day.slice(0, 3) }}</span>
          <span class="ap-hours__tile-day-full">{{ row.day }}</span>
          <span class="ap-hours__tile-time">{{ row.open }}</span>
        </li>
      </ul>
    </div>

    <!-- ── Style 5 · Ribbon ────────────────────── -->
    <div class="ap-hours__ribbon">
      <div class="ap-container">
        <div class="ap-section-head">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title }}</h2>
        </div>
      </div>
      <div class="ap-hours__ribbon-band" role="list">
        <div v-for="row in hours" :key="row.day" class="ap-hours__ribbon-cell" role="listitem"
             :class="{ 'is-today': row.day.toLowerCase().startsWith(todayLabel.slice(0, 3).toLowerCase()) }">
          <span class="ap-hours__ribbon-day">{{ row.day.slice(0, 3).toUpperCase() }}</span>
          <span class="ap-hours__ribbon-time">{{ row.open }}</span>
        </div>
      </div>
      <p v-if="note" class="ap-container ap-hours__ribbon-note">{{ note }}</p>
    </div>
  </section>
</template>

<style scoped>
/* ── Variant gating ─────────────────────────────────── */
.ap-hours__ledger,
.ap-hours__marquee,
.ap-hours__pillar,
.ap-hours__tiles,
.ap-hours__ribbon { display: none; }
[data-hours-style='1'] .ap-hours__ledger  { display: grid; }
[data-hours-style='2'] .ap-hours__marquee { display: block; }
[data-hours-style='3'] .ap-hours__pillar  { display: grid; }
[data-hours-style='4'] .ap-hours__tiles   { display: block; }
[data-hours-style='5'] .ap-hours__ribbon  { display: block; }
:root:not([data-hours-style]) .ap-hours__ledger { display: grid; }

.ap-hours__note { color: var(--ap-ink-muted); max-width: 40ch; }

/* ── Style 1 · Ledger (original) ────────────────────── */
.ap-hours__ledger {
  gap: clamp(2rem, 4vw, 4rem);
  grid-template-columns: 1fr 1fr; align-items: start;
}
.ap-hours__list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem; }
.ap-hours__list li {
  display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center;
  padding-bottom: 0.6rem; border-bottom: 1px solid var(--ap-line);
  font-family: var(--ap-font-heading); font-size: 1.05rem;
}
.ap-hours__list li:last-child { border-bottom: 0; }
.ap-hours__day { letter-spacing: var(--ap-tracking-heading); text-transform: var(--ap-heading-transform); }
.ap-hours__time { text-align: right; color: var(--ap-ink-muted); font-family: var(--ap-font-body); }
.ap-hours__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ap-primary); justify-self: center; }
@media (max-width: 720px) { .ap-hours__ledger { grid-template-columns: 1fr; } }

/* ── Style 2 · Marquee ──────────────────────────────── */
.ap-hours__marquee-head { text-align: center; margin-bottom: clamp(2rem, 4vw, 3rem); }
.ap-hours__marquee-heading {
  font-family: var(--ap-font-heading);
  font-size: clamp(1.4rem, 2.6vw, 2rem);
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
  margin: 0 0 0.5rem;
}
.ap-hours__marquee-today {
  font-family: var(--ap-font-mono); font-size: 0.78rem;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--ap-ink-muted); margin: 0.25rem 0;
}
.ap-hours__marquee-title {
  display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
  font-family: var(--ap-font-heading);
  letter-spacing: -0.02em; line-height: 0.95;
  margin: 0.25rem 0 1rem;
  text-transform: var(--ap-heading-transform);
}
.ap-hours__marquee-day  { font-size: clamp(2.5rem, 6vw, 4.5rem); }
.ap-hours__marquee-time {
  font-size: clamp(1.5rem, 3.5vw, 2.5rem);
  color: var(--ap-primary);
  font-weight: 600;
}
.ap-hours__strip {
  list-style: none; padding: 0; margin: 0;
  display: grid; grid-template-columns: repeat(7, 1fr);
  border-top: 1px solid var(--ap-line);
  border-bottom: 1px solid var(--ap-line);
}
.ap-hours__strip li {
  display: flex; flex-direction: column; align-items: center;
  padding: 1rem 0.5rem; gap: 0.4rem;
  border-right: 1px solid var(--ap-line);
}
.ap-hours__strip li:last-child { border-right: none; }
.ap-hours__strip-day {
  font-family: var(--ap-font-mono); font-size: 0.72rem;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ap-ink-muted);
}
.ap-hours__strip-time {
  font-family: var(--ap-font-heading); font-size: 0.95rem;
  text-align: center;
}
@media (max-width: 720px) {
  .ap-hours__strip { grid-template-columns: 1fr; }
  .ap-hours__strip li { flex-direction: row; justify-content: space-between; padding: 0.75rem 1rem; border-right: none; border-bottom: 1px solid var(--ap-line); }
  .ap-hours__strip li:last-child { border-bottom: none; }
}

/* ── Style 3 · Pillar ───────────────────────────────── */
.ap-hours__pillar {
  gap: clamp(2rem, 4vw, 4rem);
  grid-template-columns: 1fr 1fr; align-items: start;
}
.ap-hours__pillar-aside h2 { margin-top: 0.5rem; }
.ap-hours__rail {
  list-style: none; padding: 0; margin: 0;
  position: relative;
  display: grid; gap: 1.25rem;
}
.ap-hours__rail::before {
  content: ''; position: absolute;
  top: 0.6rem; bottom: 0.6rem; left: 5px;
  width: 2px; background: var(--ap-line);
}
.ap-hours__rail li {
  position: relative;
  display: grid; grid-template-columns: 24px 1fr; gap: 0.75rem;
  align-items: baseline;
}
.ap-hours__rail-marker {
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--ap-surface);
  border: 2px solid var(--ap-primary);
  margin-top: 0.4rem;
  z-index: 1;
}
.ap-hours__rail-body {
  display: flex; justify-content: space-between; gap: 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px dashed var(--ap-line);
}
.ap-hours__rail-day {
  font-family: var(--ap-font-heading); font-size: 1.05rem;
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-hours__rail-time { color: var(--ap-ink-muted); font-family: var(--ap-font-body); }
@media (max-width: 720px) { .ap-hours__pillar { grid-template-columns: 1fr; } }

/* ── Style 4 · Tiles ─────────────────────────────── */
.ap-hours__tiles-head { text-align: center; margin-bottom: clamp(1.5rem, 3vw, 2.5rem); }
.ap-hours__tiles-head h2 { margin: 0.4rem 0; }
.ap-hours__tiles-grid {
  list-style: none; padding: 0; margin: 0;
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 0.6rem;
}
.ap-hours__tile {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.3rem;
  background: var(--ap-surface);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius);
  padding: clamp(0.85rem, 1.6vw, 1.25rem) 0.5rem;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-height: clamp(110px, 16vh, 150px);
}
.ap-hours__tile:hover { transform: translateY(-3px); box-shadow: 0 8px 20px -10px color-mix(in srgb, var(--ap-ink) 30%, transparent); }
.ap-hours__tile-day {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.7rem; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ap-ink-muted);
}
.ap-hours__tile-day-full {
  font-family: var(--ap-font-heading);
  font-size: 1.05rem;
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-hours__tile-time {
  font-size: 0.85rem; color: var(--ap-ink-muted);
  font-family: var(--ap-font-body);
  margin-top: 0.25rem;
}
.ap-hours__tile.is-today {
  background: var(--ap-primary);
  border-color: var(--ap-primary);
  color: var(--ap-on-primary);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--ap-primary) 60%, transparent);
}
.ap-hours__tile.is-today .ap-hours__tile-day,
.ap-hours__tile.is-today .ap-hours__tile-time { color: color-mix(in srgb, var(--ap-on-primary) 80%, transparent); }
@media (max-width: 900px) {
  .ap-hours__tiles-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 560px) {
  .ap-hours__tiles-grid { grid-template-columns: repeat(2, 1fr); }
  .ap-hours__tile-day-full { display: none; }
}

/* ── Style 5 · Ribbon ───────────────────────────── */
.ap-hours__ribbon-head { text-align: center; margin-bottom: 1.5rem; }
.ap-hours__ribbon-head h2 { margin: 0.4rem 0 0; }
.ap-hours__ribbon-band {
  display: flex;
  width: 100%;
  background: var(--ap-ink);
  color: var(--ap-surface);
  overflow-x: auto;
  scrollbar-width: none;
}
.ap-hours__ribbon-band::-webkit-scrollbar { display: none; }
.ap-hours__ribbon-cell {
  flex: 1 0 auto;
  min-width: clamp(110px, 14vw, 160px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.3rem;
  padding: clamp(0.9rem, 2vw, 1.4rem) 1rem;
  border-right: 1px solid color-mix(in srgb, var(--ap-surface) 18%, transparent);
  text-align: center;
}
.ap-hours__ribbon-cell:last-child { border-right: 0; }
.ap-hours__ribbon-day {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.72rem; letter-spacing: 0.28em;
  color: color-mix(in srgb, var(--ap-surface) 60%, transparent);
}
.ap-hours__ribbon-time {
  font-family: var(--ap-font-heading); font-size: 1rem;
  color: var(--ap-surface);
}
.ap-hours__ribbon-cell.is-today {
  background: var(--ap-primary);
  color: var(--ap-on-primary);
}
.ap-hours__ribbon-cell.is-today .ap-hours__ribbon-day { color: color-mix(in srgb, var(--ap-on-primary) 75%, transparent); }
.ap-hours__ribbon-cell.is-today .ap-hours__ribbon-time { color: var(--ap-on-primary); }
.ap-hours__ribbon-note { color: var(--ap-ink-muted); text-align: center; margin-top: 1rem; }
</style>
