import type { ThemeTokens } from './tokens'

/**
 * The Studio — precision modern. Inter Tight display cut close, mono
 * metadata, hairline rules, no decoration that isn't structural.
 * Sharper than before: zero radius, tighter tracking, cooler restraint.
 */
export const studio: ThemeTokens = {
  name: 'studio',
  label: 'The Studio',
  description: 'Precision modern. Tight grotesque display, monospaced metadata, hairline rules.',
  fontHeading: '"Inter Tight", "Inter", "Helvetica Neue", Arial, sans-serif',
  fontBody: '"Inter", "Helvetica Neue", Arial, sans-serif',
  fontMono: '"IBM Plex Mono", ui-monospace, monospace',
  typeScale: 1,
  radius: '0px',
  radiusLg: '2px',
  shadow: 'none',
  shadowLg: '0 32px 64px -40px rgba(15, 23, 42, 0.28)',
  letterSpacingHeading: '-0.035em',
  letterSpacingBody: '0',
  uppercaseHeadings: false,
  sectionPaddingY: 'clamp(4.5rem, 9vw, 8.5rem)',
  containerMax: '1360px',
  headingWeight: 500,
  fontAccent: '"Instrument Serif", "Times New Roman", serif',
  motion: { smooth: true, ease: 'cubic-bezier(0.16, 1, 0.3, 1)', dur: 900, reveal: 'mask' },
  fontUrl:
    'https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300..700;1,300..700&family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap',
}
