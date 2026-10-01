<script setup lang="ts">
import { ref, computed } from 'vue'
import { Star, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  eyebrow?: string
  title?: string
  items: Array<{ quote: string; author: string; source?: string; rating?: number }>
}>(), { title: 'What our guests say' })

// Carousel index (Style 3)
const idx = ref(0)
const total = computed(() => props.items.length)
function prev() { idx.value = (idx.value - 1 + total.value) % total.value }
function next() { idx.value = (idx.value + 1) % total.value }
</script>

<!--
  Reviews/testimonials with five selectable layouts (data-reviews-style on <html>):
  Style 1 · Default   — original theme-tinted layout (studio numbered / heritage cards / vibrant stickers / ironwood spec-cards)
  Style 2 · Spotlight — single oversized pull quote with author block + supporting thumbnails
  Style 3 · Carousel  — focused single-card carousel with prev/next + indicator dots
  Style 4 · Wall      — masonry-style quote tiles, paper notes feel
  Style 5 · Ticker    — horizontal auto-scrolling marquee of quote chips
-->
<template>
  <section class="ap-section ap-section--alt ap-testimonials">
    <div class="ap-container">

      <!-- ── Style 1 · Default (theme-aware) ──────────── -->
      <div class="ap-reviews__default">
        <!-- STUDIO -->
        <div class="ap-testimonials--studio">
          <div class="ap-section-head">
            <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
            <h2>{{ title }}</h2>
          </div>
          <div class="ap-testimonials__studio-grid">
            <figure v-for="(t, i) in items" :key="i" class="ap-testimonials__studio-item">
              <div class="ap-testimonials__studio-num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</div>
              <blockquote>{{ t.quote }}</blockquote>
              <figcaption>
                <span class="ap-testimonials__author">{{ t.author }}</span>
                <span v-if="t.source" class="ap-testimonials__source">{{ t.source }}</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <!-- HERITAGE -->
        <div class="ap-testimonials--heritage">
          <div class="ap-section-head ap-section-head--center">
            <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
            <h2>{{ title }}</h2>
          </div>
          <div class="ap-testimonials__heritage-grid">
            <figure v-for="(t, i) in items" :key="i" class="ap-testimonials__heritage-item">
              <div class="ap-testimonials__heritage-mark" aria-hidden="true">"</div>
              <blockquote>{{ t.quote }}</blockquote>
              <figcaption>
                <strong>{{ t.author }}</strong>
                <span v-if="t.source"> &middot; {{ t.source }}</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <!-- VIBRANT -->
        <div class="ap-testimonials--vibrant">
          <div class="ap-section-head ap-section-head--center">
            <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
            <h2>{{ title }}</h2>
          </div>
          <div class="ap-testimonials__vibrant-grid">
            <figure v-for="(t, i) in items" :key="i" class="ap-testimonials__vibrant-item">
              <div class="ap-testimonials__stars">
                <Star v-for="s in (t.rating ?? 5)" :key="s" :size="15" fill="currentColor" stroke="none" />
              </div>
              <blockquote>{{ t.quote }}</blockquote>
              <figcaption>
                <strong>{{ t.author }}</strong>
                <span v-if="t.source"> &middot; {{ t.source }}</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <!-- KEYSTONE — spec-sheet ledger: numbered rows, mono metadata,
             ink rules, no roundness. Reads like a vendor reference card. -->
        <div class="ap-testimonials--ironwood">
          <div class="ap-section-head">
            <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
            <h2>{{ title }}</h2>
          </div>
          <div class="ap-testimonials__ironwood-grid">
            <figure v-for="(t, i) in items" :key="i" class="ap-testimonials__ironwood-item">
              <header class="ap-testimonials__ironwood-head">
                <span class="ap-testimonials__ironwood-num" aria-hidden="true">№ {{ String(i + 1).padStart(2, '0') }}</span>
                <span class="ap-testimonials__ironwood-rating" v-if="t.rating ?? 5">
                  <Star v-for="s in (t.rating ?? 5)" :key="s" :size="13" fill="currentColor" stroke="none" />
                </span>
              </header>
              <blockquote>{{ t.quote }}</blockquote>
              <figcaption>
                <strong>{{ t.author }}</strong>
                <span v-if="t.source" class="ap-testimonials__ironwood-src">{{ t.source }}</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <!-- ── Style 2 · Spotlight ───────────────────────── -->
      <div class="ap-reviews__spotlight">
        <div class="ap-section-head">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title }}</h2>
        </div>
        <figure v-if="items[0]" class="ap-reviews__spotlight-feature">
          <div class="ap-reviews__spotlight-mark" aria-hidden="true">"</div>
          <blockquote>{{ items[0].quote }}</blockquote>
          <figcaption>
            <div class="ap-reviews__stars" v-if="items[0].rating ?? 5">
              <Star v-for="s in (items[0].rating ?? 5)" :key="s" :size="14" fill="currentColor" stroke="none" />
            </div>
            <strong>{{ items[0].author }}</strong>
            <span v-if="items[0].source"> · {{ items[0].source }}</span>
          </figcaption>
        </figure>
        <ul v-if="items.length > 1" class="ap-reviews__spotlight-grid">
          <li v-for="(t, i) in items.slice(1, 4)" :key="i">
            <div class="ap-reviews__stars">
              <Star v-for="s in (t.rating ?? 5)" :key="s" :size="12" fill="currentColor" stroke="none" />
            </div>
            <p>{{ t.quote }}</p>
            <small><strong>{{ t.author }}</strong><span v-if="t.source"> · {{ t.source }}</span></small>
          </li>
        </ul>
      </div>

      <!-- ── Style 3 · Carousel ────────────────────────── -->
      <div class="ap-reviews__carousel" v-if="items.length">
        <div class="ap-section-head">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title }}</h2>
        </div>
        <figure class="ap-reviews__carousel-card" :key="idx">
          <div class="ap-reviews__stars">
            <Star v-for="s in (items[idx]?.rating ?? 5)" :key="s" :size="16" fill="currentColor" stroke="none" />
          </div>
          <blockquote>{{ items[idx]?.quote }}</blockquote>
          <figcaption>
            <strong>{{ items[idx]?.author }}</strong>
            <span v-if="items[idx]?.source"> · {{ items[idx]?.source }}</span>
          </figcaption>
        </figure>
        <div class="ap-reviews__carousel-controls">
          <button type="button" class="ap-reviews__carousel-btn" aria-label="Previous review" @click="prev"><ChevronLeft :size="18" /></button>
          <div class="ap-reviews__carousel-dots" role="tablist">
            <button
              v-for="(_, i) in items" :key="i"
              type="button"
              class="ap-reviews__carousel-dot"
              :class="{ 'is-active': i === idx }"
              :aria-label="`Go to review ${i + 1}`"
              @click="idx = i"
            />
          </div>
          <button type="button" class="ap-reviews__carousel-btn" aria-label="Next review" @click="next"><ChevronRight :size="18" /></button>
        </div>
      </div>

      <!-- ── Style 4 · Wall · paper-note masonry tiles ── -->
      <div class="ap-reviews__wall">
        <div class="ap-section-head">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title }}</h2>
        </div>
        <div class="ap-reviews__wall-grid">
          <figure v-for="(t, i) in items" :key="`w-${i}`" class="ap-reviews__wall-item" :data-size="String((i % 3) + 1)">
            <div class="ap-reviews__stars">
              <Star v-for="s in (t.rating ?? 5)" :key="s" :size="13" fill="currentColor" stroke="none" />
            </div>
            <blockquote>{{ t.quote }}</blockquote>
            <figcaption>
              <strong>{{ t.author }}</strong>
              <span v-if="t.source"> · {{ t.source }}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <!-- ── Style 5 · Ticker · auto-scrolling marquee ── -->
      <div class="ap-reviews__ticker" v-if="items.length">
        <div class="ap-section-head">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title }}</h2>
        </div>
        <div class="ap-reviews__ticker-viewport" aria-hidden="false">
          <div class="ap-reviews__ticker-track">
            <figure v-for="(t, i) in [...items, ...items]" :key="`tk-${i}`" class="ap-reviews__ticker-card">
              <div class="ap-reviews__stars ap-reviews__ticker-stars">
                <Star v-for="s in (t.rating ?? 5)" :key="s" :size="20" fill="currentColor" stroke="none" />
              </div>
              <blockquote>{{ t.quote }}</blockquote>
              <figcaption>
                <strong>{{ t.author }}</strong>
                <span v-if="t.source"> · {{ t.source }}</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
