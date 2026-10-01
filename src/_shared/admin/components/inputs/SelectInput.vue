<script setup lang="ts">
/** Bespoke dropdown — custom listbox with keyboard support. */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'

export interface SelectOption { value: string; label: string; hint?: string }

const props = defineProps<{
  label?: string
  hint?: string
  placeholder?: string
  options: SelectOption[]
  disabled?: boolean
}>()

const model = defineModel<string>({ default: '' })

const open = ref(false)
const hi = ref(-1)
const rootEl = ref<HTMLElement | null>(null)

const selected = computed(() => props.options.find(o => o.value === model.value) ?? null)

function toggle() { if (!props.disabled) { open.value = !open.value; hi.value = props.options.findIndex(o => o.value === model.value) } }
function pick(o: SelectOption) { model.value = o.value; open.value = false }
function onKey(e: KeyboardEvent) {
  if (!open.value) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); toggle() }
    return
  }
  if (e.key === 'Escape') open.value = false
  else if (e.key === 'ArrowDown') { e.preventDefault(); hi.value = Math.min(props.options.length - 1, hi.value + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); hi.value = Math.max(0, hi.value - 1) }
  else if (e.key === 'Enter') { e.preventDefault(); const o = props.options[hi.value]; if (o) pick(o) }
}
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
      <button
        type="button"
        class="ai-control ai-select-trigger"
        :class="{ 'is-open': open }"
        :disabled="disabled"
        aria-haspopup="listbox"
        :aria-expanded="open"
        @click="toggle"
        @keydown="onKey"
      >
        <span class="ai-select-value" :class="{ 'is-placeholder': !selected }">{{ selected?.label ?? placeholder ?? 'Select…' }}</span>
        <ChevronDown :size="15" class="ai-caret" />
      </button>
      <div v-if="open" class="ai-pop" role="listbox">
        <div class="ai-pop__list">
          <button
            v-for="(o, i) in options"
            :key="o.value"
            type="button"
            role="option"
            class="ai-option"
            :class="{ 'is-hi': i === hi, 'is-selected': o.value === model }"
            :aria-selected="o.value === model"
            @mouseenter="hi = i"
            @click="pick(o)"
          >
            <Check v-if="o.value === model" :size="13" />
            <span v-else style="width: 13px" />
            {{ o.label }}
            <span v-if="o.hint" class="ai-option__hint">{{ o.hint }}</span>
          </button>
        </div>
      </div>
    </div>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </div>
</template>
