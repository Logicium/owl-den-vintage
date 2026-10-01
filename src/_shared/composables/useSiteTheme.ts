import { ref, computed, watchEffect } from 'vue'
import type { ThemeName, SwatchName, ThemeTokens, ColorSwatch, SiteVariant, Archetype, HeroStyle, FooterStyle, ContactStyle, HoursStyle, GalleryStyle, ReviewsStyle, SubheroStyle, SiteStyle, AboutStyle, NavStyle, Alignment } from '../themes/tokens'
import { resolveVariant } from '../themes/tokens'
import { THEMES } from '../themes'
import { SWATCHES, resolvePresetSwatch } from '../themes/swatches'
import { findCustomSwatch, customSwatches } from '../themes/customSwatches'
import { applyTheme } from '../themes/applyTheme'

const STORAGE_KEY = 'ap-theme-config'

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

function readStorage(): Partial<{
  theme: ThemeName; swatch: string; variant: SiteVariant;
  heroStyle: HeroStyle; footerStyle: FooterStyle;
  contactStyle: ContactStyle; hoursStyle: HoursStyle;
  galleryStyle: GalleryStyle; reviewsStyle: ReviewsStyle;
  subheroStyle: SubheroStyle;
  siteStyle: SiteStyle;
  aboutStyle: AboutStyle; navStyle: NavStyle;
  alignment: Alignment;
}> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    // Drop any non-string values: an older initFromConfig bug could persist
    // whole content objects into the style fields ("[object Object]" attrs).
    return Object.fromEntries(
      Object.entries(raw).filter(([, v]) => typeof v === 'string'),
    ) as ReturnType<typeof readStorage>
  } catch { return {} }
}

const _saved = readStorage()

const themeRef = ref<ThemeName>(resolveThemeName(_saved.theme))
const swatchRef = ref<string>(_saved.swatch ?? 'onyx-light')
const variantRef = ref<SiteVariant>(resolveVariant(_saved.variant))
const archetypeRef = ref<Archetype>('dine')
const heroStyleRef = ref<HeroStyle>(_saved.heroStyle ?? '1')
const footerStyleRef = ref<FooterStyle>(_saved.footerStyle ?? '1')
const contactStyleRef = ref<ContactStyle>(_saved.contactStyle ?? '1')
const hoursStyleRef = ref<HoursStyle>(_saved.hoursStyle ?? '1')
const galleryStyleRef = ref<GalleryStyle>(_saved.galleryStyle ?? '1')
const reviewsStyleRef = ref<ReviewsStyle>(_saved.reviewsStyle ?? '1')
const subheroStyleRef = ref<SubheroStyle>(_saved.subheroStyle ?? '1')
const siteStyleRef = ref<SiteStyle>(_saved.siteStyle ?? '1')
const aboutStyleRef = ref<AboutStyle>(_saved.aboutStyle ?? '1')
const navStyleRef = ref<NavStyle>(_saved.navStyle ?? '1')
const alignmentRef = ref<Alignment>(_saved.alignment ?? 'left')

// Module-level effect — single instance, persists + syncs CSS vars on every change
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
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
 * Call `init()` once at app boot from the site config; any
 * component can then call `setTheme()` / `setSwatch()` / `setVariant()`.
 * Settings are persisted to localStorage and restored on refresh.
 */
export function useSiteTheme() {
  const theme = computed<ThemeTokens>(() => THEMES[themeRef.value])
  const swatch = computed<ColorSwatch>(() => resolveSwatch(swatchRef.value))

  function setTheme(name: ThemeName) { themeRef.value = name }
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
  function init(
    name: ThemeName,
    swatchName: SwatchName,
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
  ) {
    // Archetype is always from site config, never from user storage
    archetypeRef.value = archetype
    // User-configurable fields: only apply init defaults when nothing is saved
    if (!_saved.theme) themeRef.value = resolveThemeName(name)
    if (!_saved.swatch) swatchRef.value = swatchName
    if (!_saved.variant) variantRef.value = resolveVariant(variant)
    if (!_saved.heroStyle) heroStyleRef.value = heroStyle
    if (!_saved.footerStyle) footerStyleRef.value = footerStyle
    if (!_saved.contactStyle) contactStyleRef.value = contactStyle
    if (!_saved.hoursStyle) hoursStyleRef.value = hoursStyle
    if (!_saved.galleryStyle) galleryStyleRef.value = galleryStyle
    if (!_saved.reviewsStyle) reviewsStyleRef.value = reviewsStyle
    if (!_saved.subheroStyle) subheroStyleRef.value = subheroStyle
    if (!_saved.siteStyle) siteStyleRef.value = siteStyle
    if (!_saved.aboutStyle) aboutStyleRef.value = aboutStyle
    if (!_saved.navStyle) navStyleRef.value = navStyle
    if (!_saved.alignment) alignmentRef.value = alignment
  }

  /**
   * Convenience initializer that reads every theme-switcher field from a
   * generic site-config object (with sane defaults) so templates don't have
   * to enumerate the growing positional argument list on every call.
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
      str<HeroStyle>(style.heroStyle) ?? str<HeroStyle>(c.heroStyle) ?? '1',
      str<FooterStyle>(style.footerStyle) ?? str<FooterStyle>(c.footerStyle) ?? '1',
      str<ContactStyle>(sections.contact) ?? '1',
      str<HoursStyle>(sections.hours) ?? '1',
      str<GalleryStyle>(sections.gallery) ?? '1',
      str<ReviewsStyle>(sections.reviews) ?? '1',
      str<SubheroStyle>(style.subheroStyle) ?? str<SubheroStyle>(c.subheroStyle) ?? '1',
      str<SiteStyle>(style.siteStyle) ?? str<SiteStyle>(c.siteStyle) ?? '1',
      str<Alignment>(style.alignment) ?? str<Alignment>(c.alignment) ?? 'left',
      str<AboutStyle>(sections.about) ?? '1',
      str<NavStyle>(style.navStyle) ?? '1',
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

