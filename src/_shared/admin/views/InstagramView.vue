<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Images, Instagram } from 'lucide-vue-next'
import { contentClient, type InstagramMediaDTO } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import GalleryPanel from '../components/GalleryPanel.vue'

const activeSites = useActiveSiteStore()
const route = useRoute()
const router = useRouter()

/* Tabs: your uploaded photo library vs the live Instagram feed. Landing on
   the page with an OAuth result jumps straight to the Instagram tab. */
const tab = ref<'gallery' | 'instagram'>('gallery')
const siteId = computed(() => activeSites.activeId)
const connectUrl = ref<string | null>(null)
const connected = ref(false)
const expiresAt = ref<string | null>(null)
const error = ref<string | null>(null)
const notConfigured = ref(false)
const loading = ref(false)

/** OAuth round-trip result — the backend callback redirects here with
    ?instagram=connected|error(&detail=...). Shown once, then cleaned off
    the URL so a refresh doesn't re-announce it. */
const oauthResult = ref<'connected' | 'error' | null>(null)
const oauthDetail = ref('')

function consumeOAuthQuery() {
  const r = route.query.instagram
  if (r === 'connected' || r === 'error') {
    oauthResult.value = r
    oauthDetail.value = typeof route.query.detail === 'string' ? route.query.detail : ''
    tab.value = 'instagram'
    const { instagram: _i, detail: _d, ...rest } = route.query
    void router.replace({ query: rest })
  }
}

/* Connected-feed preview. */
const media = ref<InstagramMediaDTO[]>([])
const mediaLoading = ref(false)
const mediaLoaded = ref(false)

async function loadMedia() {
  if (!siteId.value) return
  mediaLoading.value = true
  try {
    media.value = (await contentClient.fetchInstagramFor(siteId.value)).media
  } catch {
    media.value = []
  } finally {
    mediaLoading.value = false
    mediaLoaded.value = true
  }
}

