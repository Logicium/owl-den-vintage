<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ChevronDown, Settings, Check, CornerDownRight, AlignLeft, AlignCenter, Palette, SwatchBook, LayoutTemplate, LayoutGrid, User, Save, Loader2, AlertCircle, Trash2, Plus, Pencil, CornerRightDown, ImagePlus, Move, Maximize2, Minimize2, X, Sun, Moon, Lock, Sparkles } from 'lucide-vue-next'
import { useSiteTheme } from '../composables/useSiteTheme'
import { useSectionFlash } from '../composables/useSectionFlash'
import { useContentEditor } from '../composables/useContentEditor'
import { usePreferences } from '../composables/usePreferences'
import { useAdminAuthStore } from '../platform/adminAuthStore'
import { useSiteContentStore } from '../platform/siteContentStore'
import { THEME_LIST } from '../themes'
import { SWATCH_FAMILIES, resolvePresetSwatch, type SwatchFamilyCard } from '../themes/swatches'
import { SWATCH_THEORIES } from '../themes/tokens'
import type { ColorSwatch } from '../themes/tokens'
import {
  customSwatches, saveCustomSwatch, deleteCustomSwatch,
  buildPalette, hexToHsl, slugifyPaletteName,
  HARMONY_MODELS, type HarmonyModel,
} from '../themes/customSwatches'

const auth = useAdminAuthStore()
const content = useSiteContentStore()
const { state: prefs, setThemeAutosave } = usePreferences()

// The Color Studio groups palette families by category. Each family ships
// a light and a dark version; the studio-level mode toggle decides which
// one the cards preview and apply.
const theoryGroups = computed(() => {
  return SWATCH_THEORIES
    .map(t => ({ ...t, items: SWATCH_FAMILIES.filter(f => f.group === t.id) }))
    .filter(g => g.items.length > 0)
})

const {
  themeName, swatchName, variant,
  heroStyle, footerStyle,
  contactStyle, hoursStyle, galleryStyle, reviewsStyle, subheroStyle,
  siteStyle, aboutStyle, navStyle,
  alignment,
  setTheme, setSwatch, setVariant,
  setHeroStyle, setFooterStyle,
  setContactStyle, setHoursStyle, setGalleryStyle, setReviewsStyle, setSubheroStyle,
  setSiteStyle, setAboutStyle, setNavStyle,
  setAlignment,
} = useSiteTheme()

const VARIANTS = ['essentials', 'portfolio'] as const
const VARIANT_LABELS: Record<string, string> = { essentials: 'Essentials', portfolio: 'Portfolio' }
/** Portfolio is a paid size. Locked chips route to the upgrade note. */
const portfolioUnlocked = computed(() => content.portfolioUnlocked)
const upgradeOpen = ref(false)
function pickVariant(v: (typeof VARIANTS)[number]) {
  if (v === 'portfolio' && !portfolioUnlocked.value) {
    upgradeOpen.value = true
    return
  }
  upgradeOpen.value = false
  setVariant(v)
}
const HERO_STYLES = ['1', '2', '3', '4', '5', '6'] as const
const HERO_STYLE_LABELS: Record<string, string> = { '1': 'Default', '2': 'Overlay', '3': 'Broadsheet', '4': 'Split', '5': 'Marquee', '6': 'Float' }
const FOOTER_STYLES = ['1', '2', '3', '4', '5'] as const
const FOOTER_STYLE_LABELS: Record<string, string> = { '1': 'Classic', '2': 'Editorial', '3': 'Billboard', '4': 'Minimal', '5': 'Dark Stage' }
const CONTACT_STYLES = ['1', '2', '3', '4', '5'] as const
const CONTACT_STYLE_LABELS: Record<string, string> = { '1': 'Studio Split', '2': 'Atlas Card', '3': 'Marquee', '4': 'Atlas Wide', '5': 'Brutalist' }
const HOURS_STYLES = ['1', '2', '3', '4', '5'] as const
const HOURS_STYLE_LABELS: Record<string, string> = { '1': 'Ledger', '2': 'Marquee', '3': 'Pillar', '4': 'Tiles', '5': 'Ribbon' }
const GALLERY_STYLES = ['1', '2', '3', '4', '5'] as const
const GALLERY_STYLE_LABELS: Record<string, string> = { '1': 'Default', '2': 'Mosaic', '3': 'Marquee', '4': 'Strip', '5': 'Polaroid' }
const REVIEWS_STYLES = ['1', '2', '3', '4', '5'] as const
const REVIEWS_STYLE_LABELS: Record<string, string> = { '1': 'Default', '2': 'Spotlight', '3': 'Carousel', '4': 'Wall', '5': 'Ticker' }
const SUBHERO_STYLES = ['1', '2', '3', '4', '5'] as const
const SUBHERO_STYLE_LABELS: Record<string, string> = { '1': 'Compact', '2': 'Banner', '3': 'Centered', '4': 'Broadsheet', '5': 'Split' }
const ABOUT_STYLES = ['1', '2', '3', '4'] as const
const ABOUT_STYLE_LABELS: Record<string, string> = { '1': 'Classic', '2': 'Editorial', '3': 'Ledger', '4': 'Poster' }
const NAV_STYLES = ['1', '2', '3', '4'] as const
const NAV_STYLE_LABELS: Record<string, string> = { '1': 'Classic', '2': 'Editorial', '3': 'Command', '4': 'Pill' }
const SITE_STYLES = ['1', '2', '3'] as const
// project = wizard: Site style
const SITE_STYLE_LABEL = 'Site style'
const SITE_STYLE_LABELS: Record<string, string> = { '1': 'Default', '2': 'Alt', '3': 'Bold' }

type Tab = 'edit' | 'theme' | 'color' | 'style' | 'sections'
const TAB_STORAGE_KEY = 'ap-switcher-tab'
function readTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY)
    if (v === 'edit' || v === 'theme' || v === 'color' || v === 'style' || v === 'sections') return v
  } catch { /* storage unavailable */ }
  return 'theme'
}

// ── Live content editor (in-situ + generated form) ──
const editor = useContentEditor()
// Re-bind the in-situ elements after navigating to a new page while editing.
const route = useRoute()
watch(() => route.fullPath, () => editor.rescan())
const tab = ref<Tab>(readTab())
watch(tab, (v) => { try { localStorage.setItem(TAB_STORAGE_KEY, v) } catch { /* */ } })
// ── Window management: docked / floating / fullscreen, persisted ──────────
const WIN_KEY = 'ap-switcher-win-v1'
interface WinState { open: boolean; detached: boolean; fullscreen: boolean; winPos: { x: number; y: number }; winSize: { w: number; h: number } }
function loadWin(): Partial<WinState> {
  try { const raw = localStorage.getItem(WIN_KEY); if (raw) return JSON.parse(raw) as WinState } catch { /* */ }
  return {}
}
const _w = loadWin()
const BAR = { w: 236, h: 58 }        // the floating minimized bar

const rootEl = ref<HTMLElement | null>(null)
const open = ref(_w.open ?? false)
const detached = ref(_w.detached ?? false)
const fullscreen = ref(_w.fullscreen ?? false)
const dragging = ref(false)          // suppresses the morph transition while dragging/resizing
const winPos = ref(_w.winPos ?? { x: 0, y: 0 })
const winSize = ref(_w.winSize?.w ? _w.winSize : { w: 400, h: 560 })

function toggle() {
  open.value = !open.value
  // A floating bar parked near a screen edge would open with its panel
  // partly offscreen — nudge the window so the expanded size stays visible.
  if (open.value && detached.value && !fullscreen.value) {
    const w = winSize.value.w || 400
    const h = winSize.value.h || 560
    winPos.value = {
      x: Math.min(Math.max(8, winPos.value.x), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(8, winPos.value.y), Math.max(8, window.innerHeight - h - 8)),
    }
  }
}

// Persist the full window state so a reload restores the picker exactly.
watch([open, detached, fullscreen, winPos, winSize], () => {
  try {
    localStorage.setItem(WIN_KEY, JSON.stringify({
      open: open.value, detached: detached.value, fullscreen: fullscreen.value,
      winPos: winPos.value, winSize: winSize.value,
    }))
  } catch { /* */ }
}, { deep: true })

function fixedBox(left: string, top: string, w: string, h: string): Record<string, string> {
  return { position: 'fixed', left, top, width: w, minWidth: w, maxWidth: w, height: h, minHeight: h, maxHeight: h }
}
const winStyle = computed<Record<string, string>>(() => {
  // We pin width/height AND min/max on both axes: the base rule
  // `width: var(--ap-switcher-pill-w)` otherwise wins and collapses the panel.
  if (fullscreen.value) return fixedBox('0px', '0px', '100vw', '100dvh')
  if (detached.value) {
    const w = open.value ? winSize.value.w : (pillWidth.value || BAR.w)
    const h = open.value ? winSize.value.h : BAR.h
    return fixedBox(`${winPos.value.x}px`, `${winPos.value.y}px`, `${w}px`, `${h}px`)
  }
  return { '--ap-switcher-h': `${panelHeight.value}px`, '--ap-switcher-pill-w': `${pillWidth.value}px` }
})

function detach() {
  // Float the window near where the docked panel sits (bottom-right) at a
  // comfortable working size. (The docked rect can be the collapsed pill, so we
  // use sensible defaults rather than inheriting a tiny width/height.)
  const w = Math.round(Math.min(window.innerWidth - 24, winSize.value.w || 400))
  const h = Math.round(Math.min(window.innerHeight * 0.74, winSize.value.h || 560))
  winSize.value = { w, h }
  winPos.value = {
    x: Math.max(12, window.innerWidth - w - 20),
    y: Math.max(12, window.innerHeight - h - 16),
  }
  detached.value = true; fullscreen.value = false; open.value = true
}
/** Return a floating/fullscreen window to the docked corner pill. */
function dock() { detached.value = false; fullscreen.value = false; open.value = false }
/** Collapse in place: floating window → its own floating bar; docked → pill;
 *  fullscreen → back to the floating window. */
