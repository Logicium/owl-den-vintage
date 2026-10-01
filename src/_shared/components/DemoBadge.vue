<script setup lang="ts">
import { DEMO_MODE } from '../platform/config'

withDefaults(
  defineProps<{
    /** Add-on being demonstrated, e.g. "E-Shop", "Event ticketing". */
    addOn: string
    /** Override the second line. */
    note?: string
  }>(),
  { note: 'Everything below is fully interactive — orders are simulated and nothing is charged.' },
)

const visible = DEMO_MODE
</script>

<template>
  <div v-if="visible" class="ap-demo-badge" role="note">
    <span class="ap-demo-badge__pill">Live demo</span>
    <p class="ap-demo-badge__text">
      <strong>{{ addOn }}</strong> is a premium add-on, shown here in action. {{ note }}
    </p>
  </div>
</template>

<style scoped>
.ap-demo-badge {
  display: flex; align-items: center; gap: 0.85rem;
  margin: 0 auto clamp(1.5rem, 3vw, 2.25rem);
  max-width: var(--ap-container-w, 1200px);
  padding: 0.75rem 1rem;
  border: 1px dashed color-mix(in srgb, var(--ap-primary) 55%, transparent);
  border-radius: var(--ap-radius, 8px);
  background: color-mix(in srgb, var(--ap-primary) 7%, transparent);
}
.ap-demo-badge__pill {
  flex-shrink: 0;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--ap-primary);
  color: var(--ap-on-primary, var(--ap-surface));
  font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
}
.ap-demo-badge__text { margin: 0; font-size: 0.88rem; color: var(--ap-ink-muted); }
.ap-demo-badge__text strong { color: var(--ap-ink); }
@media (max-width: 640px) {
  .ap-demo-badge { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
}
</style>
