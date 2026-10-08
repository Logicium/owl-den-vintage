import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/**
 * Slides the `img` inside a frame as the frame crosses the viewport. Pure
 * transform on rAF-throttled scroll; disabled under prefers-reduced-motion.
 * The image should be sized taller than its frame (e.g. `height: 120%`) so
 * the travel never exposes the frame edge.
 */
export function useParallax(frame: Ref<HTMLElement | null>, strength = 0.12) {
  let raf = 0

  const update = () => {
    raf = 0
    const el = frame.value
    const img = el?.querySelector('img')
    if (!el || !img) return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    if (rect.bottom < 0 || rect.top > vh) return
    const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2)
    img.style.transform = `translateY(${(-progress * strength * 100).toFixed(2)}%)`
  }

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update)
  }

  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    update()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    if (raf) cancelAnimationFrame(raf)
  })
}