function minimize() {
  if (fullscreen.value) { fullscreen.value = false; return }
  open.value = false
}
function toggleFullscreen() {
  if (!fullscreen.value && !detached.value) detach() // dock → float → fill reads as one motion
  fullscreen.value = !fullscreen.value
  if (fullscreen.value) open.value = true
}
// On mount, keep a restored floating window on-screen if the viewport changed.
onMounted(() => {
  if (detached.value && !fullscreen.value) {
    winPos.value = {
      x: Math.min(Math.max(0, winPos.value.x), Math.max(0, window.innerWidth - 60)),
      y: Math.min(Math.max(0, winPos.value.y), Math.max(0, window.innerHeight - 44)),
    }
  }
})
function clampPos(x: number, y: number) {
  return { x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - 60)), y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - 40)) }
}
function startDrag(e: PointerEvent) {
  if (!detached.value || fullscreen.value) return
  dragging.value = true
  const sx = e.clientX, sy = e.clientY, ox = winPos.value.x, oy = winPos.value.y
  const move = (ev: PointerEvent) => { winPos.value = clampPos(ox + ev.clientX - sx, oy + ev.clientY - sy) }
  const up = () => { dragging.value = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
}
function startResize(e: PointerEvent) {
  if (!detached.value || fullscreen.value) return
  e.preventDefault(); e.stopPropagation()
  dragging.value = true
  const sx = e.clientX, sy = e.clientY, ow = winSize.value.w, oh = winSize.value.h
  const move = (ev: PointerEvent) => {
    winSize.value = {
      w: Math.min(Math.max(300, ow + ev.clientX - sx), window.innerWidth - 20),
      h: Math.min(Math.max(280, oh + ev.clientY - sy), window.innerHeight - 20),
    }
  }
  const up = () => { dragging.value = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
}
// The floating minimized bar is draggable too; distinguish a drag from a click
// so a plain click still expands it.
let barJustDragged = false
function startBarDrag(e: PointerEvent) {
  if (!detached.value || open.value || fullscreen.value) return
  const sx = e.clientX, sy = e.clientY, ox = winPos.value.x, oy = winPos.value.y
  let moved = false
  const move = (ev: PointerEvent) => {
    if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return
    moved = true; dragging.value = true
    winPos.value = clampPos(ox + ev.clientX - sx, oy + ev.clientY - sy)
  }
  const up = () => {
    dragging.value = false; barJustDragged = moved
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
}
function onPillClick() {
  if (barJustDragged) { barJustDragged = false; return } // it was a drag, keep it collapsed
  toggle()
}

/* ── Section-flash registry ──
   Each setting's eyebrow label is clickable; clicking scrolls to the element
   it controls and flashes inverted colors. If the element doesn't exist on
   the current page, navigate to a fallback route and try again.

   Selectors include per-template aliases (marquee's hero, project's
   campaign gallery, the testimonials root). Routes are CANDIDATES: each
   template mounts a different subset (/contact vs /visit vs /book), so we
   resolve the first candidate that actually exists in this app's router. */
const { goto } = useSectionFlash()
const router = useRouter()
const sectionTargets = {
  hero:      { selectors: ['.ap-hero', '.ap-marquee-hero'],       routes: ['/'] },
  subhero:   { selectors: ['.ap-subhero'],                        routes: ['/contact', '/visit', '/book'] },
  footer:    { selectors: ['.ap-footer'],                         routes: ['/'] },
  site:      { selectors: ['.wiz', '.ap-section'],                routes: ['/wizard', '/'] },
  contact:   { selectors: ['.ap-contact'],                        routes: ['/contact', '/visit', '/book'] },
  hours:     { selectors: ['.ap-hours'],                          routes: ['/contact', '/visit', '/book'] },
  gallery:   { selectors: ['.ap-gallery', '.camp'],               routes: ['/', '/gallery'] },
  reviews:   { selectors: ['.ap-reviews', '.ap-testimonials'],    routes: ['/'] },
  about:     { selectors: ['.ap-about'],                          routes: ['/'] },
  header:    { selectors: ['.ap-header'],                         routes: ['/'] },
} as const
function jumpTo(key: keyof typeof sectionTargets) {
  const t = sectionTargets[key]
  const known = new Set(router.getRoutes().map(r => r.path))
  const route = t.routes.find(r => known.has(r))
  goto({ selectors: [...t.selectors], route })
}

/* ── Config export (mirrors the original archetype-project switcher) ── */
const currentSwatch = computed(() =>
  resolvePresetSwatch(swatchName.value) ?? customSwatches.value.find(s => s.name === swatchName.value))

/* ── Collapsed pill copy: human names, not ids. Title is the theme,
   the meta line is the palette + register. Internals (variant, alignment)
   stay inside the panel where they belong. */
const pillTitle = computed(() =>
  THEME_LIST.find(t => t.name === themeName.value)?.label ?? themeName.value)
const pillMeta = computed(() => {
  const s = currentSwatch.value
  return s ? `${s.label} · ${s.mode === 'dark' ? 'Dark' : 'Light'}` : swatchName.value
})
const pillCoinStyle = computed(() => {
  const s = currentSwatch.value
  return s ? { background: `linear-gradient(135deg, ${s.primary} 0 52%, ${s.accent} 52% 100%)` } : {}
})

/* ── Studio mode toggle: every preset family has a light + dark version.
   The toggle previews and applies the matching side; picking a family
   applies `<family>-<mode>`. */
const pickerMode = ref<'light' | 'dark'>(currentSwatch.value?.mode ?? 'light')
watch(swatchName, () => {
  const m = currentSwatch.value?.mode
  if (m) pickerMode.value = m
})
const currentFamily = computed(() => currentSwatch.value?.family ?? null)
function familySwatch(f: SwatchFamilyCard): ColorSwatch {
  return pickerMode.value === 'dark' ? f.dark : f.light
}
function pickFamily(f: SwatchFamilyCard) {
  setSwatch(familySwatch(f).name)
}
function setPickerMode(m: 'light' | 'dark') {
  pickerMode.value = m
  // Keep the live site in sync when a preset family is active.
  const fam = currentFamily.value
  if (fam) {
    const card = SWATCH_FAMILIES.find(x => x.family === fam)
    if (card) setSwatch((m === 'dark' ? card.dark : card.light).name)
  }
}

/* ── Palette builder (Color Lab) ──
   Pick a hue, a harmony model, and a mode; the builder derives a complete
   readable palette with the same rules the curated presets follow. Saved
   palettes persist in localStorage and can be applied like any preset. */
const builderOpen = ref(false)
const builderHue = ref(Math.round(hexToHsl(currentSwatch.value?.primary ?? '#A96F3D').h))
const builderHarmony = ref<HarmonyModel>('complementary')
const builderMode = ref<'light' | 'dark'>('light')
const builderName = ref('')

const builderPalette = computed(() => buildPalette(builderHue.value, builderHarmony.value, builderMode.value))
const builderPreviewOrder = computed(() => {
  const p = builderPalette.value
  return [
    { key: 'surface', val: p.surface }, { key: 'surfaceAlt', val: p.surfaceAlt },
    { key: 'primary', val: p.primary }, { key: 'accent', val: p.accent },
    { key: 'ink', val: p.ink }, { key: 'line', val: p.line },
  ]
})

function tryBuilderPalette() {
  const draft = draftSwatch()
  saveCustomSwatch(draft)
  setSwatch(draft.name)
}

function draftSwatch(): ColorSwatch {
  const label = builderName.value.trim() || `Hue ${builderHue.value}°`
  return {
    name: slugifyPaletteName(label),
    label,
    mode: builderMode.value,
    group: builderMode.value === 'dark' ? 'noir' : 'bold',
    feel: `${HARMONY_MODELS.find(m => m.id === builderHarmony.value)?.label} palette built at ${builderHue.value}°`,
    ...builderPalette.value,
  }
}

function removeCustom(name: string) {
  if (swatchName.value === name) setSwatch('onyx-light')
  deleteCustomSwatch(name)
}

/* ── Single-source dimension animation ──
   We measure two intrinsic sizes:
     pillWidth   = the natural width of the collapsed pill
     panelHeight = the natural height of the open panel
   The wrapper then transitions `width` between pillWidth (closed) and
   the open width (640px capped to viewport), and `height` of the expand
   region between 0 and panelHeight. Both sides of the toggle animate.

   The pill is measured via a hidden ghost (`.ap-switcher__measure`) that
   is always present in the DOM. Measuring the real pill while it's
   transitioning (or while it's been pulled out of flow via
   `position: absolute`) yields jittery / inflated widths. */
const panelEl = ref<HTMLElement | null>(null)
const measureEl = ref<HTMLElement | null>(null)
const panelHeight = ref(0)
const pillWidth = ref(0)

async function measure() {
  await nextTick()
  if (panelEl.value) panelHeight.value = panelEl.value.scrollHeight
  if (measureEl.value) pillWidth.value = measureEl.value.scrollWidth
}

onMounted(() => {
  measure()
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      if (panelEl.value) panelHeight.value = panelEl.value.scrollHeight
      if (measureEl.value) pillWidth.value = measureEl.value.scrollWidth
    })
    if (panelEl.value) ro.observe(panelEl.value)
    if (measureEl.value) ro.observe(measureEl.value)
  }
})
watch([tab, open], () => { measure() })

/* Delay hiding the pill on open until the width transition has finished
   (so the wrapper visibly grows in width with the pill filling it, instead
   of momentarily collapsing to a zero-height bar). On close, restore the
   pill immediately so it's already in place when width snaps back. */
/* When the window state restores as already-open, the pill must start
   hidden — the open-watcher only runs on CHANGES, so without this the
   stretched pill's text floats over the middle of the restored panel. */
