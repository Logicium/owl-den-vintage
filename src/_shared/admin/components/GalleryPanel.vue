<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { resolvePlanTier } from '../../themes/tokens'
import { RouterLink } from 'vue-router'
import { MapPin, Sparkles } from 'lucide-vue-next'
import { contentClient } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import ImageInput from './inputs/ImageInput.vue'

/**
 * The photo library for the active site, organized as SLOTS that say exactly
 * where each image appears on the public site. Backwards compatible: photos
 * uploaded before slots existed simply fill the positions in order.
 *
 * Slot budget follows the purchased size: Essentials 8 gallery slots,
 * Portfolio 16. Unpaid Portfolio slots render locked with an upgrade CTA.
 */

interface PhotoSlot { src: string; alt?: string; caption?: string }

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)
const activeSite = computed(() => activeSites.sites.find(s => s.id === activeSites.activeId) ?? null)
const archetype = computed(() => activeSite.value?.archetype ?? 'mesa')

/** Paid tier: the plan the site was BOUGHT on, from the sites list. */
const portfolioPaid = computed(() => {
  const plan = (activeSite.value as { plan?: string } | null)?.plan ?? 'essentials'
  return resolvePlanTier(plan) === 'portfolio'
})

const ESSENTIALS_SLOTS = 8
const PORTFOLIO_SLOTS = 16

/* ── Draft state (never clobbers keys we don't own) ── */
const draftPayload = ref<Record<string, unknown> | null>(null)
const photos = ref<{ hero: PhotoSlot; about: PhotoSlot; storefront?: PhotoSlot; gallery: PhotoSlot[] }>({
  hero: { src: '', alt: '' },
  about: { src: '', alt: '' },
  gallery: [],
})
const loading = ref(false)
const saving = ref(false)
const msg = ref<string | null>(null)
const err = ref<string | null>(null)

