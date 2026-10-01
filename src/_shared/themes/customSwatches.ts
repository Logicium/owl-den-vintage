import { ref } from 'vue'
import type { ColorSwatch } from './tokens'

/**
 * User-built palettes ("My palettes" in the Color Lab).
 *
 * A custom swatch is a full ColorSwatch derived from three author choices —
 * base hue, harmony model, light/dark mode — using the same rules the
 * curated theory presets follow: tinted surface, readable ink ramp,
 * hairline drawn from the surface hue. Saved to localStorage so they
 * survive reloads and appear alongside the presets in every picker.
 */

export type HarmonyModel = 'complementary' | 'analogous' | 'triadic' | 'split' | 'mono'

export const HARMONY_MODELS: Array<{ id: HarmonyModel; label: string; blurb: string }> = [
  { id: 'complementary', label: 'Complementary', blurb: 'Opposites on the wheel. Maximum contrast, bold energy' },
  { id: 'analogous', label: 'Analogous', blurb: 'Neighbors on the wheel. Harmonious, easy on the eye' },
  { id: 'triadic', label: 'Triadic', blurb: 'Three evenly spaced hues. Vibrant but balanced' },
  { id: 'split', label: 'Split-complement', blurb: 'A hue plus the two beside its opposite. Softened contrast' },
  { id: 'mono', label: 'Monochrome', blurb: 'One hue, many depths. Quiet and sophisticated' },
]

/* ── Color math (hex ↔ HSL) ────────────────────────────────── */

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s, l }
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360 / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  const to255 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${to255(channel(hue + 1 / 3))}${to255(channel(hue))}${to255(channel(hue - 1 / 3))}`.toUpperCase()
}

/* ── Palette derivation ────────────────────────────────────── */

/** Accent hue offset per harmony model, relative to the base hue. */
function accentHue(h: number, harmony: HarmonyModel): number {
  switch (harmony) {
    case 'complementary': return h + 180
    case 'analogous': return h + 35
    case 'triadic': return h + 120
    case 'split': return h + 150
    case 'mono': return h
  }
}

/**
 * Builds a complete, readable swatch from a base hue + harmony + mode.
 * The surface always carries the base hue as a tint so the background
 * belongs to the palette (the rule every curated preset follows).
 */
export function buildPalette(baseHue: number, harmony: HarmonyModel, mode: 'light' | 'dark'): Pick<ColorSwatch, 'primary' | 'accent' | 'surface' | 'surfaceAlt' | 'ink' | 'inkMuted' | 'line'> {
  const h = ((baseHue % 360) + 360) % 360
  const ah = accentHue(h, harmony)
  if (mode === 'light') {
    return {
      primary: hslToHex(h, harmony === 'mono' ? 0.50 : 0.74, 0.36),
      accent: hslToHex(ah, harmony === 'mono' ? 0.34 : 0.80, harmony === 'mono' ? 0.55 : 0.54),
      surface: hslToHex(h, 0.42, 0.925),
      surfaceAlt: hslToHex(h, 0.48, 0.975),
      ink: hslToHex(h, 0.32, 0.09),
      inkMuted: hslToHex(h, 0.16, 0.34),
      line: hslToHex(h, 0.34, 0.83),
    }
  }
  return {
    primary: hslToHex(h, 0.84, 0.68),
    accent: hslToHex(ah, 0.78, 0.60),
    surface: hslToHex(h, 0.44, 0.065),
    surfaceAlt: hslToHex(h, 0.38, 0.12),
    ink: hslToHex(h, 0.48, 0.95),
    inkMuted: hslToHex(h, 0.18, 0.62),
    line: hslToHex(h, 0.36, 0.21),
  }
}

/* ── Persistence ───────────────────────────────────────────── */

const STORAGE_KEY = 'ap-custom-swatches-v1'

function read(): ColorSwatch[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter(s => s && typeof s.name === 'string' && s.primary) : []
  } catch { return [] }
}

/** Reactive list of saved custom swatches — module-level singleton. */
export const customSwatches = ref<ColorSwatch[]>(typeof localStorage === 'undefined' ? [] : read())

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(customSwatches.value)) } catch { /* storage unavailable */ }
}

export function slugifyPaletteName(label: string): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'palette'
  return `custom-${base}`
}

export function saveCustomSwatch(swatch: ColorSwatch): ColorSwatch {
  const existing = customSwatches.value.findIndex(s => s.name === swatch.name)
  if (existing >= 0) customSwatches.value.splice(existing, 1, swatch)
  else customSwatches.value.push(swatch)
  persist()
  return swatch
}

export function deleteCustomSwatch(name: string): void {
  customSwatches.value = customSwatches.value.filter(s => s.name !== name)
  persist()
}

export function findCustomSwatch(name: string): ColorSwatch | undefined {
  return customSwatches.value.find(s => s.name === name)
}