const pillHidden = ref(_w.open === true)
const settled = ref(_w.open === true)
let pillTimer: ReturnType<typeof setTimeout> | null = null
let settleTimer: ReturnType<typeof setTimeout> | null = null
watch(open, (v) => {
  if (pillTimer) { clearTimeout(pillTimer); pillTimer = null }
  if (settleTimer) { clearTimeout(settleTimer); settleTimer = null }
  if (v) {
    pillTimer = setTimeout(() => { pillHidden.value = true }, 220)
    settleTimer = setTimeout(() => { settled.value = true }, 720)
  } else {
    /* Keep the pill faded out while the panel collapses; restore it once the
       height collapse has mostly finished so it fades in as width settles. */
    pillTimer = setTimeout(() => { pillHidden.value = false }, 420)
    settled.value = false
  }
})

/* ── Owner-driven publish ──
   When a signed-in site owner tweaks any setting we push the new values
   to the backend so other visitors render the same theme. In autosave mode
   we fire on the next tick (no debounce delay — settings appear instantly
   for new visitors). With autosave off the owner has to hit Save and the
   button surfaces a dirty/saving/saved/error state. Anonymous visitors
   never hit the network — they stay localStorage-only. */
const themeSnapshot = computed(() => ({
  theme: themeName.value,
  swatch: swatchName.value,
  variant: variant.value,
  alignment: alignment.value,
  style: {
    heroStyle: heroStyle.value,
    subheroStyle: subheroStyle.value,
    footerStyle: footerStyle.value,
    siteStyle: siteStyle.value,
    navStyle: navStyle.value,
    sections: {
      contact: contactStyle.value,
      hours: hoursStyle.value,
      gallery: galleryStyle.value,
      reviews: reviewsStyle.value,
      about: aboutStyle.value,
    },
  },
}))

const canPublish = computed(() => !!auth.owner && content.isPlatform)
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
const saveState = ref<SaveState>('idle')
const saveError = ref<string | null>(null)
const dirty = ref(false)
let publishTimer: number | null = null
let savedResetTimer: number | null = null
let publishedInitial = false

async function performSave() {
  if (!canPublish.value) return
  if (publishTimer) { clearTimeout(publishTimer); publishTimer = null }
  saveState.value = 'saving'
  saveError.value = null
  try {
    await content.saveThemePatch(themeSnapshot.value)
    dirty.value = false
    saveState.value = 'saved'
    if (savedResetTimer) clearTimeout(savedResetTimer)
    savedResetTimer = window.setTimeout(() => {
      if (saveState.value === 'saved') saveState.value = 'idle'
    }, 1800)
  } catch (e) {
    saveState.value = 'error'
    saveError.value = e instanceof Error ? e.message : String(e)
  }
}

watch(themeSnapshot, () => {
  // Skip the first emit so just mounting (or hydration syncing refs) doesn't
  // immediately push to the server.
  if (!publishedInitial) { publishedInitial = true; return }
  if (!canPublish.value) return
  dirty.value = true
  if (!prefs.value.themeAutosave) return
  // Autosave: coalesce only enough to merge synchronous bursts; effectively
  // immediate from a human's perspective.
  if (publishTimer) clearTimeout(publishTimer)
  publishTimer = window.setTimeout(() => { publishTimer = null; performSave() }, 0)
}, { deep: true })

// When the owner flips autosave back on while dirty, save right away.
watch(() => prefs.value.themeAutosave, (on) => {
  if (on && dirty.value && canPublish.value) performSave()
})
</script>

