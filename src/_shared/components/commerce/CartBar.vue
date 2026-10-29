<script setup lang="ts">
/**
 * The one piece of cart UI that lives on a catalog page: a quiet bar pinned
 * to the bottom with the running total and a single way forward. Everything
 * else (editing lines, contact, delivery, payment) happens on /checkout.
 */
import { RouterLink } from 'vue-router'

withDefaults(defineProps<{
  count: number
  total: string
  to?: string
  label?: string
  noun?: string
}>(), { to: '/checkout', label: 'Checkout', noun: 'item' })
</script>

<template>
  <Transition name="ap-cartbar">
    <div v-if="count > 0" class="ap-cartbar" role="status" aria-live="polite">
      <div class="ap-cartbar__inner">
        <span class="ap-cartbar__summary">
          <strong>{{ count }}</strong> {{ count === 1 ? noun : noun + 's' }}
          <span class="ap-cartbar__dot" aria-hidden="true">·</span>
          <strong>{{ total }}</strong>
        </span>
        <RouterLink :to="to" class="ap-btn ap-cartbar__go">{{ label }}</RouterLink>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ap-cartbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
  padding: 0 1rem calc(0.9rem + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}
/* Keep clear of the theme dock, which sits bottom-right on wider screens. */
@media (min-width: 720px) { .ap-cartbar { padding-right: 15rem; } }
.ap-cartbar__inner {
  pointer-events: auto;
  margin: 0 auto 0 0; max-width: 640px;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0.7rem 0.75rem 0.7rem 1.1rem;
  background: var(--ap-ink, #111); color: var(--ap-surface, #fff);
  border-radius: 999px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
}
.ap-cartbar__summary { font-size: 0.95rem; }
.ap-cartbar__dot { margin: 0 0.5rem; opacity: 0.5; }
.ap-cartbar__go {
  background: var(--ap-surface, #fff); color: var(--ap-ink, #111); border-color: var(--ap-surface, #fff);
  padding: 0.55rem 1.1rem; border-radius: 999px;
}
.ap-cartbar__go:hover { background: var(--ap-surface-alt, #f4f4f4); }
.ap-cartbar-enter-active, .ap-cartbar-leave-active { transition: transform 220ms ease, opacity 220ms ease; }
.ap-cartbar-enter-from, .ap-cartbar-leave-to { transform: translateY(1.2rem); opacity: 0; }
</style>
