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

// SEO (the Apotome Labs SEO + AEO standard). The module itself is imported by
// subpath, `@apotome/archetype-shared/seo/index` and `.../seo/node`, because its
// schema input types share names with the content client's; the body helpers
// (`.../seo/bodies`) stay on their subpath too, their names are short. These
// are the archetype-specific pieces around the module.
export * from './seo/siteConfig'
export * from './seo/nodes'

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
