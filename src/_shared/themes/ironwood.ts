import type { ThemeTokens } from './tokens'

/**
 * The Ironwood — industrial utility & heavy craftsmanship.
 * Built for auto shops, contractors, welders, and lumber mills.
 *
 * Aesthetic: structural discipline + raw grounded power. Towering
 * condensed display (Big Shoulders), engineered Barlow body, spec-sheet
 * JetBrains Mono. Zero radius. Hard, flat ink shadows on interactive
 * elements for tactile weight. Uppercase signage headings, dense grids.
 */
export const ironwood: ThemeTokens = {
  name: 'ironwood',
  label: 'The Ironwood',
  description: 'Industrial utility. Towering condensed display, hard grids, signage-grade contrast.',
  fontHeading: '"Big Shoulders Display", "Oswald", "Impact", "Helvetica Neue", Arial, sans-serif',
  fontBody: '"Barlow", "Roboto", "Helvetica Neue", Arial, sans-serif',
  fontMono: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
  typeScale: 1.05,
  radius: '0px',
  radiusLg: '0px',
  shadow: '0 0 0 1px rgba(15, 15, 15, 0.08)',
  shadowLg: '6px 6px 0 rgba(15, 15, 15, 0.92)',
  letterSpacingHeading: '0.01em',
  letterSpacingBody: '0.004em',
  uppercaseHeadings: true,
  sectionPaddingY: 'clamp(4rem, 8vw, 7rem)',
  containerMax: '1360px',
  headingWeight: 700,
  fontUrl:
    'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;600;700;800&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
}
