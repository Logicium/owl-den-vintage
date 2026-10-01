<script setup lang="ts">
import { computed } from 'vue'
import { useSiteTheme } from '../composables/useSiteTheme'
import { ARCHETYPE_FORM, markInner, type BrandForm } from '../brand/marks'

/**
 * The archetype's brand mark as an inline SVG. The tile inherits the
 * swatch's ink color and the form its surface color, so the mark stays
 * in contrast with whatever theme/swatch is active.
 */
const props = defineProps<{
  /** Override the form; defaults to the active archetype's form. */
  form?: BrandForm
  size?: number
}>()

const { archetype } = useSiteTheme()
const inner = computed(() =>
  markInner(props.form ?? ARCHETYPE_FORM[archetype.value], 'var(--ap-ink)', 'var(--ap-surface)'),
)
</script>

<template>
  <svg
    class="ap-brand-mark"
    viewBox="0 0 256 256"
    :width="size ?? 36"
    :height="size ?? 36"
    aria-hidden="true"
    v-html="inner"
  />
</template>

<style scoped>
.ap-brand-mark { display: block; flex: none; }
</style>
