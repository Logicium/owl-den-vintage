/**
 * Platform-level archetype mapping. Theme/token contracts live in
 * `src/themes/tokens.ts` (re-exported here so older imports keep working
 * and there is exactly one definition of each type).
 */

export type { ThemeName, HeroStyle, FooterStyle, ContactStyle, HoursStyle, GalleryStyle, ReviewsStyle, SubheroStyle, SiteStyle, Alignment, SwatchGroup, SwatchName, SiteVariant, Archetype } from './themes/tokens'
export { VARIANT_PHOTO_COUNT, VARIANT_RANK, variantAtLeast, resolveVariant, resolvePlanTier } from './themes/tokens'

import type { Archetype } from './themes/tokens'

/** Maps an `Archetype` to its template repo key. */
export type ArchetypeKey = 'mesa' | 'hearth' | 'vault' | 'marquee' | 'keystone'

export const ARCHETYPE_OF: Record<ArchetypeKey, Archetype> = {
  mesa: 'dine',
  hearth: 'stay',
  vault: 'shop',
  marquee: 'venue',
  keystone: 'utility',
}
