import type { ThemeTokens } from './tokens'

/**
 * The Vibrant — playful and bold. Bricolage Grotesque display, chunky
 * shapes, hard offset shadows, oversized type. Refined pass: slightly
 * tighter radii and shadows so the energy reads art-directed, not
 * sticker-book.
 */
export const vibrant: ThemeTokens = {
  name: 'vibrant',
  label: 'The Vibrant',
  description: 'Playful and bold. Big shapes, hard shadows, energetic typography.',
  fontHeading: '"Bricolage Grotesque", "Space Grotesk", system-ui, sans-serif',
  fontBody: '"Space Grotesk", "Inter", system-ui, sans-serif',
  fontMono: '"Space Mono", ui-monospace, monospace',
  typeScale: 1.1,
  radius: '14px',
  radiusLg: '26px',
  shadow: '4px 4px 0 rgba(0, 0, 0, 0.92)',
  shadowLg: '8px 8px 0 rgba(0, 0, 0, 0.92)',
  letterSpacingHeading: '-0.025em',
  letterSpacingBody: '0',
  uppercaseHeadings: false,
  sectionPaddingY: 'clamp(4rem, 8vw, 7.5rem)',
  containerMax: '1320px',
  headingWeight: 700,
  fontUrl:
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap',
}
