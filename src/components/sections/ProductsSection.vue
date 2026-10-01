<script setup lang="ts">
interface Product {
  name: string
  price: string
  image: string
  imageAlt?: string
  blurb?: string
  badge?: string
  url?: string
}

import OptimizedImage from '@apotome/archetype-shared/components/OptimizedImage.vue'

withDefaults(defineProps<{
  eyebrow?: string
  title?: string
  intro?: string
  products: Product[]
  /** Show 'Shop all' link below grid. */
  shopAllUrl?: string
  /** Per-product link label. Owner-editable. */
  ctaLabel?: string
  /** Label on the shop-everything button. Owner-editable. */
  shopAllLabel?: string
}>(), { ctaLabel: 'View', shopAllLabel: '{{ shopAllLabel }}' })
</script>

<template>
  <section class="ap-section ap-products">
    <div class="ap-container">
      <div class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="intro" style="color: var(--ap-ink-muted)">{{ intro }}</p>
      </div>

      <!-- ── Style 1 · Editorial cards (default) ── -->
      <div class="ap-products__editorial">
        <article v-for="p in products" :key="p.name" class="ap-products__card">
          <div class="ap-products__media">
            <span v-if="p.badge" class="ap-products__badge">{{ p.badge }}</span>
            <OptimizedImage :src="p.image" :alt="p.imageAlt || p.name" />
          </div>
          <div class="ap-products__body">
            <h3 class="ap-products__name">{{ p.name }}</h3>
            <p v-if="p.blurb" class="ap-products__blurb">{{ p.blurb }}</p>
            <div class="ap-products__foot">
              <span class="ap-products__price">{{ p.price }}</span>
              <a v-if="p.url" :href="p.url" class="ap-btn ap-btn--ghost">{{ ctaLabel }}</a>
            </div>
          </div>
        </article>
      </div>

      <!-- ── Style 2 · Lookbook magazine spread (asymmetric large tiles) ── -->
      <div class="ap-products__lookbook">
        <a
          v-for="(p, i) in products" :key="p.name"
          :href="p.url || '#'"
          class="ap-products__look-tile"
          :class="[`ap-products__look-tile--${(i % 6) + 1}`]"
        >
          <span v-if="p.badge" class="ap-products__look-badge">{{ p.badge }}</span>
          <div class="ap-products__look-media">
            <OptimizedImage :src="p.image" :alt="p.imageAlt || p.name" />
          </div>
          <div class="ap-products__look-overlay">
            <h3>{{ p.name }}</h3>
            <span class="ap-products__look-price">{{ p.price }}</span>
          </div>
        </a>
      </div>

      <!-- ── Style 4 · Stack — vertical magazine columns (CSS multi-column) ── -->
      <div class="ap-products__stack">
        <article
          v-for="(p, i) in products" :key="p.name"
          class="ap-products__stack-card"
          :class="[`ap-products__stack-card--${(i % 3) + 1}`]"
        >
          <a :href="p.url || '#'" class="ap-products__stack-link">
            <div class="ap-products__stack-media">
              <span v-if="p.badge" class="ap-products__stack-badge">{{ p.badge }}</span>
              <OptimizedImage :src="p.image" :alt="p.imageAlt || p.name" />
            </div>
            <div class="ap-products__stack-body">
              <h3 class="ap-products__stack-name">{{ p.name }}</h3>
              <p v-if="p.blurb" class="ap-products__stack-blurb">{{ p.blurb }}</p>
              <span class="ap-products__stack-price">{{ p.price }}</span>
            </div>
          </a>
        </article>
      </div>

      <!-- ── Style 5 · Carousel — horizontal scroll rail with custom chunky bar ── -->
      <div class="ap-products__carousel ap-scroll-x">
        <article v-for="p in products" :key="p.name" class="ap-products__car-card">
          <div class="ap-products__car-media">
            <span v-if="p.badge" class="ap-products__car-badge">{{ p.badge }}</span>
            <OptimizedImage :src="p.image" :alt="p.imageAlt || p.name" />
          </div>
          <div class="ap-products__car-body">
            <h3>{{ p.name }}</h3>
            <p v-if="p.blurb">{{ p.blurb }}</p>
            <div class="ap-products__car-foot">
              <span class="ap-products__car-price">{{ p.price }}</span>
              <a v-if="p.url" :href="p.url" class="ap-btn ap-btn--ghost">{{ ctaLabel }}</a>
            </div>
          </div>
        </article>
      </div>

      <!-- ── Style 3 · Catalog list ── -->
      <ul class="ap-products__catalog">
        <li v-for="p in products" :key="p.name" class="ap-products__cat-row">
          <div class="ap-products__cat-thumb">
            <OptimizedImage :src="p.image" :alt="p.imageAlt || p.name" />
          </div>
          <div class="ap-products__cat-body">
            <h3>{{ p.name }}</h3>
            <p v-if="p.blurb">{{ p.blurb }}</p>
          </div>
          <div class="ap-products__cat-meta">
            <span v-if="p.badge" class="ap-products__cat-badge">{{ p.badge }}</span>
            <span class="ap-products__cat-price">{{ p.price }}</span>
            <a v-if="p.url" :href="p.url" class="ap-btn ap-btn--ghost">{{ ctaLabel }}</a>
          </div>
        </li>
      </ul>

      <p v-if="shopAllUrl" style="text-align: center; margin-top: 2rem">
        <a :href="shopAllUrl" class="ap-btn">{{ shopAllLabel }}</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
