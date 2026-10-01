<script setup lang="ts">
/** Bespoke number stepper — +/- buttons, min/max clamping, optional unit. */
import { Minus, Plus } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  min?: number
  max?: number
  step?: number
  unit?: string
}>(), { step: 1 })

const model = defineModel<number>({ default: 0 })

function clamp(n: number): number {
  if (props.min != null && n < props.min) return props.min
  if (props.max != null && n > props.max) return props.max
  return n
}
function nudge(dir: 1 | -1) { model.value = clamp((model.value ?? 0) + dir * props.step) }
function onInput(e: Event) {
  const n = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(n)) model.value = clamp(n)
}
</script>

<template>
  <label class="ai-field">
    <span v-if="label" class="ai-label">{{ label }}</span>
    <span class="ai-control ai-step">
      <button type="button" class="ai-step__btn" :disabled="min != null && model <= min" aria-label="Decrease" @click="nudge(-1)"><Minus :size="14" /></button>
      <input :value="model" inputmode="numeric" @change="onInput" />
      <span v-if="unit" class="ai-step__unit">{{ unit }}</span>
      <button type="button" class="ai-step__btn" :disabled="max != null && model >= max" aria-label="Increase" @click="nudge(1)"><Plus :size="14" /></button>
    </span>
    <span v-if="hint" class="ai-hint">{{ hint }}</span>
  </label>
</template>
