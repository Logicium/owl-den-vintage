import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import type * as ThreeNS from 'three'

/**
 * The shared plumbing behind every WebGL field in the Archetypes.
 *
 * A renderer sized to its host, a frame loop that parks itself when the
 * field scrolls away or the tab hides, a resize hook, and a clean teardown.
 * What each field owns is its scene, its camera and its paint.
 *
 * three.js is loaded lazily on mount (`import('three')`), so a theme that
 * never mounts a field ships none of it. Hooks receive the module on `ctx`.
 */
export type Three = typeof ThreeNS

export interface GLContext {
  THREE: Three
  renderer: ThreeNS.WebGLRenderer
  scene: ThreeNS.Scene
  width: number
  height: number
  /** true when the visitor asked for less motion */
  reduced: boolean
}

export interface GLHooks {
  /** build geometry and the camera; return the camera to render with */
  setup: (ctx: GLContext) => ThreeNS.Camera
  /** called on mount and on every resize */
  layout: (ctx: GLContext, camera: ThreeNS.Camera) => void
  /** seconds since start; return false to stop the loop */
  paint: (t: number, ctx: GLContext) => void | false
  /** dispose anything setup created */
  teardown?: () => void
  /** frames per second cap (default: display rate) */
  fps?: number
}

/** Reads the live swatch off <html> so fields always match the site colors. */
export function readSwatchPalette() {
  const cs = getComputedStyle(document.documentElement)
  const get = (k: string, fb: string) => (cs.getPropertyValue(k).trim() || fb)
  return {
    primary: get('--ap-primary', '#2447e8'),
    accent: get('--ap-accent', '#ff3d00'),
    surface: get('--ap-surface', '#f2f0eb'),
    surfaceAlt: get('--ap-surface-alt', '#e7e4dc'),
    ink: get('--ap-ink', '#0a0a0a'),
    inkMuted: get('--ap-ink-muted', '#6b6b6b'),
    line: get('--ap-line', '#d8d5cd'),
    mode: document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light',
  }
}

/** Fires whenever the swatch/theme attributes on <html> change. */
export function onSwatchChange(cb: () => void): () => void {
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && (m.attributeName === 'data-swatch' || m.attributeName === 'data-theme' || m.attributeName === 'data-mode')) {
        cb()
        return
      }
    }
  })
  mo.observe(document.documentElement, { attributes: true })
  return () => mo.disconnect()
}

export function useGLField(host: Ref<HTMLElement | null>, hooks: GLHooks, deps: () => unknown = () => 0) {
  let stop: (() => void) | null = null
  let alive = true
  let THREE: Three | null = null

  function build() {
    stop?.()
    const el = host.value
    if (!el || !THREE || !alive) return

    let renderer: ThreeNS.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // no WebGL: the paper stands alone
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const ctx: GLContext = {
      THREE,
      renderer,
      scene: new THREE.Scene(),
      width: el.clientWidth || 1,
      height: el.clientHeight || 1,
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }

    const camera = hooks.setup(ctx)

    function resize() {
      ctx.width = el!.clientWidth || 1
      ctx.height = el!.clientHeight || 1
      renderer.setSize(ctx.width, ctx.height, false)
      hooks.layout(ctx, camera)
    }
    resize()

    // a frame mid-cycle, so a parked field still reads as the field
    hooks.paint(ctx.reduced ? 1.2 : 0, ctx)
    renderer.render(ctx.scene, camera)

    let raf = 0
    let onScreen = true
    let running = true
    let last = 0
    const minGap = hooks.fps ? 1000 / hooks.fps : 0
    const start = performance.now()

    function frame(now: number) {
      if (!onScreen || document.hidden || !running) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(frame)
      if (minGap && now - last < minGap) return
      last = now
      const result = hooks.paint((now - start) / 1000, ctx)
      if (result === false) { running = false; cancelAnimationFrame(raf); raf = 0 }
      renderer.render(ctx.scene, camera)
    }
    function play() {
      if (!ctx.reduced && !raf && onScreen && running && !document.hidden) {
        raf = requestAnimationFrame(frame)
      }
    }
    play()

    const onVis = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : play())
    document.addEventListener('visibilitychange', onVis)

    const ro = new ResizeObserver(() => {
      resize()
      hooks.paint(ctx.reduced ? 1.2 : (performance.now() - start) / 1000, ctx)
      renderer.render(ctx.scene, camera)
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
      { threshold: 0.02, rootMargin: '120px' },
    )
    io.observe(el)

    stop = () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      ro.disconnect()
      io.disconnect()
      hooks.teardown?.()
      renderer.dispose()
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
      stop = null
    }
  }

  onMounted(async () => {
    try {
      THREE = await import('three')
    } catch {
      return
    }
    if (alive) build()
  })
  watch(deps, () => build())
  onBeforeUnmount(() => {
    alive = false
    stop?.()
  })

  return { rebuild: build }
}

/** Screen-space orthographic camera: y grows downward, like CSS. */
export function screenCamera(THREE: Three): ThreeNS.OrthographicCamera {
  const cam = new THREE.OrthographicCamera(0, 1, 0, 1, -100, 100)
  cam.position.z = 1
  return cam
}

export function fitScreenCamera(cam: ThreeNS.OrthographicCamera, w: number, h: number): void {
  cam.right = w
  cam.bottom = h
  cam.updateProjectionMatrix()
}

/**
 * Frame an orthographic camera so a world box of `worldW` x `worldH` always
 * fits, whatever shape the host is.
 */
export function containOrtho(
  cam: ThreeNS.OrthographicCamera,
  pxW: number,
  pxH: number,
  worldW: number,
  worldH: number,
): void {
  const scale = Math.max(worldW / Math.max(1, pxW), worldH / Math.max(1, pxH))
  const halfW = (pxW * scale) / 2
  const halfH = (pxH * scale) / 2
  cam.left = -halfW
  cam.right = halfW
  cam.top = halfH
  cam.bottom = -halfH
  cam.updateProjectionMatrix()
}

/* True isometric: camera down the (1,1,1) diagonal. Rows laid along (1,0,-1)
   project to pure screen-horizontal, so they read flat across the panel. */
export const ISO_X = Math.SQRT2
export const ISO_Y = Math.sqrt(2 / 3)

export function isoCamera(THREE: Three, lookAtY = 0): ThreeNS.OrthographicCamera {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200)
  const d = 60
  cam.position.set(d, d, d)
  cam.up.set(0, 1, 0)
  cam.lookAt(0, lookAtY, 0)
  return cam
}

export function isoSlot(i: number, n: number, spacing: number): { x: number; z: number } {
  const u = (i - (n - 1) / 2) * spacing
  return { x: u, z: -u }
}
