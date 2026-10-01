<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title?: string
  intro?: string
  address?: string
  phone?: string
  email?: string
  mapEmbedUrl?: string
  formAction?: string
}>()
</script>

<!--
  Contact section with five selectable layouts (data-contact-style on <html>):
  Style 1 · Studio Split — original 2-col, details + map left, form-card right
  Style 2 · Atlas Card   — full-bleed map background with floating glass form card
  Style 3 · Marquee      — oversized stacked composition: header → details band → form
  Style 4 · Postcard     — two postcard-styled cards: visit details + write us
  Style 5 · Brutalist    — thick borders, oversized labels, asymmetric stark grid
  Per-theme color treatment continues to flow from CSS custom properties.
-->
<template>
  <section class="ap-section ap-contact" :aria-label="title || 'Contact'">
    <!-- ── Style 1 · Studio Split ───────────────────────────── -->
    <div class="ap-container ap-contact__split">
      <div class="ap-contact__left">
        <div class="ap-section-head">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title || 'Visit us' }}</h2>
          <p v-if="intro" class="ap-contact__intro">{{ intro }}</p>
        </div>
        <ul class="ap-contact__details">
          <li v-if="address"><span>Address</span><strong>{{ address }}</strong></li>
          <li v-if="phone"><span>Phone</span><a :href="'tel:' + phone">{{ phone }}</a></li>
          <li v-if="email"><span>Email</span><a :href="'mailto:' + email">{{ email }}</a></li>
        </ul>
        <div v-if="mapEmbedUrl" class="ap-contact__map">
          <iframe :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
        </div>
      </div>
      <form class="ap-contact__form" :action="formAction" method="post">
        <div class="ap-field"><label for="ap-occasion-1">Occasion</label>
          <select id="ap-occasion-1" name="occasion" class="ap-input">
            <option value="">— Select —</option><option>Reservation</option>
            <option>Private dining</option><option>Special event</option><option>General enquiry</option>
          </select>
        </div>
        <div class="ap-field"><label for="ap-name-1">Name</label><input id="ap-name-1" name="name" required class="ap-input" /></div>
        <div class="ap-field"><label for="ap-email-1">Email</label><input id="ap-email-1" name="email" type="email" required class="ap-input" /></div>
        <div class="ap-field"><label for="ap-message-1">Message</label><textarea id="ap-message-1" name="message" rows="5" required class="ap-textarea" /></div>
        <button type="submit" class="ap-btn">Send message</button>
      </form>
    </div>

    <!-- ── Style 2 · Atlas Card · full-bleed map + floating form ── -->
    <div class="ap-contact__atlas">
      <div v-if="mapEmbedUrl" class="ap-contact__atlas-map" aria-hidden="true">
        <iframe :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
      </div>
      <div class="ap-contact__atlas-shade" aria-hidden="true" />
      <div class="ap-container ap-contact__atlas-grid">
        <div class="ap-contact__atlas-text">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2>{{ title || 'Visit us' }}</h2>
          <p v-if="intro" class="ap-contact__intro">{{ intro }}</p>
          <ul class="ap-contact__atlas-details">
            <li v-if="address"><strong>{{ address }}</strong></li>
            <li v-if="phone"><a :href="'tel:' + phone">{{ phone }}</a></li>
            <li v-if="email"><a :href="'mailto:' + email">{{ email }}</a></li>
          </ul>
        </div>
        <form class="ap-contact__atlas-form" :action="formAction" method="post">
          <p class="ap-contact__atlas-form-title">Send a message</p>
          <div class="ap-field"><label for="ap-name-2">Name</label><input id="ap-name-2" name="name" required class="ap-input" /></div>
          <div class="ap-field"><label for="ap-email-2">Email</label><input id="ap-email-2" name="email" type="email" required class="ap-input" /></div>
          <div class="ap-field"><label for="ap-message-2">Message</label><textarea id="ap-message-2" name="message" rows="4" required class="ap-textarea" /></div>
          <button type="submit" class="ap-btn">Send</button>
        </form>
      </div>
    </div>

    <!-- ── Style 3 · Marquee · oversized stacked composition ── -->
    <div class="ap-contact__marquee">
      <div class="ap-container">
        <header class="ap-contact__marquee-head">
          <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
          <h2 class="ap-contact__marquee-title">{{ title || 'Get in touch' }}</h2>
          <p v-if="intro" class="ap-contact__intro">{{ intro }}</p>
        </header>
        <div class="ap-contact__marquee-band">
          <div v-if="address" class="ap-contact__marquee-cell">
            <span class="ap-eyebrow">Address</span><p>{{ address }}</p>
          </div>
          <div v-if="phone" class="ap-contact__marquee-cell">
            <span class="ap-eyebrow">Phone</span><p><a :href="'tel:' + phone">{{ phone }}</a></p>
          </div>
          <div v-if="email" class="ap-contact__marquee-cell">
            <span class="ap-eyebrow">Email</span><p><a :href="'mailto:' + email">{{ email }}</a></p>
          </div>
        </div>
        <div class="ap-contact__marquee-body">
          <div v-if="mapEmbedUrl" class="ap-contact__marquee-map">
            <iframe :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
          </div>
          <form class="ap-contact__marquee-form" :action="formAction" method="post">
            <div class="ap-field-row">
              <div class="ap-field"><label for="ap-name-3">Name</label><input id="ap-name-3" name="name" required class="ap-input" /></div>
              <div class="ap-field"><label for="ap-email-3">Email</label><input id="ap-email-3" name="email" type="email" required class="ap-input" /></div>
            </div>
            <div class="ap-field"><label for="ap-message-3">How can we help?</label><textarea id="ap-message-3" name="message" rows="5" required class="ap-textarea" /></div>
            <button type="submit" class="ap-btn">Send message</button>
          </form>
        </div>
      </div>
    </div>
    <!-- ── Style 4 · Atlas Wide · 2-col form + full-width map below ── -->
    <div class="ap-container ap-contact__atlaswide">
      <header class="ap-contact__atlaswide-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title || 'Get in touch' }}</h2>
        <p v-if="intro" class="ap-contact__intro">{{ intro }}</p>
      </header>
      <ul v-if="address || phone || email" class="ap-contact__atlaswide-details">
        <li v-if="address"><span>Visit</span><strong>{{ address }}</strong></li>
        <li v-if="phone"><span>Call</span><a :href="'tel:' + phone">{{ phone }}</a></li>
        <li v-if="email"><span>Email</span><a :href="'mailto:' + email">{{ email }}</a></li>
      </ul>
      <form class="ap-contact__atlaswide-form" :action="formAction" method="post">
        <div class="ap-contact__atlaswide-fields">
          <div class="ap-field"><label for="ap-name-4">Name</label><input id="ap-name-4" name="name" required class="ap-input" /></div>
          <div class="ap-field"><label for="ap-email-4">Email</label><input id="ap-email-4" name="email" type="email" required class="ap-input" /></div>
          <div class="ap-field ap-contact__atlaswide-message"><label for="ap-message-4">Message</label><textarea id="ap-message-4" name="message" rows="2" required class="ap-textarea" /></div>
        </div>
        <button type="submit" class="ap-btn">Send message</button>
      </form>
      <div v-if="mapEmbedUrl" class="ap-contact__atlaswide-map">
        <iframe :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
      </div>
    </div>

    <!-- ── Style 5 · Brutalist · thick borders, asymmetric ── -->
    <div class="ap-container ap-contact__brutalist">
      <header class="ap-contact__brutalist-head">
        <span v-if="eyebrow" class="ap-contact__brutalist-tag">[ {{ eyebrow }} ]</span>
        <h2 class="ap-contact__brutalist-title">{{ title || 'Talk—to—us' }}</h2>
        <p v-if="intro" class="ap-contact__brutalist-intro">{{ intro }}</p>
      </header>
      <div class="ap-contact__brutalist-grid">
        <aside class="ap-contact__brutalist-details">
          <dl>
            <template v-if="address"><dt>WHERE</dt><dd>{{ address }}</dd></template>
            <template v-if="phone"><dt>CALL</dt><dd><a :href="'tel:' + phone">{{ phone }}</a></dd></template>
            <template v-if="email"><dt>WRITE</dt><dd><a :href="'mailto:' + email">{{ email }}</a></dd></template>
          </dl>
          <div v-if="mapEmbedUrl" class="ap-contact__brutalist-map">
            <iframe :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
          </div>
        </aside>
        <form class="ap-contact__brutalist-form" :action="formAction" method="post">
          <div class="ap-field"><label for="ap-name-5">NAME *</label><input id="ap-name-5" name="name" required class="ap-input" /></div>
          <div class="ap-field"><label for="ap-email-5">EMAIL *</label><input id="ap-email-5" name="email" type="email" required class="ap-input" /></div>
          <div class="ap-field"><label for="ap-message-5">MESSAGE *</label><textarea id="ap-message-5" name="message" rows="6" required class="ap-textarea" /></div>
          <button type="submit" class="ap-btn ap-contact__brutalist-submit">SEND →</button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── Variant gating ─────────────────────────────────── */
