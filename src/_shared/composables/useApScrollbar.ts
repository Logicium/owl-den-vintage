/**
 * useApScrollbar — Fully custom (non-native) scrollbar manager.
 *
 *   • Hides native scrollbars globally (see scrollbar.css).
 *   • Renders a fixed overlay vertical scrollbar for window scroll.
 *   • Auto-wraps every element with computed overflow-x:auto|scroll OR
 *     overflow-y:auto|scroll in a flex container and appends an inline
 *     bar in the document flow (no absolute positioning).
 *   • The inline bar is *always* rendered (thumb fills the rail when
 *     there is no overflow) so layout doesn't jump on/off.
 *   • Pure JS + DOM; no Vue templates so it works regardless of mount tree.
 *   • All visuals are CSS-driven via the `.ap-cscroll*` classes, which pick
 *     up per-theme tokens from scrollbar.css.
 *   • Touch-friendly: thumb has `min-size: 48px`, supports pointer drag.
 */
const MIN_THUMB = 48
const HIDE_DELAY = 900

type Cleanup = () => void

function makeBar(orientation: 'y' | 'x', mode: 'page' | 'inline') {
  const bar = document.createElement('div')
  bar.className = `ap-cscroll ap-cscroll--${orientation} ap-cscroll--${mode}`
  bar.setAttribute('aria-hidden', 'true')
  const thumb = document.createElement('div')
  thumb.className = 'ap-cscroll__thumb'
  bar.appendChild(thumb)
  return { bar, thumb }
}

function bindDrag(
  thumb: HTMLElement,
  bar: HTMLElement,
  axis: 'y' | 'x',
  getMetrics: () => { trackAvail: number; thumbSize: number; scrollMax: number },
  setScroll: (v: number) => void,
) {
  let dragging = false
  let offset = 0

  thumb.addEventListener('pointerdown', (e) => {
    const m = getMetrics()
    if (m.scrollMax <= 0) return
    dragging = true
    const r = thumb.getBoundingClientRect()
    offset = axis === 'y' ? e.clientY - r.top : e.clientX - r.left
    thumb.setPointerCapture(e.pointerId)
    bar.classList.add('is-dragging')
    e.preventDefault()
  })
  thumb.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const tr = bar.getBoundingClientRect()
    const m = getMetrics()
    if (m.trackAvail <= 0) return
    const pos = axis === 'y' ? e.clientY - tr.top - offset : e.clientX - tr.left - offset
    const clamped = Math.max(0, Math.min(m.trackAvail, pos))
    setScroll((clamped / m.trackAvail) * m.scrollMax)
  })
  const release = () => {
    dragging = false
    bar.classList.remove('is-dragging')
  }
  thumb.addEventListener('pointerup', release)
  thumb.addEventListener('pointercancel', release)

  bar.addEventListener('pointerdown', (e) => {
    if (e.target !== bar) return
    const m = getMetrics()
    if (m.scrollMax <= 0) return
    const tr = bar.getBoundingClientRect()
    const pos = axis === 'y' ? e.clientY - tr.top - m.thumbSize / 2 : e.clientX - tr.left - m.thumbSize / 2
    const clamped = Math.max(0, Math.min(m.trackAvail, pos))
    setScroll((clamped / m.trackAvail) * m.scrollMax)
  })
}

