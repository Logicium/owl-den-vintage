<script setup lang="ts">
interface Category { name: string; image: string; imageAlt?: string; url?: string; count?: number }

import OptimizedImage from '@apotome/archetype-shared/components/OptimizedImage.vue'

withDefaults(defineProps<{
  eyebrow?: string
  title?: string
  categories: Category[]
  /** Label after a category's item count, e.g. "12 items". Owner-editable. */
  countLabel?: string
}>(), { countLabel: 'items' })
</script>

<template>
  <section class="ap-section ap-section--alt ap-categories">
    <div class="ap-container">
      <div class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
      </div>

      <!-- ── Style 1 · Editorial overlay tiles (default) ── -->
      <div class="ap-categories__editorial">
        <a v-for="c in categories" :key="c.name" :href="c.url || '#'" class="ap-categories__tile">
          <div class="ap-categories__media">
            <OptimizedImage :src="c.image" :alt="c.imageAlt || c.name" />
          </div>
          <div class="ap-categories__label">
            <strong>{{ c.name }}</strong>
            <small v-if="c.count">{{ c.count }} {{ countLabel }}</small>
          </div>
        </a>
      </div>

      <!-- ── Style 2 · Lookbook magazine spread (asymmetric large tiles) ── -->
      <div class="ap-categories__lookbook">
        <a
          v-for="(c, i) in categories" :key="c.name"
          :href="c.url || '#'"
          class="ap-categories__look-tile"
          :class="[`ap-categories__look-tile--${(i % 6) + 1}`]"
        >
          <div class="ap-categories__look-media">
            <OptimizedImage :src="c.image" :alt="c.imageAlt || c.name" />
          </div>
          <div class="ap-categories__look-overlay">
            <h3>{{ c.name }}</h3>
            <small v-if="c.count">{{ c.count }} {{ countLabel }} →</small>
          </div>
        </a>
      </div>

      <!-- ── Style 4 · Stack — magazine column layout ── -->
      <div class="ap-categories__stack">
        <a
          v-for="(c, i) in categories" :key="c.name"
          :href="c.url || '#'"
          class="ap-categories__stack-card"
          :class="[`ap-categories__stack-card--${(i % 3) + 1}`]"
        >
          <div class="ap-categories__stack-media">
            <OptimizedImage :src="c.image" :alt="c.imageAlt || c.name" />
          </div>
          <div class="ap-categories__stack-body">
            <h3>{{ c.name }}</h3>
            <small v-if="c.count">{{ c.count }} {{ countLabel }}</small>
          </div>
        </a>
      </div>

      <!-- ── Style 5 · Carousel — horizontal scroll rail ── -->
      <div class="ap-categories__carousel ap-scroll-x">
        <a v-for="c in categories" :key="c.name" :href="c.url || '#'" class="ap-categories__car-card">
          <div class="ap-categories__car-media">
            <OptimizedImage :src="c.image" :alt="c.imageAlt || c.name" />
          </div>
          <div class="ap-categories__car-body">
            <h3>{{ c.name }}</h3>
            <small v-if="c.count">{{ c.count }} {{ countLabel }} →</small>
          </div>
        </a>
      </div>

      <!-- ── Style 3 · Catalog list ── -->
      <ul class="ap-categories__catalog">
        <li v-for="c in categories" :key="c.name" class="ap-categories__cat-row">
          <a :href="c.url || '#'">
            <div class="ap-categories__cat-thumb">
              <OptimizedImage :src="c.image" :alt="c.imageAlt || c.name" />
            </div>
            <div class="ap-categories__cat-body">
              <h3>{{ c.name }}</h3>
              <small v-if="c.count">{{ c.count }} {{ countLabel }}</small>
            </div>
            <span class="ap-categories__cat-arrow" aria-hidden="true">→</span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
/* Visibility gating */
.ap-categories__editorial,
.ap-categories__lookbook,
.ap-categories__catalog,
.ap-categories__stack,
.ap-categories__carousel { display: none; }
[data-site-style='4'] .ap-categories__stack { display: grid; }
[data-site-style='5'] .ap-categories__carousel { display: flex; }

