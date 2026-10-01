/**
 * useSectionFlash — utility to scroll-into-view a section element and flash
 * its content (inverted colors) to indicate "this is what that setting changes".
 *
 * Selectors are resolved against the current page; if not found and a route
 * is supplied, navigates there first and then scrolls + flashes on the
 * next view.
 */
import { useRouter, useRoute } from 'vue-router'

const FLASH_CLASS = 'ap-flash-invert'
const FLASH_MS = 1800

function flash(el: HTMLElement) {
  el.classList.remove(FLASH_CLASS)
  // Force reflow so re-adding restarts the animation.
  void el.offsetWidth
  el.classList.add(FLASH_CLASS)
  window.setTimeout(() => el.classList.remove(FLASH_CLASS), FLASH_MS)
}

function findFirstVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const els = document.querySelectorAll<HTMLElement>(sel)
    for (const el of els) {
      if (el.offsetParent !== null || el.getClientRects().length > 0) return el
    }
  }
  return null
}

function scrollAndFlash(el: HTMLElement) {
  const headerH = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--ap-header-h') || '72',
    10,
  ) || 72
  const top = el.getBoundingClientRect().top + window.scrollY - headerH - 16
  window.scrollTo({ top, behavior: 'smooth' })
  // Wait until smooth scroll settles before flashing (heuristic 350ms).
  window.setTimeout(() => flash(el), 400)
}

export function useSectionFlash() {
  const router = useRouter()
  const route = useRoute()

  /**
   * Go to a section by selector list. Picks the first one that exists on the
   * current page. If none are found and a route is provided, navigates there
   * first and retries after the view mounts.
   */
  function goto(target: { selectors: string[]; route?: string }) {
    const el = findFirstVisible(target.selectors)
    if (el) {
      scrollAndFlash(el)
      return
    }
    if (target.route && route.path !== target.route) {
      router.push(target.route).then(() => {
        // Wait a tick for the new view to mount + render.
        window.setTimeout(() => {
          const el2 = findFirstVisible(target.selectors)
          if (el2) scrollAndFlash(el2)
        }, 120)
      })
    }
  }

  return { goto }
}
