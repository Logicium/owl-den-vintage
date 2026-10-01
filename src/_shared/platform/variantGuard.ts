import type { NavigationGuard } from 'vue-router'
import { variantAtLeast } from '../themes/tokens'
import type { SiteVariant } from '../themes/tokens'

/**
 * Route guard for pages that only exist on a paid variant (today: the
 * Portfolio gallery / lookbook).
 *
 * Why a guard rather than leaving the route out of the array: a site's paid
 * variant arrives in the runtime content overlay, which is fetched and applied
 * AFTER the router module has been evaluated. A route omitted at module scope
 * can never come back, so an upgraded site would keep 404ing on /gallery until
 * someone rebuilt and redeployed it. Registering the route always and checking
 * the variant at navigation time keeps the page paid-only while letting an
 * upgrade take effect on the next page load.
 *
 * `getVariant` is a getter, not a value, so it is read at navigation time —
 * by which point `main.ts` has merged the overlay into the reactive siteConfig.
 */
export function requireVariant(min: SiteVariant, getVariant: () => string | undefined): NavigationGuard {
  return () => (variantAtLeast(getVariant() ?? 'essentials', min) ? true : { path: '/' })
}