function pageScrollbar(): Cleanup {
  const { bar, thumb } = makeBar('y', 'page')
  document.body.appendChild(bar)

  let hideTimer: number | undefined

  function update() {
    const docH = document.documentElement.scrollHeight
    const viewH = window.innerHeight
    const trackH = bar.clientHeight
    if (docH <= viewH + 1) {
      thumb.style.height = trackH + 'px'
      thumb.style.transform = 'translateY(0)'
      bar.classList.add('is-empty')
      return
    }
    bar.classList.remove('is-empty')
    const ratio = viewH / docH
    const thumbH = Math.max(MIN_THUMB, Math.round(ratio * trackH))
    const trackAvail = trackH - thumbH
    const scrollMax = docH - viewH
    const top = scrollMax > 0 ? (window.scrollY / scrollMax) * trackAvail : 0
    thumb.style.height = thumbH + 'px'
    thumb.style.transform = `translateY(${top}px)`
  }

  function flash() {
    bar.classList.add('is-active')
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => bar.classList.remove('is-active'), HIDE_DELAY)
  }

  function getMetrics() {
    const docH = document.documentElement.scrollHeight
    const viewH = window.innerHeight
    const trackH = bar.clientHeight
    const ratio = viewH / docH
    const thumbSize = Math.max(MIN_THUMB, Math.round(ratio * trackH))
    return { trackAvail: trackH - thumbSize, thumbSize, scrollMax: docH - viewH }
  }
  bindDrag(thumb, bar, 'y', getMetrics, (v) => window.scrollTo({ top: v, behavior: 'auto' }))

  const onScroll = () => { update(); flash() }
  const onResize = () => update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  const ro = new ResizeObserver(update)
  ro.observe(document.documentElement)
  ro.observe(document.body)
  update()

  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    ro.disconnect()
    bar.remove()
  }
}

const attached = new WeakMap<Element, Cleanup>()

/**
 * Wrap a scrolling element so we can append an inline bar as a sibling that
 * takes real layout space (no absolute positioning).
 */
function wrapForBar(el: HTMLElement, axis: 'x' | 'y'): HTMLElement | null {
  const parent = el.parentNode
  if (!parent) return null
  const wrap = document.createElement('div')
  wrap.className = `ap-cscroll-wrap ap-cscroll-wrap--${axis}`
  parent.insertBefore(wrap, el)
  wrap.appendChild(el)
  return wrap
}

function inlineScrollbar(el: HTMLElement, axis: 'x' | 'y') {
  if (attached.has(el)) return
  // Mark as attached IMMEDIATELY (before any DOM mutation) so that the
  // MutationObserver / re-scan triggered by wrapForBar() can't pick this
  // element up a second time and produce a duplicate bar.
  attached.set(el, () => { /* placeholder replaced below */ })
  el.classList.add('ap-cscroll-host', `ap-cscroll-host--${axis}`)
  const wrap = wrapForBar(el, axis)
  if (!wrap) { attached.delete(el); return }

  const { bar, thumb } = makeBar(axis, 'inline')
  wrap.appendChild(bar)

  let hideTimer: number | undefined

  function update() {
    if (axis === 'x') {
      const sw = el.scrollWidth
      const cw = el.clientWidth
      const trackW = bar.clientWidth
      if (sw <= cw + 1) {
        thumb.style.width = trackW + 'px'
        thumb.style.transform = 'translateX(0)'
        bar.classList.add('is-empty')
        return
      }
      bar.classList.remove('is-empty')
      const ratio = cw / sw
      const thumbW = Math.max(MIN_THUMB, Math.round(ratio * trackW))
      const trackAvail = trackW - thumbW
      const scrollMax = sw - cw
      const left = scrollMax > 0 ? (el.scrollLeft / scrollMax) * trackAvail : 0
      thumb.style.width = thumbW + 'px'
      thumb.style.transform = `translateX(${left}px)`
    } else {
      const sh = el.scrollHeight
      const ch = el.clientHeight
      const trackH = bar.clientHeight
      if (sh <= ch + 1) {
        thumb.style.height = trackH + 'px'
        thumb.style.transform = 'translateY(0)'
        bar.classList.add('is-empty')
        return
      }
      bar.classList.remove('is-empty')
      const ratio = ch / sh
      const thumbH = Math.max(MIN_THUMB, Math.round(ratio * trackH))
      const trackAvail = trackH - thumbH
      const scrollMax = sh - ch
      const top = scrollMax > 0 ? (el.scrollTop / scrollMax) * trackAvail : 0
      thumb.style.height = thumbH + 'px'
      thumb.style.transform = `translateY(${top}px)`
    }
  }

  function flash() {
    bar.classList.add('is-active')
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => bar.classList.remove('is-active'), HIDE_DELAY)
  }

  function getMetrics() {
    if (axis === 'x') {
      const sw = el.scrollWidth
      const cw = el.clientWidth
      const trackW = bar.clientWidth
      const scrollMax = sw - cw
      if (scrollMax <= 0) return { trackAvail: 0, thumbSize: trackW, scrollMax: 0 }
      const ratio = cw / sw
      const thumbSize = Math.max(MIN_THUMB, Math.round(ratio * trackW))
      return { trackAvail: trackW - thumbSize, thumbSize, scrollMax }
    } else {
      const sh = el.scrollHeight
      const ch = el.clientHeight
      const trackH = bar.clientHeight
      const scrollMax = sh - ch
      if (scrollMax <= 0) return { trackAvail: 0, thumbSize: trackH, scrollMax: 0 }
      const ratio = ch / sh
      const thumbSize = Math.max(MIN_THUMB, Math.round(ratio * trackH))
      return { trackAvail: trackH - thumbSize, thumbSize, scrollMax }
    }
  }
  bindDrag(thumb, bar, axis, getMetrics, (v) => {
    if (axis === 'x') el.scrollLeft = v
    else el.scrollTop = v
  })

  const onScroll = () => { update(); flash() }
  el.addEventListener('scroll', onScroll, { passive: true })
  const ro = new ResizeObserver(update)
  ro.observe(el)
  ro.observe(bar)
  const mo = new MutationObserver(update)
  mo.observe(el, { childList: true, subtree: true })
  update()

  attached.set(el, () => {
    el.removeEventListener('scroll', onScroll)
    ro.disconnect()
    mo.disconnect()
    bar.remove()
  })
}