<template>
  <div
    ref="rootEl"
    class="ap-switcher"
    :class="{ 'is-open': open, 'is-settled': settled, 'is-detached': detached, 'is-fullscreen': fullscreen, 'is-dragging': dragging }"
    :style="winStyle"
  >
    <!-- Hidden ghost pill used purely for width measurement. Lives in the
         DOM at all times so we always know the natural collapsed width,
         independent of whether the visible pill is showing or hidden. -->
    <span ref="measureEl" class="ap-switcher__measure" aria-hidden="true">
      <span class="ap-switcher__pill" tabindex="-1">
        <span class="ap-switcher__pill-coin" />
        <span class="ap-switcher__pill-info">
          <span class="ap-switcher__pill-line">{{ pillTitle }}</span>
          <span class="ap-switcher__pill-sub">{{ pillMeta }}</span>
        </span>
        <span class="ap-switcher__pill-icon"><Settings :size="15" /></span>
      </span>
    </span>

    <!-- Collapsed pill: the docked pill AND the floating minimized bar. -->
    <button
      type="button"
      class="ap-switcher__pill"
      :class="{ 'is-hidden': pillHidden, 'is-bar': detached && !open }"
      :aria-hidden="pillHidden"
      :tabindex="pillHidden ? -1 : 0"
      @pointerdown="startBarDrag"
      @click="onPillClick"
      aria-label="Open site settings"
    >
      <span class="ap-switcher__pill-coin" :style="pillCoinStyle" aria-hidden="true" />
      <span class="ap-switcher__pill-info">
        <span class="ap-switcher__pill-line">{{ pillTitle }}</span>
        <span class="ap-switcher__pill-sub">{{ pillMeta }}</span>
      </span>
      <span class="ap-switcher__pill-icon" aria-hidden="true"><Settings :size="15" /></span>
    </button>

    <!-- Expandable area — height transitions from 0 → measured px on the inner panel.
         Only the active tab panel mounts via v-show, so the wrapper sees one
         single height value at a time and animates in a single fluid motion. -->
    <div class="ap-switcher__expand">
      <div ref="panelEl" class="ap-switcher__panel-wrap">
        <div
          class="ap-switcher__head"
          :class="{ 'is-draggable': detached && !fullscreen }"
          @pointerdown="startDrag"
        >
          <span class="ap-switcher__title">
            <Move v-if="detached && !fullscreen" :size="13" class="ap-switcher__drag-icon" />
            Site settings
          </span>
          <RouterLink
            v-if="auth.owner"
            to="/admin/account"
            class="ap-switcher__account"
            :title="`Signed in as ${auth.owner.email}`"
            @click="toggle"
          >
            <User :size="14" />
            <span>Account</span>
          </RouterLink>
          <!-- Window controls -->
          <div class="ap-switcher__wins" @pointerdown.stop>
            <button v-if="!detached && !fullscreen" type="button" class="ap-switcher__winbtn" title="Detach and drag it anywhere" @click="detach">
              <Move :size="15" />
            </button>
            <button v-else-if="detached && !fullscreen" type="button" class="ap-switcher__winbtn" title="Dock back to the corner" @click="dock">
              <CornerDownRight :size="15" />
            </button>
            <button type="button" class="ap-switcher__winbtn" :title="fullscreen ? 'Exit full screen' : 'Full screen'" @click="toggleFullscreen">
              <component :is="fullscreen ? Minimize2 : Maximize2" :size="15" />
            </button>
          </div>
          <button type="button" class="ap-switcher__close" @click="minimize" :aria-label="detached && !fullscreen ? 'Minimize to a floating bar' : 'Minimize'">
            <component :is="fullscreen ? X : ChevronDown" :size="18" />
          </button>
        </div>

        <!-- Save / autosave row. Only owners on platform builds see this; the
             controls explicitly surface what the picker is doing with each
             tweak (silent failures used to leave owners thinking everything
             was saved when it wasn't). -->
        <div v-if="canPublish" class="ap-switcher__save">
          <button
            type="button"
            class="ap-switcher__save-btn"
            :class="{
              'is-saving': saveState === 'saving',
              'is-saved': saveState === 'saved',
              'is-error': saveState === 'error',
              'is-dirty': dirty && saveState !== 'saving',
            }"
            :disabled="saveState === 'saving' || (!dirty && saveState === 'idle')"
            :title="saveError || ''"
            @click="performSave"
          >
            <Loader2 v-if="saveState === 'saving'" :size="14" class="ap-switcher__spin" />
            <Check v-else-if="saveState === 'saved'" :size="14" />
            <AlertCircle v-else-if="saveState === 'error'" :size="14" />
            <Save v-else :size="14" />
            <span>
              {{ saveState === 'saving' ? 'Saving…'
                 : saveState === 'saved' ? 'Saved'
                 : saveState === 'error' ? 'Retry save'
                 : dirty ? 'Save changes' : 'Saved' }}
            </span>
          </button>
          <label class="ap-switcher__autosave" :title="prefs.themeAutosave ? 'Autosave on. Changes publish instantly' : 'Autosave off. Click Save to publish'">
            <input
              type="checkbox"
              :checked="prefs.themeAutosave"
              @change="setThemeAutosave(($event.target as HTMLInputElement).checked)"
            />
            <span>Autosave</span>
          </label>
        </div>
        <p v-if="canPublish && saveState === 'error' && saveError" class="ap-switcher__save-err">
          {{ saveError }}
        </p>

        <div class="ap-switcher__tabs" role="tablist">
          <button type="button" role="tab" class="ap-switcher__tab ap-switcher__tab--edit" :class="{ 'is-active': tab === 'edit' }" @click="tab = 'edit'"><Pencil :size="14" /><span>edit</span></button>
          <button type="button" role="tab" class="ap-switcher__tab" :class="{ 'is-active': tab === 'theme' }" @click="tab = 'theme'"><Palette :size="14" /><span>theme</span></button>
          <button type="button" role="tab" class="ap-switcher__tab" :class="{ 'is-active': tab === 'color' }" @click="tab = 'color'"><SwatchBook :size="14" /><span>color</span></button>
          <button type="button" role="tab" class="ap-switcher__tab" :class="{ 'is-active': tab === 'style' }" @click="tab = 'style'"><LayoutTemplate :size="14" /><span>style</span></button>
          <button type="button" role="tab" class="ap-switcher__tab" :class="{ 'is-active': tab === 'sections' }" @click="tab = 'sections'"><LayoutGrid :size="14" /><span>sections</span></button>
        </div>

        <!-- Edit content -->
        <div v-show="tab === 'edit'" class="ap-switcher__panel">
          <div class="ap-switcher__span">
            <button
              type="button"
              class="ap-edit-toggle"
              :class="{ 'is-on': editor.editMode.value }"
              @click="editor.toggle()"
            >
              <span class="ap-edit-toggle__track"><span class="ap-edit-toggle__thumb" /></span>
              <span class="ap-edit-toggle__label">
                <strong>{{ editor.editMode.value ? 'Editing the page' : 'Edit content on the page' }}</strong>
                <small>{{ editor.editMode.value ? 'Click any text to edit it, or use the fields below.' : 'Turn on to edit text directly on the page.' }}</small>
              </span>
            </button>

            <template v-if="editor.editMode.value">
              <div v-if="!editor.fields.value.length" class="ap-switcher__hint">No editable text found on this page yet.</div>

              <div class="ap-edit-scroll">
                <div v-for="grp in editor.groups.value" :key="grp.name" class="ap-edit-group">
                  <p class="ap-edit-group__title">{{ grp.label }}</p>
                  <div
                    v-for="f in grp.items"
                    :key="f.path"
                    class="ap-edit-field"
                    :class="{ 'is-active': editor.activePath.value === f.path }"
                  >
                    <button type="button" class="ap-edit-field__label" :title="`Scroll to ${f.label}`" @click="editor.focusField(f.path)">
                      <CornerRightDown :size="12" /> {{ f.label }}
                    </button>
                    <button
                      v-if="f.type === 'image'"
                      type="button"
                      class="ap-edit-imgbtn"
                      :class="{ 'is-empty': !editor.getByPath(f.path) }"
                      :title="editor.getByPath(f.path) ? `Replace ${f.label}` : `Add ${f.label}`"
                      @click="editor.focusField(f.path); editor.replaceImage(f.path)"
                    >
                      <img v-if="editor.getByPath(f.path)" :src="editor.getByPath(f.path)" alt="" class="ap-edit-imgbtn__thumb" />
                      <span class="ap-edit-imgbtn__cta">
                        <ImagePlus :size="13" /> {{ editor.getByPath(f.path) ? 'Replace' : 'Upload image' }}
                      </span>
                    </button>
                    <div v-else-if="f.multiline" class="ap-edit-ta">
                      <textarea
                        class="ap-edit-field__input ap-edit-field__input--ta"
                        rows="4"
                        :value="editor.getByPath(f.path)"
                        @focus="editor.focusField(f.path)"
                        @input="editor.setByPath(f.path, ($event.target as HTMLTextAreaElement).value)"
                      />
                      <span
                        class="ap-edit-ta__count"
                        :class="{ 'is-over': editor.wordCount(editor.getByPath(f.path)) > (f.softMax || 0) }"
                      >{{ editor.wordCount(editor.getByPath(f.path)) }}/{{ f.softMax }} words</span>
                    </div>
                    <input
                      v-else
                      class="ap-edit-field__input"
                      :value="editor.getByPath(f.path)"
                      @focus="editor.focusField(f.path)"
                      @input="editor.setByPath(f.path, ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                </div>
              </div>

              <div v-if="editor.canPersist.value" class="ap-edit-save">
                <button type="button" class="ap-switcher__chip" :disabled="editor.saving.value || !editor.dirty.value.size" @click="editor.save(false)">Save draft</button>
                <button type="button" class="ap-switcher__chip is-active" :disabled="editor.saving.value || !editor.dirty.value.size" @click="editor.save(true)">
                  {{ editor.saving.value ? 'Saving…' : 'Publish' }}
                </button>
                <span v-if="editor.saveMsg.value" class="ap-edit-save__msg">{{ editor.saveMsg.value }}</span>
                <span v-else-if="editor.dirty.value.size" class="ap-edit-save__msg">{{ editor.dirty.value.size }} change{{ editor.dirty.value.size === 1 ? '' : 's' }}</span>
              </div>
              <p v-else class="ap-switcher__hint">Sign in as the site owner to save your changes.</p>
            </template>
          </div>
        </div>

        <!-- Theme -->
        <div v-show="tab === 'theme'" class="ap-switcher__panel">
          <div>
            <p class="ap-eyebrow">Theme</p>
            <div class="ap-switcher__row">
              <button v-for="t in THEME_LIST" :key="t.name" type="button" class="ap-switcher__chip" :class="{ 'is-active': themeName === t.name }" @click="setTheme(t.name)">{{ t.label }}</button>
            </div>
          </div>
          <div>
            <p class="ap-eyebrow">Size</p>
            <div class="ap-switcher__row">
              <button
                v-for="v in VARIANTS" :key="v" type="button"
                class="ap-switcher__chip ap-switcher__chip--icon"
                :class="{ 'is-active': variant === v, 'is-locked': v === 'portfolio' && !portfolioUnlocked }"
                @click="pickVariant(v)"
              >
                <Lock v-if="v === 'portfolio' && !portfolioUnlocked" :size="12" />
                {{ VARIANT_LABELS[v] }}
              </button>
            </div>
            <p v-if="upgradeOpen" class="ap-switcher__upgrade">
              <Sparkles :size="13" />
              <span>
                Portfolio is a paid upgrade: hero carousel, photo-forward layouts, and up to 16 photos.
                <a href="mailto:hello@apotomelabs.com?subject=Portfolio%20upgrade">Ask us to upgrade your site</a>
              </span>
            </p>
          </div>
          <div class="ap-switcher__span">
            <div class="ap-switcher__color-head">
              <p class="ap-eyebrow">Color</p>
              <div class="ap-modes" role="group" aria-label="Light or dark palette">
                <button type="button" class="ap-modes__btn" :class="{ 'is-active': pickerMode === 'light' }" @click="setPickerMode('light')"><Sun :size="13" /> Light</button>
                <button type="button" class="ap-modes__btn" :class="{ 'is-active': pickerMode === 'dark' }" @click="setPickerMode('dark')"><Moon :size="13" /> Dark</button>
              </div>
            </div>
            <div class="ap-switcher__colors">
              <button
                v-for="f in SWATCH_FAMILIES" :key="f.family" type="button"
                class="ap-color" :class="{ 'is-active': currentFamily === f.family }"
                :title="f.label" :aria-label="f.label"
                @click="pickFamily(f)"
              >
                <span class="ap-color__chip" aria-hidden="true">
                  <span :style="{ background: familySwatch(f).primary }" />
                  <span :style="{ background: familySwatch(f).accent }" />
                </span>
                <span class="ap-color__name">{{ f.label }}</span>
              </button>
            </div>
            <button type="button" class="ap-switcher__studio-link" @click="tab = 'color'">
              <SwatchBook :size="13" /> Fine-tune in the Color Studio
            </button>
          </div>
          <div class="ap-switcher__span">
            <p class="ap-eyebrow">Content alignment</p>
            <div class="ap-switcher__row">
              <button type="button" class="ap-switcher__chip ap-switcher__chip--icon" :class="{ 'is-active': alignment === 'left' }" @click="setAlignment('left')">
                <AlignLeft :size="14" /> Left
              </button>
              <button type="button" class="ap-switcher__chip ap-switcher__chip--icon" :class="{ 'is-active': alignment === 'center' }" @click="setAlignment('center')">
                <AlignCenter :size="14" /> Center
              </button>
            </div>
          </div>
        </div>

        <!-- Color Studio -->
        <div v-show="tab === 'color'" class="ap-switcher__panel">
          <div class="ap-switcher__span">
            <div class="ap-lab__modes-row">
              <span class="ap-eyebrow">Palettes</span>
              <div class="ap-modes" role="group" aria-label="Light or dark palette">
                <button type="button" class="ap-modes__btn" :class="{ 'is-active': pickerMode === 'light' }" @click="setPickerMode('light')"><Sun :size="13" /> Light</button>
                <button type="button" class="ap-modes__btn" :class="{ 'is-active': pickerMode === 'dark' }" @click="setPickerMode('dark')"><Moon :size="13" /> Dark</button>
              </div>
            </div>
            <div v-for="grp in theoryGroups" :key="grp.id" class="ap-lab__theory">
              <div class="ap-lab__theory-head">
                <!-- The one-line group description lives in the tooltip now:
                     six visible sentences made the docked panel taller than a
                     laptop screen, and the swatches already show the mood. -->
                <span class="ap-lab__theory-name" :title="grp.subtext">{{ grp.label }}</span>
              </div>
              <div class="ap-lab__swatches">
                <button
                  v-for="f in grp.items"
                  :key="f.family"
                  type="button"
                  class="ap-lab__swatch"
                  :class="{ 'is-active': currentFamily === f.family }"
                  :style="{ background: familySwatch(f).surface, borderColor: currentFamily === f.family ? familySwatch(f).primary : familySwatch(f).line }"
                  :title="familySwatch(f).feel ? `${f.label}. ${familySwatch(f).feel}` : f.label"
                  @click="pickFamily(f)"
                >
                  <span class="ap-lab__swatch-dots">
                    <span :style="{ background: familySwatch(f).primary }" />
                    <span :style="{ background: familySwatch(f).accent }" />
                  </span>
                  <span class="ap-lab__swatch-name" :style="{ color: familySwatch(f).ink }">{{ f.label }}</span>
                  <Check v-if="currentFamily === f.family" :size="12" class="ap-lab__swatch-check" :style="{ color: familySwatch(f).primary }" />
                </button>
              </div>
            </div>

            <!-- My palettes -->
            <div class="ap-lab__theory ap-lab__theory--mine">
              <div class="ap-lab__theory-head">
                <span class="ap-lab__theory-name" title="Palettes you build below are saved here">My palettes</span>
              </div>
              <div v-if="customSwatches.length" class="ap-lab__swatches">
                <div
                  v-for="s in customSwatches"
                  :key="s.name"
                  class="ap-lab__swatch ap-lab__swatch--custom"
                  :class="{ 'is-active': swatchName === s.name }"
                  :style="{ background: s.surface, borderColor: swatchName === s.name ? s.primary : s.line }"
                >
                  <button type="button" class="ap-lab__swatch-hit" :title="s.feel || s.label" @click="setSwatch(s.name)">
                    <span class="ap-lab__swatch-dots">
                      <span :style="{ background: s.primary }" />
                      <span :style="{ background: s.accent }" />
                    </span>
                    <span class="ap-lab__swatch-name" :style="{ color: s.ink }">{{ s.label }}</span>
                  </button>
                  <button type="button" class="ap-lab__swatch-del" :style="{ color: s.inkMuted }" :aria-label="`Delete ${s.label}`" @click="removeCustom(s.name)">
                    <Trash2 :size="12" />
                  </button>
                </div>
              </div>
              <p v-else class="ap-switcher__hint">None yet.</p>

              <button v-if="!builderOpen" type="button" class="ap-switcher__chip ap-switcher__chip--icon ap-lab__new" @click="builderOpen = true">
                <Plus :size="14" /> New palette
              </button>

              <!-- Builder -->
              <div v-if="builderOpen" class="ap-lab__builder">
                <label class="ap-lab__hue">
                  <span class="ap-lab__builder-label">Base hue · {{ builderHue }}°</span>
                  <input type="range" min="0" max="359" v-model.number="builderHue" class="ap-lab__hue-slider" />
                </label>
                <div>
                  <span class="ap-lab__builder-label">Harmony</span>
                  <div class="ap-switcher__row">
                    <button
                      v-for="m in HARMONY_MODELS" :key="m.id" type="button"
                      class="ap-switcher__chip"
                      :class="{ 'is-active': builderHarmony === m.id }"
                      :title="m.blurb"
                      @click="builderHarmony = m.id"
                    >{{ m.label }}</button>
                  </div>
                </div>
                <div>
                  <span class="ap-lab__builder-label">Mode</span>
                  <div class="ap-switcher__row">
                    <button type="button" class="ap-switcher__chip" :class="{ 'is-active': builderMode === 'light' }" @click="builderMode = 'light'">Light</button>
                    <button type="button" class="ap-switcher__chip" :class="{ 'is-active': builderMode === 'dark' }" @click="builderMode = 'dark'">Dark</button>
                  </div>
                </div>
                <div class="ap-lab__preview" :style="{ background: builderPalette.surface, borderColor: builderPalette.line }">
                  <span
                    v-for="c in builderPreviewOrder" :key="c.key"
                    class="ap-lab__preview-chip"
                    :style="{ background: c.val }"
                    :title="`${c.key} · ${c.val}`"
                  />
                  <span class="ap-lab__preview-type" :style="{ color: builderPalette.ink }">Aa</span>
                </div>
                <div class="ap-lab__builder-row">
                  <input
                    v-model="builderName"
                    type="text"
                    class="ap-lab__name"
                    placeholder="Palette name"
                    @keydown.enter.prevent="tryBuilderPalette"
                  />
                  <button type="button" class="ap-switcher__chip ap-switcher__chip--icon is-active" @click="tryBuilderPalette">
                    <Save :size="13" /> Save &amp; apply
                  </button>
                  <button type="button" class="ap-switcher__chip" @click="builderOpen = false">Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Style -->
        <div v-show="tab === 'style'" class="ap-switcher__panel">
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('hero')">
              <span class="ap-eyebrow">Hero style</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in HERO_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': heroStyle === s }" @click="setHeroStyle(s)">{{ HERO_STYLE_LABELS[s] }}</button>
            </div>
          </div>
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('subhero')">
              <span class="ap-eyebrow">Subpage hero</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in SUBHERO_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': subheroStyle === s }" @click="setSubheroStyle(s)">{{ SUBHERO_STYLE_LABELS[s] }}</button>
            </div>
          </div>
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('header')">
              <span class="ap-eyebrow">Navbar style</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in NAV_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': navStyle === s }" @click="setNavStyle(s)">{{ NAV_STYLE_LABELS[s] }}</button>
            </div>
          </div>
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('footer')">
              <span class="ap-eyebrow">Footer style</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in FOOTER_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': footerStyle === s }" @click="setFooterStyle(s)">{{ FOOTER_STYLE_LABELS[s] }}</button>
            </div>
          </div>
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('site')">
              <span class="ap-eyebrow">{{ SITE_STYLE_LABEL }}</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in SITE_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': siteStyle === s }" @click="setSiteStyle(s)">{{ SITE_STYLE_LABELS[s] }}</button>
            </div>
          </div>
        </div>

        <!-- Sections -->
        <div v-show="tab === 'sections'" class="ap-switcher__panel">
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('about')">
              <span class="ap-eyebrow">About section</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in ABOUT_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': aboutStyle === s }" @click="setAboutStyle(s)">{{ ABOUT_STYLE_LABELS[s] }}</button>
            </div>
          </div>
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('contact')">
              <span class="ap-eyebrow">Contact section</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in CONTACT_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': contactStyle === s }" @click="setContactStyle(s)">{{ CONTACT_STYLE_LABELS[s] }}</button>
            </div>
          </div>
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('hours')">
              <span class="ap-eyebrow">Hours section</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in HOURS_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': hoursStyle === s }" @click="setHoursStyle(s)">{{ HOURS_STYLE_LABELS[s] }}</button>
            </div>
          </div>
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('gallery')">
              <span class="ap-eyebrow">Gallery section</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in GALLERY_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': galleryStyle === s }" @click="setGalleryStyle(s)">{{ GALLERY_STYLE_LABELS[s] }}</button>
            </div>
          </div>
          <div class="ap-switcher__span">
            <button type="button" class="ap-switcher__group-head" @click="jumpTo('reviews')">
              <span class="ap-eyebrow">Reviews section</span>
              <CornerDownRight :size="12" />
            </button>
            <div class="ap-switcher__row">
              <button v-for="s in REVIEWS_STYLES" :key="s" type="button" class="ap-switcher__chip" :class="{ 'is-active': reviewsStyle === s }" @click="setReviewsStyle(s)">{{ REVIEWS_STYLE_LABELS[s] }}</button>
            </div>
          </div>
        </div>

      </div>
    </div>
    <!-- Resize grip — only on the open floating window (not the minimized bar) -->
    <div
      v-if="detached && open && !fullscreen"
      class="ap-switcher__resize"
      title="Drag to resize"
      @pointerdown="startResize"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
