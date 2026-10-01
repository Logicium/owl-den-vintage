import { computed, ref } from 'vue'

/**
 * Two-phase image pre-loading with deterministic progress tracking:
 *  1. `preloadCritical(urls)` — awaits, drives `progress` / `loaded` / `total`
 *     and flips `isReady` true when done.
 *  2. `preloadBackground(urls)` — fire-and-forget, never blocks the splash.
 *
 * Counts are scoped to the critical queue, so the splash bar reflects "what's
 * needed to render the first paint" rather than every asset on the site.
 */
function loadOne(url: string, onDone: () => void): Promise<void> {
  return new Promise(resolve => {
    const img = new Image()
    const finish = () => { onDone(); resolve() }
    img.onload = finish
    img.onerror = finish // never block the app on a broken image
    img.src = url
  })
}

export function useImagePreload() {
  const isReady = ref(false)
  const loaded = ref(0)
  const total = ref(0)
  const label = ref('Preparing your experience…')
  const progress = computed(() =>
    total.value === 0 ? 0 : Math.min(100, Math.round((loaded.value / total.value) * 100))
  )

  /** Awaitable: resolves when all `urls` have loaded (or errored). */
  async function preloadCritical(urls: string[], stepLabel?: string): Promise<void> {
    const list = urls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    total.value = list.length
    loaded.value = 0
    if (list.length === 0) {
      label.value = 'Ready'
      isReady.value = true
      return
    }
    label.value = stepLabel ?? `Loading ${list.length} asset${list.length === 1 ? '' : 's'}…`
    await Promise.all(list.map(u => loadOne(u, () => { loaded.value++ })))
    label.value = 'Ready'
    isReady.value = true
  }

  /** Fire-and-forget: starts downloads without awaiting or tracking. */
  function preloadBackground(urls: string[]): void {
    urls
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
      .forEach(u => { void loadOne(u, () => {}) })
  }

  return { isReady, progress, loaded, total, label, preloadCritical, preloadBackground }
}
