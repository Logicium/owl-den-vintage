<script setup lang="ts">
import { computed } from 'vue'
import OptimizedImage from '../OptimizedImage.vue'
import { useSiteContentStore } from '../../platform/siteContentStore'

interface Photo { src: string; alt?: string; caption?: string }

const props = withDefaults(defineProps<{
  eyebrow?: string
  title?: string
  photos: Photo[]
  /** Per-component layout (legacy). Variant style on <html> overrides this. */
  layout?: 'masonry' | 'grid'
  /** Cap how many photos to show; rest are dropped. */
  limit?: number
  centered?: boolean
  /** Set false to always show the build-time photos, ignoring Instagram. */
  allowInstagram?: boolean
}>(), {
  // Vue casts absent Boolean props to false — without this default the
  // Instagram override would silently never fire on templates that don't
  // pass the prop (i.e. all of them).
  allowInstagram: true,
})

const content = useSiteContentStore()
void content.loadInstagram()

/** IG captions are long and hashtag-heavy — keep the first line, drop tags. */
function cleanCaption(raw?: string): string | undefined {
  if (!raw) return undefined
  const line = raw.split('\n')[0]!.replace(/#[\w]+/g, '').replace(/\s{2,}/g, ' ').trim()
  if (!line) return undefined
  return line.length > 90 ? `${line.slice(0, 87)}…` : line
}

/** When the owner has connected Instagram, their live feed replaces the
    stock/build-time gallery across every layout variant. */
const sourcePhotos = computed<Photo[]>(() => {
  if (props.allowInstagram && content.instagramMedia.length) {
    return content.instagramMedia.map(m => ({
      src: m.src,
      alt: cleanCaption(m.caption) || 'Instagram post',
      caption: cleanCaption(m.caption),
    }))
  }
  return props.photos
})

const visible = computed(() =>
  props.limit ? sourcePhotos.value.slice(0, props.limit) : sourcePhotos.value
)

function shapeFor(i: number): 'tall' | 'wide' | 'square' {
  const cycle: Array<'tall' | 'wide' | 'square'> = ['square', 'tall', 'wide', 'square', 'wide', 'tall']
  return cycle[i % cycle.length]!
}
</script>

<!--
  Gallery section with five selectable layouts (data-gallery-style on <html>):
  Style 1 · Default  — masonry/grid (theme-aware: Vibrant uses fluid 100vh viewport)
  Style 2 · Mosaic   — editorial grid with featured hero tile + supporting cells
  Style 3 · Marquee  — horizontal scrolling reel with snap, full-bleed
  Style 4 · Strip    — full-bleed vertical stack with alternating captions
  Style 5 · Polaroid — rotated polaroid cards, casual scrapbook feel
-->
<template>
  <section class="ap-section ap-gallery">
    <div class="ap-container ap-gallery__head-wrap">
      <div v-if="title || eyebrow" class="ap-section-head" :class="{ 'ap-section-head--center': centered }">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2 v-if="title">{{ title }}</h2>
      </div>
    </div>

    <!-- ── Style 1 · Default ──────────────────────────── -->
    <div class="ap-container ap-gallery__default">
      <div class="ap-gallery__grid" :class="`is-${layout || 'masonry'}`">
        <figure
          v-for="(p, i) in visible"
          :key="`d-${p.src}`"
          class="ap-gallery__item"
          :data-shape="(shapeFor(i) as string)"
        >
          <OptimizedImage :src="p.src" :alt="p.alt" />
          <figcaption v-if="p.caption">{{ p.caption }}</figcaption>
        </figure>
      </div>
    </div>

    <!-- ── Style 2 · Mosaic · editorial featured ──────── -->
    <div class="ap-container ap-gallery__mosaic">
      <figure
        v-for="(p, i) in visible"
        :key="`m-${p.src}`"
        class="ap-gallery__mosaic-item"
        :data-pos="String((i % 6) + 1)"
      >
        <OptimizedImage :src="p.src" :alt="p.alt" />
        <figcaption v-if="p.caption || p.alt" class="ap-gallery__mosaic-caption">
          <span class="ap-gallery__mosaic-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="ap-gallery__mosaic-text">{{ p.caption || p.alt }}</span>
        </figcaption>
      </figure>
    </div>

    <!-- ── Style 3 · Marquee · horizontal scrolling reel ── -->
    <div class="ap-gallery__marquee">
      <div class="ap-gallery__marquee-track">
        <figure
          v-for="(p) in visible"
          :key="`r-${p.src}`"
          class="ap-gallery__marquee-item"
        >
          <OptimizedImage :src="p.src" :alt="p.alt" />
          <figcaption v-if="p.caption">{{ p.caption }}</figcaption>
        </figure>
      </div>
    </div>
    <!-- ── Style 4 · Strip · full-width vertical stack ── -->
    <div class="ap-gallery__strip">
      <figure
        v-for="(p, i) in visible"
        :key="`s-${p.src}`"
        class="ap-gallery__strip-item"
        :class="i % 2 === 0 ? 'is-left' : 'is-right'"
      >
        <div class="ap-gallery__strip-media">
          <OptimizedImage :src="p.src" :alt="p.alt" />
        </div>
        <figcaption v-if="p.caption || p.alt" class="ap-gallery__strip-caption">
          <span class="ap-gallery__strip-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="ap-gallery__strip-text">{{ p.caption || p.alt }}</span>
        </figcaption>
      </figure>
    </div>

    <!-- ── Style 5 · Polaroid · scrapbook cards ── -->
    <div class="ap-container ap-gallery__polaroid">
      <figure
        v-for="(p, i) in visible"
        :key="`p-${p.src}`"
        class="ap-gallery__polaroid-item"
        :style="{ '--ap-rot': `${((i * 37) % 11) - 5}deg` }"
      >
        <div class="ap-gallery__polaroid-media">
          <OptimizedImage :src="p.src" :alt="p.alt" />
        </div>
        <figcaption class="ap-gallery__polaroid-caption">
          {{ p.caption || p.alt || `Frame ${i + 1}` }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
/* ── Variant gating ─────────────────────────────────── */
.ap-gallery__default,
.ap-gallery__mosaic,
.ap-gallery__marquee,
.ap-gallery__strip,
.ap-gallery__polaroid { display: none; }
[data-gallery-style='1'] .ap-gallery__default  { display: block; }
[data-gallery-style='2'] .ap-gallery__mosaic   { display: grid; }
[data-gallery-style='3'] .ap-gallery__marquee  { display: block; }
[data-gallery-style='4'] .ap-gallery__strip    { display: flex; }
[data-gallery-style='5'] .ap-gallery__polaroid { display: flex; }
:root:not([data-gallery-style]) .ap-gallery__default { display: block; }

/* ── Shared item visuals ────────────────────────────── */
.ap-gallery__item,
.ap-gallery__mosaic-item,
.ap-gallery__marquee-item { margin: 0; position: relative; overflow: hidden; }
.ap-gallery__item img,
.ap-gallery__mosaic-item img,
.ap-gallery__marquee-item img {
  width: 100%; height: 100%; object-fit: cover;
  border-radius: var(--ap-radius);
  background: var(--ap-line);
  transition: transform 0.6s cubic-bezier(.2,.8,.2,1);
}
.ap-gallery__item:hover img,
.ap-gallery__mosaic-item:hover img,
.ap-gallery__marquee-item:hover img { transform: scale(1.04); }
.ap-gallery__item figcaption,
.ap-gallery__mosaic-item figcaption,
.ap-gallery__marquee-item figcaption {
  position: absolute; left: 0.75rem; bottom: 0.75rem;
  background: color-mix(in srgb, var(--ap-surface) 85%, transparent);
  color: var(--ap-ink);
  padding: 0.25rem 0.6rem; font-size: 0.78rem;
  border-radius: var(--ap-radius);
  backdrop-filter: blur(4px);
}

/* ── Style 1 · Default — masonry / grid ─────────────── */
.ap-gallery__grid.is-grid {
  display: grid; gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.ap-gallery__grid.is-grid .ap-gallery__item img { aspect-ratio: 1 / 1; }
.ap-gallery__grid.is-masonry {
  display: grid; gap: 0.75rem;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-flow: dense;
}
.is-masonry .ap-gallery__item[data-shape='square'] { grid-column: span 4; }
.is-masonry .ap-gallery__item[data-shape='tall']   { grid-column: span 4; }
.is-masonry .ap-gallery__item[data-shape='wide']   { grid-column: span 8; }
.is-masonry .ap-gallery__item[data-shape='square'] img { aspect-ratio: 1 / 1; }
.is-masonry .ap-gallery__item[data-shape='tall']   img { aspect-ratio: 3 / 4; }
.is-masonry .ap-gallery__item[data-shape='wide']   img { aspect-ratio: 16 / 9; }

/* Vibrant theme: redesign Style 1 to a fluid ~100vh viewport rail.
   Replaces the cumbersome tall masonry with a contained, scroll-light reel. */
[data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__grid,
[data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__grid {
  display: grid !important;
  grid-template-columns: 1.4fr 0.9fr 1.1fr 0.9fr;
  grid-template-rows: 1fr 1fr;
  gap: 0.75rem;
  height: clamp(560px, 92vh, 920px);
}
[data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__item,
[data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__item {
  grid-column: span 1 !important;
  grid-row: span 1 !important;
  border: 3px solid var(--ap-ink);
  border-radius: 18px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
[data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__item img,
[data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__item img {
  aspect-ratio: auto !important;
  height: 100% !important;
  border-radius: 0;
}
[data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__item:hover,
[data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__item:hover {
  transform: translate(-3px, -3px);
  box-shadow: 6px 6px 0 var(--ap-ink);
}
/* Featured tile spans 2 rows, others fill in */
[data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__item:nth-child(1),
[data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__item:nth-child(1) {
  grid-row: span 2 !important;
}
[data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__item:nth-child(4),
[data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__item:nth-child(4) {
  grid-row: span 2 !important;
}
/* Cap how many show in the viewport so we don't blow past 100vh */
[data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__item:nth-child(n + 8),
[data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__item:nth-child(n + 8) {
  display: none;
}

/* ── Style 2 · Mosaic · compact editorial, fits within 100vh ── */
.ap-gallery__mosaic {
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 1fr;
  gap: 0.5rem;
  height: clamp(520px, 88vh, 880px);
  max-height: 100vh;
}
.ap-gallery__mosaic-item {
  isolation: isolate;
  border-radius: var(--ap-radius);
  overflow: hidden;
}
.ap-gallery__mosaic-item img { width: 100%; height: 100%; aspect-ratio: auto; }
.ap-gallery__mosaic-item::after {
  content: ''; position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--ap-ink) 70%, transparent) 100%);
  pointer-events: none;
}
.ap-gallery__mosaic-caption {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
  display: flex; align-items: baseline; gap: 0.6rem;
  padding: clamp(0.6rem, 1.4vw, 1rem);
  color: var(--ap-surface);
  background: none;
  backdrop-filter: none;
  border-radius: 0;
}
.ap-gallery__mosaic-num {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.7rem; letter-spacing: 0.3em;
  opacity: 0.75;
  flex: 0 0 auto;
}
.ap-gallery__mosaic-text {
  font-family: var(--ap-font-heading);
  font-size: clamp(0.85rem, 1.3vw, 1.1rem);
  line-height: 1.15;
  letter-spacing: -0.005em;
}
/* 6-cell editorial pattern, repeating */
.ap-gallery__mosaic-item[data-pos='1'] { grid-column: span 4; grid-row: span 2; }
.ap-gallery__mosaic-item[data-pos='2'] { grid-column: span 2; grid-row: span 1; }
.ap-gallery__mosaic-item[data-pos='3'] { grid-column: span 2; grid-row: span 1; }
.ap-gallery__mosaic-item[data-pos='4'] { grid-column: span 2; grid-row: span 2; }
.ap-gallery__mosaic-item[data-pos='5'] { grid-column: span 2; grid-row: span 1; }
.ap-gallery__mosaic-item[data-pos='6'] { grid-column: span 2; grid-row: span 1; }
/* Cap items so we always fit the 4-row, 6-col viewport (max 6 cells) */
.ap-gallery__mosaic-item:nth-child(n + 7) { display: none; }

/* ── Style 3 · Marquee · horizontal reel ────────────── */
.ap-gallery__marquee {
  position: relative;
  width: 100%;
  margin-top: 0.5rem;
  /* Bleed outside the container for cinematic feel */
  margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw);
  padding: 0.5rem 0;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
}
.ap-gallery__marquee-track {
  display: flex; gap: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-padding: 5vw;
  padding: 0.5rem 5vw;
}
.ap-gallery__marquee-item {
  flex: 0 0 clamp(260px, 38vw, 520px);
  height: clamp(360px, 60vh, 620px);
  scroll-snap-align: start;
  border-radius: var(--ap-radius-lg);
}
.ap-gallery__marquee-item:nth-child(odd) { transform: translateY(-8px); }

/* ── Style 4 · Strip ─────────────────────────────── */
[data-gallery-style='4'] .ap-gallery__strip {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  flex-direction: column;
}
.ap-gallery__strip-item {
  position: relative;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  min-height: clamp(220px, 42vh, 380px);
  overflow: hidden;
  isolation: isolate;
}
.ap-gallery__strip-media {
  position: absolute; inset: 0; z-index: 0;
}
.ap-gallery__strip-media :deep(img),
.ap-gallery__strip-media img {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 0;
  aspect-ratio: auto;
}
.ap-gallery__strip-item::after {
  content: ''; position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(180deg, transparent 50%, color-mix(in srgb, var(--ap-ink) 70%, transparent) 100%);
  pointer-events: none;
}
.ap-gallery__strip-caption {
  position: relative; z-index: 2;
  grid-column: 1;
  display: flex; align-items: baseline; gap: 1rem;
  padding: clamp(1.5rem, 4vw, 3rem);
  color: var(--ap-surface);
}
.ap-gallery__strip-item.is-right .ap-gallery__strip-caption {
  grid-column: 2;
  justify-content: flex-end; text-align: right;
}
.ap-gallery__strip-num {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.78rem; letter-spacing: 0.3em;
  opacity: 0.7;
}
.ap-gallery__strip-text {
  font-family: var(--ap-font-heading);
  font-size: clamp(1.25rem, 3vw, 2.25rem);
  line-height: 1.1;
  letter-spacing: -0.01em;
  max-width: 18ch;
}

/* ── Style 5 · Polaroid ──────────────────────────── */
.ap-gallery__polaroid {
  flex-wrap: wrap;
  gap: clamp(1rem, 2vw, 2rem) clamp(0.5rem, 2vw, 1.5rem);
  justify-content: center;
  align-items: flex-start;
  padding-top: 1rem; padding-bottom: 1rem;
}
.ap-gallery__polaroid-item {
  margin: 0;
  background: var(--ap-surface);
  padding: 0.75rem 0.75rem 1.5rem;
  border: 1px solid var(--ap-line);
  box-shadow: 0 14px 28px -16px color-mix(in srgb, var(--ap-ink) 40%, transparent),
              0 2px 6px -2px color-mix(in srgb, var(--ap-ink) 20%, transparent);
  width: clamp(220px, 26vw, 320px);
  transform: rotate(var(--ap-rot, 0deg));
  transition: transform 0.3s ease, box-shadow 0.3s ease, z-index 0s 0s;
  position: relative;
  z-index: 0;
}
.ap-gallery__polaroid-item:hover {
  transform: rotate(0deg) scale(1.04) translateY(-6px);
  box-shadow: 0 22px 40px -16px color-mix(in srgb, var(--ap-ink) 50%, transparent);
  z-index: 5;
}
.ap-gallery__polaroid-media {
  overflow: hidden;
  background: var(--ap-line);
  aspect-ratio: 4 / 5;
}
.ap-gallery__polaroid-media :deep(img),
.ap-gallery__polaroid-media img {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 0;
  aspect-ratio: auto;
}
.ap-gallery__polaroid-caption {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.85rem;
  text-align: center;
  padding-top: 0.85rem;
  color: var(--ap-ink);
  letter-spacing: 0.04em;
}

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 760px) {
  .is-masonry .ap-gallery__item { grid-column: span 12 !important; }
  .is-masonry .ap-gallery__item img { aspect-ratio: 4 / 3 !important; }
  .ap-gallery__mosaic {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 1fr;
    height: 90vh;
  }
  .ap-gallery__mosaic-item[data-pos='1'] { grid-column: span 2; grid-row: span 2; }
  .ap-gallery__mosaic-item[data-pos] { grid-column: span 1; grid-row: span 1; }
  .ap-gallery__mosaic-item:nth-child(n + 6) { display: none; }
  .ap-gallery__strip-item { min-height: clamp(180px, 34vh, 280px); }
  [data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__grid,
  [data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: repeat(3, 1fr);
    height: 90vh;
  }
  [data-theme='vibrant'][data-gallery-style='1'] .ap-gallery__item:nth-child(n + 7),
  [data-theme='vibrant']:not([data-gallery-style]) .ap-gallery__item:nth-child(n + 7) { display: none; }
  .ap-gallery__marquee-item { height: 50vh; flex-basis: 78vw; }
}
</style>
