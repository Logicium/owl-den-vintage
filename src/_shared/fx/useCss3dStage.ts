import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import type * as ThreeNS from 'three'
import type { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'
import type { Three } from './useGLField'

/**
 * Dual-renderer stage for spatial DOM galleries, following the same
 * lifecycle contract as useGLField: a frame loop that parks when the host
 * scrolls away or the tab hides, resize plumbing, full teardown.
 *
 * Two renderers share one camera. The WebGL layer sits behind (z-index 0,
 * pointer-events none) and carries atmosphere only; the CSS3D layer carries
 * real DOM photo planes, so images stay crisp at any size and click/hover
 * behave like ordinary elements. Both three.js and the CSS3D addon are
 * loaded lazily on mount.
 */
export interface StageContext {
  THREE: Three
  CSS3DObject: typeof import('three/addons/renderers/CSS3DRenderer.js').CSS3DObject
  glRenderer: ThreeNS.WebGLRenderer
  cssRenderer: CSS3DRenderer
  glScene: ThreeNS.Scene
  cssScene: ThreeNS.Scene
  width: number
  height: number
  reduced: boolean
}

export interface StageHooks {
  setup: (ctx: StageContext) => ThreeNS.PerspectiveCamera
  layout: (ctx: StageContext, camera: ThreeNS.PerspectiveCamera) => void
  paint: (t: number, ctx: StageContext) => void | false
  teardown?: () => void
}

export function useCss3dStage(host: Ref<HTMLElement | null>, hooks: StageHooks) {
  let stop: (() => void) | null = null
  let alive = true

  async function build() {
    stop?.()
    const el = host.value
    if (!el) return
    let THREE: Three
    let addon: typeof import('three/addons/renderers/CSS3DRenderer.js')
    try {
      ;[THREE, addon] = await Promise.all([import('three'), import('three/addons/renderers/CSS3DRenderer.js')])
    } catch {
      return
    }
    if (!alive) return

    let glRenderer: ThreeNS.WebGLRenderer
    try {
      glRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    glRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    glRenderer.domElement.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;'

    const cssRenderer = new addon.CSS3DRenderer()
    cssRenderer.domElement.style.cssText = 'position:absolute;inset:0;z-index:1;'

    el.appendChild(glRenderer.domElement)
    el.appendChild(cssRenderer.domElement)

    const ctx: StageContext = {
      THREE,
      CSS3DObject: addon.CSS3DObject,
      glRenderer,
      cssRenderer,
      glScene: new THREE.Scene(),
      cssScene: new THREE.Scene(),
      width: el.clientWidth || 1,
      height: el.clientHeight || 1,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }

    const camera = hooks.setup(ctx)

    function resize() {
      ctx.width = el!.clientWidth || 1
      ctx.height = el!.clientHeight || 1
      camera.aspect = ctx.width / ctx.height
      camera.updateProjectionMatrix()
      glRenderer.setSize(ctx.width, ctx.height, false)
      cssRenderer.setSize(ctx.width, ctx.height)
      hooks.layout(ctx, camera)
    }
    resize()

    const render = () => {
      glRenderer.render(ctx.glScene, camera)
      cssRenderer.render(ctx.cssScene, camera)
    }
    hooks.paint(0, ctx)
    render()

    let raf = 0
    let onScreen = true
    let running = true
    const start = performance.now()

    function frame() {
      if (!onScreen || document.hidden || !running) {
        raf = 0
        return
      }
      const result = hooks.paint((performance.now() - start) / 1000, ctx)
      if (result === false) running = false
      render()
      raf = running ? requestAnimationFrame(frame) : 0
    }
    function play() {
      if (!raf && onScreen && running && !document.hidden) raf = requestAnimationFrame(frame)
    }
    play()

    const onVis = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : play())
    document.addEventListener('visibilitychange', onVis)

    const ro = new ResizeObserver(() => {
      resize()
      hooks.paint((performance.now() - start) / 1000, ctx)
      render()
    })
    ro.observe(el)

    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false
        if (!onScreen) {
          cancelAnimationFrame(raf)
          raf = 0
        } else play()
      },
      { threshold: 0.05 },
    )
    io.observe(el)

    stop = () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      ro.disconnect()
      io.disconnect()
      hooks.teardown?.()
      glRenderer.dispose()
      for (const child of [glRenderer.domElement, cssRenderer.domElement]) {
        if (child.parentNode === el) el.removeChild(child)
      }
      stop = null
    }
  }

  onMounted(build)
  onBeforeUnmount(() => {
    alive = false
    stop?.()
  })

  return { rebuild: build }
}
