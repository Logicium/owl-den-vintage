<script setup lang="ts">
/** Bespoke segmented control — for small closed choices (2–4 options). */
import type { SelectOption } from './SelectInput.vue'

defineProps<{
  label?: string
  hint?: string
  options: SelectOption[]
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="ai-field">
    <span v-if="label" class="ai-label">{{ label }}</span>
    <div class="ai-seg" role="radiogroup">
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        role="radio"
        :aria-checked="model === o.value"
        :class="{ 'is-active': model === o.value }"
        @click="model = o.value"
      >{{ o.label }}</button>
    </div>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </div>
</template>
