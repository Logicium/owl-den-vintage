/**
 * Who this site is, for search engines and assistants.
 *
 * The facts come from the owner's content (brand, tagline, blurb, contact,
 * hours, socials, photos): the demo config in a template build, the tenant
 * record laid over it in a provisioned build, the published overlay at
 * runtime. This file only says which archetype the template is and what to
 * fall back to when a record is thin. Pure data: the prerender imports it
 * under Node and the app imports it in the browser.
 */
import type { SiteConfig } from '@apotome/archetype-shared/seo/index'
import { siteConfigFor, type SeoArchetype, type SeoFallback } from '@apotome/archetype-shared/seo/siteConfig'
import { siteConfig } from './config/site.config'

export const archetype: SeoArchetype = 'shop'

export const fallback: SeoFallback = {
  brand: 'Vault',
  tagline: 'Archetype Shop',
  description: 'A shop website template by Apotome Archetypes.',
}

/**
 * The runtime SiteConfig, built from the reactive site config as it stands
 * now. The origin comes from the same variables the build used
 * (VITE_SITE_URL, VERCEL_PROJECT_PRODUCTION_URL; see envPrefix in
 * vite.config.ts), so the head the app applies matches the prerendered one.
 */
export function seoSite(): SiteConfig {
  return siteConfigFor({ tenant: siteConfig, archetype, fallback, env: import.meta.env as Record<string, unknown> })
}
