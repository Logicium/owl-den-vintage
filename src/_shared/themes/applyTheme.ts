import type { ColorSwatch, ThemeTokens, SiteVariant, Archetype, HeroStyle, FooterStyle, ContactStyle, HoursStyle, GalleryStyle, ReviewsStyle, SubheroStyle, SiteStyle, AboutStyle, NavStyle, Alignment } from './tokens'
import { ARCHETYPE_FORM, markSvg } from '../brand/marks'

/**
 * Writes a theme + swatch + variant + archetype into CSS custom properties
 * on <html>. Stylesheets reference these via `var(--ap-*)` and via the
 * `[data-theme]` / `[data-variant]` / `[data-mode]` / `[data-archetype]`
 * selectors.
 */
export function applyTheme(
  theme: ThemeTokens,
  swatch: ColorSwatch,
  variant: SiteVariant = 'essentials',
  archetype: Archetype = 'dine',
  heroStyle: HeroStyle = '1',
  footerStyle: FooterStyle = '1',
  contactStyle: ContactStyle = '1',
  hoursStyle: HoursStyle = '1',
  galleryStyle: GalleryStyle = '1',
  reviewsStyle: ReviewsStyle = '1',
  subheroStyle: SubheroStyle = '1',
  siteStyle: SiteStyle = '1',
  alignment: Alignment = 'left',
  aboutStyle: AboutStyle = '1',
  navStyle: NavStyle = '1',
): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const set = (k: string, v: string) => root.style.setProperty(k, v)

  // Colors
  set('--ap-primary', swatch.primary)
  set('--ap-accent', swatch.accent)
  set('--ap-surface', swatch.surface)
  set('--ap-surface-alt', swatch.surfaceAlt)
  set('--ap-ink', swatch.ink)
  set('--ap-ink-muted', swatch.inkMuted)
  set('--ap-line', swatch.line)
  // On-primary text (used inside primary buttons).
  set('--ap-on-primary', swatch.mode === 'dark' ? swatch.surface : swatch.surfaceAlt)

  // Bold-category swatches let color drive whole surfaces (broadsheet
  // heroes, tinted bands). Styles hook on [data-swatch-energy='bold'].
  root.setAttribute('data-swatch-energy', swatch.group === 'bold' ? 'bold' : 'standard')
  root.setAttribute('data-swatch-group', swatch.group)
  if (swatch.family) root.setAttribute('data-swatch-family', swatch.family)
  else root.removeAttribute('data-swatch-family')

  // Typography
  set('--ap-font-heading', theme.fontHeading)
  set('--ap-font-body', theme.fontBody)
  set('--ap-font-mono', theme.fontMono)
  set('--ap-type-scale', String(theme.typeScale))
  set('--ap-tracking-heading', theme.letterSpacingHeading)
  set('--ap-tracking-body', theme.letterSpacingBody)
  set('--ap-heading-transform', theme.uppercaseHeadings ? 'uppercase' : 'none')
  set('--ap-heading-weight', String(theme.headingWeight))

  // Shape & space
  set('--ap-radius', theme.radius)
  set('--ap-radius-lg', theme.radiusLg)
  set('--ap-shadow', theme.shadow)
  set('--ap-shadow-lg', theme.shadowLg)
  set('--ap-section-py', theme.sectionPaddingY)
  set('--ap-container', theme.containerMax)

  // Identifying attributes for scoped CSS overrides
  root.setAttribute('data-theme', theme.name)
  root.setAttribute('data-swatch', swatch.name)
  root.setAttribute('data-mode', swatch.mode)
  root.setAttribute('data-variant', variant)
  root.setAttribute('data-archetype', archetype)
  root.setAttribute('data-hero-style', heroStyle)
  root.setAttribute('data-footer-style', footerStyle)
  root.setAttribute('data-contact-style', contactStyle)
  root.setAttribute('data-hours-style', hoursStyle)
  root.setAttribute('data-gallery-style', galleryStyle)
  root.setAttribute('data-reviews-style', reviewsStyle)
  root.setAttribute('data-subhero-style', subheroStyle)
  root.setAttribute('data-site-style', siteStyle)
  root.setAttribute('data-about-style', aboutStyle)
  root.setAttribute('data-nav-style', navStyle)
  root.setAttribute('data-align', alignment)
  root.style.colorScheme = swatch.mode

  ensureFontLink(theme)
  updateFavicon(swatch, archetype)
}

/**
 * Regenerates the favicon from the active swatch so the tab icon always
 * matches the site: tile in the swatch's ink, form in its surface.
 * Replaces the static /icon.svg fallback from index.html once JS runs.
 */
function updateFavicon(swatch: ColorSwatch, archetype: Archetype): void {
  const svg = markSvg(ARCHETYPE_FORM[archetype], swatch.ink, swatch.surface)
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg)
}

const FONT_LINK_ID = 'ap-theme-fonts'

function ensureFontLink(theme: ThemeTokens): void {
  if (typeof document === 'undefined' || !theme.fontUrl) return
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== theme.fontUrl) link.href = theme.fontUrl
}
