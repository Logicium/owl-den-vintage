<script setup lang="ts">
/** Bespoke icon (emoji) picker — curated grid in a popover, free-type fallback. */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

defineProps<{
  label?: string
  hint?: string
}>()

const model = defineModel<string>({ default: '' })

const EMOJIS = [
  '☕', '🍽', '🥂', '🍞', '🧁', '🌮', '🍕', '🥗',
  '🛏', '🛁', '🔥', '🌄', '🚿', '🧖', '🐾', '🅿️',
  '🔧', '⚙️', '🛠', '⚡', '🔌', '🚗', '🏗', '🪛',
  '🛍', '🎁', '📦', '💎', '🧵', '🪴', '🕯', '📚',
  '🎟', '🎤', '🎭', '🎨', '🎶', '🎬', '🏟', '🍿',
  '📶', '❄️', '🌡', '🧺', '🗝', '♿', '🚭', '✨',
]

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
function pick(e: string) { model.value = e; open.value = false }
function onDocClick(e: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="rootEl" class="ai-field">
    <span v-if="label" class="ai-label">{{ label }}</span>
    <div style="position: relative">
      <button type="button" class="ai-control ai-select-trigger" :class="{ 'is-open': open }" @click="open = !open">
        <span class="ai-select-value" :class="{ 'is-placeholder': !model }" style="font-size: 1.05rem">{{ model || 'Pick an icon' }}</span>
        <ChevronDown :size="15" class="ai-caret" />
      </button>
      <div v-if="open" class="ai-pop" style="min-width: 260px">
        <div class="ai-emoji-grid">
          <button v-for="e in EMOJIS" :key="e" type="button" :title="e" @click="pick(e)">{{ e }}</button>
        </div>
        <div class="ai-pop__search">
          <input v-model="model" placeholder="…or type any emoji / character" />
        </div>
      </div>
    </div>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </div>
</template>
