/**
 * From a tenant's content to a SiteConfig.
 *
 * Every template feeds the same record into the SEO module: the brand,
 * tagline, blurb, contact details, hours, socials and photos the owner keeps
 * in the dashboard (and, at build, in public/tenant.config.json). This file
 * turns that record into the module's `SiteConfig`: the entity type per
 * archetype, a parsed postal address, opening hours in schema.org form, the
 * canonical origin and whether the site may be indexed at all.
 *
 * Browser-safe: the prerender calls it under Node, main.ts calls it in the
 * browser once the owner's published content has arrived.
 */
import type { OpeningHours, PostalAddress, SiteConfig, Weekday } from './types'

export type SeoArchetype = 'dine' | 'stay' | 'shop' | 'utility' | 'venue' | 'project'

/** schema.org type per archetype. */
export const ENTITY_TYPE: Record<SeoArchetype, string> = {
  dine: 'Restaurant',
  stay: 'LodgingBusiness',
  shop: 'Store',
  utility: 'LocalBusiness',
  venue: 'EventVenue',
  project: 'Organization',
}

/** Paths no template ever lets into the index. */
export const ARCHETYPE_PRIVATE_PREFIXES = ['/admin', '/checkout', '/order', '/account']

/** The slice of a site config SEO reads; every template's config satisfies it. */
export interface TenantSeoSource {
  brand?: string
  tagline?: string
  blurb?: string
  mission?: string
  favicon?: string
  logo?: string
  /** An explicit 1200 x 630 share card, when the owner has one. */
  ogImage?: string
  /** A custom domain or origin, when the tenant record carries one. */
  domain?: string
  siteUrl?: string
  customDomain?: string
  contact?: { address?: string; phone?: string; email?: string }
  hours?: Array<{ day: string; open: string }>
  social?: Array<{ label?: string; href: string }>
  photos?: { hero?: { src?: string; alt?: string } }
  /** The project template keeps its hero image here. */
  hero?: { image?: string }
  story?: { paragraphs?: string[] }
  variant?: string
}

/** What a template says about itself when the tenant record is thin. */
export interface SeoFallback {
  brand: string
  tagline?: string
  description: string
  /** A canonical origin the repo itself states (the project site). */
  siteUrl?: string
}

/** The environment variables the origin and the provisioning state come from. */
export interface SeoEnv {
  VITE_SITE_URL?: string
  VITE_SITE_ID?: string
  VITE_SITE_SLUG?: string
  VERCEL_PROJECT_PRODUCTION_URL?: string
  [key: string]: unknown
}

export interface SiteConfigInput {
  tenant: TenantSeoSource
  archetype: SeoArchetype
  fallback: SeoFallback
  env: SeoEnv
  /** path prefixes on top of ARCHETYPE_PRIVATE_PREFIXES */
  privatePrefixes?: string[]
  /** extra JSON-LD properties merged into the entity node */
  extra?: Record<string, unknown>
}

/** The origin a build claims when it has none: never indexed, never canonical. */
export const UNKNOWN_ORIGIN = 'https://preview.invalid'

/** Provisioned sites carry a site id or slug; anything else is a demo or local build. */
export function isProvisioned(env: SeoEnv): boolean {
  return Boolean(str(env.VITE_SITE_ID) || str(env.VITE_SITE_SLUG))
}

/* ------------------------------ helpers ------------------------------ */

// 555-0100 to 555-0199 is the fictional range; the template samples use 555-0200 and up too
const PLACEHOLDER = /\b(555-?0\d{3}|555-?1234|123 Main|lorem|ipsum|example\.com|TODO|TBD|replace me|your (name|business))\b|\.(example|invalid|test)\b/i

/** True when a value is still template filler rather than an owner's fact. */
export function isPlaceholder(v: string): boolean {
  return PLACEHOLDER.test(v)
}

function str(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.replace(/\s+/g, ' ').trim()
  return t ? t : undefined
}

/** A fact the owner has not filled in yet is left out rather than published. */
function fact(v: unknown): string | undefined {
  const t = str(v)
  return t && !PLACEHOLDER.test(t) ? t : undefined
}