.ap-contact__split,
.ap-contact__atlas,
.ap-contact__marquee,
.ap-contact__atlaswide,
.ap-contact__brutalist { display: none; }
[data-contact-style='1'] .ap-contact__split      { display: grid; }
[data-contact-style='2'] .ap-contact__atlas      { display: block; }
[data-contact-style='3'] .ap-contact__marquee    { display: block; }
[data-contact-style='4'] .ap-contact__atlaswide  { display: block; }
[data-contact-style='5'] .ap-contact__brutalist  { display: block; }
:root:not([data-contact-style]) .ap-contact__split { display: grid; }

.ap-contact__intro { color: var(--ap-ink-muted); margin: 0 0 1.5rem; max-width: 52ch; }
.ap-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 640px) { .ap-field-row { grid-template-columns: 1fr; } }

/* ── Style 1 · Studio Split ─────────────────────────── */
.ap-contact__split {
  gap: clamp(2rem, 4vw, 4rem);
  grid-template-columns: 5fr 6fr;
  align-items: start;
}
.ap-contact__details { list-style: none; padding: 0; margin: 0 0 1.5rem; display: grid; gap: 0.75rem; }
.ap-contact__details li {
  display: grid; grid-template-columns: 110px 1fr; gap: 1rem;
  padding-bottom: 0.6rem; border-bottom: 1px solid var(--ap-line);
}
.ap-contact__details li:last-child { border-bottom: none; }
.ap-contact__details span {
  font-size: 0.78rem; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ap-ink-muted);
}
.ap-contact__details a { color: var(--ap-ink); text-decoration: none; }
.ap-contact__details a:hover { color: var(--ap-primary); }
.ap-contact__map { aspect-ratio: 4 / 3; border-radius: var(--ap-radius); overflow: hidden; border: 1px solid var(--ap-line); }
.ap-contact__map iframe { width: 100%; height: 100%; border: 0; }
.ap-contact__form { background: var(--ap-surface-alt); padding: clamp(1.5rem, 3vw, 2.5rem); border-radius: var(--ap-radius-lg); border: 1px solid var(--ap-line); }
@media (max-width: 820px) { .ap-contact__split { grid-template-columns: 1fr; } }

