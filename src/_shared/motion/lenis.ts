/**
 * One inertial scroller for the whole site. Native scrolling stays in
 * place; Lenis eases the wheel and drives `scrollTo`, so every scroll-driven
 * value on the page (parallax, rails, index counters) inherits the same
 * smoothing. Off when the visitor asks for reduced motion, and loaded
 * lazily so themes that never turn it on ship none of it.
 */
type LenisLike = {
  raf: (t: number) => void
  destroy: () => void
  scrollTo: (target: number | HTMLElement, opts?: { immediate?: boolean; duration?: number; offset?: number }) => void
  stop: () => void
  start: () => void
}

let lenis: LenisLike | null = null

/** True for an element that scrolls its own content (not the document). */
function isNestedScroller(node: Element): boolean {
  if (!(node instanceof HTMLElement)) return false
  if (node === document.documentElement || node === document.body) return false
  const { overflowY, overflowX } = getComputedStyle(node)
  const scrollsY = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1
  const scrollsX = (overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 1
  return scrollsY || scrollsX
}
let raf = 0
let starting: Promise<LenisLike | null> | null = null

export async function startLenis(): Promise<LenisLike | null> {
  if (lenis) return lenis
  if (starting) return starting
  if (typeof window === 'undefined') return null
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  // coarse pointers scroll natively; smoothing there fights the OS
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return null
  starting = import('lenis').then((mod) => {
    const Lenis = mod.default
    lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
      smoothWheel: true,
      // Lenis owns the WINDOW. Anything that scrolls on its own inside the
      // page (the owner dashboard overlay, the theme switcher's tabs, an
      // ordering cart) must get the wheel natively, or Lenis swallows the
      // event and tries to move a document that is often scroll-locked
      // underneath — the dashboard then only scrolls by dragging its bar.
      // `prevent` runs for every element on the event's path, so a wheel
      // over any nested scroller that really overflows is handed back.
      prevent: (node: Element) => isNestedScroller(node),
    }) as unknown as LenisLike
    const loop = (t: number) => {
      lenis?.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    document.documentElement.classList.add('ap-lenis')
    starting = null
    return lenis
  }).catch((err) => {
    if (import.meta.env?.DEV) console.warn('[archetype-motion] lenis failed to load', err)
    starting = null
    return null
  })
  return starting
}

export function stopLenis() {
  cancelAnimationFrame(raf)
  lenis?.destroy()
  lenis = null
  document.documentElement.classList.remove('ap-lenis')
}

export function getLenis() {
  return lenis
}

/** Scroll to a document offset with the same easing as the wheel. */
export function scrollToY(top: number, immediate = false) {
  if (lenis) lenis.scrollTo(top, { immediate, duration: 1.4 })
  else window.scrollTo({ top, behavior: immediate ? 'auto' : 'smooth' })
}
