<script setup lang="ts">
/**
 * MapSearchPicker — address autocomplete + Google Maps embed preview.
 *
 * Geocoding goes through the backend (`/admin/sites/:id/geocode`) so the
 * Google API key never leaves the server. The embed iframe uses the keyless
 * `maps.google.com/?q=place_id:X&output=embed` form which works without any
 * client-side key.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { contentClient } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'

const props = defineProps<{
  address: string
  embedUrl?: string
}>()

const emit = defineEmits<{
  (e: 'update:address', v: string): void
  (e: 'update:embedUrl', v: string): void
}>()

interface GeoResult { placeId: string; address: string }

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)

const query = ref(props.address)
const open = ref(false)
const loading = ref(false)
const results = ref<GeoResult[]>([])
const lastErr = ref<string>('')
let timer: ReturnType<typeof setTimeout> | null = null
let seq = 0

watch(() => props.address, (v) => {
  if (v !== query.value) query.value = v
})

function buildEmbed(address: string): string {
  // Keyless embed that geocodes AND zooms to the picked address. The old
  // `q=place_id:X` form renders a fully zoomed-OUT world map on the keyless
  // endpoint (it can't resolve a bare place_id without an API key) — which is
  // exactly why the pin never landed on the business. Passing the formatted
  // address with an explicit zoom drops the pin on the real location.
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`
}

async function search(q: string) {
  if (!q || q.trim().length < 3) { results.value = []; open.value = false; return }
  if (!siteId.value) { lastErr.value = 'Select a site first.'; return }
  loading.value = true
  lastErr.value = ''
  const mySeq = ++seq
  try {
    const res = await contentClient.geocodeAddress(siteId.value, q)
    if (mySeq !== seq) return
    results.value = res.results
    open.value = results.value.length > 0
  } catch (e) {
    if (mySeq !== seq) return
    lastErr.value = (e as Error).message
  } finally {
    if (mySeq === seq) loading.value = false
  }
}

function onInput(v: string) {
  query.value = v
  emit('update:address', v)
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => search(v), 350)
}

function pick(h: GeoResult) {
  query.value = h.address
  emit('update:address', h.address)
  emit('update:embedUrl', buildEmbed(h.address))
  open.value = false
}

function onBlur() {
  setTimeout(() => { open.value = false }, 150)
}

const previewSrc = computed(() => props.embedUrl || '')

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <div class="msp">
    <div class="msp__search">
      <input
        type="search"
        class="msp__input"
        :value="query"
        placeholder="Search address (powered by Google Maps)…"
        autocomplete="off"
        spellcheck="false"
        @input="onInput(($event.target as HTMLInputElement).value)"
        @focus="results.length && (open = true)"
        @blur="onBlur"
      />
      <span v-if="loading" class="msp__spinner" aria-hidden="true" />
      <ul v-if="open && results.length" class="msp__results" role="listbox">
        <li v-for="h in results" :key="h.placeId">
          <button type="button" class="msp__result" @mousedown.prevent="pick(h)">
            {{ h.address }}
          </button>
        </li>
      </ul>
      <p v-if="lastErr" class="msp__err">{{ lastErr }}</p>
    </div>

    <div class="msp__preview">
      <iframe
        v-if="previewSrc"
        :src="previewSrc"
        class="msp__map"
        loading="lazy"
        referrerpolicy="no-referrer"
        allowfullscreen
        title="Location preview"
      />
      <div v-else class="msp__placeholder">Search for an address to drop a pin.</div>
    </div>
  </div>
</template>

<style scoped>
.msp { display: flex; flex-direction: column; gap: 0.6rem; }
.msp__search { position: relative; }
.msp__input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  background: var(--adm-surface-2);
  color: var(--adm-text);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius-sm, 6px);
  font: inherit; font-size: 0.9rem;
}
.msp__input:focus { outline: none; border-color: var(--adm-accent); }
.msp__spinner {
  position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%);
  width: 14px; height: 14px;
  border: 2px solid var(--adm-border);
  border-top-color: var(--adm-accent);
  border-radius: 50%;
  animation: msp-spin 0.7s linear infinite;
}
@keyframes msp-spin { to { transform: translateY(-50%) rotate(360deg); } }

.msp__results {
  position: absolute; z-index: 5; top: calc(100% + 4px); left: 0; right: 0;
  list-style: none; padding: 0.25rem; margin: 0;
  background: var(--adm-surface);
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius, 8px);
  box-shadow: 0 12px 28px rgba(0,0,0,0.35);
  max-height: 280px; overflow: auto;
}
.msp__result {
  display: block; width: 100%; text-align: left;
  padding: 0.5rem 0.65rem;
  background: transparent; border: 0;
  color: var(--adm-text); font: inherit; font-size: 0.85rem;
  border-radius: var(--adm-radius-sm, 6px);
  cursor: pointer;
}
.msp__result:hover { background: var(--adm-surface-2); }

.msp__err { color: #e26d6d; font-size: 0.8rem; margin: 0.4rem 0 0; }

.msp__preview {
  border: 1px solid var(--adm-border);
  border-radius: var(--adm-radius, 8px);
  overflow: hidden;
  background: var(--adm-surface-2);
  aspect-ratio: 16 / 9;
}
.msp__map { display: block; width: 100%; height: 100%; border: 0; }
.msp__placeholder {
  display: flex; align-items: center; justify-content: center; height: 100%;
  color: var(--adm-text-muted); font-size: 0.85rem;
}
</style>
