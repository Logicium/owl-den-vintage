import type { ThemeTokens } from './tokens'

/**
 * The Heritage — modern editorial serif. Fraunces display (soft, high
 * contrast, quietly eccentric) over the readable Newsreader body.
 * Generous whitespace, hairline rules, italic accents. The register of
 * an independent magazine rather than a newspaper template.
 */
export const heritage: ThemeTokens = {
  name: 'heritage',
  label: 'The Heritage',
  description: 'Modern editorial serif. Fraunces display, Newsreader body, hairline rules.',
  fontHeading: '"Fraunces", "Playfair Display", Georgia, serif',
  fontBody: '"Newsreader", Georgia, "Times New Roman", serif',
  fontMono: '"IBM Plex Mono", ui-monospace, monospace',
  typeScale: 1.06,
  radius: '0px',
  radiusLg: '0px',
  shadow: 'none',
  shadowLg: 'none',
  letterSpacingHeading: '-0.02em',
  letterSpacingBody: '0.004em',
  uppercaseHeadings: false,
  sectionPaddingY: 'clamp(5rem, 11vw, 10rem)',
  containerMax: '1060px',
  headingWeight: 500,
  fontUrl:
    'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=IBM+Plex+Mono:wght@400;500&display=swap',
}