/* Visibility gating */
.ap-products__editorial,
.ap-products__lookbook,
.ap-products__catalog,
.ap-products__stack,
.ap-products__carousel { display: none; }
[data-site-style='4'] .ap-products__stack { display: block; }
[data-site-style='5'] .ap-products__carousel { display: flex; }

/* ── Style 1 · Editorial ─────────────────────────────────── */
[data-site-style='1'] .ap-products__editorial {
  display: grid; gap: clamp(1rem, 2vw, 1.75rem);
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.ap-products__card {
  background: var(--ap-surface-alt);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius-lg);
  overflow: hidden; display: flex; flex-direction: column;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.ap-products__card:hover { transform: translateY(-3px); box-shadow: var(--ap-shadow-lg); }
.ap-products__media { position: relative; }
.ap-products__media img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; }
.ap-products__badge {
  position: absolute; top: 0.75rem; left: 0.75rem;
  background: var(--ap-accent); color: var(--ap-ink);
  padding: 0.2rem 0.55rem; border-radius: 999px;
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
}
.ap-products__body { padding: 1rem 1.1rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
.ap-products__name { font-size: 1.05rem; margin: 0; }
.ap-products__blurb { color: var(--ap-ink-muted); font-size: 0.9rem; margin: 0; }
.ap-products__foot { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.ap-products__price { font-family: var(--ap-font-heading); font-size: 1.1rem; color: var(--ap-primary); }
[data-theme='vibrant'] .ap-products__card { border-width: 2px; border-color: var(--ap-ink); }

/* ── Style 2 · Lookbook — magazine spread with asymmetric large tiles ── */
[data-site-style='2'] .ap-products__lookbook {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: clamp(110px, 13vw, 170px);
  grid-auto-flow: dense;
  gap: clamp(0.6rem, 1vw, 1rem);
}
/* Asymmetric pattern repeats every 6 items for a magazine spread feel. */
.ap-products__look-tile { grid-column: span 2; grid-row: span 1; }
.ap-products__look-tile--1 { grid-column: span 3; grid-row: span 2; }
.ap-products__look-tile--2 { grid-column: span 3; grid-row: span 2; }
.ap-products__look-tile--3 { grid-column: span 3; grid-row: span 1; }
.ap-products__look-tile--4 { grid-column: span 3; grid-row: span 2; }
.ap-products__look-tile--5 { grid-column: span 4; grid-row: span 1; }
.ap-products__look-tile--6 { grid-column: span 2; grid-row: span 1; }
.ap-products__look-tile {
  position: relative; display: block; overflow: hidden;
  text-decoration: none; color: inherit;
  background: var(--ap-surface-alt);
  border-radius: var(--ap-radius);
}
.ap-products__look-media { width: 100%; height: 100%; }
.ap-products__look-media img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.3, 1);
}
.ap-products__look-tile:hover .ap-products__look-media img { transform: scale(1.06); }
.ap-products__look-badge {
  position: absolute; top: 0.85rem; left: 0.85rem; z-index: 2;
  background: var(--ap-accent); color: var(--ap-ink);
  padding: 0.25rem 0.7rem; font-size: 0.7rem;
  letter-spacing: 0.16em; text-transform: uppercase;
  border-radius: 4px;
}
.ap-products__look-overlay {
  position: absolute; inset: auto 0 0 0;
  padding: clamp(1rem, 2vw, 1.75rem);
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--ap-ink) 88%, transparent) 0%,
    color-mix(in srgb, var(--ap-ink) 50%, transparent) 55%,
    transparent 100%
  );
  color: var(--ap-surface);
  display: flex; justify-content: space-between; align-items: end; gap: 1rem;
}
.ap-products__look-overlay h3 {
  margin: 0; font-family: var(--ap-font-heading);
  font-size: clamp(0.95rem, 1.3vw, 1.25rem);
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
  line-height: 1.1;
}
.ap-products__look-tile--1 .ap-products__look-overlay h3 { font-size: clamp(1.2rem, 2vw, 1.85rem); }
.ap-products__look-price {
  font-family: var(--ap-font-mono); font-size: 0.85rem;
  background: var(--ap-accent); color: var(--ap-ink);
  padding: 0.2rem 0.55rem;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
[data-theme='vibrant'] .ap-products__look-tile {
  border: 3px solid var(--ap-ink);
  border-radius: 0;
  box-shadow: 6px 6px 0 var(--ap-ink);
}
@media (max-width: 760px) {
  [data-site-style='2'] .ap-products__lookbook {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: clamp(140px, 30vw, 200px);
  }
  .ap-products__look-tile,
  .ap-products__look-tile--2,
  .ap-products__look-tile--3,
  .ap-products__look-tile--4,
  .ap-products__look-tile--5,
  .ap-products__look-tile--6 { grid-column: span 1; grid-row: span 1; }
  .ap-products__look-tile--1 { grid-column: span 2; grid-row: span 2; }
}

/* ── Style 3 · Catalog list with chunky thumbnails ───────────────── */
[data-site-style='3'] .ap-products__catalog {
  display: grid; gap: 0;
  list-style: none; padding: 0; margin: 0;
  border-top: 1px solid var(--ap-line);
}
.ap-products__cat-row {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: clamp(1.25rem, 2.5vw, 2rem);
  align-items: center;
  padding: clamp(1.25rem, 2.5vw, 1.75rem) 0.5rem;
  border-bottom: 1px solid var(--ap-line);
  transition: background 0.18s ease;
}
.ap-products__cat-row:hover { background: var(--ap-surface-alt); }
.ap-products__cat-thumb {
  width: 160px; height: 160px; overflow: hidden;
  border-radius: var(--ap-radius);
  background: var(--ap-surface-alt);
}
.ap-products__cat-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ap-products__cat-body h3 {
  margin: 0; font-size: clamp(1.1rem, 1.6vw, 1.4rem);
  font-family: var(--ap-font-heading);
  letter-spacing: var(--ap-tracking-heading);
}
.ap-products__cat-body p { margin: 0.4rem 0 0; color: var(--ap-ink-muted); font-size: 0.95rem; line-height: 1.55; max-width: 56ch; }
.ap-products__cat-meta {
  display: flex; align-items: center; gap: 0.85rem;
  flex-wrap: wrap; justify-content: flex-end;
}
.ap-products__cat-badge {
  background: var(--ap-accent); color: var(--ap-ink);
  padding: 0.2rem 0.6rem; border-radius: 4px;
  font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase;
}
.ap-products__cat-price {
  font-family: var(--ap-font-heading);
  font-size: 1.25rem; color: var(--ap-primary);
  font-variant-numeric: tabular-nums;
}
[data-theme='vibrant'] .ap-products__cat-row { border-bottom-width: 2px; border-bottom-color: var(--ap-ink); }
[data-theme='vibrant'] .ap-products__cat-price {
  background: var(--ap-accent); color: var(--ap-ink); padding: 0 0.4rem;
}
@media (max-width: 600px) {
  .ap-products__cat-row { grid-template-columns: 110px 1fr; }
  .ap-products__cat-meta { grid-column: 1 / -1; justify-content: flex-start; }
  .ap-products__cat-thumb { width: 110px; height: 110px; }
}

/* ── Style 4 · Stack — vertical magazine columns (CSS multi-column) ── */
[data-site-style='4'] .ap-products__stack {
  column-count: 3;
  column-gap: clamp(1rem, 2vw, 1.75rem);
}
@media (max-width: 960px) { [data-site-style='4'] .ap-products__stack { column-count: 2; } }
@media (max-width: 560px) { [data-site-style='4'] .ap-products__stack { column-count: 1; } }
.ap-products__stack-card {
  break-inside: avoid;
  margin: 0 0 clamp(1rem, 2vw, 1.75rem);
  background: var(--ap-surface-alt);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius-lg);
  overflow: hidden;
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.ap-products__stack-card:hover { transform: translateY(-4px); box-shadow: var(--ap-shadow-lg); }
.ap-products__stack-link { text-decoration: none; color: inherit; display: block; }
.ap-products__stack-media { position: relative; }
.ap-products__stack-media img { display: block; width: 100%; object-fit: cover; }
.ap-products__stack-card--1 .ap-products__stack-media img { aspect-ratio: 3 / 4; }
.ap-products__stack-card--2 .ap-products__stack-media img { aspect-ratio: 1 / 1; }
.ap-products__stack-card--3 .ap-products__stack-media img { aspect-ratio: 4 / 5; }
.ap-products__stack-badge {
  position: absolute; top: 0.85rem; left: 0.85rem;
  background: var(--ap-accent); color: var(--ap-ink);
  padding: 0.25rem 0.7rem; border-radius: 999px;
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
}
.ap-products__stack-body {
  padding: 1.1rem 1.25rem 1.35rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.ap-products__stack-name {
  margin: 0; font-family: var(--ap-font-heading);
  font-size: 1.15rem; letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-products__stack-blurb {
  margin: 0; color: var(--ap-ink-muted);
  font-size: 0.9rem; line-height: 1.55;
}
.ap-products__stack-price {
  font-family: var(--ap-font-heading);
  color: var(--ap-primary); font-size: 1.1rem;
  margin-top: 0.25rem;
}
[data-theme='vibrant'] .ap-products__stack-card {
  border-width: 2px; border-color: var(--ap-ink);
  border-radius: 0;
  box-shadow: 5px 5px 0 var(--ap-ink);
}
[data-theme='vibrant'] .ap-products__stack-card:hover { box-shadow: 8px 8px 0 var(--ap-ink); }

/* ── Style 5 · Carousel — horizontal scroll rail (uses .ap-scroll-x) ── */
[data-site-style='5'] .ap-products__carousel {
  display: flex;
  gap: clamp(1rem, 2vw, 1.5rem);
  scroll-snap-type: x mandatory;
  scroll-padding-left: clamp(1rem, 4vw, 2rem);
  padding: 0.25rem 0.25rem 1rem;
}
.ap-products__car-card {
  flex: 0 0 clamp(280px, 32vw, 360px);
  scroll-snap-align: start;
  background: var(--ap-surface-alt);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius-lg);
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.ap-products__car-card:hover { transform: translateY(-4px); box-shadow: var(--ap-shadow-lg); }
.ap-products__car-media { position: relative; }
.ap-products__car-media img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; display: block; }
.ap-products__car-badge {
  position: absolute; top: 0.85rem; left: 0.85rem;
  background: var(--ap-accent); color: var(--ap-ink);
  padding: 0.25rem 0.7rem; border-radius: 999px;
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
}
.ap-products__car-body {
  padding: 1rem 1.1rem 1.25rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  flex: 1;
}
.ap-products__car-body h3 {
  margin: 0; font-family: var(--ap-font-heading);
  font-size: 1.15rem; letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-products__car-body p {
  margin: 0; color: var(--ap-ink-muted);
  font-size: 0.9rem; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.ap-products__car-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: auto;
}
.ap-products__car-price {
  font-family: var(--ap-font-heading);
  color: var(--ap-primary); font-size: 1.15rem;
}
[data-theme='vibrant'] .ap-products__car-card {
  border-width: 2px; border-color: var(--ap-ink);
  border-radius: 0;
  box-shadow: 5px 5px 0 var(--ap-ink);
}
</style>