async function loadConnect() {
  if (!siteId.value) return
  loading.value = true
  error.value = null
  notConfigured.value = false
  connectUrl.value = null
  media.value = []
  mediaLoaded.value = false
  try {
    const [conn, status] = await Promise.all([
      contentClient.getInstagramConnect(siteId.value),
      contentClient.getInstagramStatus(siteId.value).catch(() => ({ connected: false, expiresAt: null })),
    ])
    connectUrl.value = conn.url
    connected.value = status.connected
    expiresAt.value = status.expiresAt
    if (status.connected) void loadMedia()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Detect "Instagram not configured" — service returns 400 when the
    // INSTAGRAM_APP_ID/SECRET environment isn't set.
    if (/not configured/i.test(msg) || /400/.test(msg)) {
      notConfigured.value = true
    } else {
      error.value = msg
    }
  } finally {
    loading.value = false
  }
}
async function disconnect() {
  if (!siteId.value) return
  await contentClient.disconnectInstagram(siteId.value)
  oauthResult.value = null
  await loadConnect()
}
onMounted(() => { consumeOAuthQuery(); void loadConnect() })
watch(siteId, loadConnect)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div class="adm-page__title-block">
        <span class="adm-eyebrow">Photos</span>
        <h1 class="adm-title">Photos &amp; Instagram</h1>
        <p class="adm-subtitle">Your photo library, mapped to the page. Or connect Instagram and let your feed do the work.</p>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <div class="adm-empty__icon">⌗</div>
      <h2 class="adm-empty__title">No active site</h2>
      <p class="adm-empty__body">Select a site from the header dropdown to manage its photos.</p>
    </div>

    <template v-else>
      <div class="adm-tabs" role="tablist">
        <button type="button" role="tab" class="adm-tab" :class="{ 'is-active': tab === 'gallery' }" :aria-selected="tab === 'gallery'" @click="tab = 'gallery'">
          <Images :size="14" /> Gallery
        </button>
        <button type="button" role="tab" class="adm-tab" :class="{ 'is-active': tab === 'instagram' }" :aria-selected="tab === 'instagram'" @click="tab = 'instagram'">
          <Instagram :size="14" /> Instagram feed
        </button>
      </div>

      <!-- ── Tab 1 · Gallery (uploaded photo slots) ── -->
      <GalleryPanel v-if="tab === 'gallery'" />

      <!-- ── Tab 2 · Instagram ── -->
      <template v-else>

    <!-- Coming soon (no FB app credentials) -->
    <div v-if="notConfigured" class="ig-soon">
      <div class="ig-soon__inner">
        <div class="ig-soon__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
          </svg>
        </div>
        <span class="adm-eyebrow">Coming soon</span>
        <h2 class="ig-soon__title">Instagram sync is on the way</h2>
        <p class="ig-soon__body">
          We’re finalising our partnership with Meta so you can connect your account in one click.
          In the meantime, you can upload photos directly in the Content section.
        </p>
        <div class="ig-soon__list">
          <div class="ig-soon__row">
            <span class="ig-soon__dot" />
            <div>
              <strong>One-click connect</strong>
              <p>Authenticate with your Instagram Business account in seconds.</p>
            </div>
          </div>
          <div class="ig-soon__row">
            <span class="ig-soon__dot" />
            <div>
              <strong>Auto-refresh feed</strong>
              <p>New posts appear in your gallery within minutes — no re-deploy needed.</p>
            </div>
          </div>
          <div class="ig-soon__row">
            <span class="ig-soon__dot" />
            <div>
              <strong>Curate what shows</strong>
              <p>Hide individual posts or filter by hashtag from the Content editor.</p>
            </div>
          </div>
        </div>
        <button type="button" class="adm-btn adm-btn--primary" @click="tab = 'gallery'">Upload photos in the Gallery tab</button>
      </div>
    </div>

    <!-- Normal connect/disconnect -->
    <template v-else>
      <p v-if="oauthResult === 'connected'" class="adm-msg-ok">
        Instagram connected — your latest posts will appear in your gallery within a few minutes.
      </p>
      <p v-else-if="oauthResult === 'error'" class="adm-msg-err">
        Instagram connection failed{{ oauthDetail ? `: ${oauthDetail}` : '.' }}
      </p>

      <div class="adm-card">
        <template v-if="connected">
          <h3 class="adm-card__title">Connected ✓</h3>
          <p class="adm-card__sub">
            Your feed is syncing automatically — we renew access in the background.
            <template v-if="expiresAt"> Current access valid until {{ new Date(expiresAt).toLocaleDateString() }}.</template>
          </p>
        </template>
        <template v-else>
          <h3 class="adm-card__title">Connect your account</h3>
          <p class="adm-card__sub">
            Authorise Apotome to read your posts. We only fetch media, never publish.
            Your Instagram must be a <strong>professional account</strong> (Business or Creator) —
            switch for free in the Instagram app under Settings → Account type and tools.
          </p>
        </template>
        <div class="ig-actions">
          <a v-if="connectUrl && !connected" :href="connectUrl" class="adm-btn adm-btn--primary">Connect Instagram</a>
          <a v-else-if="connectUrl && connected" :href="connectUrl" class="adm-btn">Reconnect</a>
          <button v-if="connected" type="button" class="adm-btn" @click="disconnect">Disconnect</button>
          <span v-if="loading" class="adm-muted">Loading…</span>
        </div>
        <p v-if="error" class="adm-msg-err">{{ error }}</p>
      </div>

      <!-- Connected-feed preview — what visitors see in the site gallery. -->
      <div v-if="connected" class="adm-card">
        <div class="ig-preview-head">
          <div>
            <h3 class="adm-card__title">Feed preview</h3>
            <p class="adm-card__sub">
              These posts now power your site's gallery — newest first, refreshed automatically.
            </p>
          </div>
          <button type="button" class="adm-btn" :disabled="mediaLoading" @click="loadMedia">
            {{ mediaLoading ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>

        <p v-if="mediaLoading && !media.length" class="adm-muted">Loading your latest posts…</p>
        <p v-else-if="mediaLoaded && !media.length" class="adm-muted">
          No posts found yet — if you just connected, Instagram can take a minute. Make sure the account has public image posts.
        </p>
        <div v-else class="ig-grid">
          <a
            v-for="m in media"
            :key="m.id"
            :href="m.permalink"
            target="_blank"
            rel="noopener"
            class="ig-grid__item"
            :title="m.caption || 'View on Instagram'"
          >
            <img :src="m.media_url" :alt="m.caption || 'Instagram post'" loading="lazy" />
            <span v-if="m.caption" class="ig-grid__caption">{{ m.caption }}</span>
          </a>
        </div>
      </div>
    </template>
      </template>
    </template>
  </section>
</template>

<style scoped>
.ig-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

/* ── Connected-feed preview grid ── */
.ig-preview-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;
}
.ig-preview-head .adm-btn { flex-shrink: 0; }
.ig-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.6rem;
}
.ig-grid__item {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  overflow: hidden;
  background: color-mix(in srgb, var(--adm-text) 8%, transparent);
  border: 1px solid var(--adm-border);
  isolation: isolate;
}
.ig-grid__item img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 320ms ease;
}
.ig-grid__item:hover img { transform: scale(1.04); }
.ig-grid__caption {
  position: absolute; inset: auto 0 0 0;
  padding: 1.4rem 0.6rem 0.5rem;
  font-size: 0.72rem; line-height: 1.35;
  color: #fff;
  background: linear-gradient(to top, rgba(0,0,0,0.72), transparent);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0;
  transition: opacity 200ms ease;
}
.ig-grid__item:hover .ig-grid__caption { opacity: 1; }

