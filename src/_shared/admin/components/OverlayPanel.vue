<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  /** Two-way bound visibility flag. */
  modelValue: boolean
  /** Title shown in the header slot when no custom #header is provided. */
  title?: string
  /** Click-outside / Esc dismiss. Defaults to true. */
  dismissible?: boolean
  /** Max width of the panel in CSS units. Ignored when `fullscreen` is true. */
  width?: string
  /** Render the panel edge-to-edge instead of a centered modal. */
  fullscreen?: boolean
}>(), {
  title: '',
  dismissible: true,
  width: 'min(720px, calc(100vw - 2rem))',
  fullscreen: false,
})

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function close() {
  if (!props.dismissible) return
  emit('update:modelValue', false)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(() => props.modelValue, (open) => {
  if (open) {
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="modelValue"
        class="overlay"
        :class="{ 'overlay--fullscreen': fullscreen }"
        role="dialog"
        aria-modal="true"
        @mousedown.self="close"
      >
        <div
          class="overlay__panel"
          :class="{ 'overlay__panel--fullscreen': fullscreen }"
          :style="fullscreen ? undefined : { maxWidth: width }"
          @mousedown.stop
        >
          <header class="overlay__header">
            <slot name="header">
              <h2 class="overlay__title">{{ title }}</h2>
            </slot>
            <button
              v-if="dismissible"
              type="button"
              class="overlay__close"
              aria-label="Close"
              @click="close"
            >×</button>
          </header>
          <div class="overlay__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="overlay__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  z-index: 9000;
  display: flex; align-items: flex-start; justify-content: center;
  padding: clamp(1rem, 6vh, 4rem) 1rem 1rem;
  background: rgba(8, 10, 14, 0.55);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  perspective: 1400px;
}
.overlay--fullscreen { padding: 0; }

.overlay__panel {
  width: 100%;
  background: var(--adm-surface, #14161a);
  color: var(--adm-text, #f4f5f7);
  border: 1px solid var(--adm-border, #262a32);
  border-radius: var(--adm-radius-lg, 14px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
  display: flex; flex-direction: column;
  max-height: calc(100vh - 4rem);
  transform-origin: 50% 0%;
}
.overlay__panel--fullscreen {
  width: 100%;
  max-width: 100% !important;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
  border-left: 0; border-right: 0;
}

.overlay__header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--adm-border, #262a32);
}
.overlay__title {
  margin: 0;
  font-family: var(--adm-font-serif, serif);
  font-weight: 500; font-size: 1.15rem;
}
.overlay__close {
  appearance: none; background: transparent; border: 0;
  color: var(--adm-text-muted, #a5acba);
  font-size: 1.4rem; line-height: 1; cursor: pointer;
  padding: 0 0.25rem;
}
.overlay__close:hover { color: var(--adm-text, #f4f5f7); }

.overlay__body { padding: 1rem 1.25rem; overflow: auto; flex: 1; }
.overlay__footer {
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--adm-border, #262a32);
  display: flex; justify-content: flex-end; gap: 0.5rem;
}

/* 3D drop-in: backdrop blur fades in, panel tips forward from above. */
.overlay-enter-active { transition: opacity 220ms ease, backdrop-filter 220ms ease; }
.overlay-leave-active { transition: opacity 180ms ease, backdrop-filter 180ms ease; }
.overlay-enter-from, .overlay-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px) saturate(100%);
  -webkit-backdrop-filter: blur(0px) saturate(100%);
}
.overlay-enter-active .overlay__panel {
  animation: overlay-drop 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.overlay-leave-active .overlay__panel {
  animation: overlay-lift 200ms cubic-bezier(0.4, 0, 1, 1);
}
@keyframes overlay-drop {
  0%   { opacity: 0; transform: translateY(-32px) rotateX(-22deg) scale(0.94); filter: blur(6px); }
  60%  { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) rotateX(0) scale(1); filter: blur(0); }
}
@keyframes overlay-lift {
  0%   { opacity: 1; transform: translateY(0) rotateX(0) scale(1); }
  100% { opacity: 0; transform: translateY(-16px) rotateX(-12deg) scale(0.97); filter: blur(4px); }
}

@media (prefers-reduced-motion: reduce) {
  .overlay-enter-active .overlay__panel,
  .overlay-leave-active .overlay__panel { animation: none; }
}
</style>
