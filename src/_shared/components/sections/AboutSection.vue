<script setup lang="ts">
import OptimizedImage from '../OptimizedImage.vue'

defineProps<{
  eyebrow?: string
  title: string
  paragraphs: string[]
  image?: string
  imageAlt?: string
  /** Reverse the order: image left vs right. */
  reverse?: boolean
  facts?: Array<{ label: string; value: string }>
}>()
</script>

<template>
  <section class="ap-section ap-about" :class="{ 'is-reverse': reverse }">
    <div class="ap-container ap-about__grid">
      <div v-if="image" class="ap-about__media">
        <OptimizedImage v-if="image" :src="image" :alt="imageAlt || title" />
      </div>
      <div class="ap-about__body">
        <div class="ap-section-head">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title }}</h2>
        </div>
        <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        <dl v-if="facts?.length" class="ap-about__facts">
          <div v-for="f in facts" :key="f.label">
            <dt>{{ f.label }}</dt>
            <dd>{{ f.value }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ap-about__grid {
  display: grid; gap: clamp(2rem, 4vw, 4rem);
  grid-template-columns: 5fr 6fr; align-items: center;
}
.is-reverse .ap-about__grid { grid-template-columns: 6fr 5fr; direction: rtl; }
.is-reverse .ap-about__body { direction: ltr; }
.is-reverse .ap-about__media { direction: ltr; }
.ap-about__media img {
  width: 100%; aspect-ratio: 4 / 5; object-fit: cover;
  border-radius: var(--ap-radius-lg);
}
.ap-about__facts {
  margin-top: 1.5rem; display: grid; gap: 0.75rem 2rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  border-top: 1px solid var(--ap-line); padding-top: 1.25rem;
}
.ap-about__facts dt {
  font-size: 0.75rem; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ap-ink-muted);
}
.ap-about__facts dd { margin: 0.2rem 0 0; font-family: var(--ap-font-heading); font-size: 1.1rem; }
@media (max-width: 820px) {
  .ap-about__grid, .is-reverse .ap-about__grid { grid-template-columns: 1fr; direction: ltr; }
}

/* ── About layout variants (data-about-style on <html>) ──
   1 Classic  — split image/text (default above)
   2 Editorial — centered single column, image full-width beneath the text
   3 Ledger   — wide banner image on top, text left, facts as a right rail
   4 Poster   — image as the backdrop, text on a raised surface card

   Templates give .ap-about a viewport-relative min-height and center the
   grid vertically — fine for the split, but it tears the single-column
   variants apart. Neutralize both and cap the banner media so text and
   image stay one connected composition. */
[data-about-style='2'] .ap-about,
[data-about-style='3'] .ap-about,
[data-about-style='4'] .ap-about {
  min-height: 0 !important;
}
[data-about-style='2'] .ap-about__grid,
[data-about-style='3'] .ap-about__grid,
[data-about-style='4'] .ap-about__grid {
  align-items: start;
  align-content: start;
}
[data-about-style='2'] .ap-about__media img,
[data-about-style='3'] .ap-about__media img,
[data-about-style='4'] .ap-about__media img {
  max-height: min(46svh, 460px);
  width: 100%;
  object-fit: cover;
}

[data-about-style='2'] .ap-about__grid,
[data-about-style='2'].is-reverse .ap-about__grid {
  grid-template-columns: 1fr;
  direction: ltr;
  justify-items: center;
  gap: clamp(1.5rem, 3vw, 2.25rem);
}
[data-about-style='2'] .ap-about__media { order: 2; width: 100%; }
[data-about-style='2'] .ap-about__media img { aspect-ratio: 21 / 9; }
[data-about-style='2'] .ap-about__body {
  order: 1; max-width: 62ch; text-align: center;
}
[data-about-style='2'] .ap-about__body .ap-section-head {
  margin-left: auto; margin-right: auto; align-items: center; text-align: center;
}
[data-about-style='2'] .ap-about__facts { justify-items: center; text-align: center; }

[data-about-style='3'] .ap-about__grid,
[data-about-style='3'].is-reverse .ap-about__grid {
  grid-template-columns: 1fr;
  direction: ltr;
}
[data-about-style='3'] .ap-about__media img { aspect-ratio: 21 / 9; }
[data-about-style='3'] .ap-about__body {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(200px, 0.9fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: start;
}
[data-about-style='3'] .ap-about__body .ap-section-head { grid-column: 1 / -1; }
[data-about-style='3'] .ap-about__facts {
  grid-column: 2;
  grid-row: 2 / span 9;
  grid-template-columns: 1fr;
  margin-top: 0;
  border-top: 0;
  border-left: 1px solid var(--ap-line);
  padding: 0 0 0 1.25rem;
  align-content: start;
}
[data-about-style='3'] .ap-about__body > p { grid-column: 1; }

[data-about-style='4'] .ap-about__grid,
[data-about-style='4'].is-reverse .ap-about__grid {
  grid-template-columns: 1fr;
  direction: ltr;
  position: relative;
}
[data-about-style='4'] .ap-about__media img {
  aspect-ratio: 16 / 7;
  border-radius: var(--ap-radius-lg);
}
[data-about-style='4'] .ap-about__body {
  position: relative;
  z-index: 1;
  width: min(100%, 640px);
  margin: calc(-1 * clamp(3rem, 8vw, 6rem)) auto 0;
  padding: clamp(1.5rem, 3.5vw, 2.75rem);
  background: var(--ap-surface-alt);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius-lg);
  box-shadow: var(--ap-shadow-lg);
}
@media (max-width: 820px) {
  [data-about-style='3'] .ap-about__body { grid-template-columns: 1fr; }
  [data-about-style='3'] .ap-about__facts {
    grid-column: 1; grid-row: auto;
    border-left: 0; border-top: 1px solid var(--ap-line);
    padding: 1.25rem 0 0;
  }
  [data-about-style='4'] .ap-about__body { margin-top: -2rem; }
}
</style>