/* Single-source height animation: the wrapper measures its content via JS and
   sets --ap-switcher-h; the expand region transitions `height` from 0 → that
   value in one fluid motion. Switching tabs simply re-measures and animates
   to the new height. No grid-template-rows tricks → no bounce. */
.ap-switcher {
  position: fixed; bottom: 1rem; right: 1rem; z-index: 100;
  font-family: var(--ap-font-body); font-size: 0.85rem;
  /* rgba fallback first so prod CSS minifiers that fold/precompute color-mix
     don't collapse the panel to fully opaque; the color-mix below overrides
     it in modern browsers. */
  background: rgba(245, 244, 240, 0.72);
  background: color-mix(in srgb, var(--ap-surface) 72%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  backdrop-filter: blur(14px) saturate(140%);
  /* Force our own stacking context so backdrop-filter always has a backdrop
     to sample, regardless of whatever ancestor compositing the prod build
     ends up with. */
  isolation: isolate;
  will-change: backdrop-filter;
  border: 1px solid color-mix(in srgb, var(--ap-line) 85%, transparent);
  border-radius: 999px;
  box-shadow: 0 10px 40px -10px color-mix(in srgb, var(--ap-ink) 35%, transparent),
              0 2px 8px -2px color-mix(in srgb, var(--ap-ink) 20%, transparent);
  overflow: hidden;
  /* Collapsed: width matches the measured pill width. Open: snap to 640px.
     Staged animation: opening goes width-then-height; closing height-then-width.
     The closed-state spec delays width by the height duration; the open-state
     spec removes that delay so width leads on the way in. */
  width: var(--ap-switcher-pill-w, max-content);
  /* Floor the width at the measured pill width. Without this, returning from a
     detached/fullscreen float can leave the `width` computing to ~0 and the
     docked panel collapses to an invisible sliver. */
  min-width: var(--ap-switcher-pill-w, max-content);
  max-width: min(640px, calc(100vw - 2rem));
  /* Staggered expansion: width and height run CONCURRENTLY on the same
     settle-out bezier, height trailing by a beat — one fluid diagonal
     bloom instead of two hard sequential stages. Closing reverses the
     stagger (height leads, width trails). */
  transition: width 460ms cubic-bezier(0.22, 1, 0.36, 1) 90ms,
              border-radius 420ms cubic-bezier(0.22, 1, 0.36, 1) 90ms,
              border-color 360ms ease 90ms,
              background-color 360ms ease 90ms;
}
.ap-switcher.is-open {
  width: 640px;
  border-radius: 18px;
  transition: width 460ms cubic-bezier(0.22, 1, 0.36, 1) 0ms,
              border-radius 420ms cubic-bezier(0.22, 1, 0.36, 1) 0ms,
              border-color 360ms ease 0ms,
              background-color 360ms ease 0ms;
}
/* When open, pill fades out (driven by JS pillHidden timer) so it gracefully
   disappears as the height grows. On close it fades back in over the
   width-collapse phase. Stays in grid flow so it contributes to height. */
.ap-switcher__pill.is-hidden {
  opacity: 0;
  pointer-events: none;
}
/* Offscreen ghost used only to measure the pill's natural width. Kept in
   the DOM at all times so width is always known, even while the visible
   pill is hidden. position: absolute removes it from layout entirely. */
.ap-switcher__measure {
  position: absolute; left: -99999px; top: -99999px;
  visibility: hidden; pointer-events: none;
  width: max-content;
}

/* ── Collapsed pill — quiet, precise, ultramodern ──────────
   One color coin, the theme's name, the palette underneath, and a bare
   glyph behind a hairline. Nothing shouts; everything reads. */
.ap-switcher__pill {
  display: flex; align-items: center; gap: 0.7rem;
  width: 100%;
  background: transparent; border: 0; cursor: pointer;
  padding: 0.5rem 0.35rem 0.5rem 0.8rem;
  color: var(--ap-ink); font: inherit;
  text-align: left;
  opacity: 1;
  transition: opacity 320ms ease;
}
.ap-switcher__pill-coin {
  display: inline-block;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--ap-line);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--ap-ink) 14%, transparent),
    0 1px 4px color-mix(in srgb, var(--ap-ink) 18%, transparent);
  flex-shrink: 0;
  transition: transform 240ms cubic-bezier(0.2, 0.7, 0.3, 1);
}
.ap-switcher__pill:hover .ap-switcher__pill-coin { transform: rotate(24deg) scale(1.05); }
.ap-switcher__pill-info {
  display: inline-flex; flex-direction: column; justify-content: center;
  gap: 0.1rem; min-width: 0;
}
.ap-switcher__pill-line {
  font-size: 0.8rem; font-weight: 600;
  color: var(--ap-ink);
  white-space: nowrap;
  letter-spacing: -0.01em;
  line-height: 1;
}
.ap-switcher__pill-sub {
  font-family: var(--ap-font-mono);
  font-size: 0.6rem; font-weight: 500;
  color: var(--ap-ink-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  white-space: nowrap;
  line-height: 1;
}
.ap-switcher__pill-icon {
  margin-left: auto;
  display: flex; align-items: center; justify-content: center;
  align-self: stretch;
  padding: 0 0.7rem 0 0.75rem;
  border-left: 1px solid color-mix(in srgb, var(--ap-line) 80%, transparent);
  color: var(--ap-ink-muted);
  flex-shrink: 0;
  transition: color 160ms ease;
}
/* The gear spins; its container must not — the container carries the
   hairline divider, and rotating that tilts the rule with it. */
.ap-switcher__pill-icon :deep(svg) {
  display: block; width: 15px; height: 15px; flex-shrink: 0;
  transition: transform 240ms ease;
}
.ap-switcher__pill:hover .ap-switcher__pill-icon { color: var(--ap-ink); }
.ap-switcher__pill:hover .ap-switcher__pill-icon :deep(svg) { transform: rotate(45deg); }

/* ── Expand region ─ height transitions in sync with the pill leaving layout ─ */
.ap-switcher {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}
.ap-switcher__measure,
.ap-switcher__pill,
.ap-switcher__expand {
  grid-column: 1;
  grid-row: 1;
}
.ap-switcher__expand {
  height: 0;
  overflow: hidden;
  transition: height 460ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ap-switcher.is-open .ap-switcher__expand {
  height: var(--ap-switcher-h, auto);
  transition: height 560ms cubic-bezier(0.22, 1, 0.36, 1) 110ms;
}
/* Once fully open, tab switches re-measure --ap-switcher-h; remove the
   opening-stage delay so the height retunes immediately. */
.ap-switcher.is-open.is-settled .ap-switcher__expand {
  transition: height 320ms cubic-bezier(0.2, 0.7, 0.3, 1);
}

/* ── Expanded wrapper ──────────────────────────────────── */
.ap-switcher__panel-wrap {
  display: flex; flex-direction: column;
  opacity: 0;
  transition: opacity 220ms ease;
}
/* Fade panel contents IN after width AND part of height have grown; fade
   OUT immediately on close so it clears before height collapses. */
.ap-switcher.is-open .ap-switcher__panel-wrap {
  opacity: 1;
  transition: opacity 360ms ease 260ms;
}
.ap-switcher__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.7rem 0.9rem 0.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ap-line) 60%, transparent);
}
.ap-switcher__title {
  font-family: var(--ap-font-heading);
  font-size: 0.88rem; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ap-ink);
}
.ap-switcher__close {
  background: color-mix(in srgb, var(--ap-ink) 8%, transparent);
  border: 0; cursor: pointer;
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--ap-ink);
  flex-shrink: 0;
  transition: background 160ms ease, color 160ms ease, transform 240ms ease;
}
.ap-switcher__account {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  margin-left: auto; margin-right: 0.4rem;
  background: color-mix(in srgb, var(--ap-primary) 12%, transparent);
  color: var(--ap-primary);
  border: 1px solid color-mix(in srgb, var(--ap-primary) 35%, transparent);
  border-radius: 999px;
  font-size: 0.72rem; font-weight: 600;
  letter-spacing: 0.05em; text-transform: uppercase;
  text-decoration: none;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
}
.ap-switcher__account:hover {
  background: var(--ap-primary);
  color: var(--ap-surface);
  border-color: var(--ap-primary);
}
.ap-switcher__close :deep(svg) { display: block; margin: 0; }
.ap-switcher__close:hover {
  background: color-mix(in srgb, var(--ap-ink) 14%, transparent);
  color: var(--ap-ink);
}
/* Chevron points down by default (in open state — clicking collapses).
   Pre-rotate so the icon visually invites "click to close". */
