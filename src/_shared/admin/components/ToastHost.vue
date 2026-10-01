<script setup lang="ts">
import { useToast } from '../composables/useToast'

const toast = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-host" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast">
        <div
          v-for="t in toast.items"
          :key="t.id"
          class="toast"
          :class="`toast--${t.kind}`"
          role="status"
        >
          <span class="toast__msg">{{ t.message }}</span>
          <button
            type="button"
            class="toast__close"
            aria-label="Dismiss notification"
            @click="toast.dismiss(t.id)"
          >×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-host {
  /* Top-right, clearing the sticky admin bar — the old bottom-right spot
     collided with the floating theme picker. */
  position: fixed; right: 1.25rem; top: 5.25rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  z-index: 9999;
  pointer-events: none;
  max-width: min(420px, calc(100vw - 2.5rem));
}
.toast {
  pointer-events: auto;
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  background: var(--adm-surface-2, #1d2026);
  color: var(--adm-text, #f4f5f7);
  border: 1px solid var(--adm-border, #262a32);
  border-left: 3px solid var(--adm-accent, #c4a47c);
  border-radius: var(--adm-radius, 8px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  font-size: 0.9rem; line-height: 1.35;
}
.toast--success { border-left-color: #6bcf8a; }
.toast--error   { border-left-color: #e26d6d; }
.toast--info    { border-left-color: var(--adm-accent, #c4a47c); }

.toast__msg   { flex: 1; word-break: break-word; }
.toast__close {
  appearance: none; background: transparent; border: 0;
  color: var(--adm-text-muted, #a5acba);
  font-size: 1.1rem; line-height: 1; cursor: pointer;
  padding: 0 0.15rem;
}
.toast__close:hover { color: var(--adm-text, #f4f5f7); }

.toast-enter-from { opacity: 0; transform: translateY(-12px) scale(0.96); }
.toast-leave-to   { opacity: 0; transform: translateX(24px); }
.toast-enter-active, .toast-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
</style>
