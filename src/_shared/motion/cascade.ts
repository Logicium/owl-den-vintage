import type { Directive } from 'vue'

/**
 * v-cascade — the entrance for lists, grids and rows.
 *
 * Put it on a container whose children are rows, cards or sheets. Each child
 * is indexed and rises into place on its own delay. Slow on purpose: the
 * point is that the content looks composed rather than dumped.
 *
 * Because lists are often empty on mount and fill when a request lands, the
 * directive re-indexes on every update and only plays a child in once.
 *
 *   v-cascade                       default 90ms per step
 *   v-cascade="140"                 slower step
 *   v-cascade="{ step, selector }"  index only matching children
 */
export interface CascadeOptions {
  step?: number
  /** CSS selector for the children to animate; defaults to every element child */
  selector?: string
}

const ITEM = 'c-item'
const PLAYED = 'c-in'

interface CascadeEl extends HTMLElement {
  _cascade?: {
    step: number
    selector?: string
    io?: IntersectionObserver
    failsafe?: number
    onScreen: boolean
  }
}

/** Children on their way out (`data-leaving`) belong to whatever animates them out. */
function children(el: CascadeEl): HTMLElement[] {
  const sel = el._cascade?.selector
  const list = sel ? el.querySelectorAll<HTMLElement>(sel) : el.children
  return Array.from(list).filter(
    (n): n is HTMLElement => n instanceof HTMLElement && !n.hasAttribute('data-leaving'),
  )
}

function sync(el: CascadeEl) {
  const state = el._cascade
  if (!state) return
  const kids = children(el)
  let fresh = 0
  kids.forEach((kid) => {
    kid.classList.add(ITEM)
    if (kid.classList.contains(PLAYED)) return
    kid.style.setProperty('--i', String(fresh++))
  })
  if (!state.onScreen) return
  requestAnimationFrame(() => {
    for (const kid of kids) kid.classList.add(PLAYED)
  })
}

export const vCascade: Directive<CascadeEl, number | CascadeOptions | undefined> = {
  mounted(el, binding) {
    const opts: CascadeOptions =
      typeof binding.value === 'number' ? { step: binding.value } : (binding.value ?? {})

    el.classList.add('cascade')
    el._cascade = { step: opts.step ?? 90, selector: opts.selector, onScreen: false }
    el.style.setProperty('--cascade-step', `${el._cascade.step}ms`)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el._cascade.onScreen = true
      sync(el)
      return
    }

    // threshold 0: a long list is taller than the viewport, so any ratio at
    // all can be unreachable and the rows would sit in the DOM at opacity 0.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          el._cascade!.onScreen = true
          sync(el)
        }
      },
      { threshold: 0, rootMargin: '0px 0px -4% 0px' },
    )
    io.observe(el)
    el._cascade.io = io
    el._cascade.failsafe = window.setTimeout(() => {
      if (!el._cascade) return
      el._cascade.onScreen = true
      sync(el)
    }, 1200)
    sync(el)
  },
  updated(el) {
    sync(el)
  },
  unmounted(el) {
    el._cascade?.io?.disconnect()
    if (el._cascade?.failsafe) clearTimeout(el._cascade.failsafe)
    delete el._cascade
  },
}
