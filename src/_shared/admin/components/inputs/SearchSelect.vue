<script setup lang="ts">
/**
 * Bespoke searchable dropdown (combobox). Filters as you type; optionally
 * lets the user keep a free-text value (`creatable`) for open vocabularies
 * like menu categories.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, Search, Check, Plus } from 'lucide-vue-next'
import type { SelectOption } from './SelectInput.vue'

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  placeholder?: string
  options: SelectOption[]
  creatable?: boolean
  disabled?: boolean
}>(), { creatable: false })

const model = defineModel<string>({ default: '' })

const open = ref(false)
const query = ref('')
const hi = ref(0)
const rootEl = ref<HTMLElement | null>(null)
const searchEl = ref<HTMLInputElement | null>(null)

const selected = computed(() => props.options.find(o => o.value === model.value) ?? null)
const displayValue = computed(() => selected.value?.label ?? (model.value || ''))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(o =>
    o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q))
})

const canCreate = computed(() =>
  props.creatable && query.value.trim().length > 0 &&
  !props.options.some(o => o.label.toLowerCase() === query.value.trim().toLowerCase()))

async function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    query.value = ''
    hi.value = Math.max(0, props.options.findIndex(o => o.value === model.value))
    await nextTick()
    searchEl.value?.focus()
  }
}
function pick(value: string) { model.value = value; open.value = false }
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { open.value = false; return }
  const max = filtered.value.length - 1 + (canCreate.value ? 1 : 0)
  if (e.key === 'ArrowDown') { e.preventDefault(); hi.value = Math.min(max, hi.value + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); hi.value = Math.max(0, hi.value - 1) }
  else if (e.key === 'Enter') {
    e.preventDefault()
    if (canCreate.value && hi.value === filtered.value.length) pick(query.value.trim())
    else { const o = filtered.value[hi.value]; if (o) pick(o.value) }
  }
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
      >
        <span class="ai-select-value" :class="{ 'is-placeholder': !displayValue }">{{ displayValue || placeholder || 'Select…' }}</span>
        <ChevronDown :size="15" class="ai-caret" />
      </button>
      <div v-if="open" class="ai-pop">
        <div class="ai-pop__search">
          <Search :size="14" />
          <input ref="searchEl" v-model="query" :placeholder="placeholder || 'Search…'" @keydown="onKey" />
        </div>
        <div class="ai-pop__list" role="listbox">
          <button
            v-for="(o, i) in filtered"
            :key="o.value"
            type="button"
            role="option"
            class="ai-option"
            :class="{ 'is-hi': i === hi, 'is-selected': o.value === model }"
            :aria-selected="o.value === model"
            @mouseenter="hi = i"
            @click="pick(o.value)"
          >
            <Check v-if="o.value === model" :size="13" />
            <span v-else style="width: 13px" />
            {{ o.label }}
            <span v-if="o.hint" class="ai-option__hint">{{ o.hint }}</span>
          </button>
          <button
            v-if="canCreate"
            type="button"
            class="ai-option"
            :class="{ 'is-hi': hi === filtered.length }"
            @mouseenter="hi = filtered.length"
            @click="pick(query.trim())"
          >
            <Plus :size="13" /> Use “{{ query.trim() }}”
          </button>
          <div v-if="!filtered.length && !canCreate" class="ai-pop__empty">No matches</div>
        </div>
      </div>
    </div>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </div>
</template>
