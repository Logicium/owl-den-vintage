/**
 * Active site selection used across all admin tabs.
 * Loads the owner's sites once and persists the active selection in localStorage
 * so navigating between tabs keeps the same site selected.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { contentClient } from './contentClient'

const STORAGE_KEY = 'admin.activeSiteId'

export type AdminSiteRow = Awaited<ReturnType<typeof contentClient.listSites>>[number] & { archetype: string }

export const useActiveSiteStore = defineStore('activeSite', () => {
  const sites = ref<AdminSiteRow[]>([])
  const activeId = ref<string>(localStorage.getItem(STORAGE_KEY) || '')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeSite = computed<AdminSiteRow | null>(() => sites.value.find(s => s.id === activeId.value) ?? null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      sites.value = await contentClient.listSites()
      // Make sure the persisted id still exists; otherwise pick the first site.
      if (!sites.value.some(s => s.id === activeId.value)) {
        activeId.value = sites.value[0]?.id ?? ''
        if (activeId.value) localStorage.setItem(STORAGE_KEY, activeId.value)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function setActive(id: string) {
    activeId.value = id
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return { sites, activeId, activeSite, loading, error, refresh, setActive }
})