/* ── Variant gating ─────────────────────────────────── */
.ap-reviews__default,
.ap-reviews__spotlight,
.ap-reviews__carousel,
.ap-reviews__wall,
.ap-reviews__ticker { display: none; }
[data-reviews-style='1'] .ap-reviews__default   { display: block; }
[data-reviews-style='2'] .ap-reviews__spotlight { display: block; }
[data-reviews-style='3'] .ap-reviews__carousel  { display: block; }
[data-reviews-style='4'] .ap-reviews__wall      { display: block; }
[data-reviews-style='5'] .ap-reviews__ticker    { display: block; }
:root:not([data-reviews-style]) .ap-reviews__default { display: block; }

/* ── Style 1 · Default (theme-aware) ────────────────── */
.ap-testimonials--studio,
.ap-testimonials--heritage,
.ap-testimonials--vibrant,
.ap-testimonials--ironwood { display: none; }
[data-theme='studio']   .ap-testimonials--studio   { display: block; }
/* Atlas shares the studio numbered-ledger layout; its own type takes over. */
[data-theme='atlas']    .ap-testimonials--studio   { display: block; }
[data-theme='heritage'] .ap-testimonials--heritage { display: block; }
[data-theme='vibrant']  .ap-testimonials--vibrant  { display: block; }
[data-theme='ironwood'] .ap-testimonials--ironwood { display: block; }

