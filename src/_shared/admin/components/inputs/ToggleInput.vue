<script setup lang="ts">
/** Bespoke switch for booleans — animated thumb, label on the right. */
defineProps<{
  label?: string
  hint?: string
  disabled?: boolean
}>()

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <div class="ai-field">
    <button
      type="button"
      class="ai-toggle"
      :class="{ 'is-on': model }"
      role="switch"
      :aria-checked="model"
      :disabled="disabled"
      style="background: none; border: none; padding: 0; font: inherit"
      @click="model = !model"
    >
      <span class="ai-toggle__track"><span class="ai-toggle__thumb" /></span>
      <span v-if="label" class="ai-toggle__text">{{ label }}</span>
    </button>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </div>
</template>
