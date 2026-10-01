import type { ThemeName, ThemeTokens } from './tokens'
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

/** Picker order: lead with the flagship. */
export const THEME_LIST: ThemeTokens[] = [atlas, studio, heritage, vibrant, ironwood]

export * from './tokens'
export * from './swatches'
export * from './customSwatches'
export * from './applyTheme'