/**
 * "example.com", "https://example.com/" -> "https://example.com"; nothing when
 * it is not an https origin (an http:// value is refused, not upgraded). The
 * host is kept exactly as given: the service sets VITE_SITE_URL from the
 * custom domain (`https://<apex>`, www stripped) and is the source of truth
 * for which host is canonical, so apex and www are never swapped here.
 */
export function toOrigin(v: unknown): string | undefined {
  const t = str(v)
  if (!t) return undefined
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'https:' || !u.hostname.includes('.')) return undefined
    return `https://${u.host}`
  } catch {
    return undefined
  }
}

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO',
  'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
])

/**
 * "123 Main St, Trinidad, CO 81082" or "Trinidad, Colorado" to a PostalAddress.
 * Needs at least a locality and a region; a street that is still a placeholder
 * is dropped while the town is kept.
 */
export function parseAddress(input: unknown): PostalAddress | undefined {
  const t = str(input)
  if (!t) return undefined
  const parts = t.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return undefined
  const last = parts[parts.length - 1]!
  const m = last.match(/^([A-Za-z .'-]+?)\s*(\d{5}(?:-\d{4})?)?$/)
  if (!m) return undefined
  const region = m[1]!.trim()
  const postalCode = m[2]
  const locality = parts[parts.length - 2]!
  const street = parts.length > 2 ? parts.slice(0, parts.length - 2).join(', ') : undefined
  if (!region || !locality) return undefined
  // a two-letter code that is not a US state is more likely a country than a region
  if (region.length === 2 && !US_STATES.has(region.toUpperCase())) return undefined
  return {
    streetAddress: fact(street),
    addressLocality: locality,
    addressRegion: region,
    postalCode,
    addressCountry: 'US',
  }
}

const DAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function dayIndex(token: string): number {
  const t = token.trim().toLowerCase().replace(/\.$/, '')
  if (t.length < 3) return -1
  return DAYS.findIndex((d) => d.toLowerCase().startsWith(t.slice(0, 3)))
}

/** "Mon–Thu", "Tuesday – Thursday", "Saturday", "Daily", "Weekends" to weekdays. */
export function parseDays(input: string): Weekday[] {
  const t = input.trim().toLowerCase()
  if (!t) return []
  if (/^(daily|every ?day|all week|7 days)/.test(t)) return [...DAYS]
  if (/^weekdays?$/.test(t)) return DAYS.slice(0, 5)
  if (/^weekends?$/.test(t)) return DAYS.slice(5)
  const range = t.split(/\s*(?:–|—|-|to|through)\s*/)
  if (range.length === 2) {
    const a = dayIndex(range[0]!)
    const b = dayIndex(range[1]!)
    if (a < 0 || b < 0) return []
    const out: Weekday[] = []
    for (let i = a; ; i = (i + 1) % 7) {
      out.push(DAYS[i]!)
      if (i === b) break
      if (out.length > 7) return []
    }
    return out
  }
  return t
    .split(/\s*[,&/]\s*|\s+and\s+/)
    .map(dayIndex)
    .filter((i) => i >= 0)
    .map((i) => DAYS[i]!)
}

function toMinutes(h: string, m: string | undefined, ampm: string | undefined): number | undefined {
  let hour = Number(h)
  const min = m ? Number(m) : 0
  if (!Number.isFinite(hour) || hour > 24 || min > 59) return undefined
  const p = ampm?.toLowerCase().replace(/\./g, '')
  if (p === 'pm' && hour < 12) hour += 12
  if (p === 'am' && hour === 12) hour = 0
  return hour * 60 + min
}

const hhmm = (mins: number) => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

/** "11:00 – 9:00", "11am – 9pm", "7:00 - 6:00" to 24-hour opens/closes; nothing for "Closed". */
export function parseTimes(input: string): { opens: string; closes: string } | undefined {
  const m = input.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:–|—|-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i)
  if (!m) return undefined
  let opens = toMinutes(m[1]!, m[2], m[3])
  let closes = toMinutes(m[4]!, m[5], m[6])
  if (opens === undefined || closes === undefined) return undefined
  // "11:00 – 9:00" with no meridiem: a closing time at or before opening is in the evening
  if (!m[6] && closes <= opens) closes += 12 * 60
  // "7 – 6" with no meridiem on either side and an opening before dawn is a morning opening written short
  if (!m[3] && !m[6] && opens < 5 * 60) opens += 12 * 60
  if (closes <= opens) return undefined
  return { opens: hhmm(opens), closes: hhmm(closes) }
}

/** The dashboard's free-text hours rows to OpeningHoursSpecification input; rows that do not parse are left out. */
export function parseHours(rows: Array<{ day?: string; open?: string }> | undefined): OpeningHours[] | undefined {
  if (!rows?.length) return undefined
  const out: OpeningHours[] = []
  for (const row of rows) {
    const days = parseDays(row.day ?? '')
    const times = parseTimes(row.open ?? '')
    if (days.length && times) out.push({ days, ...times })
  }
  return out.length ? out : undefined
}

/** Social links that point at a real profile, not a bare network home page. */
export function sameAsFrom(social: TenantSeoSource['social']): string[] | undefined {
  const out = (social ?? [])
    .map((s) => str(s?.href))
    .filter((h): h is string => Boolean(h) && /^https?:\/\//i.test(h!) && !PLACEHOLDER.test(h!))
    .filter((h) => {
      try {
        return new URL(h).pathname.replace(/\/+$/, '').length > 0
      } catch {
        return false
      }
    })
  return out.length ? Array.from(new Set(out)) : undefined
}

/* ------------------------------ the config ------------------------------ */

export function siteConfigFor(input: SiteConfigInput): SiteConfig {
  const { tenant, archetype, fallback, env } = input
  const provisioned = isProvisioned(env)

  const name = fact(tenant.brand) ?? fallback.brand
  const tagline = fact(tenant.tagline) ?? fallback.tagline
  const description = fact(tenant.blurb) ?? fact(tenant.mission) ?? fact(tenant.story?.paragraphs?.[0]) ?? fallback.description

  // origin: the provisioner's variable, a domain in the tenant record, the
  // repo's own domain, Vercel's production URL, or none. Never the page's own
  // origin: a preview deploy must not claim to be canonical.
  const siteUrl =
    toOrigin(env.VITE_SITE_URL) ??
    toOrigin(tenant.customDomain) ??
    toOrigin(tenant.domain) ??
    toOrigin(tenant.siteUrl) ??
    toOrigin(fallback.siteUrl) ??
    toOrigin(env.VERCEL_PROJECT_PRODUCTION_URL)
  const indexable = siteUrl !== undefined

  const address = parseAddress(tenant.contact?.address)
  const wanted = ENTITY_TYPE[archetype]
  // a local business must say where it is; without a town and region the
  // record is published as a plain Organization instead of failing the build
  const type = wanted === 'Organization' || address ? wanted : 'Organization'

  const hero = str(tenant.photos?.hero?.src) ?? str(tenant.hero?.image)
  const ogImage = str(tenant.ogImage)
  const shareUrl = ogImage ?? (provisioned && hero ? hero : '/og/default.png')
  const image =
    shareUrl === '/og/default.png'
      ? { url: shareUrl, width: 1200, height: 630, alt: tagline ? `${name}, ${tagline}` : name }
      : { url: shareUrl, alt: str(tenant.photos?.hero?.alt) ?? name }

  return {
    siteUrl: siteUrl ?? UNKNOWN_ORIGIN,
    name,
    tagline,
    description,
    lang: 'en',
    locale: 'en_US',
    image,
    entity: {
      type,
      name,
      description,
      logo: str(tenant.logo),
      image: hero,
      email: fact(tenant.contact?.email),
      telephone: fact(tenant.contact?.phone),
      address,
      hours: parseHours(tenant.hours),
      sameAs: sameAsFrom(tenant.social),
      extra: input.extra,
    },
    crawlers: { training: 'allow' },
    privatePrefixes: Array.from(new Set([...ARCHETYPE_PRIVATE_PREFIXES, ...(input.privatePrefixes ?? [])])),
    indexable,
  }
}
