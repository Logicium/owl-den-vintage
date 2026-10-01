<script setup lang="ts">
/**
 * Bespoke tag/chips input for string lists (room features, dish tags,
 * lineups). Enter or comma adds; backspace on empty removes the last.
 * Far more intuitive than "comma-separated" text fields.
 */
import { ref } from 'vue'

defineProps<{
  label?: string
  hint?: string
  placeholder?: string
}>()

const model = defineModel<string[]>({ default: () => [] })
const draft = ref('')

function commit() {
  const v = draft.value.replace(/,/g, '').trim()
  if (v && !model.value.includes(v)) model.value = [...model.value, v]
  draft.value = ''
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
  else if (e.key === 'Backspace' && !draft.value && model.value.length) {
    model.value = model.value.slice(0, -1)
  }
}
function remove(i: number) {
  model.value = model.value.filter((_, idx) => idx !== i)
}
</script>

<template>
  <label class="ai-field">
    <span v-if="label" class="ai-label">{{ label }}</span>
    <span class="ai-control ai-chips" @click="($event.currentTarget as HTMLElement).querySelector('input')?.focus()">
      <span v-for="(chip, i) in model" :key="`${chip}-${i}`" class="ai-chip">
        {{ chip }}
        <button type="button" :aria-label="`Remove ${chip}`" @click.stop="remove(i)">✕</button>
      </span>
      <input v-model="draft" :placeholder="model.length ? '' : (placeholder ?? 'Type and press Enter…')" @keydown="onKey" @blur="commit" />
    </span>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </label>
</template>
