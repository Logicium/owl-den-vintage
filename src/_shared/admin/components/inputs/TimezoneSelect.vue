<script setup lang="ts">
/** Searchable IANA timezone picker with live UTC offsets, US zones first. */
import { computed } from 'vue'
import SearchSelect from './SearchSelect.vue'
import type { SelectOption } from './SelectInput.vue'

defineProps<{
  label?: string
  hint?: string
}>()

const model = defineModel<string>({ default: '' })

const COMMON = [
  'America/Denver', 'America/Chicago', 'America/New_York', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
]

function offsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch { return '' }
}

const options = computed<SelectOption[]>(() => {
  let zones: string[] = []
  try { zones = Intl.supportedValuesOf('timeZone') } catch { zones = COMMON }
  const rest = zones.filter(z => !COMMON.includes(z))
  return [...COMMON, ...rest].map(z => ({
    value: z,
    label: z.replace(/_/g, ' '),
    hint: offsetLabel(z),
  }))
})
</script>

<template>
  <SearchSelect v-model="model" :label="label" :hint="hint" :options="options" placeholder="Search timezones…" />
</template>