/* ── Style 1 · Editorial overlay tiles (default) ── */
[data-site-style='1'] .ap-categories__editorial {
  display: grid; gap: clamp(0.75rem, 2vw, 1.5rem);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.ap-categories__tile {
  position: relative; overflow: hidden;
  border-radius: var(--ap-radius-lg);
  border: 1px solid var(--ap-line);
  background: var(--ap-surface);
  display: block; color: var(--ap-ink);
  transition: transform 160ms ease;
}
.ap-categories__tile:hover { transform: translateY(-3px); }
.ap-categories__media img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
.ap-categories__label {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 0.85rem 1rem;
  background: linear-gradient(to top, color-mix(in srgb, var(--ap-ink) 75%, transparent), transparent);
  color: var(--ap-surface);
  display: flex; justify-content: space-between; align-items: end;
  font-family: var(--ap-font-heading);
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-categories__label small { opacity: 0.85; font-family: var(--ap-font-body); text-transform: none; letter-spacing: 0; }

/* ── Style 2 · Lookbook — magazine spread with asymmetric large tiles ── */
[data-site-style='2'] .ap-categories__lookbook {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: clamp(120px, 14vw, 180px);
  grid-auto-flow: dense;
  gap: clamp(0.6rem, 1vw, 1rem);
}
.ap-categories__look-tile { grid-column: span 2; grid-row: span 1; }
.ap-categories__look-tile--1 { grid-column: span 4; grid-row: span 2; }
.ap-categories__look-tile--2 { grid-column: span 2; grid-row: span 2; }
.ap-categories__look-tile--3 { grid-column: span 3; grid-row: span 1; }
.ap-categories__look-tile--4 { grid-column: span 3; grid-row: span 2; }
.ap-categories__look-tile--5 { grid-column: span 3; grid-row: span 1; }
.ap-categories__look-tile--6 { grid-column: span 2; grid-row: span 1; }
.ap-categories__look-tile {
  position: relative; display: block; overflow: hidden;
  text-decoration: none; color: inherit;
  background: var(--ap-surface-alt);
  border-radius: var(--ap-radius);
}
.ap-categories__look-media { width: 100%; height: 100%; }
.ap-categories__look-media img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.3, 1);
}
.ap-categories__look-tile:hover .ap-categories__look-media img { transform: scale(1.06); }
.ap-categories__look-overlay {
  position: absolute; inset: 0;
  padding: clamp(1.25rem, 2.5vw, 2rem);
  display: flex; flex-direction: column; justify-content: flex-end;
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--ap-ink) 88%, transparent) 0%,
    color-mix(in srgb, var(--ap-ink) 30%, transparent) 50%,
    transparent 100%
  );
  color: var(--ap-surface);
}
.ap-categories__look-overlay h3 {
  margin: 0; font-family: var(--ap-font-heading);
  font-size: clamp(1.05rem, 1.8vw, 1.5rem);
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
  line-height: 1.1;
}
.ap-categories__look-tile--1 .ap-categories__look-overlay h3 { font-size: clamp(1.4rem, 2.6vw, 2.2rem); }
.ap-categories__look-overlay small {
  margin-top: 0.5rem; font-family: var(--ap-font-mono);
  font-size: 0.8rem; letter-spacing: 0.16em; text-transform: uppercase;
  opacity: 0.9;
}
[data-theme='vibrant'] .ap-categories__look-tile {
  border: 3px solid var(--ap-ink);
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--ap-ink);
}
@media (max-width: 760px) {
  [data-site-style='2'] .ap-categories__lookbook {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: clamp(150px, 30vw, 200px);
  }
  .ap-categories__look-tile,
  .ap-categories__look-tile--2,
  .ap-categories__look-tile--3,
  .ap-categories__look-tile--4,
  .ap-categories__look-tile--5,
  .ap-categories__look-tile--6 { grid-column: span 1; grid-row: span 1; }
  .ap-categories__look-tile--1 { grid-column: span 2; grid-row: span 2; }
}