.ig-soon {
  background: var(--adm-surface);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius-lg);
  padding: 3rem 2rem;
  position: relative; overflow: hidden;
  box-shadow: var(--adm-shadow);
}
.ig-soon::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(600px 300px at 80% -10%, rgba(196,164,124,0.10), transparent 60%),
    radial-gradient(500px 250px at 0% 110%, rgba(122,162,247,0.08), transparent 60%);
  pointer-events: none;
}
.ig-soon__inner {
  position: relative;
  max-width: 580px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start;
  text-align: left;
}
.ig-soon__mark {
  width: 58px; height: 58px; border-radius: 14px;
  display: grid; place-items: center;
  background: linear-gradient(140deg, var(--adm-accent) 0%, var(--adm-accent-deep) 100%);
  color: var(--adm-on-accent);
  box-shadow: 0 6px 16px rgba(0,0,0,0.4);
  margin-bottom: 0.4rem;
}
.ig-soon__title {
  font-family: var(--adm-font-serif);
  font-size: clamp(1.6rem, 2.2vw, 2.1rem);
  font-weight: 500; letter-spacing: -0.01em;
  margin: 0.2rem 0 0.3rem;
}
.ig-soon__body { color: var(--adm-text-muted); margin: 0 0 1.25rem; max-width: 52ch; text-align: left; }
.ig-soon__list {
  display: flex; flex-direction: column; gap: 0.9rem;
  width: 100%; margin: 0.5rem 0 1.5rem;
}
.ig-soon__row { display: flex; gap: 0.75rem; align-items: flex-start; }
.ig-soon__dot {
  flex: 0 0 6px; height: 6px; margin-top: 0.55rem;
  border-radius: 50%; background: var(--adm-accent);
}
.ig-soon__row strong { color: var(--adm-text); font-weight: 600; font-size: 0.95rem; }
.ig-soon__row p { color: var(--adm-text-muted); margin: 0.15rem 0 0; font-size: 0.88rem; }
</style>
