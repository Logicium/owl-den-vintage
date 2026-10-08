import { onBeforeUnmount, ref } from 'vue'

const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

/** Reactive prefers-reduced-motion flag. */
export function useReducedMotion() {
  const reduced = ref(query?.matches ?? false)
  const onChange = (e: MediaQueryListEvent) => { reduced.value = e.matches }
  query?.addEventListener('change', onChange)
  onBeforeUnmount(() => query?.removeEventListener('change', onChange))
  return reduced
}

/** Non-reactive read for code outside a component. */
export function prefersReducedMotion(): boolean {
  return query?.matches ?? false
}
