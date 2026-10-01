import type { ThemeTokens } from './tokens'

/**
 * The Atlas — the flagship. Swiss editorial index.
 *
 * Oversized Archivo display set tight, IBM Plex Mono ledger labels,
 * hairline grid frames that treat every section like a page of a survey
 * report. Zero radius, zero shadow: structure comes from rules, not
 * elevation. Dither-field texture accents give it a printed, plate-made
 * quality no template default ever has.
 */
export const atlas: ThemeTokens = {
  name: 'atlas',
  label: 'The Atlas',
  description: 'Editorial index. Oversized grotesque display, mono ledgers, hairline grids.',
  fontHeading: '"Archivo", "Inter Tight", "Helvetica Neue", Arial, sans-serif',
  fontBody: '"Archivo", "Inter", "Helvetica Neue", Arial, sans-serif',
  fontMono: '"IBM Plex Mono", ui-monospace, monospace',
  typeScale: 1.02,
  radius: '0px',
  radiusLg: '0px',
  shadow: 'none',
  shadowLg: 'none',
  letterSpacingHeading: '-0.03em',
  letterSpacingBody: '0.002em',
  uppercaseHeadings: false,
  sectionPaddingY: 'clamp(5rem, 10vw, 9rem)',
  containerMax: '1400px',
  headingWeight: 700,
  fontUrl:
    'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,300..800;1,62..125,400..700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
}