function isScrollable(value: string): boolean {
  return value === 'auto' || value === 'scroll'
}

function scanScrollers() {
  // Reap orphaned wrappers: wrapForBar() reparents elements Vue owns, so a
  // route unmount can leave an empty flex wrap (+ bar) behind. Left in
  // place they shred the re-rendered page into flex columns.
  document.querySelectorAll<HTMLElement>('.ap-cscroll-wrap').forEach((w) => {
    if (!w.querySelector('.ap-cscroll-host')) w.remove()
  })

  // Explicit opt-ins first
  document.querySelectorAll<HTMLElement>('.ap-scroll-x').forEach((el) => inlineScrollbar(el, 'x'))
  document.querySelectorAll<HTMLElement>('.ap-scroll-y').forEach((el) => inlineScrollbar(el, 'y'))

  const all = document.querySelectorAll<HTMLElement>('body *')
  for (const el of all) {
    if (attached.has(el)) continue
    if (el.classList.contains('ap-cscroll') || el.classList.contains('ap-cscroll__thumb')) continue
    if (el.classList.contains('ap-cscroll-wrap')) continue
    // Skip anything that lives inside a custom scrollbar's chrome.
    if (el.closest('.ap-cscroll')) continue
    // The admin overlay manages its own (native, thin) scrollbars — wrapping
    // its Vue-managed panels breaks their flex widths and corrupts unmount.
    if (el.closest('.admin-shell')) continue
    if (el.tagName === 'HTML' || el.tagName === 'BODY') continue
    const cs = getComputedStyle(el)
    const sx = isScrollable(cs.overflowX)
    const sy = isScrollable(cs.overflowY)
    if (!sx && !sy) continue
    // Choose axis based on actual overflow direction; if neither overflows
    // yet, fall back to the explicitly-declared scrollable axis (preferring
    // y for 'auto' overflow which defaults to vertical text flow).
    const overflowsX = el.scrollWidth - el.clientWidth > 1
    const overflowsY = el.scrollHeight - el.clientHeight > 1
    if (overflowsY && sy) { inlineScrollbar(el, 'y'); continue }
    if (overflowsX && sx) { inlineScrollbar(el, 'x'); continue }
    if (sy) inlineScrollbar(el, 'y')
    else if (sx) inlineScrollbar(el, 'x')
  }
}

let installed = false
export function useApScrollbar() {
  if (typeof window === 'undefined' || installed) return
  installed = true

  pageScrollbar()

  scanScrollers()
  const mo = new MutationObserver(() => scanScrollers())
  mo.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', () => scanScrollers())
}
