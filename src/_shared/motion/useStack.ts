import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { scrollToY } from './lenis'

/**
 * Stacked spreads. Every `.panel` inside `root` is sticky at the top of the
 * viewport; the next one scrolls up over it. A panel may be followed by a
 * `.spacer` so it stays pinned for extra scroll.
 *
 * Each scroll frame sets `--cover` (0 to 1) on every panel: how far the
 * following panel (or, for the last panel, the element after the stack)
 * has covered it. CSS turns that into blur, scale and fade. It also reports
 * which spread is current and whether the stack is on screen at all.
 */
export function useStack(root: Ref<HTMLElement | null>) {
  const active = ref(0)
  const inView = ref(false)
  const progress = ref(0)
  let raf = 0
  let panels: HTMLElement[] = []
  let tail: HTMLElement | null = null

  const anchorTop = (p: HTMLElement) => {
    const el = root.value
    if (!el) return 0
    let y = el.getBoundingClientRect().top + window.scrollY
    for (const child of Array.from(el.children)) {
      if (child === p) break
      y += (child as HTMLElement).offsetHeight
    }
    return y
  }

  const update = () => {
    raf = 0
    const el = root.value
    if (!el) return
    const vh = window.innerHeight
    let current = 0
    for (let i = 0; i < panels.length; i++) {
      const next = panels[i + 1] ?? tail
      const cover = next ? Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh)) : 0
      panels[i]!.style.setProperty('--cover', cover.toFixed(3))
      panels[i]!.classList.toggle('covered', cover > 0.004)
      if (panels[i]!.getBoundingClientRect().top <= vh * 0.5) current = i
    }
    active.value = current
    const r = el.getBoundingClientRect()
    inView.value = r.top <= vh * 0.35 && r.bottom >= vh * 0.65
    const total = el.offsetHeight - vh
    progress.value = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0
  }

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update)
  }

  const scrollTo = (i: number) => {
    const p = panels[i]
    if (p) scrollToY(anchorTop(p))
  }

  onMounted(() => {
    if (!root.value) return
    panels = Array.from(root.value.querySelectorAll<HTMLElement>('.panel'))
    tail = root.value.nextElementSibling as HTMLElement | null
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    update()
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
  })

  return { active, inView, progress, scrollTo }
}