/* ── Style 2 · Atlas Card ───────────────────────────── */
.ap-contact__atlas {
  position: relative;
  min-height: clamp(560px, 78vh, 760px);
  overflow: hidden;
  border-radius: var(--ap-radius-lg);
  isolation: isolate;
}
.ap-contact__atlas-map { position: absolute; inset: 0; z-index: 0; }
.ap-contact__atlas-map iframe { width: 100%; height: 100%; border: 0; filter: grayscale(0.35) contrast(1.05); }
.ap-contact__atlas-shade {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(120deg,
    color-mix(in srgb, var(--ap-ink) 55%, transparent) 0%,
    color-mix(in srgb, var(--ap-ink) 8%, transparent) 55%,
    transparent 100%);
}
.ap-contact__atlas-grid {
  position: relative; z-index: 2;
  display: grid; grid-template-columns: 1fr 420px;
  gap: clamp(2rem, 4vw, 4rem);
  align-items: end;
  padding: clamp(2.5rem, 6vw, 5rem) 0;
  min-height: inherit;
}
.ap-contact__atlas-text { color: var(--ap-surface); padding-bottom: 0.5rem; max-width: 48ch; }
.ap-contact__atlas-text h2 { color: var(--ap-surface); margin: 0.5rem 0 1rem; }
.ap-contact__atlas-text .ap-contact__intro { color: color-mix(in srgb, var(--ap-surface) 80%, transparent); }
.ap-contact__atlas-text .ap-eyebrow { color: color-mix(in srgb, var(--ap-surface) 75%, transparent); }
.ap-contact__atlas-details { list-style: none; padding: 0; margin: 1rem 0 0; display: grid; gap: 0.4rem; }
.ap-contact__atlas-details a, .ap-contact__atlas-details strong { color: var(--ap-surface); text-decoration: none; }
.ap-contact__atlas-form {
  background: color-mix(in srgb, var(--ap-surface) 92%, transparent);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  padding: clamp(1.5rem, 2.5vw, 2rem);
  border-radius: var(--ap-radius-lg);
  border: 1px solid color-mix(in srgb, var(--ap-surface) 50%, transparent);
  box-shadow: 0 30px 60px -20px color-mix(in srgb, var(--ap-ink) 45%, transparent);
}
.ap-contact__atlas-form-title {
  margin: 0 0 1rem; font-family: var(--ap-font-heading);
  font-size: 1.25rem; letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
@media (max-width: 820px) {
  .ap-contact__atlas-grid { grid-template-columns: 1fr; align-items: stretch; }
  .ap-contact__atlas { min-height: 0; }
  .ap-contact__atlas-map { position: relative; height: 280px; }
  .ap-contact__atlas-shade { display: none; }
  .ap-contact__atlas-text { color: var(--ap-ink); padding: 0 1rem; }
  .ap-contact__atlas-text h2, .ap-contact__atlas-text .ap-eyebrow { color: var(--ap-ink); }
  .ap-contact__atlas-text .ap-contact__intro { color: var(--ap-ink-muted); }
  .ap-contact__atlas-details a, .ap-contact__atlas-details strong { color: var(--ap-ink); }
  .ap-contact__atlas-form { margin: 0 1rem; }
}

/* ── Style 3 · Marquee ──────────────────────────────── */
.ap-contact__marquee-head { text-align: left; margin-bottom: clamp(2rem, 4vw, 3rem); }
.ap-contact__marquee-title {
  font-family: var(--ap-font-heading);
  font-size: clamp(2.5rem, 7vw, 5.5rem);
  line-height: 0.95; letter-spacing: -0.02em;
  margin: 0.5rem 0 1rem;
  text-transform: var(--ap-heading-transform);
}
.ap-contact__marquee-band {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0;
  border-top: 1px solid var(--ap-line);
  border-bottom: 1px solid var(--ap-line);
  margin-bottom: clamp(2rem, 4vw, 3rem);
}
.ap-contact__marquee-cell {
  padding: clamp(1.25rem, 2.5vw, 1.75rem);
  border-right: 1px solid var(--ap-line);
}
.ap-contact__marquee-cell:last-child { border-right: none; }
.ap-contact__marquee-cell .ap-eyebrow { display: block; margin-bottom: 0.4rem; }
.ap-contact__marquee-cell p { margin: 0; font-family: var(--ap-font-heading); font-size: 1.1rem; }
.ap-contact__marquee-cell a { color: inherit; text-decoration: none; }
.ap-contact__marquee-cell a:hover { color: var(--ap-primary); }
.ap-contact__marquee-body {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: clamp(1.5rem, 3vw, 2.5rem);
}
.ap-contact__marquee-map { aspect-ratio: 4 / 3; border-radius: var(--ap-radius); overflow: hidden; border: 1px solid var(--ap-line); }
.ap-contact__marquee-map iframe { width: 100%; height: 100%; border: 0; }
.ap-contact__marquee-form { display: grid; gap: 1rem; align-content: start; }
@media (max-width: 820px) {
  .ap-contact__marquee-cell { border-right: none; border-bottom: 1px solid var(--ap-line); }
  .ap-contact__marquee-cell:last-child { border-bottom: none; }
  .ap-contact__marquee-body { grid-template-columns: 1fr; }
}

/* ── Style 4 · Atlas Wide ────────────────────────── */
.ap-contact__atlaswide { padding: clamp(1.5rem, 3vw, 2.5rem) 0; }
.ap-contact__atlaswide-head { margin-bottom: clamp(0.75rem, 1.5vw, 1.25rem); }
.ap-contact__atlaswide-head h2 {
  margin: 0.25rem 0 0.4rem;
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  line-height: 1; letter-spacing: -0.015em;
}
.ap-contact__atlaswide-head .ap-contact__intro { margin-bottom: 0; font-size: 0.95rem; }
.ap-contact__atlaswide-details {
  list-style: none; padding: 0; margin: 0 0 clamp(0.75rem, 1.5vw, 1.25rem);
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0;
  border-top: 1px solid var(--ap-line);
  border-bottom: 1px solid var(--ap-line);
}
.ap-contact__atlaswide-details li {
  padding: 0.55rem 0.85rem;
  border-right: 1px solid var(--ap-line);
  display: flex; flex-direction: column; gap: 0.1rem;
}
.ap-contact__atlaswide-details li:last-child { border-right: none; }
.ap-contact__atlaswide-details span {
  font-size: 0.68rem; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--ap-ink-muted);
}
.ap-contact__atlaswide-details strong,
.ap-contact__atlaswide-details a {
  font-family: var(--ap-font-heading);
  font-size: 0.95rem; color: var(--ap-ink);
  text-decoration: none;
}
.ap-contact__atlaswide-details a:hover { color: var(--ap-primary); }
.ap-contact__atlaswide-form { display: grid; gap: 0.6rem; margin-bottom: clamp(0.75rem, 1.5vw, 1.25rem); }
.ap-contact__atlaswide-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  align-items: end;
}
.ap-contact__atlaswide-message { grid-column: 1 / -1; }
.ap-contact__atlaswide-form .ap-input,
.ap-contact__atlaswide-form .ap-textarea {
  padding: 0.5rem 0.75rem;
}
.ap-contact__atlaswide-form .ap-textarea { min-height: 0; resize: vertical; }
.ap-contact__atlaswide-form .ap-field label {
  font-size: 0.72rem; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ap-ink-muted);
  margin-bottom: 0.2rem;
}
.ap-contact__atlaswide-form .ap-btn {
  justify-self: start;
  padding: 0.55rem 1.25rem;
}
.ap-contact__atlaswide-map {
  width: 100%;
  aspect-ratio: 32 / 9;
  max-height: 32vh;
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius);
  overflow: hidden;
}
.ap-contact__atlaswide-map iframe { width: 100%; height: 100%; border: 0; }
@media (max-width: 720px) {
  .ap-contact__atlaswide-fields { grid-template-columns: 1fr; }
  .ap-contact__atlaswide-details li { border-right: none; border-bottom: 1px solid var(--ap-line); }
  .ap-contact__atlaswide-details li:last-child { border-bottom: none; }
  .ap-contact__atlaswide-map { aspect-ratio: 4 / 3; max-height: none; }
}

