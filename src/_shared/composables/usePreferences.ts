import { ref, computed, watch } from 'vue'
import { useAdminAuthStore } from '../platform/adminAuthStore'
import { getStoredToken } from '../platform/contentClient'
import { DEMO_MODE } from '../platform/config'

/**
 * User-level UI preferences persisted in localStorage. Currently controls the
 * theme picker visibility — defaults to ON for signed-in site owners and OFF
 * for anonymous visitors. The user can override either way from /admin/account.
 */
const STORAGE_KEY = 'archetype_prefs_v1'

type Prefs = {
  themePickerVisible: 'auto' | 'on' | 'off'
  /** When true the theme picker pushes every change to the server immediately;
   *  when false the owner has to hit the Save button. */
  themeAutosave: boolean
}

const DEFAULTS: Prefs = { themePickerVisible: 'auto', themeAutosave: true }

function load(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

const state = ref<Prefs>(load())

watch(state, (v) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch { /* ignore */ }
}, { deep: true })

let hydrateKicked = false

export function usePreferences() {
  const auth = useAdminAuthStore()

  // First call on a public route: kick off a single /auth/me so the picker
  // can resolve `auto` based on real session state instead of staying hidden
  // because nobody else hydrated the owner.
  if (!hydrateKicked) {
    hydrateKicked = true
    if (!auth.owner && getStoredToken()) {
      auth.refresh().catch(() => { /* ignore */ })
    }
  }

  const themePickerVisible = computed(() => {
    // Demo/showcase builds always expose the picker so visitors can play with
    // themes. Real template sites keep it owner-only (a live site's visitors
    // must not be able to restyle it unless the owner is signed in).
    if (DEMO_MODE) return true
    const mode = state.value.themePickerVisible
    if (mode === 'on') return true
    if (mode === 'off') return false
    // Optimistic: a stored session token implies "logged in" until /auth/me
    // confirms otherwise, so the picker doesn't flash off on first paint.
    return !!auth.owner || !!getStoredToken()
  })

  function setThemePickerVisibility(mode: Prefs['themePickerVisible']) {
    state.value = { ...state.value, themePickerVisible: mode }
  }

  function setThemeAutosave(on: boolean) {
    state.value = { ...state.value, themeAutosave: on }
  }

  return {
    state,
    themePickerVisible,
    setThemePickerVisibility,
    setThemeAutosave,
  }
}
