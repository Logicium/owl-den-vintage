<script setup lang="ts">
defineProps<{
  brand: string
  blurb?: string
  address?: string
  phone?: string
  email?: string
  social?: Array<{ label: string; href: string }>
  links?: Array<{ to: string; label: string }>
}>()
const year = new Date().getFullYear()
</script>

<!--
  AppFooter renders 5 interchangeable layouts controlled via data-footer-style on <html>.
  Style 1 · Classic     — 4-col grid (brand / contact / links / social)
  Style 2 · Editorial   — horizontal rule + 2-col: blurb left, columns right
  Style 3 · Billboard   — giant brand name as background text, contact bar below
  Style 4 · Minimal     — single centered line: brand · links · copyright
  Style 5 · Dark Stage  — full-width dark block, stacked centered brand + CTA row
  All visual treatment lives in themes.css via [data-footer-style] selectors.
-->
<template>
  <footer class="ap-footer">
    <!-- ── Style 3 · Billboard: brand name as giant watermark ── -->
    <div class="ap-footer__billboard" aria-hidden="true">{{ brand }}</div>

    <!-- ── Styles 1 + 2 · Classic / Editorial grid ── -->
    <div class="ap-container ap-footer__grid">
      <div class="ap-footer__col-brand">
        <p class="ap-footer__brand">{{ brand }}</p>
        <p v-if="blurb" class="ap-footer__blurb">{{ blurb }}</p>
        <ul v-if="social?.length" class="ap-footer__social">
          <li v-for="s in social" :key="s.href">
            <a :href="s.href" target="_blank" rel="noopener">{{ s.label }}</a>
          </li>
        </ul>
      </div>
      <div v-if="address || phone || email" class="ap-footer__col-contact">
        <p class="ap-eyebrow">Visit</p>
        <p v-if="address">{{ address }}</p>
        <p v-if="phone"><a :href="'tel:' + phone">{{ phone }}</a></p>
        <p v-if="email"><a :href="'mailto:' + email">{{ email }}</a></p>
      </div>
      <div v-if="links?.length" class="ap-footer__col-links">
        <p class="ap-eyebrow">Explore</p>
        <ul>
          <li v-for="l in links" :key="l.to"><router-link :to="l.to">{{ l.label }}</router-link></li>
        </ul>
      </div>
    </div>

    <!-- ── Style 4 · Minimal: inline nav ── -->
    <div class="ap-container ap-footer__minimal">
      <span class="ap-footer__brand">{{ brand }}</span>
      <nav v-if="links?.length" class="ap-footer__minimal-nav">
        <router-link v-for="l in links" :key="l.to" :to="l.to">{{ l.label }}</router-link>
      </nav>
    </div>

    <!-- ── Style 5 · Dark Stage: centered brand + contact ── -->
    <div class="ap-container ap-footer__stage">
      <p class="ap-footer__stage-brand">{{ brand }}</p>
      <p v-if="blurb" class="ap-footer__blurb">{{ blurb }}</p>
      <div class="ap-footer__stage-contact">
        <a v-if="phone" :href="'tel:' + phone">{{ phone }}</a>
        <a v-if="email" :href="'mailto:' + email">{{ email }}</a>
      </div>
      <ul v-if="social?.length" class="ap-footer__social ap-footer__social--row">
        <li v-for="s in social" :key="s.href">
          <a :href="s.href" target="_blank" rel="noopener">{{ s.label }}</a>
        </li>
      </ul>
    </div>

    <!-- ── Base bar (all styles) ── -->
    <div class="ap-container ap-footer__base">
      <small>&copy; {{ year }} {{ brand }}. All rights reserved.</small>
      <small>Built by <a href="https://apotomelabs.com" target="_blank" rel="noopener">Apotome Labs</a></small>
    </div>
  </footer>
</template>

<style scoped>
/* ── Base shared ────────────────────────────────────────── */
.ap-footer {
  position: relative; overflow: hidden;
  margin-top: 0;
}
.ap-footer ul { list-style: none; padding: 0; margin: 0.5rem 0 0; display: grid; gap: 0.4rem; }
.ap-footer a { color: inherit; text-decoration: none; }
.ap-footer a:hover { text-decoration: underline; }
.ap-footer__brand {
  font-family: var(--ap-font-heading); font-size: 1.4rem; margin: 0 0 0.5rem;
  letter-spacing: var(--ap-tracking-heading); text-transform: var(--ap-heading-transform);
}
.ap-footer__blurb { color: var(--ap-ink-muted); max-width: 34ch; margin: 0; }
.ap-footer__social { display: flex !important; flex-direction: row; flex-wrap: wrap; gap: 0.75rem !important; margin-top: 1rem !important; }
.ap-footer__social li { display: contents; }
.ap-footer__base {
  display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  padding-block: 1.25rem; border-top: 1px solid var(--ap-line); color: var(--ap-ink-muted);
  font-size: 0.8rem;
  position: relative; z-index: 1;
}

/* ── Style 1 · Classic (default) ───────────────────────── */
.ap-footer__grid {
  display: grid; gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  padding-block: clamp(3rem, 6vw, 5rem) 2rem;
}
.ap-footer__billboard { display: none; }
.ap-footer__minimal  { display: none; }
.ap-footer__stage    { display: none; }

/* ── Style 3 · Billboard ────────────────────────────────── */
/* Giant watermark brand name */
.ap-footer__billboard {
  position: absolute; top: 0; left: 0; right: 0;
  font-family: var(--ap-font-heading);
  font-size: clamp(8rem, 22vw, 18rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 0.88;
  white-space: nowrap;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

/* ── Style 4 · Minimal ──────────────────────────────────── */
.ap-footer__minimal {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.5rem; flex-wrap: wrap;
}
.ap-footer__minimal-nav {
  display: flex; gap: 1.5rem; flex-wrap: wrap;
}
.ap-footer__minimal-nav a { color: var(--ap-ink-muted); font-size: 0.9rem; }
.ap-footer__minimal-nav a:hover { color: var(--ap-ink); }

/* ── Style 5 · Dark Stage ───────────────────────────────── */
.ap-footer__stage {
  display: flex; flex-direction: column; align-items: center;
  gap: 1rem; text-align: center;
}
.ap-footer__stage-brand {
  font-family: var(--ap-font-heading);
  font-size: clamp(3rem, 8vw, 7rem);
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
  margin: 0; line-height: 1;
}
.ap-footer__stage-contact {
  display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center;
}
.ap-footer__social--row { flex-direction: row !important; justify-content: center; }

@media (max-width: 640px) {
  .ap-footer__minimal { flex-direction: column; align-items: flex-start; }
}
</style>