/* ── Style 3 · Catalog list with chunky thumbs ───────────── */
[data-site-style='3'] .ap-categories__catalog {
  display: grid; gap: 0;
  list-style: none; padding: 0; margin: 0;
  border-top: 1px solid var(--ap-line);
}
.ap-categories__cat-row { border-bottom: 1px solid var(--ap-line); }
.ap-categories__cat-row a {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: clamp(1.25rem, 2.5vw, 2rem);
  align-items: center;
  padding: clamp(1.25rem, 2.5vw, 1.75rem) 0.5rem;
  color: inherit; text-decoration: none;
  transition: background 0.18s ease;
}
.ap-categories__cat-row a:hover { background: var(--ap-surface-alt); }
.ap-categories__cat-thumb {
  width: 160px; height: 160px; overflow: hidden;
  border-radius: var(--ap-radius);
  background: var(--ap-surface-alt);
}
.ap-categories__cat-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ap-categories__cat-body h3 {
  margin: 0; font-size: clamp(1.1rem, 1.6vw, 1.4rem);
  font-family: var(--ap-font-heading);
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-categories__cat-body small { color: var(--ap-ink-muted); font-size: 0.9rem; }
.ap-categories__cat-arrow {
  font-family: var(--ap-font-heading);
  font-size: 1.75rem; color: var(--ap-primary);
}
[data-theme='vibrant'] .ap-categories__cat-row { border-bottom-width: 2px; border-bottom-color: var(--ap-ink); }
@media (max-width: 600px) {
  .ap-categories__cat-row a { grid-template-columns: 110px 1fr auto; }
  .ap-categories__cat-thumb { width: 110px; height: 110px; }
}

/* ── Style 4 · Stack — simple magazine grid ── */
[data-site-style='4'] .ap-categories__stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: clamp(1rem, 2vw, 1.75rem);
  align-items: start;
}
.ap-categories__stack-card {
  display: block; text-decoration: none; color: inherit;
  background: var(--ap-surface-alt);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius-lg);
  overflow: hidden;
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.ap-categories__stack-card:hover { transform: translateY(-4px); box-shadow: var(--ap-shadow-lg); }
.ap-categories__stack-media img { width: 100%; object-fit: cover; display: block; }
.ap-categories__stack-card--1 .ap-categories__stack-media img { aspect-ratio: 3 / 4; }
.ap-categories__stack-card--2 .ap-categories__stack-media img { aspect-ratio: 1 / 1; }
.ap-categories__stack-card--3 .ap-categories__stack-media img { aspect-ratio: 16 / 11; }
.ap-categories__stack-body {
  padding: 1rem 1.25rem 1.35rem;
  display: flex; flex-direction: column; gap: 0.25rem;
}
.ap-categories__stack-body h3 {
  margin: 0; font-family: var(--ap-font-heading);
  font-size: 1.2rem; letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-categories__stack-body small { color: var(--ap-ink-muted); font-size: 0.85rem; }
[data-theme='vibrant'] .ap-categories__stack-card {
  border-width: 2px; border-color: var(--ap-ink);
  border-radius: 0; box-shadow: 5px 5px 0 var(--ap-ink);
}

/* ── Style 5 · Carousel — horizontal scroll rail ── */
[data-site-style='5'] .ap-categories__carousel {
  display: flex;
  gap: clamp(1rem, 2vw, 1.5rem);
  scroll-snap-type: x mandatory;
  padding: 0.25rem 0.25rem 1rem;
}
.ap-categories__car-card {
  flex: 0 0 clamp(220px, 24vw, 300px);
  scroll-snap-align: start;
  text-decoration: none; color: inherit;
  background: var(--ap-surface-alt);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius-lg);
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.ap-categories__car-card:hover { transform: translateY(-4px); box-shadow: var(--ap-shadow-lg); }
.ap-categories__car-media img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; display: block; }
.ap-categories__car-body { padding: 0.9rem 1.1rem 1.1rem; }
.ap-categories__car-body h3 {
  margin: 0; font-family: var(--ap-font-heading);
  font-size: 1.1rem; letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-categories__car-body small {
  color: var(--ap-ink-muted); font-size: 0.85rem;
  display: block; margin-top: 0.25rem;
}
[data-theme='vibrant'] .ap-categories__car-card {
  border-width: 2px; border-color: var(--ap-ink);
  border-radius: 0; box-shadow: 5px 5px 0 var(--ap-ink);
}
</style>
