<script setup lang="ts">
/**
 * Bespoke money input — v-model is integer CENTS (what the API stores),
 * the field displays and accepts dollars. No float drift: parses to cents.
 */
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  currency?: string
  placeholder?: string
}>(), { currency: 'USD' })

const model = defineModel<number>({ default: 0 })

const symbol = computed(() => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: props.currency })
      .formatToParts(0).find(p => p.type === 'currency')?.value ?? '$'
  } catch { return '$' }
})

function centsToText(cents: number): string {
  if (!Number.isFinite(cents)) return ''
  return (cents / 100).toFixed(2).replace(/\.00$/, '')
}

const text = ref(centsToText(model.value))
watch(model, v => {
  // Only resync when the value changed externally (not from our own typing).
  const current = Math.round((parseFloat(text.value) || 0) * 100)
  if (current !== v) text.value = centsToText(v)
})

function commit() {
  const n = parseFloat(text.value.replace(/[^0-9.]/g, ''))
  model.value = Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0
  text.value = centsToText(model.value)
}
</script>

<template>
  <label class="ai-field">
    <span v-if="label" class="ai-label">{{ label }}</span>
    <span class="ai-control">
      <span class="ai-affix">{{ symbol }}</span>
      <input
        v-model="text"
        inputmode="decimal"
        :placeholder="placeholder ?? '0.00'"
        @blur="commit"
        @keyup.enter="commit"
      />
      <span class="ai-affix">{{ currency.toUpperCase() }}</span>
    </span>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </label>
</template>