.ap-testimonials__studio-head { margin-bottom: clamp(2.5rem, 5vw, 4rem); }
.ap-testimonials__studio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  border-top: 1px solid var(--ap-line);
}
.ap-testimonials__studio-item {
  padding: clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 2vw, 1.75rem);
  border-right: 1px solid var(--ap-line);
  display: flex; flex-direction: column; gap: 1.25rem;
}
.ap-testimonials__studio-item:last-child { border-right: none; }
.ap-testimonials__studio-num {
  font-family: var(--ap-font-mono); font-size: 0.7rem;
  letter-spacing: 0.22em; color: var(--ap-ink-muted);
}
.ap-testimonials__studio-item blockquote {
  margin: 0; font-size: 1.05rem; line-height: 1.62; color: var(--ap-ink); flex: 1;
}
.ap-testimonials__author {
  display: block; font-family: var(--ap-font-mono); font-size: 0.76rem;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ap-ink);
}
.ap-testimonials__source {
  display: block; font-family: var(--ap-font-mono); font-size: 0.76rem; color: var(--ap-ink-muted);
}
@media (max-width: 640px) {
  .ap-testimonials__studio-item { border-right: none; border-bottom: 1px solid var(--ap-line); }
  .ap-testimonials__studio-item:last-child { border-bottom: none; }
}

