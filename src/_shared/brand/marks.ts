import type { Archetype } from '../themes/tokens'

/**
 * The Apotome brand-mark system. Each archetype is an ideal geometric form
 * sliced by the same diagonal — an abstract homage to the "//" in a URL.
 *
 * Colors are dynamic: the tile inherits the swatch's text color (--ap-ink)
 * and the form is cut from it in the swatch's surface color, so the mark
 * always sits in maximum contrast with the current theme. Usually that
 * means a dark tile; on dark swatches it inverts.
 */
export type BrandForm = 'grid' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'circle'

export const ARCHETYPE_FORM: Record<Archetype, BrandForm> = {
  project: 'grid',
  stay: 'triangle',
  dine: 'square',
  utility: 'pentagon',
  venue: 'hexagon',
  shop: 'circle',
}

/** The shared diagonal slice, in tile color, drawn over the form. */
const SLASH = (tile: string) => `<polygon points="92,210 112,210 164,46 144,46" fill="${tile}"/>`

const FORMS: Record<BrandForm, (mark: string) => string> = {
  grid: mark =>
    `<rect x="75" y="75" width="46" height="46" fill="${mark}"/>` +
    `<rect x="135" y="75" width="46" height="46" fill="${mark}"/>` +
    `<rect x="75" y="135" width="46" height="46" fill="${mark}"/>` +
    `<rect x="135" y="135" width="46" height="46" fill="${mark}"/>`,
  triangle: mark => `<polygon points="128,64 74,186 182,186" fill="${mark}"/>`,
  square: mark => `<rect x="75" y="75" width="106" height="106" fill="${mark}"/>`,
  pentagon: mark => `<polygon points="128,64 189,108 166,180 90,180 67,108" fill="${mark}"/>`,
  hexagon: mark => `<polygon points="128,64 183,96 183,160 128,192 73,160 73,96" fill="${mark}"/>`,
  circle: mark => `<circle cx="128" cy="128" r="62" fill="${mark}"/>`,
}

/**
 * Inner markup of the 256×256 icon: rounded tile, form, diagonal slice.
 * `tile` is the background (normally the swatch ink); `mark` is the form
 * (normally the swatch surface).
 */
export function markInner(form: BrandForm, tile: string, mark: string): string {
  return (
    `<rect width="256" height="256" rx="58" fill="${tile}"/>` +
    FORMS[form](mark) +
    SLASH(tile)
  )
}

/** Complete standalone SVG document for the icon (favicon use). */
export function markSvg(form: BrandForm, tile: string, mark: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">` +
    markInner(form, tile, mark) +
    `</svg>`
  )
}
