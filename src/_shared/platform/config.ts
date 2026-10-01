/**
 * Platform feature switch.
 *
 * When `enabled` is true, the app:
 *   - boots `useSiteContentStore().hydrate()` from the backend overlay before mount,
 *   - registers `/admin/*` routes for the owner dashboard,
 *   - posts contact-form submissions to the backend.
 *
 * When false (default), the site behaves exactly as it does today: fully static,
 * reading from the build-time `src/config/site.config.ts`.
 *
 * Toggle via `VITE_PLATFORM_ENABLED=true` in the environment.
 */
export const PLATFORM_ENABLED = import.meta.env.VITE_PLATFORM_ENABLED === 'true'

/** Backend base URL (no trailing slash). */
export const PLATFORM_API = (import.meta.env.VITE_CONTENT_API || '').replace(/\/$/, '')

/** This site's slug in the backend. Set per-deployment by the provisioner. */
export const PLATFORM_SLUG = import.meta.env.VITE_SITE_SLUG || ''

/** This site's immutable UUID in the backend. Preferred over slug for lookups. */
export const PLATFORM_SITE_ID = import.meta.env.VITE_SITE_ID || ''

/**
 * The key used by `contentClient` for all public per-site requests.
 * Prefers the immutable site ID; falls back to the slug for back-compat
 * with sites deployed before the ID switchover.
 */
export const PLATFORM_SITE_KEY = PLATFORM_SITE_ID || PLATFORM_SLUG

/**
 * Demo mode: premium sections (shop, ticketing, ordering, lodging, booking)
 * render fully interactive against seeded in-browser data, clearly labelled
 * as a demo — so template visitors experience the add-ons they'd be buying.
 *
 * Defaults to ON whenever this deployment is not a real, hydratable site
 * (no platform backend, or platform enabled without a site key — which is
 * what template demos and local template dev look like). Provisioned
 * customer sites always get a site id/slug, so they are never demos.
 * Override with VITE_DEMO_MODE=true|false.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
  || (import.meta.env.VITE_DEMO_MODE !== 'false' && !(PLATFORM_ENABLED && !!PLATFORM_SITE_KEY))

export type ArchetypeKind = 'mesa' | 'hearth' | 'vault' | 'project' | 'keystone'

/** Which archetype this UI represents. Derived from VITE_SITE_SLUG. */
export const ARCHETYPE_KIND = (import.meta.env.VITE_SITE_SLUG || 'hearth') as ArchetypeKind