.ap-testimonials__heritage-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: clamp(1.25rem, 3vw, 2rem);
}
.ap-testimonials__heritage-item {
  background: var(--ap-surface); border-radius: var(--ap-radius);
  padding: clamp(1.5rem, 3vw, 2.5rem);
  display: flex; flex-direction: column; gap: 0.85rem;
  box-shadow: 0 2px 18px -4px color-mix(in srgb, var(--ap-ink) 12%, transparent);
}
.ap-testimonials__heritage-mark {
  font-family: var(--ap-font-heading); font-size: 4.5rem; line-height: 0.75;
  color: var(--ap-primary); opacity: 0.35; user-select: none;
}
.ap-testimonials__heritage-item blockquote {
  margin: 0; font-family: var(--ap-font-heading);
  font-style: italic; font-size: 1.1rem; line-height: 1.56; color: var(--ap-ink); flex: 1;
}
.ap-testimonials__heritage-item figcaption { color: var(--ap-ink-muted); font-size: 0.9rem; }
.ap-testimonials__heritage-item figcaption strong { color: var(--ap-ink); }

.ap-testimonials__vibrant-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}
.ap-testimonials__vibrant-item {
  background: var(--ap-surface); border: 3px solid var(--ap-ink);
  border-radius: 20px; padding: clamp(1.25rem, 3vw, 2rem);
  display: flex; flex-direction: column; gap: 0.85rem;
  box-shadow: 5px 5px 0 var(--ap-ink); transform: rotate(-0.5deg);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ap-testimonials__vibrant-item:nth-child(even) { transform: rotate(0.5deg); }
.ap-testimonials__vibrant-item:hover { transform: rotate(0deg) translateY(-4px); box-shadow: 7px 7px 0 var(--ap-ink); }
.ap-testimonials__stars { display: flex; gap: 2px; color: var(--ap-accent); }
.ap-testimonials__vibrant-item blockquote {
  margin: 0; font-size: 1rem; line-height: 1.55; font-weight: 500; color: var(--ap-ink); flex: 1;
}
.ap-testimonials__vibrant-item figcaption { font-size: 0.85rem; font-weight: 700; color: var(--ap-ink); }
.ap-testimonials__vibrant-item figcaption span { font-weight: 400; color: var(--ap-ink-muted); }

/* ── Style 2 · Spotlight ────────────────────────────── */
.ap-reviews__spotlight-head { margin-bottom: clamp(1.5rem, 3vw, 2.5rem); }
.ap-reviews__spotlight-feature {
  position: relative;
  margin: 0 0 clamp(2rem, 4vw, 3rem);
  padding: clamp(2rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3.5rem);
  background: var(--ap-surface-alt);
  border-radius: var(--ap-radius-lg);
  border: 1px solid var(--ap-line);
  overflow: hidden;
}
.ap-reviews__spotlight-mark {
  position: absolute; top: -1.5rem; right: 1.5rem;
  font-family: var(--ap-font-heading);
  font-size: clamp(8rem, 16vw, 14rem);
  color: var(--ap-primary); opacity: 0.18;
  line-height: 1; user-select: none; pointer-events: none;
}
.ap-reviews__spotlight-feature blockquote {
  position: relative; z-index: 1;
  margin: 0 0 1.5rem;
  font-family: var(--ap-font-heading);
  font-size: clamp(1.5rem, 3vw, 2.4rem);
  line-height: 1.3; letter-spacing: -0.01em;
  color: var(--ap-ink);
  max-width: 28ch;
}
.ap-reviews__spotlight-feature figcaption {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; gap: 0.4rem;
  font-family: var(--ap-font-mono); font-size: 0.85rem;
  color: var(--ap-ink-muted);
}
.ap-reviews__spotlight-feature figcaption strong { color: var(--ap-ink); font-family: var(--ap-font-heading); font-size: 1rem; }
.ap-reviews__stars { display: flex; gap: 2px; color: var(--ap-accent); }
.ap-reviews__spotlight-grid {
  list-style: none; padding: 0; margin: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}
.ap-reviews__spotlight-grid li {
  padding: 1.25rem; border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius);
  display: flex; flex-direction: column; gap: 0.75rem;
}
.ap-reviews__spotlight-grid p { margin: 0; font-size: 0.95rem; line-height: 1.5; flex: 1; }
.ap-reviews__spotlight-grid small { font-size: 0.8rem; color: var(--ap-ink-muted); }
.ap-reviews__spotlight-grid small strong { color: var(--ap-ink); }

