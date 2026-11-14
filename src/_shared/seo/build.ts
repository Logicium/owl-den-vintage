/**
 * The build-time half of a template's SEO: the SiteConfig the prerender uses.
 *
 * A provisioned site carries public/tenant.config.json, written by the
 * provisioning service from the wizard and never overwritten by template
 * updates. At build that record is laid over the template's demo content, the
 * way main.ts lays the published overlay over it at runtime (applyDeep), so
 * the route table's titles, descriptions and bodies read the tenant's words. A
 * demo or local build has no provisioned record and keeps the template's own
 * content.
 *
 * Node only: imported by scripts/prerender.ts, never by app code. Kept free of
 * the browser stores so it type-checks under the node tsconfig.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isProvisioned, siteConfigFor, type SeoArchetype, type SeoEnv, type SeoFallback, type TenantSeoSource } from './siteConfig'
import type { RouteRecordRaw } from 'vue-router'
import type { PageContext, RouteSeo, SeoImage, SiteConfig } from './types'

export interface BuildSiteInput {
  /** the template root (holds public/, dist/, vercel.json) */
  root: string | URL
  env: SeoEnv
  archetype: SeoArchetype
  fallback: SeoFallback
  /** the template's reactive demo config; the tenant record is applied to it in place */
  siteConfig: Record<string, unknown>
  privatePrefixes?: string[]
  extra?: Record<string, unknown>
  log?: (line: string) => void
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * The same merge the runtime overlay uses (platform/siteContentStore applyDeep):
 * objects merge leaf by leaf, arrays and values replace, and an object where
 * the template expects an array is ignored rather than allowed to break a page.
 */
export function overlay(target: Record<string, unknown>, source: unknown): void {
  if (!isObject(source)) return
  for (const [k, v] of Object.entries(source)) {
    const cur = target[k]
    if (isObject(v) && isObject(cur)) overlay(cur, v)
    else if (isObject(v) && Array.isArray(cur)) continue
    else target[k] = v
  }
}

/** public/tenant.config.json, when this is a provisioned build and the file parses. */
export function readTenantConfig(root: string, env: SeoEnv, log: (line: string) => void): Record<string, unknown> | null {
  if (!isProvisioned(env)) return null
  const file = path.join(root, 'public', 'tenant.config.json')
  if (!existsSync(file)) {
    log('[seo] provisioned build without public/tenant.config.json; using the template content')
    return null
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    if (!isObject(parsed) || typeof parsed.brand !== 'string' || !parsed.brand.trim()) {
      log('[seo] public/tenant.config.json has no brand; using the template content')
      return null
    }
    // provisioning metadata, not content
    const { _generated: _g, _note: _n, archetype: _a, ...content } = parsed
    return content
  } catch (err) {
    log(`[seo] public/tenant.config.json is not readable (${err instanceof Error ? err.message : err}); using the template content`)
    return null
  }
}

/**
 * The SiteConfig for this build. Applies the tenant record to the template's
 * content first, then checks that a site-relative share image is really in
 * public/, falling back to the template's default card when it is not.
 */
export function buildSiteConfig(input: BuildSiteInput): SiteConfig {
  const log = input.log ?? ((l: string) => console.log(l))
  const root = typeof input.root === 'string' ? input.root : fileURLToPath(input.root)
  const tenant = readTenantConfig(root, input.env, log)
  if (tenant) {
    overlay(input.siteConfig, tenant)
    log(`[seo] tenant content applied: ${String(tenant.brand)}`)
  }
  const site = siteConfigFor({
    tenant: input.siteConfig as TenantSeoSource,
    archetype: input.archetype,
    fallback: input.fallback,
    env: input.env,
    privatePrefixes: input.privatePrefixes,
    extra: input.extra,
  })
  if (site.image.url.startsWith('/') && !existsSync(path.join(root, 'public', decodeURIComponent(site.image.url)))) {
    log(`[seo] share image ${site.image.url} is not in public/; using /og/default.png`)
    site.image = { url: '/og/default.png', width: 1200, height: 630, alt: site.tagline ? `${site.name}, ${site.tagline}` : site.name }
  }
  if (site.indexable === false) log(`[seo] no origin (VITE_SITE_URL, tenant domain or VERCEL_PROJECT_PRODUCTION_URL): built as noindex under ${site.siteUrl}`)
  else log(`[seo] origin ${site.siteUrl}`)
  return site
}

/**
 * The route table with every site-relative share image checked against
 * public/. An owner's photo path that is not in the build (a typo, a file
 * that was never uploaded) falls back to the default card with a log line
 * instead of failing the whole deploy on "share image is not in dist".
 */
export function withCheckedImages(routes: readonly RouteRecordRaw[], root: string | URL, log: (line: string) => void = (l) => console.log(l)): RouteRecordRaw[] {
  const dir = typeof root === 'string' ? root : fileURLToPath(root)
  const present = (url: string) => !url.startsWith('/') || url.startsWith('//') || existsSync(path.join(dir, 'public', decodeURIComponent(url.split(/[?#]/)[0]!)))
  const walk = (list: readonly RouteRecordRaw[]): RouteRecordRaw[] =>
    list.map((r) => {
      const seo = r.meta?.seo as RouteSeo | undefined
      const next = { ...r } as RouteRecordRaw
      if (seo?.image !== undefined) {
        const image = seo.image
        next.meta = {
          ...r.meta,
          seo: {
            ...seo,
            image: (ctx: PageContext) => {
              const v = (typeof image === 'function' ? image(ctx) : image) as SeoImage | string | undefined
              const url = typeof v === 'string' ? v : v?.url
              if (url && !present(url)) {
                log(`[seo] ${ctx.path}: share image ${url} is not in public/; using the default card`)
                return undefined
              }
              return v
            },
          },
        }
      }
      if (r.children?.length) (next as { children?: RouteRecordRaw[] }).children = walk(r.children)
      return next
    })
  return walk(routes)
}
