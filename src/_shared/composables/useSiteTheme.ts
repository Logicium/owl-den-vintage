import { ref, computed, watchEffect } from 'vue'
import type { ThemeName, SwatchName, ThemeTokens, ColorSwatch, SiteVariant, Archetype, HeroStyle, FooterStyle, ContactStyle, HoursStyle, GalleryStyle, ReviewsStyle, SubheroStyle, SiteStyle, AboutStyle, NavStyle, Alignment, StyleAxes } from '../themes/tokens'
import { resolveVariant } from '../themes/tokens'
import { THEMES, themeStyleDefaults } from '../themes'
import { SWATCHES, resolvePresetSwatch } from '../themes/swatches'
import { findCustomSwatch, customSwatches } from '../themes/customSwatches'
import { applyTheme } from '../themes/applyTheme'
import { DEMO_MODE } from '../platform/config'

const STORAGE_KEY = 'ap-theme-config'

/**
 * Bump when defaults change in a way every browser should pick up. Stored
 * payloads carrying an older (or no) version are discarded once, so the new
 * theme defaults actually show instead of the frozen copy every visitor's
 * first load left behind.
 */
const STORAGE_VERSION = 2

/**
 * Swatch names may be current presets, legacy preset names from older
 * published configs, or user-built `custom-*` palettes.
 */
function resolveSwatch(name: string): ColorSwatch {
  return resolvePresetSwatch(name) ?? findCustomSwatch(name) ?? SWATCHES['onyx-light']
}

/** Theme names from older configs that no longer exist fall back safely. */
function resolveThemeName(name: string | undefined): ThemeName {
  return name && name in THEMES ? (name as ThemeName) : 'atlas'
}

type Saved = Partial<{
  theme: ThemeName; swatch: string; variant: SiteVariant;
} & StyleAxes>

function readStorage(): Saved {
  // Real (platform) sites render what the owner published; the playground
  // lives in demo builds only. Without this, the first visit froze every
  // axis in localStorage and later published changes never showed.
  if (!DEMO_MODE) return {}
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    if (raw.v !== STORAGE_VERSION) return {}
    // Drop any non-string values: an older initFromConfig bug could persist
    // whole content objects into the style fields ("[object Object]" attrs).
    return Object.fromEntries(
      Object.entries(raw).filter(([k, v]) => k !== 'v' && typeof v === 'string'),
    ) as Saved
  } catch { return {} }
}

/**
 * Demo builds accept `?theme=studio&swatch=onyx-dark&variant=portfolio&hero=2`
 * (plus nav/footer/about/contact/hours/gallery/reviews/subhero/site/align)
 * so a link can open any look directly. Used by the screenshot rig and the
 * marketing site. Ignored on real sites.
 */
const URL_KEYS: Record<string, keyof Saved> = {
  theme: 'theme', swatch: 'swatch', variant: 'variant',
  hero: 'heroStyle', footer: 'footerStyle', contact: 'contactStyle', hours: 'hoursStyle',
  gallery: 'galleryStyle', reviews: 'reviewsStyle', subhero: 'subheroStyle', site: 'siteStyle',
  about: 'aboutStyle', nav: 'navStyle', align: 'alignment',
}
function readUrl(): Saved {
  if (!DEMO_MODE || typeof window === 'undefined') return {}
  try {
    const q = new URLSearchParams(window.location.search)
    const out: Record<string, string> = {}
    for (const [k, field] of Object.entries(URL_KEYS)) {
      const v = q.get(k)
      if (v) out[field] = v
    }
    return out as Saved
  } catch { return {} }
}

const _url = readUrl()
const _saved: Saved = { ...readStorage(), ..._url }
/** Explicit picks from the URL win over everything, including published config. */
const _forced = new Set(Object.keys(_url))

const themeRef = ref<ThemeName>(resolveThemeName(_saved.theme))
const swatchRef = ref<string>(_saved.swatch ?? 'onyx-light')
const variantRef = ref<SiteVariant>(resolveVariant(_saved.variant))
const archetypeRef = ref<Archetype>('dine')
const d0 = themeStyleDefaults(themeRef.value)
const heroStyleRef = ref<HeroStyle>(_saved.heroStyle ?? d0.heroStyle)
const footerStyleRef = ref<FooterStyle>(_saved.footerStyle ?? d0.footerStyle)
const contactStyleRef = ref<ContactStyle>(_saved.contactStyle ?? d0.contactStyle)
const hoursStyleRef = ref<HoursStyle>(_saved.hoursStyle ?? d0.hoursStyle)
const galleryStyleRef = ref<GalleryStyle>(_saved.galleryStyle ?? d0.galleryStyle)
const reviewsStyleRef = ref<ReviewsStyle>(_saved.reviewsStyle ?? d0.reviewsStyle)
const subheroStyleRef = ref<SubheroStyle>(_saved.subheroStyle ?? d0.subheroStyle)
const siteStyleRef = ref<SiteStyle>(_saved.siteStyle ?? d0.siteStyle)
const aboutStyleRef = ref<AboutStyle>(_saved.aboutStyle ?? d0.aboutStyle)
const navStyleRef = ref<NavStyle>(_saved.navStyle ?? d0.navStyle)
const alignmentRef = ref<Alignment>(_saved.alignment ?? d0.alignment)