.ap-switcher.is-open .ap-switcher__close { transform: rotate(0deg); }

/* ── Window controls (detach / resize / fullscreen) ── */
.ap-switcher__title { margin-right: auto; display: inline-flex; align-items: center; gap: 0.35rem; }
.ap-switcher__drag-icon { opacity: 0.5; }
.ap-switcher__wins { display: inline-flex; gap: 1px; margin-right: 0.3rem; flex-shrink: 0; }
.ap-switcher__winbtn {
  display: grid; place-items: center; width: 28px; height: 28px;
  border: 0; background: none; color: var(--ap-ink-muted); cursor: pointer; border-radius: 7px;
  transition: background 140ms ease, color 140ms ease;
}
.ap-switcher__winbtn:hover { background: color-mix(in srgb, var(--ap-ink) 9%, transparent); color: var(--ap-ink); }
.ap-switcher__head.is-draggable { cursor: move; touch-action: none; user-select: none; }

/* Detached / fullscreen: break out of the docked corner + height animation so
   the panel fills the window and its content scrolls. A robust flex chain
   (root → expand → panel-wrap) lets the panel-wrap own the scroll. */
.ap-switcher.is-detached, .ap-switcher.is-fullscreen {
  bottom: auto; right: auto; max-width: none;
  display: flex; flex-direction: column; overflow: hidden;
  /* Override the collapsed pill's 999px radius — otherwise a large floating
     window renders as a giant oval that clips the header controls. */
  border-radius: 18px;
  /* One calm, continuous morph across EVERY size property (incl. min/max on
     both axes, since we pin those) so resizing/minimizing/fullscreen flow
     smoothly instead of jumping. Slower + gentle ease for a settled feel. */
  transition:
    left 620ms cubic-bezier(0.4, 0.02, 0.2, 1),
    top 620ms cubic-bezier(0.4, 0.02, 0.2, 1),
    width 620ms cubic-bezier(0.4, 0.02, 0.2, 1),
    min-width 620ms cubic-bezier(0.4, 0.02, 0.2, 1),
    max-width 620ms cubic-bezier(0.4, 0.02, 0.2, 1),
    height 620ms cubic-bezier(0.4, 0.02, 0.2, 1),
    min-height 620ms cubic-bezier(0.4, 0.02, 0.2, 1),
    max-height 620ms cubic-bezier(0.4, 0.02, 0.2, 1),
    border-radius 520ms ease;
}
/* While dragging or resizing, follow the pointer 1:1 (no lag). */
.ap-switcher.is-dragging { transition: none !important; }
.ap-switcher.is-fullscreen { border-radius: 0; }
/* The floating MINIMIZED bar (detached + closed) is a pill. */
.ap-switcher.is-detached:not(.is-open) { border-radius: 999px; }

/* Only the OPEN floating window fills + scrolls; the closed bar just shows the
   pill. Scoping to .is-open lets the panel collapse to the bar cleanly. */
.ap-switcher.is-detached.is-open .ap-switcher__expand,
.ap-switcher.is-fullscreen .ap-switcher__expand {
  height: auto !important; flex: 1 1 auto; min-height: 0; overflow: hidden;
  display: flex; flex-direction: column;
  transition: none;
}
.ap-switcher.is-detached.is-open .ap-switcher__panel-wrap,
.ap-switcher.is-fullscreen .ap-switcher__panel-wrap {
  flex: 1 1 auto; min-height: 0; height: auto; max-height: none;
  overflow-y: auto; overflow-x: hidden; opacity: 1;
}
.ap-switcher.is-detached.is-open .ap-edit-scroll,
.ap-switcher.is-fullscreen .ap-edit-scroll { max-height: none; overflow: visible; }
/* Hide the visible pill when the floating window is OPEN (and in fullscreen);
   it stays as the bar when the floating window is closed. Never touch the
   measurement ghost (nested), or `pillWidth` measures 0. */
.ap-switcher.is-detached.is-open > .ap-switcher__pill,
.ap-switcher.is-fullscreen > .ap-switcher__pill { display: none; }
/* The floating bar's pill fills its compact box and can be grabbed to move. */
.ap-switcher__pill.is-bar { height: 100%; cursor: grab; touch-action: none; }
.ap-switcher__pill.is-bar:active { cursor: grabbing; }
/* Pin the header above the scrolling content while floating/fullscreen. */
.ap-switcher.is-detached.is-open .ap-switcher__head,
.ap-switcher.is-fullscreen .ap-switcher__head {
  position: sticky; top: 0; z-index: 3;
  background: color-mix(in srgb, var(--ap-surface) 92%, transparent);
  backdrop-filter: blur(6px);
}