/* ── Style 3 · Carousel ─────────────────────────────── */
.ap-reviews__carousel-head { text-align: center; margin-bottom: clamp(1.5rem, 3vw, 2.5rem); }
.ap-reviews__carousel-card {
  margin: 0 auto;
  max-width: 720px;
  background: var(--ap-surface);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius-lg);
  padding: clamp(2rem, 4vw, 3rem);
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
  box-shadow: 0 30px 60px -30px color-mix(in srgb, var(--ap-ink) 25%, transparent);
  animation: ap-fade-in 0.4s cubic-bezier(.2,.8,.2,1);
}
@keyframes ap-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.ap-reviews__carousel-card blockquote {
  margin: 0;
  font-family: var(--ap-font-heading);
  font-size: clamp(1.15rem, 2.2vw, 1.6rem);
  line-height: 1.45;
  color: var(--ap-ink);
}
.ap-reviews__carousel-card figcaption {
  font-family: var(--ap-font-mono); font-size: 0.85rem;
  color: var(--ap-ink-muted);
}
.ap-reviews__carousel-card figcaption strong { color: var(--ap-ink); }
.ap-reviews__carousel-controls {
  display: flex; align-items: center; justify-content: center; gap: 1rem;
  margin-top: 1.5rem;
}
.ap-reviews__carousel-btn {
  width: 40px; height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--ap-line);
  background: var(--ap-surface);
  color: var(--ap-ink);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.ap-reviews__carousel-btn:hover { background: var(--ap-ink); color: var(--ap-surface); border-color: var(--ap-ink); }
.ap-reviews__carousel-dots { display: flex; gap: 0.4rem; }
.ap-reviews__carousel-dot {
  width: 8px; height: 8px; padding: 0;
  border-radius: 50%;
  border: 0;
  background: color-mix(in srgb, var(--ap-ink) 20%, transparent);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}
.ap-reviews__carousel-dot.is-active { background: var(--ap-primary); transform: scale(1.4); }

