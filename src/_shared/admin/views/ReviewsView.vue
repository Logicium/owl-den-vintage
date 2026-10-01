<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Building2, PenLine, Star } from 'lucide-vue-next'
import { contentClient, type GooglePlacePreview } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import TextAreaField from '../../components/forms/TextAreaField.vue'
import { useToast } from '../composables/useToast'

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)
const toast = useToast()

// ── "Show on the public site" IS the tab switcher: the active tab is the
//    source the site renders. Default tab: Google reviews. ──
interface Testimonial { quote: string; author: string; source?: string }
// The full content draft is held so we only ever overwrite the two keys we own
// (reviewsSource + testimonials) and never clobber the rest of the payload.
const draftPayload = ref<Record<string, unknown> | null>(null)
const reviewsSource = ref<'manual' | 'google'>('google')
const savedSource = ref<'manual' | 'google'>('google')
const testimonials = ref<Testimonial[]>([])
const contentSaving = ref(false)
const sourceDirty = computed(() => reviewsSource.value !== savedSource.value)

async function loadContent() {
  draftPayload.value = null
  reviewsSource.value = 'google'
  savedSource.value = 'google'
  testimonials.value = []
  if (!siteId.value) return
  try {
    const d = await contentClient.getDraft(siteId.value)
    draftPayload.value = d.payload
    // Saved choice wins; a site that never chose defaults to Google.
    const src = d.payload.reviewsSource === 'manual' ? 'manual' : 'google'
    reviewsSource.value = src
    savedSource.value = src
    testimonials.value = Array.isArray(d.payload.testimonials) ? (d.payload.testimonials as Testimonial[]) : []
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function addTestimonial() { testimonials.value.push({ quote: '', author: '', source: '' }) }
function removeTestimonial(i: number) { testimonials.value.splice(i, 1) }

async function saveContent(publish: boolean) {
  if (!siteId.value || !draftPayload.value) return
  contentSaving.value = true
  try {
    const payload = { ...draftPayload.value, reviewsSource: reviewsSource.value, testimonials: testimonials.value }
    if (publish) {
      const r = await contentClient.publish(siteId.value, payload)
      toast.success(`Published v${r.version}`)
    } else {
      const r = await contentClient.saveDraft(siteId.value, payload)
      toast.success(`Draft saved · v${r.version}`)
    }
    draftPayload.value = payload
    savedSource.value = reviewsSource.value
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    contentSaving.value = false
  }
}

/* ── Google Business Profile onboarding ──
   Only shown while no listing is connected. Two paths, both requiring
   explicit consent; each emails the operator with the details. */
const gbpChoice = ref<'setup' | 'manage' | null>(null)
const gbpConsent = ref(false)
const gbpBusy = ref(false)
const gbpSent = ref(false)
const gbpFields = ref<Record<string, string>>({
  businessName: '', address: '', phone: '', category: '', hoursNotes: '', notes: '',
})

function pickGbp(choice: 'setup' | 'manage') {
  gbpChoice.value = gbpChoice.value === choice ? null : choice
  gbpConsent.value = false
  gbpSent.value = false
}

async function submitGbp() {
  if (!siteId.value || !gbpChoice.value || !gbpConsent.value) return
  gbpBusy.value = true
  try {
    await contentClient.submitGbpRequest(siteId.value, gbpChoice.value, gbpFields.value, true)
    gbpSent.value = true
    toast.success('Request sent. We will follow up by email.')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    gbpBusy.value = false
  }
}

type Candidate = { placeId: string; name: string; address: string; rating: number | null; totalRatings: number | null }

const loading = ref(false)
const error = ref<string | null>(null)
const status = ref('')

const connected = ref<{ placeId: string; preview: GooglePlacePreview | null } | null>(null)
const savedReviews = ref<Array<{ id: string; rating: number; author: string; text: string; source: string; fetchedAt: string }>>([])

const query = ref('')
const searching = ref(false)
const results = ref<Candidate[]>([])
let searchSeq = 0
let searchTimer: number | null = null

async function loadConnection() {
  if (!siteId.value) { connected.value = null; savedReviews.value = []; return }
  // Reset before fetching so a slow request never shows the previous site's data.
  connected.value = null
  savedReviews.value = []
  results.value = []
  query.value = ''
  status.value = ''
  loading.value = true
  error.value = null
  try {
    const place = await contentClient.getGooglePlace(siteId.value)
    connected.value = place.placeId ? { placeId: place.placeId, preview: place.preview } : null
    savedReviews.value = await contentClient.listAdminReviews(siteId.value).catch(() => [])
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function scheduleSearch() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(runSearch, 280)
}

async function runSearch() {
  if (!siteId.value) return
  const q = query.value.trim()
  if (q.length < 2) { results.value = []; searching.value = false; return }
  const mySeq = ++searchSeq
  searching.value = true
  try {
    const res = await contentClient.searchGooglePlaces(siteId.value, q)
    if (mySeq !== searchSeq) return
    results.value = res.results
  } catch (e) {
    if (mySeq !== searchSeq) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (mySeq === searchSeq) searching.value = false
  }
}

async function pickPlace(c: Candidate) {
  if (!siteId.value) return
  status.value = ''
  error.value = null
  loading.value = true
  try {
    const res = await contentClient.setGooglePlace(siteId.value, c.placeId)
    connected.value = { placeId: res.placeId, preview: res.preview }
    savedReviews.value = await contentClient.listAdminReviews(siteId.value).catch(() => [])
    status.value = `Connected to ${c.name}. Reviews refresh hourly.`
    query.value = ''
    results.value = []
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function disconnect() {
  if (!siteId.value || !connected.value) return
  if (!confirm('Disconnect this Google Business listing? Reviews will stop refreshing.')) return
  status.value = ''
  error.value = null
  loading.value = true
  try {
    await contentClient.disconnectGooglePlace(siteId.value)
    connected.value = null
    savedReviews.value = []
    status.value = 'Disconnected.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/* The keyless embed cannot resolve `q=place_id:…` — it silently falls back to
   a zoomed-out world map. Query the listing's name + address instead (the
   same form MapSearchPicker uses) and pin the zoom so it lands on the shop. */
const mapEmbedUrl = computed(() => {
  const c = connected.value
  if (!c) return null
  const place = [c.preview?.name, c.preview?.address].filter(Boolean).join(', ')
  if (!place) return null
  return `https://www.google.com/maps?q=${encodeURIComponent(place)}&z=16&output=embed`
})

function stars(rating: number) {
  const full = Math.round(rating)
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full)
}

onMounted(() => { void loadConnection(); void loadContent() })
watch(siteId, () => { void loadConnection(); void loadContent() })
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div class="adm-page__title-block">
        <span class="adm-eyebrow">Reputation</span>
        <h1 class="adm-title">Reviews</h1>
        <p class="adm-subtitle">Show hand-written testimonials or pull live ratings straight from your Google Business Profile.</p>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <div class="adm-empty__icon">⌗</div>
      <h2 class="adm-empty__title">No active site</h2>
      <p class="adm-empty__body">Select a site from the header to manage its reviews.</p>
    </div>

    <template v-else>
      <!-- ── "Show on the public site" = the tab switcher ── -->
      <div class="rv-source">
        <span class="adm-eyebrow rv-source__label">Show on the public site</span>
        <div class="adm-tabs" role="tablist">
          <button type="button" role="tab" class="adm-tab" :class="{ 'is-active': reviewsSource === 'google' }" :aria-selected="reviewsSource === 'google'" @click="reviewsSource = 'google'">
            <Star :size="14" /> Live Google reviews
          </button>
          <button type="button" role="tab" class="adm-tab" :class="{ 'is-active': reviewsSource === 'manual' }" :aria-selected="reviewsSource === 'manual'" @click="reviewsSource = 'manual'">
            <PenLine :size="14" /> Hand-written testimonials
          </button>
        </div>
        <div class="rv-source__save">
          <span v-if="sourceDirty" class="rv-source__dirty">Publish to make this the live source.</span>
          <button type="button" class="adm-btn adm-btn--sm" :disabled="contentSaving || !draftPayload" @click="saveContent(false)">Save draft</button>
          <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" :disabled="contentSaving || !draftPayload" @click="saveContent(true)">Publish</button>
        </div>
      </div>

      <!-- ── Tab · Hand-written testimonials ── -->
      <div v-if="reviewsSource === 'manual'" class="adm-card rv-testimonials">
        <h3 class="adm-card__title">Hand-written testimonials</h3>
        <p class="adm-card__sub">Shown on the site while this tab is the live source, and used as the fallback when Google has nothing.</p>
        <div class="rv-tst">
          <div v-for="(t, i) in testimonials" :key="i" class="rv-tst__row">
            <TextAreaField v-model="t.quote" :rows="3" :maxlength="400" placeholder="Quote…" />
            <div class="rv-tst__meta">
              <input class="adm-input" v-model="t.author" placeholder="Author name" />
              <input class="adm-input" v-model="t.source" placeholder="Source (Google, Yelp…)" />
              <button type="button" class="adm-btn adm-btn--danger adm-btn--sm" @click="removeTestimonial(i)">Remove</button>
            </div>
          </div>
          <p v-if="!testimonials.length" class="adm-muted rv-tst__empty">
            No testimonials yet. Add a few favorite quotes from happy customers.
          </p>
          <button type="button" class="adm-btn adm-btn--sm rv-tst__add" @click="addTestimonial">+ Add testimonial</button>
        </div>
      </div>

      <!-- ── Tab · Google reviews ── -->
      <div v-else-if="connected" class="rv-connected">
        <div class="rv-card rv-summary">
          <div class="rv-summary__head">
            <div class="rv-brand">
              <span class="rv-brand__logo" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="22" height="22">
                  <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 24 4a20 20 0 1 0 19.6 16.5z"/>
                  <path fill="#34A853" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
                  <path fill="#FBBC05" d="M24 44a20 20 0 0 0 13.6-5.3l-6.3-5.3a12 12 0 0 1-18-6.3l-6.6 5.1A20 20 0 0 0 24 44z"/>
                  <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.4l6.3 5.3c-.4.4 6.4-4.7 6.4-14.7 0-1.3-.1-2.3-.4-3.5z"/>
                </svg>
              </span>
              <div>
                <span class="adm-eyebrow">Google Business Profile</span>
                <h3 class="rv-summary__name">{{ connected.preview?.name || 'Connected listing' }}</h3>
                <p v-if="connected.preview?.address" class="rv-summary__addr">{{ connected.preview.address }}</p>
              </div>
            </div>
            <button type="button" class="adm-btn adm-btn--sm" :disabled="loading" @click="disconnect">Disconnect</button>
          </div>

          <div v-if="connected.preview" class="rv-stats">
            <div class="rv-stat">
              <span class="rv-stat__val">{{ connected.preview.rating?.toFixed(1) ?? '—' }}</span>
              <span class="rv-stat__lbl">Average rating</span>
            </div>
            <div class="rv-stat">
              <span class="rv-stat__val">{{ connected.preview.totalRatings ?? '—' }}</span>
              <span class="rv-stat__lbl">Total reviews</span>
            </div>
            <div class="rv-stat">
              <span class="rv-stat__val">{{ savedReviews.length }}</span>
              <span class="rv-stat__lbl">Cached on site</span>
            </div>
            <a v-if="connected.preview.url" :href="connected.preview.url" target="_blank" rel="noopener" class="adm-btn adm-btn--sm rv-stat__link">View on Google ↗</a>
          </div>
        </div>

        <div class="rv-grid">
          <div class="rv-card rv-map" v-if="mapEmbedUrl">
            <iframe
              :key="mapEmbedUrl"
              :src="mapEmbedUrl"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
              title="Business location"
            />
          </div>

          <div class="rv-card rv-reviews">
            <h3 class="rv-reviews__title">Recent reviews</h3>
            <p v-if="!savedReviews.length && !connected.preview?.reviews.length" class="adm-muted">
              No reviews yet. They’ll show up here once Google returns them.
            </p>
            <ul class="rv-list">
              <li v-for="r in (savedReviews.length ? savedReviews : connected.preview?.reviews ?? []).slice(0, 6)" :key="('id' in r) ? r.id : r.author + r.text" class="rv-item">
                <div class="rv-item__head">
                  <span class="rv-item__author">{{ r.author }}</span>
                  <span class="rv-item__stars" :title="`${r.rating}/5`">{{ stars(r.rating) }}</span>
                </div>
                <p class="rv-item__text">{{ r.text }}</p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div v-else-if="reviewsSource === 'google'" class="rv-card rv-picker">
        <div class="rv-brand rv-brand--lg">
          <span class="rv-brand__logo" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="34" height="34">
              <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 24 4a20 20 0 1 0 19.6 16.5z"/>
              <path fill="#34A853" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 44a20 20 0 0 0 13.6-5.3l-6.3-5.3a12 12 0 0 1-18-6.3l-6.6 5.1A20 20 0 0 0 24 44z"/>
              <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.4l6.3 5.3c-.4.4 6.4-4.7 6.4-14.7 0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
          </span>
          <div>
            <span class="adm-eyebrow">Google Business Profile</span>
            <h3 class="rv-picker__title">Find your business on Google</h3>
            <p class="rv-picker__body">Search for your business name and pick it from the list. We’ll pull your rating and recent reviews automatically.</p>
          </div>
        </div>

        <label class="adm-label rv-picker__search">
          <input
            v-model="query"
            class="adm-input"
            type="search"
            placeholder="e.g. Eternal Spa, Trinidad CO"
            autocomplete="off"
            @input="scheduleSearch"
          />
        </label>

        <div v-if="searching" class="adm-muted rv-picker__hint">Searching…</div>
        <div v-else-if="query.trim().length >= 2 && !results.length" class="adm-muted rv-picker__hint">
          No matches. Try including your city or a more specific name.
        </div>

        <ul v-if="results.length" class="rv-results">
          <li v-for="c in results" :key="c.placeId" class="rv-result">
            <button type="button" class="rv-result__btn" :disabled="loading" @click="pickPlace(c)">
              <div class="rv-result__main">
                <span class="rv-result__name">{{ c.name }}</span>
                <span class="rv-result__addr">{{ c.address }}</span>
              </div>
              <div class="rv-result__meta">
                <span v-if="c.rating != null" class="rv-result__rating">
                  <span class="rv-result__stars">{{ stars(c.rating) }}</span>
                  <span class="rv-result__count">{{ c.rating.toFixed(1) }}<template v-if="c.totalRatings"> · {{ c.totalRatings }}</template></span>
                </span>
                <span class="rv-result__cta">Connect →</span>
              </div>
            </button>
          </li>
        </ul>

        <p class="rv-picker__footnote">
          Google logo and listing data © Google. Make sure you own or manage the business profile before connecting.
        </p>
      </div>

      <!-- ── Google Business Profile onboarding (google tab, nothing connected) ── -->
      <div v-if="reviewsSource === 'google' && !connected" class="rv-card rv-gbp">
        <div class="rv-gbp__head">
          <span class="rv-gbp__icon"><Building2 :size="18" /></span>
          <div>
            <h3 class="rv-gbp__title">No Google Business Profile yet?</h3>
            <p class="rv-gbp__body">We can set one up for you, or help you manage the one you have. Pick what fits:</p>
          </div>
        </div>

        <div class="rv-gbp__choices">
          <button type="button" class="rv-gbp__choice" :class="{ 'is-active': gbpChoice === 'setup' }" @click="pickGbp('setup')">
            <strong>Set one up for me</strong>
            <span>Answer a few questions and we create the profile, transfer ownership to you, and stay on as editors.</span>
          </button>
          <button type="button" class="rv-gbp__choice" :class="{ 'is-active': gbpChoice === 'manage' }" @click="pickGbp('manage')">
            <strong>I have one. Help me manage it</strong>
            <span>Add us as an editor on your existing profile and we keep hours, photos, and posts fresh.</span>
          </button>
        </div>

        <p v-if="gbpSent" class="adm-msg-ok">Request sent. We will reply by email to get things moving.</p>

        <!-- Setup form -->
        <form v-else-if="gbpChoice === 'setup'" class="rv-gbp__form" @submit.prevent="submitGbp">
          <div class="rv-gbp__grid">
            <label class="adm-label">Business name
              <input class="adm-input" v-model="gbpFields.businessName" required placeholder="e.g. Mesa Trinidad" />
            </label>
            <label class="adm-label">Business address
              <input class="adm-input" v-model="gbpFields.address" required placeholder="Street, city, state, zip" />
            </label>
            <label class="adm-label">Public phone
              <input class="adm-input" v-model="gbpFields.phone" placeholder="(719) 555-0100" />
            </label>
            <label class="adm-label">Business category
              <input class="adm-input" v-model="gbpFields.category" placeholder="e.g. Restaurant, Auto repair shop" />
            </label>
          </div>
          <label class="adm-label">Anything else we should know?
            <TextAreaField v-model="gbpFields.notes" :rows="3" :maxlength="400" placeholder="Hours quirks, service area, a second location…" />
          </label>
          <label class="rv-gbp__consent">
            <input type="checkbox" v-model="gbpConsent" required />
            <span>I give Apotome Labs permission to create a Google Business Profile for my business, transfer its ownership to me, and remain an editor so they can help maintain it.</span>
          </label>
          <button class="adm-btn adm-btn--primary" type="submit" :disabled="gbpBusy || !gbpConsent">
            {{ gbpBusy ? 'Sending…' : 'Request profile setup' }}
          </button>
        </form>

        <!-- Manage instructions -->
        <form v-else-if="gbpChoice === 'manage'" class="rv-gbp__form" @submit.prevent="submitGbp">
          <ol class="rv-gbp__steps">
            <li>Open <a href="https://business.google.com" target="_blank" rel="noopener">business.google.com</a> and sign in with the account that owns your profile.</li>
            <li>Choose your business, then open <strong>Business Profile settings → People and access</strong>.</li>
            <li>Click <strong>Add</strong>, enter <strong>hello@apotomelabs.com</strong>, and give it the <strong>Manager</strong> role.</li>
            <li>Submit this form so we know to accept and get started.</li>
          </ol>
          <label class="adm-label">Anything we should focus on?
            <TextAreaField v-model="gbpFields.notes" :rows="3" :maxlength="400" placeholder="e.g. our hours are wrong, we need photos updated…" />
          </label>
          <label class="rv-gbp__consent">
            <input type="checkbox" v-model="gbpConsent" required />
            <span>I consent to Apotome Labs acting as an editor on my Google Business Profile to help manage it on my behalf.</span>
          </label>
          <button class="adm-btn adm-btn--primary" type="submit" :disabled="gbpBusy || !gbpConsent">
            {{ gbpBusy ? 'Sending…' : 'Request management help' }}
          </button>
        </form>
      </div>

      <p v-if="status" class="adm-msg-ok">{{ status }}</p>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
    </template>
  </section>
</template>

<style scoped>
.rv-card {
  background: var(--adm-surface);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius-lg);
  padding: 1.5rem;
}

/* Source tab row: the switcher plus its save controls */
.rv-source {
  display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.rv-source__label { flex-basis: 100%; }
.rv-source .adm-tabs { margin-bottom: 0; }
.rv-source__save { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; flex-wrap: wrap; }
.rv-source__dirty { color: var(--adm-warn, #f0b56b); font-size: 0.78rem; }

/* GBP onboarding */
.rv-gbp { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 1.1rem; }
.rv-gbp__head { display: flex; gap: 0.85rem; align-items: flex-start; }
.rv-gbp__icon {
  width: 40px; height: 40px; flex: 0 0 auto;
  display: grid; place-items: center;
  border-radius: var(--adm-radius-sm);
  background: color-mix(in srgb, var(--adm-accent) 12%, transparent);
  color: var(--adm-accent);
}
.rv-gbp__title { font-family: var(--adm-font-serif); font-weight: 500; font-size: 1.25rem; margin: 0 0 0.25rem; }
.rv-gbp__body { color: var(--adm-text-muted); margin: 0; }
.rv-gbp__choices { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
@media (max-width: 700px) { .rv-gbp__choices { grid-template-columns: 1fr; } }
.rv-gbp__choice {
  display: flex; flex-direction: column; gap: 0.3rem;
  text-align: left;
  padding: 0.9rem 1rem;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius);
  color: var(--adm-text);
  font: inherit; cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.rv-gbp__choice span { color: var(--adm-text-muted); font-size: 0.84rem; line-height: 1.45; }
.rv-gbp__choice:hover { border-color: var(--adm-accent-deep); }
.rv-gbp__choice.is-active {
  border-color: var(--adm-accent);
  background: color-mix(in srgb, var(--adm-accent) 7%, var(--adm-surface-2));
}
.rv-gbp__form { display: flex; flex-direction: column; gap: 0.9rem; }
.rv-gbp__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
@media (max-width: 700px) { .rv-gbp__grid { grid-template-columns: 1fr; } }
.rv-gbp__steps { margin: 0; padding-left: 1.2rem; color: var(--adm-text-muted); display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; }
.rv-gbp__steps a { color: var(--adm-accent); }
.rv-gbp__consent {
  display: flex; gap: 0.6rem; align-items: flex-start;
  padding: 0.75rem 0.9rem;
  border: 1px dashed var(--adm-border-strong);
  border-radius: var(--adm-radius);
  font-size: 0.84rem; line-height: 1.5; color: var(--adm-text-muted);
  cursor: pointer;
}
.rv-gbp__consent input { margin-top: 0.2rem; accent-color: var(--adm-accent); }
.rv-gbp__form .adm-btn { align-self: flex-start; }

/* Testimonials block */
.rv-testimonials { display: flex; flex-direction: column; gap: 1.1rem; margin-bottom: 1.25rem; }
.rv-tst { display: flex; flex-direction: column; gap: 0.85rem; }
.rv-tst__row {
  display: flex; flex-direction: column; gap: 0.5rem;
  padding: 0.9rem;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border-soft);
  border-radius: var(--adm-radius);
}
.rv-tst__meta { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: center; }
.rv-tst__empty { margin: 0; font-size: 0.88rem; }
.rv-tst__add { align-self: flex-start; }
.rv-tst__save {
  display: flex; gap: 0.6rem; align-items: center;
  padding-top: 0.9rem; border-top: 1px solid var(--adm-border-soft);
}
@media (max-width: 640px) { .rv-tst__meta { grid-template-columns: 1fr; } }

.rv-connected { display: flex; flex-direction: column; gap: 1.25rem; }

.rv-summary__head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 1rem; flex-wrap: wrap;
}
.rv-brand { display: flex; gap: 1rem; align-items: flex-start; min-width: 0; }
.rv-brand--lg {
  margin-bottom: 1.25rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}
.rv-brand__logo {
  flex: 0 0 auto;
  width: 48px; height: 48px;
  border-radius: 12px;
  background: #fff;
  display: grid; place-items: center;
  border: 1px solid var(--adm-border);
  box-shadow: 0 1px 2px rgba(0,0,0,0.25);
}
.rv-summary__name {
  font-family: var(--adm-font-serif); font-weight: 500;
  font-size: 1.3rem; margin: 0.2rem 0 0.25rem;
}
.rv-summary__addr { color: var(--adm-text-muted); margin: 0; font-size: 0.9rem; }

.rv-stats {
  display: flex; flex-wrap: wrap; gap: 1.5rem 2rem; align-items: center;
  margin-top: 1.25rem; padding-top: 1.25rem;
  border-top: 1px solid var(--adm-border-soft);
}
.rv-stat { display: flex; flex-direction: column; gap: 0.15rem; }
.rv-stat__val { font-family: var(--adm-font-serif); font-size: 1.6rem; font-weight: 500; }
.rv-stat__lbl { color: var(--adm-text-muted); font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }
.rv-stat__link { margin-left: auto; }

.rv-grid {
  display: grid; gap: 1.25rem;
  grid-template-columns: minmax(260px, 1fr) minmax(280px, 1.4fr);
}
@media (max-width: 880px) { .rv-grid { grid-template-columns: 1fr; } }

.rv-map { padding: 0; overflow: hidden; min-height: 320px; }
.rv-map iframe { width: 100%; height: 100%; min-height: 320px; border: 0; display: block; }

.rv-reviews__title {
  font-family: var(--adm-font-serif); font-weight: 500;
  font-size: 1.1rem; margin: 0 0 1rem;
}
.rv-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
.rv-item { border-top: 1px solid var(--adm-border-soft); padding-top: 0.85rem; }
.rv-item:first-child { border-top: 0; padding-top: 0; }
.rv-item__head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.rv-item__author { font-weight: 600; font-size: 0.92rem; }
.rv-item__stars { color: #f5a623; letter-spacing: 0.1em; font-size: 0.85rem; }
.rv-item__text { color: var(--adm-text-muted); margin: 0.35rem 0 0; font-size: 0.9rem; line-height: 1.5; }

.rv-picker__title {
  font-family: var(--adm-font-serif); font-weight: 500;
  font-size: clamp(1.4rem, 2vw, 1.8rem); margin: 0.2rem 0 0.4rem;
}
.rv-picker__body { color: var(--adm-text-muted); margin: 0; max-width: 56ch; }
.rv-picker__search { margin: 0.25rem 0 0.5rem; max-width: 560px; }
.rv-picker__hint { margin: 0.25rem 0 0.75rem; font-size: 0.85rem; }
.rv-picker__footnote { margin: 1.25rem 0 0; color: var(--adm-text-subtle); font-size: 0.78rem; }

.rv-results {
  list-style: none; margin: 0.5rem 0 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.5rem;
  max-width: 720px;
}
.rv-result__btn {
  width: 100%; text-align: left;
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding: 0.85rem 1rem;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius);
  color: var(--adm-text); cursor: pointer;
  font: inherit;
  transition: border-color 140ms, background 140ms;
}
.rv-result__btn:hover:not(:disabled) {
  border-color: var(--adm-accent);
  background: color-mix(in srgb, var(--adm-accent) 6%, var(--adm-surface-2));
}
.rv-result__btn:disabled { opacity: 0.6; cursor: progress; }
.rv-result__main { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.rv-result__name { font-weight: 600; }
.rv-result__addr { color: var(--adm-text-muted); font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv-result__meta { display: flex; align-items: center; gap: 1rem; flex: 0 0 auto; }
.rv-result__rating { display: flex; flex-direction: column; align-items: flex-end; }
.rv-result__stars { color: #f5a623; letter-spacing: 0.08em; font-size: 0.85rem; }
.rv-result__count { color: var(--adm-text-muted); font-size: 0.78rem; }
.rv-result__cta { color: var(--adm-accent); font-size: 0.85rem; font-weight: 600; }
</style>
