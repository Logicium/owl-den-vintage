/**
 * Theme token contracts shared across every Archetype site.
 * A "theme" defines feel (typography, spacing, shape).
 * A "swatch" defines color. They are composed at runtime.
 */

export type ThemeName = 'atlas' | 'studio' | 'heritage' | 'vibrant' | 'ironwood'
export type HeroStyle = '1' | '2' | '3' | '4' | '5' | '6'
export type FooterStyle = '1' | '2' | '3' | '4' | '5'
export type ContactStyle = '1' | '2' | '3' | '4' | '5'
export type HoursStyle = '1' | '2' | '3' | '4' | '5'
export type GalleryStyle = '1' | '2' | '3' | '4' | '5'
export type ReviewsStyle = '1' | '2' | '3' | '4' | '5'
export type SubheroStyle = '1' | '2' | '3' | '4' | '5'
export type SiteStyle = '1' | '2' | '3'
export type AboutStyle = '1' | '2' | '3' | '4'
export type NavStyle = '1' | '2' | '3' | '4'
export type Alignment = 'left' | 'center'

/**
 * Swatch categories. Each category is a hue territory with a clear
 * personality; the swatch families inside it are tuned to feel like
 * siblings while staking out unmistakably different palettes.
 * Every family ships a light and a dark version.
 */
export type SwatchGroup = 'terra' | 'coast' | 'solar' | 'bold' | 'noir' | 'neon'
export const SWATCH_GROUP_LABELS: Record<SwatchGroup, string> = {
  terra: 'Terra',
  coast: 'Coast',
  solar: 'Solar',
  bold: 'Bold',
  noir: 'Noir',
  neon: 'Neon',
}

/** A swatch category: one line of meaning, no lecture. */
export interface SwatchTheory {
  id: SwatchGroup
  label: string
  /** The single line of context shown in pickers. */
  subtext: string
}

export const SWATCH_THEORIES: SwatchTheory[] = [
  {
    id: 'terra',
    label: 'Terra',
    subtext: 'Clay, pine, and olive. Grounded color for kitchens, stays, and craft.',
  },
  {
    id: 'coast',
    label: 'Coast',
    subtext: 'Deep blues, teal, and violet. Calm, capable, quietly modern.',
  },
  {
    id: 'solar',
    label: 'Solar',
    subtext: 'Vermilion, wine, and saffron. Heat and appetite for food and festivity.',
  },
  {
    id: 'bold',
    label: 'Bold',
    subtext: 'Color takes over the page. Loud, confident, impossible to miss.',
  },
  {
    id: 'noir',
    label: 'Noir',
    subtext: 'Near-black rooms with one jewel accent. The look of luxury after dark.',
  },
  {
    id: 'neon',
    label: 'Neon',
    subtext: 'Signal hues that glow. Built for nightlife, music, and late hours.',
  },
]

/**
 * A swatch family: one named palette idea that exists in a light and a
 * dark version ("<family>-light" / "<family>-dark").
 */
export type SwatchFamily =
  // Terra
  | 'adobe'
  | 'pine'
  | 'matcha'
  | 'cacao'
  // Coast
  | 'ultramarine'
  | 'lagoon'
  | 'iris'
  | 'fjord'
  // Solar
  | 'vermilion'
  | 'rosewood'
  | 'saffron'
  | 'hibiscus'
  // Bold
  | 'klein'
  | 'riot'
  | 'signal'
  | 'cadmium'
  // Noir
  | 'onyx'
  | 'midnight'
  | 'velvet'
  | 'garnet'
  // Neon
  | 'volt'
  | 'aurora'
  | 'acid'
  | 'plasma'

export type SwatchName = `${SwatchFamily}-light` | `${SwatchFamily}-dark`

/**
 * Names accepted from older site configs / localStorage. Kept forever so a
 * site published under the previous color system keeps rendering close to
 * what its owner picked.
 */
export type LegacySwatchName =
  | 'sand' | 'sage' | 'forest' | 'citrus'
  | 'stone' | 'glacier' | 'tide' | 'lilac'
  | 'sunset' | 'rose' | 'fiesta' | 'mango'
  | 'electric' | 'punch' | 'carnival'
  | 'midnight' | 'obsidian' | 'ember' | 'plum'
  | 'neon' | 'aurora' | 'acid' | 'synthwave'

export interface ColorSwatch {
  /** Preset swatches use a SwatchName; user-built palettes use a free id. */
  name: string
  label: string
  mode: 'light' | 'dark'
  group: SwatchGroup
  /** Family id linking this swatch to its light/dark counterpart. */
  family?: string
  primary: string
  accent: string
  surface: string
  surfaceAlt: string
  ink: string
  inkMuted: string
  line: string
  /** One-line feel description shown in pickers. */
  feel?: string
}

export interface ThemeTokens {
  name: ThemeName
  label: string
  description: string
  fontHeading: string
  fontBody: string
  fontMono: string
  /** Base scale modifier applied to type sizes. */
  typeScale: number
  radius: string
  radiusLg: string
  shadow: string
  shadowLg: string
  letterSpacingHeading: string
  letterSpacingBody: string
  uppercaseHeadings: boolean
  sectionPaddingY: string
  containerMax: string
  /** Optional google fonts URL. */
  fontUrl?: string
  /** Heading weight: themes vary intentionally. */
  headingWeight: number
}

/**
 * The two website sizes. ("extended" no longer exists as a tier — any
 * config still carrying it resolves to portfolio via resolveVariant.)
 */
export type SiteVariant = 'essentials' | 'portfolio'

export type Archetype = 'dine' | 'stay' | 'shop' | 'venue' | 'project' | 'utility'

/** How many photos each variant expects in each gallery slot. */
export const VARIANT_PHOTO_COUNT: Record<SiteVariant, { gallery: number; max: number }> = {
  essentials: { gallery: 8, max: 8 },
  portfolio: { gallery: 16, max: 16 },
}

/**
 * Variants are a tier ladder — portfolio unlocks everything in essentials
 * plus the photo-forward layouts (hero carousel, larger galleries).
 * Gate features with `variantAtLeast` rather than equality checks.
 */
export const VARIANT_RANK: Record<SiteVariant, number> = {
  essentials: 0,
  portfolio: 1,
}

/** Accepts legacy values ('extended') and anything unknown safely. */
export function resolveVariant(v: string | undefined | null): SiteVariant {
  if (v === 'portfolio' || v === 'extended') return 'portfolio'
  return 'essentials'
}

export function variantAtLeast(variant: SiteVariant | string, min: SiteVariant): boolean {
  return VARIANT_RANK[resolveVariant(variant as string)] >= VARIANT_RANK[min]
}

/**
 * The single place that decides which tier a site PAID for.
 *
 * Distinct from `resolveVariant`, which says how the site is currently laid
 * out. `Site.plan` has held two kinds of value: catalogue SKU ids from the
 * initial purchase (`website-extended`) and tier names from the upgrade flow
 * (`portfolio`). Both must resolve the same way, or an owner who bought
 * Portfolio outright is shown the Essentials limits they did not pay for.
 *
 * Anything unrecognised is Essentials — the tier that grants nothing — so a
 * typo can never hand out paid capacity.
 */
const PORTFOLIO_PLANS = new Set([
  'portfolio', 'extended', 'premium', 'pro',
  'website-extended', 'website-premium', 'website-portfolio-upgrade',
])

export function resolvePlanTier(plan: string | null | undefined): SiteVariant {
  return PORTFOLIO_PLANS.has((plan ?? '').trim().toLowerCase()) ? 'portfolio' : 'essentials'
}