/* ── Style 4 · Wall ──────────────────────────────── */
.ap-reviews__wall-head { text-align: center; margin-bottom: clamp(2rem, 4vw, 3rem); }
.ap-reviews__wall-head h2 { margin: 0.4rem 0 0; }
.ap-reviews__wall-grid {
  column-count: 3;
  column-gap: clamp(1rem, 2vw, 1.5rem);
}
@media (max-width: 880px) { .ap-reviews__wall-grid { column-count: 2; } }
@media (max-width: 560px) { .ap-reviews__wall-grid { column-count: 1; } }
.ap-reviews__wall-item {
  break-inside: avoid;
  margin: 0 0 clamp(1rem, 2vw, 1.5rem);
  padding: clamp(1.25rem, 2.5vw, 1.75rem);
  background: var(--ap-surface);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius);
  display: flex; flex-direction: column; gap: 0.75rem;
  box-shadow: 0 8px 18px -12px color-mix(in srgb, var(--ap-ink) 30%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ap-reviews__wall-item:hover { transform: translateY(-3px); box-shadow: 0 16px 28px -16px color-mix(in srgb, var(--ap-ink) 40%, transparent); }
.ap-reviews__wall-item[data-size='1'] blockquote { font-size: 1rem; }
.ap-reviews__wall-item[data-size='2'] blockquote { font-size: 1.15rem; font-style: italic; }
.ap-reviews__wall-item[data-size='3'] blockquote { font-size: 1.05rem; }
.ap-reviews__wall-item[data-size='2'] { background: var(--ap-surface-alt); }
.ap-reviews__wall-item blockquote {
  margin: 0; line-height: 1.55;
  color: var(--ap-ink);
  font-family: var(--ap-font-body);
}
.ap-reviews__wall-item figcaption {
  font-size: 0.85rem; color: var(--ap-ink-muted);
  font-family: var(--ap-font-mono, monospace);
  border-top: 1px dashed var(--ap-line); padding-top: 0.6rem;
}
.ap-reviews__wall-item figcaption strong { color: var(--ap-ink); font-family: var(--ap-font-heading); }

/* ── Style 5 · Ticker ────────────────────────────── */
.ap-reviews__ticker-head { text-align: center; margin-bottom: clamp(1.5rem, 3vw, 2.5rem); }
.ap-reviews__ticker-head h2 { margin: 0.4rem 0 0; }
.ap-reviews__ticker-viewport {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  padding: 1.5rem 0;
}
.ap-reviews__ticker-track {
  display: flex; gap: clamp(1.75rem, 3vw, 2.5rem);
  width: max-content;
  animation: ap-ticker-scroll 60s linear infinite;
}
.ap-reviews__ticker-viewport:hover .ap-reviews__ticker-track { animation-play-state: paused; }
@keyframes ap-ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.ap-reviews__ticker-card {
  flex: 0 0 clamp(340px, 38vw, 480px);
  min-height: clamp(280px, 32vh, 360px);
  margin: 0;
  padding: clamp(1.75rem, 2.5vw, 2.25rem) clamp(1.75rem, 2.5vw, 2.25rem);
  background: var(--ap-surface);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius);
  display: flex; flex-direction: column; gap: 1rem;
  box-shadow: 0 12px 28px -14px color-mix(in srgb, var(--ap-ink) 30%, transparent);
}
.ap-reviews__ticker-stars { gap: 4px; }
.ap-reviews__ticker-card blockquote {
  margin: 0;
  font-family: var(--ap-font-heading);
  font-size: clamp(1.1rem, 1.6vw, 1.35rem);
  line-height: 1.45;
  color: var(--ap-ink);
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.ap-reviews__ticker-card figcaption {
  font-size: 0.95rem; color: var(--ap-ink-muted);
  font-family: var(--ap-font-mono, monospace);
  padding-top: 0.5rem;
  border-top: 1px solid var(--ap-line);
}
.ap-reviews__ticker-card figcaption strong {
  display: block;
  font-family: var(--ap-font-heading);
  font-size: 1.1rem;
  color: var(--ap-ink);
  margin-bottom: 0.15rem;
}
@media (prefers-reduced-motion: reduce) {
  .ap-reviews__ticker-track { animation: none; }
  .ap-reviews__ticker-viewport { overflow-x: auto; }
}

/* ── Ironwood · industrial spec-card grid ─────────── */
.ap-testimonials__ironwood-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0;
  border: 1px solid var(--ap-ink);
  background: var(--ap-ink);
}
.ap-testimonials__ironwood-item {
  background: var(--ap-surface);
  padding: clamp(1.5rem, 3vw, 2rem);
  margin: 0;
  display: flex; flex-direction: column; gap: 1rem;
  outline: 1px solid var(--ap-ink);
  outline-offset: 0;
}
.ap-testimonials__ironwood-head {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--ap-ink);
  margin-bottom: 0.25rem;
}
.ap-testimonials__ironwood-num {
  font-family: var(--ap-font-mono);
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ap-primary);
}
.ap-testimonials__ironwood-rating { display: inline-flex; gap: 2px; color: var(--ap-accent); }
.ap-testimonials__ironwood-item blockquote {
  margin: 0; font-size: 1rem; line-height: 1.55;
  color: var(--ap-ink); flex: 1;
}
.ap-testimonials__ironwood-item figcaption {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ap-line);
  font-family: var(--ap-font-mono);
  font-size: 0.78rem;
}
.ap-testimonials__ironwood-item figcaption strong {
  font-family: var(--ap-font-heading);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--ap-ink);
}
.ap-testimonials__ironwood-src {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ap-ink-muted);
  font-size: 0.7rem;
}
</style>