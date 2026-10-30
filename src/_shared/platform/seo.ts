/**
 * Site-wide SEO driven by the owner's own content.
 *
 * Every template calls `useSiteSeo` once from App.vue with its reactive site
 * config and a small page map. From then on the document title, description,
 * canonical, Open Graph / Twitter cards, favicon and a LocalBusiness JSON-LD
 * block follow the site's brand, tagline, blurb, contact details, social
 * links and hero photo (all editable in the dashboard) and change per page as
 * the visitor navigates. Dashboard, checkout and order pages are noindex.
 *
 * The matching build-time half (`vite/seo.mjs`) bakes the same brand, title
 * and description into index.html so crawlers that do not run JavaScript, and
 * link previews, see the business instead of the template name.
 */
import { watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router'

export type SeoArchetype = 'dine' | 'stay' | 'shop' | 'utility' | 'venue' | 'project'

/** The slice of a site config SEO reads; every template's config satisfies it. */
export interface SeoSite {
  brand: string
  tagline?: string
  blurb?: string
  mission?: string
  favicon?: string
  contact?: { address?: string; phone?: string; email?: string }
  social?: Array<{ label?: string; href: string }>
  photos?: { hero?: { src?: string; alt?: string } }
}

export interface PageSeo {
  /** Page name; the brand is appended automatically. */
  title?: string
  description?: string
  /** Absolute or site-relative image for link previews. Defaults to the hero. */
  image?: string
  noindex?: boolean
}

export interface SeoOptions {
  site: MaybeRefOrGetter<SeoSite>
  archetype: SeoArchetype
  /** Per-route title/description. Return nothing to fall back to the route name. */
  page?: (route: RouteLocationNormalizedLoaded) => PageSeo | null | undefined
}

const SCHEMA_TYPE: Record<SeoArchetype, string> = {
  dine: 'Restaurant',
  stay: 'LodgingBusiness',
  shop: 'Store',
  utility: 'LocalBusiness',
  venue: 'EventVenue',
  project: 'Organization',
}

/** Paths that must never be indexed, whatever the template. */
const PRIVATE_PREFIXES = ['/admin', '/checkout', '/order/']

function upsert(selector: string, create: () => HTMLElement): HTMLElement {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  return el
}

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  const selector = `meta[${attr}="${key}"]`
  if (!content) {
    document.head.querySelector(selector)?.remove()
    return
  }
  const el = upsert(selector, () => {
    const m = document.createElement('meta')
    m.setAttribute(attr, key)
    return m
  })
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string | undefined, extra: Record<string, string> = {}) {
  const selector = `link[rel="${rel}"]`
  if (!href) {
    document.head.querySelector(selector)?.remove()
    return
  }
  const el = upsert(selector, () => {
    const l = document.createElement('link')
    l.setAttribute('rel', rel)
    return l
  })
  el.setAttribute('href', href)
  for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v)
}

function setJsonLd(data: Record<string, unknown> | null) {
  const selector = 'script[type="application/ld+json"][data-ap-seo]'
  if (!data) {
    document.head.querySelector(selector)?.remove()
    return
  }
  const el = upsert(selector, () => {
    const s = document.createElement('script')
    s.setAttribute('type', 'application/ld+json')
    s.setAttribute('data-ap-seo', '')
    return s
  })
  el.textContent = JSON.stringify(data)
}

function absolute(src: string | undefined): string | undefined {
  if (!src) return undefined
  try { return new URL(src, window.location.origin).href } catch { return undefined }
}

function clean(s: string | undefined, max = 160): string | undefined {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return undefined
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : t
}

function faviconType(src: string): string | undefined {
  const ext = src.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase()
  return { svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext ?? '']
}

/** Human page name from a route when the template gave none ("data-deletion" → "Data deletion"). */
function routeTitle(route: RouteLocationNormalizedLoaded): string {
  const raw = String(route.name ?? route.path.split('/').filter(Boolean)[0] ?? '')
  const words = raw.replace(/[-_]+/g, ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

export function useSiteSeo(opts: SeoOptions): void {
  if (typeof document === 'undefined') return
  const route = useRoute()

  function apply() {
    const site = toValue(opts.site)
    const brand = (site.brand || '').trim() || 'Website'
    const tagline = clean(site.tagline, 90)
    const siteDescription = clean(site.blurb) ?? clean(site.mission) ?? (tagline ? `${brand}. ${tagline}` : brand)
    const page = opts.page?.(route) ?? {}
    const isHome = route.path === '/'
    const privatePage = page.noindex || PRIVATE_PREFIXES.some(p => route.path === p || route.path.startsWith(p))

    const pageTitle = (page.title ?? (isHome ? '' : routeTitle(route))).trim()
    const title = isHome
      ? (tagline ? `${brand} · ${tagline}` : brand)
      : (pageTitle ? `${pageTitle} · ${brand}` : brand)
    const description = clean(page.description) ?? siteDescription
    const image = absolute(page.image ?? site.photos?.hero?.src)
    const canonical = `${window.location.origin}${route.path === '/' ? '/' : route.path.replace(/\/$/, '')}`

    document.title = title
    if (!document.documentElement.lang) document.documentElement.lang = 'en'
    setMeta('name', 'description', description)
    setMeta('name', 'robots', privatePage ? 'noindex, nofollow' : undefined)
    setLink('canonical', privatePage ? undefined : canonical)

    setMeta('property', 'og:site_name', brand)
    setMeta('property', 'og:type', isHome ? 'website' : 'article')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', image)

    if (site.favicon) {
      const type = faviconType(site.favicon)
      setLink('icon', site.favicon, type ? { type } : {})
    }

    if (privatePage) {
      setJsonLd(null)
      return
    }
    const sameAs = (site.social ?? []).map(s => s.href).filter(h => /^https?:\/\//.test(h))
    const business: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': SCHEMA_TYPE[opts.archetype],
      name: brand,
      description: siteDescription,
      url: `${window.location.origin}/`,
    }
    if (image) business.image = image
    if (site.contact?.phone) business.telephone = site.contact.phone
    if (site.contact?.email) business.email = site.contact.email
    if (site.contact?.address) business.address = { '@type': 'PostalAddress', streetAddress: site.contact.address }
    if (sameAs.length) business.sameAs = sameAs
    setJsonLd(business)
  }

  // Re-run on navigation and whenever the owner's published content hydrates
  // or changes (the config is reactive, so the deep watch sees it).
  watch(() => [route.fullPath, toValue(opts.site)] as const, apply, { immediate: true, deep: true })
}