.ap-switcher__resize {
  position: absolute; right: 3px; bottom: 3px; width: 18px; height: 18px;
  cursor: nwse-resize; z-index: 6; touch-action: none; border-radius: 0 0 8px 0;
  background: linear-gradient(135deg, transparent 45%,
    color-mix(in srgb, var(--ap-ink) 28%, transparent) 45%,
    color-mix(in srgb, var(--ap-ink) 28%, transparent) 55%, transparent 55%,
    transparent 70%,
    color-mix(in srgb, var(--ap-ink) 28%, transparent) 70%,
    color-mix(in srgb, var(--ap-ink) 28%, transparent) 80%, transparent 80%);
}

/* ── Save / autosave row ───────────────────────────────── */
.ap-switcher__save {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 0.85rem 0.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ap-line) 50%, transparent);
}
.ap-switcher__save-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ap-line) 70%, transparent);
  background: color-mix(in srgb, var(--ap-ink) 5%, transparent);
  color: var(--ap-ink);
  font: inherit; font-size: 0.72rem; font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease, opacity 140ms ease;
}
.ap-switcher__save-btn:disabled { cursor: default; opacity: 0.55; }
.ap-switcher__save-btn:not(:disabled):hover {
  background: color-mix(in srgb, var(--ap-ink) 10%, transparent);
}
.ap-switcher__save-btn.is-dirty {
  background: var(--ap-primary);
  border-color: var(--ap-primary);
  color: var(--ap-on-primary, var(--ap-surface));
  opacity: 1;
}
.ap-switcher__save-btn.is-dirty:not(:disabled):hover {
  background: color-mix(in srgb, var(--ap-primary) 88%, var(--ap-ink));
}
.ap-switcher__save-btn.is-saving { opacity: 0.85; }
.ap-switcher__save-btn.is-saved {
  background: color-mix(in srgb, var(--ap-primary) 18%, transparent);
  border-color: color-mix(in srgb, var(--ap-primary) 45%, transparent);
  color: var(--ap-primary);
  opacity: 1;
}
.ap-switcher__save-btn.is-error {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.45);
  color: rgb(185, 28, 28);
  opacity: 1;
}
.ap-switcher__save-btn :deep(svg) { display: block; }
.ap-switcher__spin { animation: ap-switcher-spin 0.9s linear infinite; }
@keyframes ap-switcher-spin { to { transform: rotate(360deg); } }

.ap-switcher__autosave {
  display: inline-flex; align-items: center; gap: 0.4rem;
  margin-left: auto;
  font-size: 0.72rem; font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--ap-ink-muted, var(--ap-ink));
  cursor: pointer; user-select: none;
}
.ap-switcher__autosave input { accent-color: var(--ap-primary); cursor: pointer; }

.ap-switcher__save-err {
  margin: 0; padding: 0.4rem 0.85rem 0.55rem;
  font-size: 0.72rem; color: rgb(185, 28, 28);
  border-bottom: 1px solid color-mix(in srgb, var(--ap-line) 50%, transparent);
  word-break: break-word;
}

/* ── Tabs ──────────────────────────────────────────────── */
.ap-switcher__tabs {
  display: flex; gap: 0;
  padding: 0 0.6rem; margin: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--ap-line) 60%, transparent);
}
.ap-switcher__tab {
  flex: 1;
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.2rem;
  background: transparent; border: 0;
  padding: 0.6rem 0.3rem 0.55rem;
  font-family: inherit; font-size: 0.7rem;
  color: var(--ap-ink-muted); cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  transition: color 160ms ease, border-color 160ms ease;
}
.ap-switcher__tab :deep(svg) { display: block; opacity: 0.8; }
.ap-switcher__tab:hover { color: var(--ap-ink); }
.ap-switcher__tab.is-active {
  color: var(--ap-ink);
  border-bottom-color: var(--ap-primary);
  font-weight: 600;
}
.ap-switcher__tab.is-active :deep(svg) { opacity: 1; color: var(--ap-primary); }

/* ── Panel (2-col by default; full-width groups via __span) ── */
.ap-switcher__panel {
  padding: 0.9rem 1rem 1.1rem;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.9rem 1.25rem;
  animation: ap-switcher-fade 360ms ease both;
}
/* Docked panels cap at the viewport and scroll inside. The expand region
   animates to the measured panel height, so without this cap a tall tab
   (the Color Studio on a laptop) grows past the screen and, with the
   expand's overflow hidden, everything past the fold is simply unreachable.
   The cap keeps the measurement itself under the viewport: 8rem covers the
   dock offset, the header row and panel padding. Detached and fullscreen
   windows manage their own height and scrolling. */
.ap-switcher:not(.is-detached):not(.is-fullscreen) .ap-switcher__panel {
  max-height: calc(100dvh - 8rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}
@keyframes ap-switcher-fade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .ap-switcher__panel { animation: none; }
}

/* Clickable group head — jumps to the section the setting controls */
.ap-switcher__group-head {
  display: inline-flex; align-items: center; gap: 0.35rem;
  background: transparent; border: 0; padding: 0; margin: 0;
  color: inherit; cursor: pointer;
  border-bottom: 1px dashed transparent;
  transition: color 160ms ease, border-color 160ms ease;
}
.ap-switcher__group-head .ap-eyebrow { transition: color 160ms ease; }
/* :deep, NOT :global — Vue compiles `x :global(svg)` by dropping the scoped
   ancestor entirely, which shipped a literal global `svg { transform:
   translateX(2px); opacity: .4 }` rule and nudged every icon on the whole
   site 2px off center. */
.ap-switcher__group-head :deep(svg) {
  opacity: 0.4;
  transition: opacity 160ms ease, transform 200ms ease;
}
.ap-switcher__group-head:hover { border-bottom-color: color-mix(in srgb, var(--ap-primary) 60%, transparent); }
.ap-switcher__group-head:hover .ap-eyebrow { color: var(--ap-primary); }
.ap-switcher__group-head:hover :deep(svg) { opacity: 0.9; transform: translateX(2px); }
.ap-switcher__row { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.4rem; }
.ap-switcher__chip {
  background: transparent; color: var(--ap-ink);
  border: 1px solid color-mix(in srgb, var(--ap-line) 80%, transparent);
  border-radius: 999px;
  padding: 0.3rem 0.7rem; font-size: 0.78rem;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
}
.ap-switcher__chip:hover { border-color: var(--ap-ink); }
.ap-switcher__chip.is-active {
  background: var(--ap-ink); color: var(--ap-surface); border-color: var(--ap-ink);
}
.ap-switcher__chip--icon {
  display: inline-flex; align-items: center; gap: 0.4rem;
}
.ap-switcher__chip.is-locked {
  opacity: 0.75;
  border-style: dashed;
}
.ap-switcher__upgrade {
  display: flex; align-items: flex-start; gap: 0.45rem;
  margin: 0.55rem 0 0;
  padding: 0.55rem 0.7rem;
  border: 1px dashed color-mix(in srgb, var(--ap-primary) 45%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--ap-primary) 7%, transparent);
  font-size: 0.75rem; line-height: 1.45;
  color: var(--ap-ink);
}
.ap-switcher__upgrade :deep(svg) { flex-shrink: 0; margin-top: 0.1rem; color: var(--ap-primary); }
.ap-switcher__upgrade a { font-weight: 600; }
.ap-switcher__swatch {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--ap-line) 70%, transparent);
  padding: 0; cursor: pointer;
}
.ap-switcher__swatch.is-active { outline: 2px solid; outline-offset: 2px; }

/* ── Color Lab ──────────────────────────────────────────
   Theory groups render as titled clusters; each swatch is a tile painted
   in its own SURFACE color (the background is the point), with primary +
   accent dots and the palette name set in its own ink. */
