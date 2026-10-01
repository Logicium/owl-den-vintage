<script setup lang="ts">
/**
 * MenuScanButton — upload a photo of a printed menu and let the AI vision
 * model read it into structured categories + items. Emits `scanned` with the
 * parsed shape; the parent (ContentView) merges it into the menu editor.
 * Text-only: prices/descriptions come across, images do not.
 */
import { ref } from 'vue'
import { ScanText } from 'lucide-vue-next'
import { contentClient } from '../../platform/contentClient'
import { useToast } from '../composables/useToast'

const props = defineProps<{ siteId: string }>()
const emit = defineEmits<{ (e: 'scanned', menu: { categories: Array<{ name: string; description?: string; items: Array<{ name: string; description?: string; price?: string }> }> }): void }>()

const toast = useToast()
const scanning = ref(false)
const fileEl = ref<HTMLInputElement | null>(null)

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result as string)
    fr.onerror = rej
    fr.readAsDataURL(file)
  })
}

async function onPick(evt: Event) {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) { toast.error('Please choose a photo of your menu (JPG or PNG).'); return }
  scanning.value = true
  try {
    const base64 = (await readAsDataUrl(file)).split(',')[1] ?? ''
    const res = await contentClient.scanMenu(props.siteId, file.type, base64)
    emit('scanned', res)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    scanning.value = false
  }
}
</script>

<template>
  <div class="menu-scan">
    <button type="button" class="menu-scan__btn" :disabled="scanning" @click="fileEl?.click()">
      <span v-if="scanning" class="menu-scan__spinner" aria-hidden="true" />
      <ScanText v-else :size="16" />
      {{ scanning ? 'Reading your menu…' : 'Scan menu photo' }}
    </button>
    <input ref="fileEl" type="file" accept="image/*" capture="environment" hidden @change="onPick" />
  </div>
</template>

<style scoped>
.menu-scan { display: inline-flex; }
.menu-scan__btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  background: var(--adm-accent);
  color: var(--adm-on-accent);
  border: 1px solid var(--adm-accent);
  border-radius: 999px;
  font: inherit; font-size: 0.85rem; font-weight: 700;
  letter-spacing: 0.01em; cursor: pointer;
  transition: background 140ms ease, box-shadow 140ms ease, opacity 140ms ease;
}
.menu-scan__btn:hover:not(:disabled) { background: var(--adm-accent-soft); box-shadow: var(--adm-shadow); }
.menu-scan__btn:disabled { opacity: 0.7; cursor: progress; }
.menu-scan__spinner {
  width: 15px; height: 15px;
  border: 2px solid color-mix(in srgb, var(--adm-on-accent) 40%, transparent);
  border-top-color: var(--adm-on-accent);
  border-radius: 50%;
  animation: menu-scan-spin 0.7s linear infinite;
}
@keyframes menu-scan-spin { to { transform: rotate(360deg); } }
</style>
