// Core data
// `./tokens` is the legacy token file — only its unique members are exported
// here; the canonical theme token types come from `./themes` below.
export { ARCHETYPE_OF } from './tokens'
export type { ArchetypeKey } from './tokens'
export * from './content'
export * from './pricing'

// Bootstrap
export * from './bootstrap'

// Platform (env-driven config, content sync, auth)
export * from './platform/config'
export * from './platform/contentClient'
export * from './platform/siteContentStore'
export * from './platform/activeSiteStore'
export * from './platform/adminAuthStore'

// Composables
export * from './composables/useSiteTheme'
export * from './composables/usePreferences'
export * from './composables/useSectionFlash'
export * from './composables/useImagePreload'
export * from './composables/useApScrollbar'

// Themes
export * from './themes'

// Admin routes (views/components must be imported via subpath)
export { adminRoutes } from './admin/routes'