.ap-lab__theory { margin-bottom: 0.6rem; }
.ap-lab__theory--mine {
  margin-bottom: 0;
  padding-top: 0.6rem;
  border-top: 1px dashed color-mix(in srgb, var(--ap-line) 80%, transparent);
}
.ap-lab__theory-head {
  display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap;
  margin-bottom: 0.3rem;
}
.ap-lab__theory-name {
  font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ap-ink);
}
/* Studio-wide light/dark mode toggle */
.ap-lab__modes-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.6rem; margin-bottom: 0.6rem;
}
.ap-switcher__color-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.6rem;
}
.ap-modes {
  display: inline-flex; gap: 0;
  border: 1px solid color-mix(in srgb, var(--ap-line) 85%, transparent);
  border-radius: 999px;
  padding: 2px;
  background: color-mix(in srgb, var(--ap-ink) 4%, transparent);
}
.ap-modes__btn {
  display: inline-flex; align-items: center; gap: 0.3rem;
  border: 0; background: transparent; cursor: pointer;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  font: inherit; font-size: 0.7rem; font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--ap-ink-muted);
  transition: background 140ms ease, color 140ms ease;
}
.ap-modes__btn.is-active {
  background: var(--ap-ink);
  color: var(--ap-surface);
}
.ap-lab__swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 0.4rem;
}
.ap-lab__swatch {
  position: relative;
  display: flex; align-items: center; gap: 0.45rem;
  padding: 0.42rem 0.55rem;
  border: 1.5px solid;
  border-radius: var(--ap-radius, 8px);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.ap-lab__swatch:hover { transform: translateY(-1px); box-shadow: 0 4px 14px -6px color-mix(in srgb, var(--ap-ink) 40%, transparent); }
.ap-lab__swatch.is-active { box-shadow: 0 0 0 2px color-mix(in srgb, var(--ap-primary) 30%, transparent); }
.ap-lab__swatch-dots { display: inline-flex; gap: 3px; flex-shrink: 0; }
.ap-lab__swatch-dots span {
  width: 13px; height: 13px; border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.12);
  display: block;
}
.ap-lab__swatch-name {
  font-size: 0.7rem; font-weight: 600;
  line-height: 1.1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ap-lab__swatch-check { margin-left: auto; flex-shrink: 0; }

/* Custom palette tiles: apply zone + delete affordance */
.ap-lab__swatch--custom { padding: 0; overflow: hidden; }
.ap-lab__swatch-hit {
  display: flex; align-items: center; gap: 0.45rem;
  flex: 1; min-width: 0;
  padding: 0.5rem 0.2rem 0.5rem 0.6rem;
  background: transparent; border: 0; cursor: pointer; font: inherit;
  text-align: left;
}
.ap-lab__swatch-del {
  background: transparent; border: 0; cursor: pointer;
  padding: 0.5rem 0.55rem;
  display: inline-flex; align-items: center;
  opacity: 0.55;
  transition: opacity 140ms ease;
}
.ap-lab__swatch-del:hover { opacity: 1; }
.ap-lab__new { margin-top: 0.6rem; }

/* Builder */
.ap-lab__builder {
  margin-top: 0.75rem;
  padding: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--ap-line) 80%, transparent);
  border-radius: var(--ap-radius-lg, 12px);
  display: grid; gap: 0.7rem;
  background: color-mix(in srgb, var(--ap-ink) 3%, transparent);
}
.ap-lab__builder-label {
  display: block;
  font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ap-ink-muted);
  margin-bottom: 0.3rem;
}
.ap-lab__hue { display: block; }
.ap-lab__hue-slider {
  width: 100%;
  height: 14px;
  appearance: none; -webkit-appearance: none;
  border-radius: 999px;
  background: linear-gradient(90deg,
    hsl(0, 75%, 55%), hsl(60, 75%, 55%), hsl(120, 75%, 45%),
    hsl(180, 75%, 45%), hsl(240, 75%, 60%), hsl(300, 75%, 55%), hsl(359, 75%, 55%));
  outline: none;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--ap-ink) 15%, transparent);
}
.ap-lab__hue-slider::-webkit-slider-thumb {
  appearance: none; -webkit-appearance: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: #fff;
  border: 2px solid var(--ap-ink);
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  cursor: grab;
}
.ap-lab__hue-slider::-moz-range-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; border: 2px solid var(--ap-ink);
  cursor: grab;
}
.ap-lab__preview {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 0.7rem;
  border: 1.5px solid;
  border-radius: var(--ap-radius, 8px);
}
.ap-lab__preview-chip {
  width: 22px; height: 22px; border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.14);
  display: block;
}
.ap-lab__preview-type {
  margin-left: auto;
  font-family: var(--ap-font-heading);
  font-size: 1.05rem; font-weight: 700;
}
.ap-lab__builder-row { display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; }
.ap-lab__name {
  flex: 1; min-width: 140px;
  padding: 0.42rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--ap-line) 85%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ap-surface) 80%, transparent);
  color: var(--ap-ink);
  font: inherit; font-size: 0.78rem;
}
.ap-lab__name:focus { outline: none; border-color: var(--ap-primary); }
.ap-switcher__hint {
  margin: 0.25rem 0 0.6rem; font-size: 0.78rem;
  color: var(--ap-ink-muted);
}
.ap-switcher__span { grid-column: 1 / -1; }

/* ── Edit-content tab ── */
.ap-switcher__tab--edit.is-active :deep(svg),
.ap-switcher__tab--edit:hover :deep(svg) { color: var(--ap-primary); }

.ap-edit-toggle {
  display: flex; align-items: center; gap: 0.75rem; width: 100%;
  padding: 0.7rem 0.8rem; margin-bottom: 0.5rem;
  background: var(--ap-surface-alt); color: var(--ap-ink);
  border: 1px solid color-mix(in srgb, var(--ap-line) 80%, transparent);
  border-radius: 12px; cursor: pointer; text-align: left;
  transition: border-color 160ms ease, background 160ms ease;
}
.ap-edit-toggle.is-on { border-color: var(--ap-primary); background: color-mix(in srgb, var(--ap-primary) 8%, var(--ap-surface-alt)); }
.ap-edit-toggle__track {
  width: 40px; height: 24px; flex-shrink: 0; border-radius: 999px;
  background: color-mix(in srgb, var(--ap-ink) 20%, transparent);
  position: relative; transition: background 180ms ease;
}
.ap-edit-toggle.is-on .ap-edit-toggle__track { background: var(--ap-primary); }
.ap-edit-toggle__thumb {
  position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
  border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.3, 1.2);
}
.ap-edit-toggle.is-on .ap-edit-toggle__thumb { transform: translateX(16px); }
.ap-edit-toggle__label { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.ap-edit-toggle__label strong { font-size: 0.86rem; }
.ap-edit-toggle__label small { font-size: 0.72rem; color: var(--ap-ink-muted); line-height: 1.35; }

.ap-edit-scroll { max-height: 44vh; overflow-y: auto; margin: 0 -0.2rem; padding: 0 0.2rem; }
.ap-edit-group { margin-bottom: 0.85rem; }
.ap-edit-group__title {
  font-size: 0.66rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ap-ink-muted); margin: 0.4rem 0 0.35rem;
}
.ap-edit-field { margin-bottom: 0.5rem; padding: 0.15rem; border-radius: 8px; }
.ap-edit-field.is-active { background: color-mix(in srgb, var(--ap-primary) 10%, transparent); }
.ap-edit-field__label {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: none; border: 0; padding: 0 0 0.2rem; cursor: pointer;
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.04em;
  color: var(--ap-ink-muted);
}
.ap-edit-field__label:hover { color: var(--ap-primary); }
.ap-edit-field__input {
  width: 100%; padding: 0.4rem 0.55rem;
  background: var(--ap-surface); color: var(--ap-ink);
  border: 1px solid color-mix(in srgb, var(--ap-line) 85%, transparent);
  border-radius: 8px; font: inherit; font-size: 0.82rem; line-height: 1.4;
  resize: vertical;
}
.ap-edit-field__input:focus { outline: none; border-color: var(--ap-primary); }

/* Long-paragraph textarea: taller, with an x/y word counter in the corner */
.ap-edit-ta { position: relative; }
.ap-edit-field__input--ta { min-height: 6.5rem; line-height: 1.5; padding-bottom: 1.4rem; }
.ap-edit-ta__count {
  position: absolute; right: 0.5rem; bottom: 0.4rem;
  font-size: 0.64rem; font-variant-numeric: tabular-nums;
  color: var(--ap-ink-muted); pointer-events: none;
  background: color-mix(in srgb, var(--ap-surface) 82%, transparent);
  padding: 0.05rem 0.3rem; border-radius: 5px;
}
.ap-edit-ta__count.is-over { color: #e0574a; }

/* Empty image field: dashed "upload" state instead of a broken thumbnail */
.ap-edit-imgbtn.is-empty {
  aspect-ratio: 16 / 7; border-style: dashed;
  border-color: var(--ap-line); background: var(--ap-surface);
}
.ap-edit-imgbtn.is-empty .ap-edit-imgbtn__cta {
  position: static; inset: auto; opacity: 1;
  background: none; color: var(--ap-primary); height: 100%;
}

/* Image field: thumbnail + hover "Replace" overlay */
.ap-edit-imgbtn {
  position: relative; display: block; width: 100%; padding: 0; cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--ap-line) 85%, transparent);
  border-radius: 8px; overflow: hidden; background: var(--ap-surface-alt);
  aspect-ratio: 16 / 9;
}
.ap-edit-imgbtn:hover { border-color: var(--ap-primary); }
.ap-edit-imgbtn__thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.ap-edit-imgbtn__cta {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 0.35rem;
  background: rgba(0,0,0,0.42); color: #fff; font-size: 0.76rem; font-weight: 600;
  opacity: 0; transition: opacity 140ms ease;
}
.ap-edit-imgbtn:hover .ap-edit-imgbtn__cta { opacity: 1; }

.ap-edit-save {
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  margin-top: 0.75rem; padding-top: 0.75rem;
  border-top: 1px solid color-mix(in srgb, var(--ap-line) 60%, transparent);
}
.ap-edit-save__msg { font-size: 0.74rem; color: var(--ap-ink-muted); }

/* ── Quick color toggles on the Theme tab — just colors, no descriptions ── */
.ap-switcher__colors {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 0.35rem;
  margin-top: 0.4rem;
}
.ap-color {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.45rem;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--ap-line) 80%, transparent);
  border-radius: 999px;
  cursor: pointer; font: inherit;
  transition: border-color 140ms ease, background 140ms ease;
}
.ap-color:hover { border-color: var(--ap-ink); }
.ap-color.is-active {
  border-color: var(--ap-ink);
  background: color-mix(in srgb, var(--ap-ink) 8%, transparent);
}
.ap-color__chip {
  display: inline-flex; flex-shrink: 0;
  width: 22px; height: 22px; border-radius: 50%;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--ap-ink) 18%, transparent);
}
.ap-color__chip span { flex: 1; display: block; }
.ap-color__name {
  font-size: 0.74rem; color: var(--ap-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ap-switcher__studio-link {
  display: inline-flex; align-items: center; gap: 0.35rem;
  margin-top: 0.6rem;
  background: none; border: 0; padding: 0; cursor: pointer;
  color: var(--ap-primary); font: inherit; font-size: 0.76rem; font-weight: 600;
}
.ap-switcher__studio-link:hover { text-decoration: underline; }

/* Config tab: code preview */
.ap-switcher__code {
  margin: 0.5rem 0 0.75rem;
  padding: 0.65rem 0.8rem;
  background: color-mix(in srgb, var(--ap-ink) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--ap-line) 70%, transparent);
  border-radius: 8px;
  font-family: var(--ap-font-mono, ui-monospace, monospace);
  font-size: 0.72rem;
  line-height: 1.55;
  max-height: 240px;
  overflow: auto;
  white-space: pre;
  color: var(--ap-ink);
}

@media (max-width: 720px) {
  .ap-switcher.is-open { width: calc(100vw - 2rem); }
  .ap-switcher__panel { grid-template-columns: 1fr; }
}
</style>