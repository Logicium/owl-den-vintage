<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  // Accept undefined so call sites can bind optional fields directly without
  // forcing every parent to coalesce. The template guards with `?? ''`.
  modelValue: string | undefined
  rows?: number
  maxlength?: number
  placeholder?: string
  disabled?: boolean
}>(), {
  rows: 3,
  maxlength: 0,
  placeholder: '',
  disabled: false,
})

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const length = computed(() => (props.modelValue ?? '').length)
const showCounter = computed(() => props.maxlength > 0)
const isOver = computed(() => props.maxlength > 0 && length.value > props.maxlength)
const remaining = computed(() => props.maxlength - length.value)
</script>

<template>
  <div class="ta-field" :class="{ 'ta-field--over': isOver }">
    <textarea
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength > 0 ? maxlength : undefined"
      class="ta-field__input"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <span v-if="showCounter" class="ta-field__counter" aria-hidden="true">
      <template v-if="isOver">{{ -remaining }} over</template>
      <template v-else>{{ remaining }} / {{ maxlength }} characters left</template>
    </span>
  </div>
</template>

<style scoped>
.ta-field {
  position: relative;
  width: 100%;
  display: block;
}
/* Token bridge: inside the admin panel the --adm-* vars are set; on the
   public site (wizard) they are not, so every use falls back to the site's
   --ap-* palette. One component, both contexts. */
.ta-field__input {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.7rem 0.85rem;
  min-height: 6rem;
  background: var(--adm-surface-2, var(--ap-surface-alt, #fff));
  color: var(--adm-text, var(--ap-ink, #111));
  border: 1px solid var(--adm-border, var(--ap-line, #ccc));
  border-radius: var(--adm-radius-sm, var(--ap-radius, 6px));
  font: inherit;
  font-size: 0.92rem;
  line-height: 1.55;
  /* Preserve user-entered line breaks visually so paragraphs aren't squished. */
  white-space: pre-wrap;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.ta-field__input:focus {
  outline: none;
  border-color: var(--adm-accent, var(--ap-primary, #888));
  box-shadow: 0 0 0 3px var(--adm-accent-glow, color-mix(in srgb, var(--ap-primary, #888) 22%, transparent));
}
/* Minimalist "characters left" label sits BELOW the field, right-aligned, so
   it never overlaps the text being typed. */
.ta-field__counter {
  display: block;
  margin: 0.25rem 0.1rem 0 0;
  text-align: right;
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: var(--adm-text-subtle, var(--ap-ink-muted, #888));
  pointer-events: none;
}
.ta-field--over .ta-field__counter {
  color: var(--adm-danger, #d64545);
  font-weight: 600;
}
</style>
