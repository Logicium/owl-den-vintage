<script setup lang="ts">
/**
 * Bespoke image input — drag-and-drop or click to upload (via the site's
 * media endpoint), live preview, replace/remove chips.
 * v-model holds the image URL string. (Paste-URL entry was removed so every
 * image goes through a real upload — no stray external hotlinks.)
 */
import { ref, watch } from 'vue'
import { ImagePlus, ImageOff } from 'lucide-vue-next'
import { contentClient } from '../../../platform/contentClient'
import { optimizeImage } from '../../../platform/imageOptimize'

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  /** Site whose media library receives uploads. */
  siteId: string
  /** Preview aspect. Defaults to 16/9; use '1/1' for square product shots. */
  aspect?: string
  /** Allow removing the image entirely. */
  clearable?: boolean
}>(), { aspect: '16 / 9', clearable: true })

const model = defineModel<string>({ default: '' })

const uploading = ref(false)
const error = ref<string | null>(null)
const dragging = ref(false)
const fileEl = ref<HTMLInputElement | null>(null)
/* A src that 404s (seed paths, deleted media) must never show the browser's
   broken-image glyph — swap to a quiet placeholder instead. */
const loadFailed = ref(false)
watch(model, () => { loadFailed.value = false })

async function upload(file: File) {
  uploading.value = true
  error.value = null
  try {
    // Downscale + WebP re-encode (when it wins) + size validation, all client-side.
    const opt = await optimizeImage(file)
    const r = await contentClient.uploadMedia(props.siteId, opt.filename, opt.contentType, opt.base64)
    model.value = r.url
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    uploading.value = false
  }
}

function onPick(evt: Event) {
  const f = (evt.target as HTMLInputElement).files?.[0]
  if (f) void upload(f)
  ;(evt.target as HTMLInputElement).value = ''
}
function onDrop(evt: DragEvent) {
  dragging.value = false
  const f = evt.dataTransfer?.files?.[0]
  if (f) void upload(f)
}
</script>

<template>
  <div class="ai-field">
    <span v-if="label" class="ai-label">{{ label }}</span>
    <div
      class="ai-img"
      :class="{ 'ai-img--empty': !model, 'is-drag': dragging }"
      @click="!model && fileEl?.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="model">
        <div class="ai-img__preview" :style="{ aspectRatio: aspect }">
          <div v-if="loadFailed" class="ai-img__missing">
            <ImageOff :size="18" />
            <span>No photo yet</span>
          </div>
          <img v-else :src="model" alt="" loading="lazy" @error="loadFailed = true" />
        </div>
        <div class="ai-img__actions" @click.stop>
          <button type="button" class="ai-img__chip" @click="fileEl?.click()"><ImagePlus :size="12" /> Replace</button>
          <button v-if="clearable" type="button" class="ai-img__chip" @click="model = ''">✕ Remove</button>
        </div>
      </template>
      <div v-else class="ai-img__cta" title="Upload a photo: click or drag one in">
        <ImagePlus :size="20" />
        <span class="ai-img__cta-long"><strong>Upload a photo</strong> or drag one in</span>
        <span class="ai-img__cta-short">Add photo</span>
      </div>
      <div v-if="uploading" class="ai-img__busy">Uploading…</div>
    </div>
    <input ref="fileEl" type="file" accept="image/*" hidden @change="onPick" />
    <span v-if="error" class="ai-hint" style="color: var(--adm-danger)">{{ error }}</span>
    <span v-else-if="hint" class="ai-hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.ai-img__missing {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.4rem;
  color: var(--adm-text-subtle);
  font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase;
  background:
    repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in srgb, var(--adm-text) 3%, transparent) 12px 13px),
    var(--adm-surface-2);
}
.ai-img__missing svg { opacity: 0.6; }
</style>
