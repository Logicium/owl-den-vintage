import type { ThemeName, ThemeTokens, StyleAxes } from './tokens'
import { BASE_STYLE_AXES } from './tokens'
import { atlas } from './atlas'
import { studio } from './studio'
import { heritage } from './heritage'
import { vibrant } from './vibrant'
import { ironwood } from './ironwood'

export const THEMES: Record<ThemeName, ThemeTokens> = {
  atlas,
  studio,
  heritage,
  vibrant,
  ironwood,
}

/**
 * Per-theme style-axis defaults. Style id '1' on every axis is each theme's
 * "Signature" layout, so most entries stay at '1'; an entry here lets a
 * theme point an axis at another layout without any site-data change.
 * Used only when a config carries no explicit value for that axis.
 */
export const THEME_STYLE_DEFAULTS: Record<ThemeName, Partial<StyleAxes>> = {
  atlas: {},
  studio: { navStyle: '2' },
  heritage: {},
  vibrant: {},
  ironwood: {},
}

export function themeStyleDefaults(name: ThemeName): StyleAxes {
  return { ...BASE_STYLE_AXES, ...(THEME_STYLE_DEFAULTS[name] ?? {}) }
}

/** Picker order: lead with the flagship. */
export const THEME_LIST: ThemeTokens[] = [atlas, studio, heritage, vibrant, ironwood]

export * from './tokens'
export * from './swatches'
export * from './customSwatches'
export * from './applyTheme'