/* ── Style 5 · Brutalist ──────────────────────────── */
.ap-contact__brutalist {
  border-top: 6px solid var(--ap-ink);
  border-bottom: 6px solid var(--ap-ink);
  padding: clamp(2rem, 4vw, 3rem) 0;
}
.ap-contact__brutalist-head { margin-bottom: clamp(1.5rem, 3vw, 2.5rem); }
.ap-contact__brutalist-tag {
  display: inline-block;
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.78rem; letter-spacing: 0.22em;
  color: var(--ap-ink); margin-bottom: 0.5rem;
}
.ap-contact__brutalist-title {
  font-family: var(--ap-font-heading);
  font-size: clamp(3rem, 9vw, 7rem);
  line-height: 0.9; letter-spacing: -0.04em;
  margin: 0 0 0.5rem;
  text-transform: var(--ap-heading-transform);
}
.ap-contact__brutalist-intro {
  font-size: 1.1rem; color: var(--ap-ink-muted);
  max-width: 60ch; margin: 0;
}
.ap-contact__brutalist-grid {
  display: grid; grid-template-columns: 1fr 2fr;
  gap: 0;
  border: 3px solid var(--ap-ink);
  background: var(--ap-surface);
}
.ap-contact__brutalist-details {
  border-right: 3px solid var(--ap-ink);
  padding: clamp(1.5rem, 3vw, 2.25rem);
  background: var(--ap-surface-alt);
}
.ap-contact__brutalist-details dl { margin: 0; display: grid; gap: 1rem; }
.ap-contact__brutalist-details dt {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.72rem; letter-spacing: 0.24em;
  color: var(--ap-ink-muted);
}
.ap-contact__brutalist-details dd {
  margin: 0.15rem 0 0;
  font-family: var(--ap-font-heading); font-size: 1.05rem;
  border-bottom: 2px solid var(--ap-ink);
  padding-bottom: 0.5rem;
}
.ap-contact__brutalist-details a { color: var(--ap-ink); text-decoration: none; }
.ap-contact__brutalist-details a:hover { color: var(--ap-primary); }
.ap-contact__brutalist-map {
  margin-top: 1.25rem;
  aspect-ratio: 1 / 1;
  border: 2px solid var(--ap-ink);
  overflow: hidden;
}
.ap-contact__brutalist-map iframe { width: 100%; height: 100%; border: 0; filter: grayscale(1) contrast(1.15); }
.ap-contact__brutalist-form {
  display: grid; gap: 1rem;
  padding: clamp(1.5rem, 3vw, 2.25rem);
}
.ap-contact__brutalist-form .ap-field label {
  font-family: var(--ap-font-mono, monospace);
  font-size: 0.72rem; letter-spacing: 0.24em;
  color: var(--ap-ink);
}
.ap-contact__brutalist-form .ap-input,
.ap-contact__brutalist-form .ap-textarea {
  border-radius: 0;
  border: 2px solid var(--ap-ink);
  background: var(--ap-surface);
}
.ap-contact__brutalist-submit {
  border-radius: 0 !important;
  border: 2px solid var(--ap-ink) !important;
  background: var(--ap-ink) !important;
  color: var(--ap-surface) !important;
  font-family: var(--ap-font-mono, monospace);
  letter-spacing: 0.2em;
  padding: 1rem 1.5rem;
  justify-self: start;
}
@media (max-width: 760px) {
  .ap-contact__brutalist-grid { grid-template-columns: 1fr; }
  .ap-contact__brutalist-details { border-right: 0; border-bottom: 3px solid var(--ap-ink); }
}
</style>

