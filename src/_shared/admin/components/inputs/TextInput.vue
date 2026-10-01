<script setup lang="ts">
/** Bespoke text input — label, hint, optional prefix/suffix affixes. */
withDefaults(defineProps<{
  label?: string
  hint?: string
  placeholder?: string
  type?: string
  maxlength?: number
  prefix?: string
  suffix?: string
  disabled?: boolean
}>(), { type: 'text' })

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="ai-field">
    <span v-if="label" class="ai-label">{{ label }}</span>
    <span class="ai-control">
      <span v-if="prefix" class="ai-affix">{{ prefix }}</span>
      <input v-model="model" :type="type" :placeholder="placeholder" :maxlength="maxlength" :disabled="disabled" />
      <span v-if="suffix" class="ai-affix">{{ suffix }}</span>
    </span>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </label>
</template>