const AXIS_REFS = {
  heroStyle: heroStyleRef, footerStyle: footerStyleRef, contactStyle: contactStyleRef,
  hoursStyle: hoursStyleRef, galleryStyle: galleryStyleRef, reviewsStyle: reviewsStyleRef,
  subheroStyle: subheroStyleRef, siteStyle: siteStyleRef, aboutStyle: aboutStyleRef,
  navStyle: navStyleRef, alignment: alignmentRef,
} as const

// Module-level effect: single instance, persists + syncs CSS vars on every change
watchEffect(() => {
  // Touch the custom-swatch list so edits to a live custom palette re-apply.
  void customSwatches.value
  applyTheme(
    THEMES[themeRef.value],
    resolveSwatch(swatchRef.value),
    variantRef.value,
    archetypeRef.value,
    heroStyleRef.value,
    footerStyleRef.value,
    contactStyleRef.value,
    hoursStyleRef.value,
    galleryStyleRef.value,
    reviewsStyleRef.value,
    subheroStyleRef.value,
    siteStyleRef.value,
    alignmentRef.value,
    aboutStyleRef.value,
    navStyleRef.value,
  )
  if (!DEMO_MODE) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      v: STORAGE_VERSION,
      theme: themeRef.value,
      swatch: swatchRef.value,
      variant: variantRef.value,
      heroStyle: heroStyleRef.value,
      footerStyle: footerStyleRef.value,
      contactStyle: contactStyleRef.value,
      hoursStyle: hoursStyleRef.value,
      galleryStyle: galleryStyleRef.value,
      reviewsStyle: reviewsStyleRef.value,
      subheroStyle: subheroStyleRef.value,
      siteStyle: siteStyleRef.value,
      aboutStyle: aboutStyleRef.value,
      navStyle: navStyleRef.value,
      alignment: alignmentRef.value,
    }))
  } catch { /* storage unavailable */ }
})

/**
 * Reactive theme + swatch + variant + archetype controller.
 * Call `init()` / `initFromConfig()` once at app boot from the site config;
 * any component can then call `setTheme()` / `setSwatch()` / `setVariant()`.
 * In demo builds the settings persist to localStorage; on real sites the
 * published config is the source of truth on every load.
 */