async function load() {
  if (!siteId.value) return
  loading.value = true
  err.value = null
  try {
    const d = await contentClient.getDraft(siteId.value)
    draftPayload.value = d.payload ?? {}
    const p = (d.payload?.photos ?? {}) as Partial<typeof photos.value>
    const norm = (s?: Partial<PhotoSlot>): PhotoSlot => ({ src: s?.src ?? '', alt: s?.alt ?? '', caption: s?.caption })
    photos.value = {
      hero: norm(p.hero),
      about: norm(p.about),
      ...(archetype.value === 'vault' ? { storefront: norm(p.storefront) } : {}),
      gallery: Array.isArray(p.gallery) ? p.gallery.map(norm) : [],
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(siteId, load)

/* ── Slots ──
   Named slots first (hero / story / storefront), then ordinal gallery
   positions. Existing uploads beyond the visible budget stay visible so
   nothing a customer uploaded ever disappears. */
type NamedKey = 'hero' | 'about' | 'storefront'
const NAMED_SLOTS = computed<Array<{ key: NamedKey; label: string; where: string }>>(() => {
  const base: Array<{ key: NamedKey; label: string; where: string }> = [
    { key: 'hero', label: 'Hero photo', where: 'Home · top of the page' },
    { key: 'about', label: 'Story photo', where: 'Home · story section' },
  ]
  if (archetype.value === 'vault') {
    base.push({ key: 'storefront', label: 'Storefront photo', where: 'Visit page' })
  }
  return base
})
/** Named-slot accessor that materializes optional slots on first touch. */
function named(key: NamedKey): PhotoSlot {
  if (key === 'storefront') {
    if (!photos.value.storefront) photos.value.storefront = { src: '', alt: '' }
    return photos.value.storefront
  }
  return photos.value[key]
}

const GALLERY_WHERE: Record<string, string> = {
  mesa: 'Home · A look around + Gallery page',
  hearth: 'Home · gallery + Gallery page',
  vault: 'Home · lookbook + Gallery page',
  keystone: 'Home · work gallery',
  marquee: 'Home · gallery + Gallery page',
}

const unlockedCount = computed(() => (portfolioPaid.value ? PORTFOLIO_SLOTS : ESSENTIALS_SLOTS))
/* Only editable slots render; locked Portfolio capacity is represented by
   the upgrade CTA instead of a wall of padlocked boxes. Uploads beyond the
   current budget (grandfathered content) stay visible. */
const gallerySlots = computed(() => {
  const visible = Math.max(unlockedCount.value, photos.value.gallery.length)
  return Array.from({ length: visible }, (_, i) => {
    const notes: string[] = [GALLERY_WHERE[archetype.value] ?? 'Home · gallery']
    if (i < 3) notes.push('Hero carousel on Portfolio')
    if (i >= ESSENTIALS_SLOTS) notes.push('Portfolio')
    return { index: i, where: notes.join(' · ') }
  })
})

/* ── Photo campaign checkout ──
   One-off purchase against this site; the paid order shows up in Billing. */
const buying = ref<string | null>(null)
async function buy(items: string[]) {
  if (!siteId.value || buying.value) return
  buying.value = items[0] ?? null
  err.value = null
  try {
    const r = await contentClient.createUpgradeCheckout(siteId.value, items)
    if (r.checkoutUrl) {
      window.location.href = r.checkoutUrl
    } else {
      msg.value = 'Order placed. You can see it under Billing.'
      if (items.includes('website-portfolio-upgrade')) window.location.reload()
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    buying.value = null
  }
}

function slotFor(i: number): PhotoSlot {
  while (photos.value.gallery.length <= i) photos.value.gallery.push({ src: '', alt: '' })
  return photos.value.gallery[i]!
}
function clearSlot(i: number) {
  const g = photos.value.gallery[i]
  if (g) { g.src = ''; g.alt = '' }
}

/* ── Save ── */
async function save(publish: boolean) {
  if (!siteId.value || !draftPayload.value) return
  saving.value = true
  msg.value = null
  err.value = null
  try {
    // Compact the gallery: slots are ordinal, so empty holes collapse and
    // the public site only ever receives real photos.
    const compacted = photos.value.gallery.filter(g => g.src && g.src.trim())
    const payload = {
      ...draftPayload.value,
      photos: {
        ...(draftPayload.value.photos as Record<string, unknown> ?? {}),
        hero: photos.value.hero,
        about: photos.value.about,
        ...(photos.value.storefront ? { storefront: photos.value.storefront } : {}),
        gallery: compacted,
      },
    }
    if (publish) {
      await contentClient.publish(siteId.value, payload)
      msg.value = 'Published. Your site shows the new photos now.'
    } else {
      await contentClient.saveDraft(siteId.value, payload)
      msg.value = 'Draft saved.'
    }
    draftPayload.value = payload
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="gal">
    <p v-if="loading" class="adm-muted">Loading photos…</p>

    <template v-else>
      <!-- Named slots — the cinematic pair: wide hero plate, portrait story. -->
      <div class="adm-card">
        <h3 class="adm-card__title">Page photos</h3>
        <p class="adm-card__sub">Each slot maps to one fixed place on your site.</p>
        <div class="gal__named">
          <div v-for="n in NAMED_SLOTS" :key="n.key" class="gal__slot" :class="{ 'gal__slot--hero': n.key === 'hero' }">
            <div class="gal__slot-head">
              <span class="gal__slot-name">{{ n.label }}</span>
              <span class="gal__slot-where"><MapPin :size="11" /> {{ n.where }}</span>
            </div>
            <ImageInput
              :model-value="named(n.key).src"
              @update:model-value="v => { named(n.key).src = v }"
              :site-id="siteId ?? undefined"
              :aspect="n.key === 'hero' ? '16 / 9' : '4 / 5'"
            />
            <input
              :value="named(n.key).alt"
              class="adm-input gal__alt"
              placeholder="Describe this photo (alt text)"
              @input="named(n.key).alt = ($event.target as HTMLInputElement).value"
            />
          </div>
        </div>
      </div>

      <!-- Gallery slots -->
      <div class="adm-card">
        <div class="gal__head">
          <div>
            <h3 class="adm-card__title">Gallery</h3>
            <p class="adm-card__sub">
              {{ unlockedCount }} slots on your plan.
              Photos fill positions in order; earlier uploads are already mapped for you.
            </p>
          </div>
        </div>

        <div class="gal__grid">
          <div v-for="g in gallerySlots" :key="g.index" class="gal__slot">
            <div class="gal__slot-head">
              <span class="gal__slot-name">Slot {{ g.index + 1 }}</span>
              <span class="gal__slot-where"><MapPin :size="11" /> {{ g.where }}</span>
            </div>
            <ImageInput :model-value="slotFor(g.index).src" @update:model-value="v => { slotFor(g.index).src = v }" :site-id="siteId ?? undefined" aspect="1 / 1" />
            <input
              :value="slotFor(g.index).alt"
              class="adm-input gal__alt"
              placeholder="Alt text"
              @input="slotFor(g.index).alt = ($event.target as HTMLInputElement).value"
            />
            <button v-if="slotFor(g.index).src" type="button" class="adm-btn adm-btn--sm gal__clear" @click="clearSlot(g.index)">Clear</button>
          </div>
        </div>

        <!-- Portfolio upsell — shown only when the paid tier is missing -->
        <div v-if="!portfolioPaid" class="gal__upsell">
          <Sparkles :size="15" />
          <div>
            <strong>Want more room for photos?</strong>
            <p>
              Portfolio doubles your gallery to 16 photos and adds the hero carousel and
              photo-forward layouts. $50, one time.
            </p>
          </div>
          <div class="gal__upsell-actions">
            <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" :disabled="!!buying" @click="buy(['website-portfolio-upgrade'])">
              {{ buying === 'website-portfolio-upgrade' ? 'Starting checkout…' : 'Upgrade to Portfolio' }}
            </button>
            <RouterLink to="/admin/addons" class="adm-btn adm-btn--sm">See all upgrades</RouterLink>
          </div>
        </div>
      </div>

      <!-- Photo campaign CTA -->
      <div class="adm-card gal__campaign">
        <div class="gal__campaign-copy">
          <span class="adm-eyebrow">Need better photos?</span>
          <h3 class="adm-card__title">Book a photo campaign</h3>
          <p class="adm-card__sub">
            We come to you, shoot on location, and deliver web-ready photos named to
            match these slots. The order lands right in your Billing history.
          </p>
        </div>
        <div class="gal__campaign-actions">
          <button type="button" class="adm-btn adm-btn--primary" :disabled="!!buying" @click="buy(['photo'])">
            {{ buying === 'photo' ? 'Starting checkout…' : 'Photo campaign · $100' }}
          </button>
          <button type="button" class="adm-btn" :disabled="!!buying" @click="buy(['photo-extended'])">
            {{ buying === 'photo-extended' ? 'Starting checkout…' : 'Extended session · $150' }}
          </button>
        </div>
      </div>

      <div class="gal__actions">
        <button type="button" class="adm-btn" :disabled="saving" @click="save(false)">Save draft</button>
        <button type="button" class="adm-btn adm-btn--primary" :disabled="saving" @click="save(true)">
          {{ saving ? 'Saving…' : 'Publish' }}
        </button>
        <span v-if="msg" class="adm-msg-ok gal__msg">{{ msg }}</span>
        <span v-if="err" class="adm-msg-err gal__msg">{{ err }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.gal { display: flex; flex-direction: column; gap: 1.1rem; }
/* Cinematic pair: the hero plate takes the wide lane, story/storefront sit
   beside it as portraits. */
.gal__named {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1.25rem;
  margin-top: 0.9rem;
  align-items: start;
}
.gal__slot--hero { grid-column: 1; }
@media (max-width: 900px) {
  .gal__named { grid-template-columns: 1fr 1fr; }
  .gal__slot--hero { grid-column: 1 / -1; }
}
.gal__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.gal__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-top: 0.9rem;
}
.gal__slot {
  display: flex; flex-direction: column; gap: 0.4rem;
  min-width: 0;
}
.gal__slot-head {
  display: flex; flex-direction: column; gap: 0.15rem;
  min-height: 2.2rem;
}
.gal__slot-name {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.78rem; font-weight: 600; color: var(--adm-text);
}
.gal__slot-where {
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-family: var(--adm-font-mono);
  font-size: 0.62rem; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--adm-text-subtle);
  line-height: 1.35;
}
.gal__slot-where svg { flex-shrink: 0; }
.gal__alt { font-size: 0.78rem; padding: 0.35rem 0.5rem; }
.gal__clear { align-self: flex-start; }
.gal__upsell {
  display: flex; align-items: flex-start; gap: 0.7rem;
  margin-top: 1.1rem;
  padding: 0.85rem 1rem;
  border: 1px dashed color-mix(in srgb, var(--adm-accent) 55%, transparent);
  border-radius: var(--adm-radius);
  background: color-mix(in srgb, var(--adm-accent) 6%, transparent);
}
.gal__upsell svg { flex-shrink: 0; color: var(--adm-accent); margin-top: 0.15rem; }
.gal__upsell strong { font-size: 0.9rem; }
.gal__upsell p { margin: 0.15rem 0 0; font-size: 0.82rem; color: var(--adm-text-muted); max-width: 52ch; }
.gal__upsell-actions {
  margin-left: auto; flex-shrink: 0; align-self: center;
  display: flex; gap: 0.5rem; flex-wrap: wrap;
}
.gal__campaign {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.25rem; flex-wrap: wrap;
}
.gal__campaign-copy { max-width: 56ch; }
.gal__campaign-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; flex-shrink: 0; }
.gal__actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.gal__msg { margin: 0; }
@media (max-width: 700px) {
  .gal__upsell { flex-wrap: wrap; }
  .gal__upsell-actions { margin-left: 0; }
}
</style>