export function useSiteTheme() {
  const theme = computed<ThemeTokens>(() => THEMES[themeRef.value])
  const swatch = computed<ColorSwatch>(() => resolveSwatch(swatchRef.value))

  /**
   * Switching theme carries untouched axes along: any axis still sitting on
   * the OLD theme's default moves to the NEW theme's default, so the picker
   * always lands on that theme's signature look. Explicit picks stay.
   */
  function setTheme(name: ThemeName) {
    const from = themeStyleDefaults(themeRef.value)
    const to = themeStyleDefaults(name)
    for (const k of Object.keys(AXIS_REFS) as (keyof typeof AXIS_REFS)[]) {
      const r = AXIS_REFS[k] as { value: string }
      if (r.value === from[k] && from[k] !== to[k]) r.value = to[k]
    }
    themeRef.value = name
  }
  function setSwatch(name: string) { swatchRef.value = name }
  function setVariant(v: SiteVariant) { variantRef.value = resolveVariant(v) }
  function setArchetype(a: Archetype) { archetypeRef.value = a }
  function setHeroStyle(s: HeroStyle) { heroStyleRef.value = s }
  function setFooterStyle(s: FooterStyle) { footerStyleRef.value = s }
  function setContactStyle(s: ContactStyle) { contactStyleRef.value = s }
  function setHoursStyle(s: HoursStyle) { hoursStyleRef.value = s }
  function setGalleryStyle(s: GalleryStyle) { galleryStyleRef.value = s }
  function setReviewsStyle(s: ReviewsStyle) { reviewsStyleRef.value = s }
  function setSubheroStyle(s: SubheroStyle) { subheroStyleRef.value = s }
  function setSiteStyle(s: SiteStyle) { siteStyleRef.value = s }
  function setAlignment(a: Alignment) { alignmentRef.value = a }
  function setAboutStyle(s2: AboutStyle) { aboutStyleRef.value = s2 }
  function setNavStyle(s2: NavStyle) { navStyleRef.value = s2 }

  /**
   * Apply the site's configured look. Style axes left `undefined` resolve
   * to the theme's defaults (see THEME_STYLE_DEFAULTS). Saved demo state
   * and URL overrides win over config, in that order.
   */
  function init(
    name: ThemeName,
    swatchName: SwatchName | string,
    variant: SiteVariant = 'essentials',
    archetype: Archetype = 'dine',
    heroStyle?: HeroStyle,
    footerStyle?: FooterStyle,
    contactStyle?: ContactStyle,
    hoursStyle?: HoursStyle,
    galleryStyle?: GalleryStyle,
    reviewsStyle?: ReviewsStyle,
    subheroStyle?: SubheroStyle,
    siteStyle?: SiteStyle,
    alignment?: Alignment,
    aboutStyle?: AboutStyle,
    navStyle?: NavStyle,
  ) {
    // Archetype is always from site config, never from user storage
    archetypeRef.value = archetype
    const themeName = resolveThemeName(name)
    if (!_saved.theme) themeRef.value = themeName
    if (!_saved.swatch) swatchRef.value = swatchName
    if (!_saved.variant) variantRef.value = resolveVariant(variant)
    const d = themeStyleDefaults(themeRef.value)
    const given: Partial<StyleAxes> = {
      heroStyle, footerStyle, contactStyle, hoursStyle, galleryStyle, reviewsStyle,
      subheroStyle, siteStyle, alignment, aboutStyle, navStyle,
    }
    for (const k of Object.keys(AXIS_REFS) as (keyof typeof AXIS_REFS)[]) {
      if (_saved[k]) continue
      const r = AXIS_REFS[k] as { value: string }
      r.value = (given[k] as string | undefined) ?? d[k]
    }
  }

  /**
   * Reads every theme-switcher field from a generic site-config object so
   * templates don't have to enumerate the growing positional argument list.
   * Picks up `style`-nested fields published by the live ThemeSwitcher.
   */
  function initFromConfig(cfg: unknown, archetype: Archetype = 'dine'): void {
    const c = (cfg ?? {}) as Record<string, unknown>
    const style = (c.style ?? {}) as Record<string, unknown>
    // Style-variant ids are always short strings ('1'..'6'). Site configs
    // also carry a CONTENT-level `sections` object (eyebrows/titles); only
    // read a value as a style when it actually is a string, or the section
    // style attributes end up as "[object Object]" and every layout variant
    // stays display:none.
    const sections = (style.sections ?? c.sections ?? {}) as Record<string, unknown>
    const str = <T extends string>(v: unknown): T | undefined =>
      typeof v === 'string' ? (v as T) : undefined
    init(
      resolveThemeName(str(c.theme)),
      str<SwatchName>(c.swatch) ?? 'onyx-light',
      str<SiteVariant>(c.variant) ?? 'essentials',
      archetype,
      str<HeroStyle>(style.heroStyle) ?? str<HeroStyle>(c.heroStyle),
      str<FooterStyle>(style.footerStyle) ?? str<FooterStyle>(c.footerStyle),
      str<ContactStyle>(sections.contact),
      str<HoursStyle>(sections.hours),
      str<GalleryStyle>(sections.gallery),
      str<ReviewsStyle>(sections.reviews),
      str<SubheroStyle>(style.subheroStyle) ?? str<SubheroStyle>(c.subheroStyle),
      str<SiteStyle>(style.siteStyle) ?? str<SiteStyle>(c.siteStyle),
      str<Alignment>(style.alignment) ?? str<Alignment>(c.alignment),
      str<AboutStyle>(sections.about),
      str<NavStyle>(style.navStyle),
    )
  }

  return {
    theme, swatch,
    themeName: themeRef, swatchName: swatchRef,
    variant: variantRef, archetype: archetypeRef,
    heroStyle: heroStyleRef, footerStyle: footerStyleRef,
    contactStyle: contactStyleRef, hoursStyle: hoursStyleRef,
    galleryStyle: galleryStyleRef, reviewsStyle: reviewsStyleRef,
    subheroStyle: subheroStyleRef,
    siteStyle: siteStyleRef,
    aboutStyle: aboutStyleRef, navStyle: navStyleRef,
    alignment: alignmentRef,
    /** Axes pinned by the URL (demo only); the picker may want to show them as locked. */
    forced: _forced,
    setTheme, setSwatch, setVariant, setArchetype,
    setHeroStyle, setFooterStyle,
    setContactStyle, setHoursStyle, setGalleryStyle, setReviewsStyle, setSubheroStyle,
    setSiteStyle,
    setAboutStyle, setNavStyle,
    setAlignment,
    init,
    initFromConfig,
  }
}
