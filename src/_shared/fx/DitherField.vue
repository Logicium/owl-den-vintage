<script setup lang="ts">
/**
 * DitherField — the Apotome print texture, as weather.
 *
 * A WebGL field of big flat tiles (three.js InstancedMesh of planes) whose
 * color flows along 45° diagonals. Colors are Bayer-quantized into the
 * swatch ramp: pixels, never gradients. Tiles sit perfectly still; the
 * motion is entirely in the color. The pointer tints the field: a tile
 * entering its radius flips to the primary or accent, flat, never blended,
 * and the touch fades by dissolving in Bayer order. Nothing moves, tilts,
 * or scales.
 *
 * The ramp defaults to the live swatch (surface → primary → ink → accent)
 * and rebuilds whenever the swatch changes, so it always belongs to the
 * site it sits on. Reduced motion renders one still frame.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type * as ThreeNS from 'three'
import { readSwatchPalette, onSwatchChange } from './useGLField'

const props = withDefaults(
  defineProps<{
    /** CSS pixel size of one tile */
    cell?: number
    /** color ramp, first = "low" (drawn as empty), last = "high" */
    colors?: string[]
    /** animation speed multiplier */
    speed?: number
    /** pointer interaction on/off */
    interactive?: boolean
    /** how much of the field is lit at rest (0.1 sparse … 0.6 dense) */
    density?: number
  }>(),
  { cell: 28, colors: undefined, speed: 0.6, interactive: true, density: 0.32 },
)

const host = ref<HTMLElement | null>(null)

const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => v / 64))

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >> 13)) | 0
  h = Math.imul(h, 1274126177)
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}
function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function rampFromSwatch(): string[] {
  const p = readSwatchPalette()
  // low slot is drawn as empty, so the surface shows through the grid
  return [p.surface, p.primary, p.ink, p.accent]
}

let cleanup: (() => void) | null = null
let setRamp: ((c: string[]) => void) | null = null

onMounted(async () => {
  if (!host.value) return
  const el = host.value as HTMLElement
  let THREE: typeof ThreeNS
  try {
    THREE = await import('three')
  } catch {
    return
  }
  if (!host.value) return

  let renderer: ThreeNS.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
  } catch {
    return
  }
  el.appendChild(renderer.domElement)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000)

  let ramp = (props.colors ?? rampFromSwatch()).map((c) => new THREE.Color(c))
  let primaries = [ramp[1] ?? ramp[0]!, ramp[3] ?? ramp[1] ?? ramp[0]!]
  setRamp = (c) => {
    ramp = c.map((x) => new THREE.Color(x))
    primaries = [ramp[1] ?? ramp[0]!, ramp[3] ?? ramp[1] ?? ramp[0]!]
    draw(performance.now())
  }

  const PAD = 2
  let cols = 0, rows = 0, cellX = 0, cellY = 0
  let mesh: ThreeNS.InstancedMesh | null = null
  let geometry: ThreeNS.PlaneGeometry | null = null
  let recede = new Float32Array(0)
  let blankState = new Uint8Array(0)
  let tint = new Float32Array(0)
  let tintIdx = new Uint8Array(0)
  let insideState = new Uint8Array(0)
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const dummy = new THREE.Object3D()
  const colorScratch = new THREE.Color()

  let raf = 0
  let last = 0
  let dpr = 1
  const pointer = { x: -1e4, y: -1e4, vx: -1e4, vy: -1e4, energy: 0 }

  function rebuild(w: number, h: number) {
    const visCols = Math.max(2, Math.round(w / props.cell))
    const visRows = Math.max(2, Math.round(h / props.cell))
    cellX = w / visCols
    cellY = h / visRows
    cols = visCols + PAD * 2
    rows = visRows + PAD * 2
    if (mesh) { scene.remove(mesh); mesh.dispose() }
    geometry?.dispose()
    geometry = new THREE.PlaneGeometry(cellX * 0.94, cellY * 0.94)
    mesh = new THREE.InstancedMesh(geometry, material, cols * rows)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    const n = cols * rows
    recede = new Float32Array(n); blankState = new Uint8Array(n)
    tint = new Float32Array(n); tintIdx = new Uint8Array(n); insideState = new Uint8Array(n)
    const w2 = ((cols - PAD * 2 - 1) / 2) * cellX
    const h2 = ((rows - PAD * 2 - 1) / 2) * cellY
    let i = 0
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dummy.position.set((x - PAD) * cellX - w2, h2 - (y - PAD) * cellY, 0)
        dummy.quaternion.identity()
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        i++
      }
    }
    scene.add(mesh)
  }

  function resize() {
    const w = el.clientWidth, h = el.clientHeight
    if (w === 0 || h === 0) return
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
    const sizeChanged =
      Math.max(2, Math.round(w / props.cell)) + PAD * 2 !== cols ||
      Math.max(2, Math.round(h / props.cell)) + PAD * 2 !== rows ||
      nextDpr !== dpr
    if (!sizeChanged && mesh) return
    dpr = nextDpr
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2
    camera.position.set(0, 0, 1000)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    rebuild(w, h)
    draw(performance.now())
  }

  function field(x: number, y: number, t: number): number {
    const diag = 0.5 + 0.5 * Math.sin((x + y) * 0.22 - t * 0.38)
    const n1 = noise(x * 0.09 + t * 0.11, y * 0.09 - t * 0.08)
    const n2 = noise(x * 0.028 - t * 0.045, y * 0.028 + t * 0.03)
    return 0.34 * diag + 0.38 * n2 + 0.28 * n1
  }

  function draw(now: number) {
    if (!mesh) return
    const t = (now / 1000) * props.speed
    const w2 = ((cols - PAD * 2 - 1) / 2) * cellX
    const h2 = ((rows - PAD * 2 - 1) / 2) * cellY
    pointer.vx += (pointer.x - pointer.vx) * 0.16
    pointer.vy += (pointer.y - pointer.vy) * 0.16
    pointer.energy *= 0.96
    const sigma2 = 2 * 2.6 * 2.6
    // density shifts the ramp window: higher density lights more tiles
    const lo = 0.5 - props.density * 0.9
    const span = 0.32
    let i = 0
    for (let y = 0; y < rows; y++) {
      const by = BAYER[y % 8]!
      for (let x = 0; x < cols; x++) {
        const threshold = by[x % 8]!
        const gx = x - PAD, gy = y - PAD
        const v = field(gx, gy, t)
        let influence = 0
        if (pointer.energy > 0.02) {
          const dxp = gx - pointer.vx, dyp = gy - pointer.vy
          influence = pointer.energy * Math.exp(-(dxp * dxp + dyp * dyp) / sigma2)
        }
        const prevRec = recede[i]!
        let rec = prevRec + (influence - prevRec) * 0.12
        if (rec < 0.001 && influence < 0.001) rec = 0
        recede[i] = rec
        const inside = rec > 0.3
        if (inside && insideState[i] === 0) tintIdx[i] = (tintIdx[i]! + 1) % primaries.length
        insideState[i] = inside ? 1 : 0
        const tn = Math.max(tint[i]! * 0.94, rec)
        tint[i] = tn < 0.004 ? 0 : tn

        const stretched = (v - lo) / span
        const scaled = Math.min(Math.max(stretched, 0), 0.999) * (ramp.length - 1)
        const idx = Math.floor(scaled)
        const frac = scaled - idx
        const base = frac > threshold ? Math.min(idx + 1, ramp.length - 1) : idx
        const lit = tint[i]! > threshold
        const blank = base === 0 && !lit
        colorScratch.copy(lit ? primaries[tintIdx[i]!]! : ramp[base]!)
        mesh.setColorAt(i, colorScratch)

        const wasBlank = blankState[i] === 1
        if (blank !== wasBlank) {
          blankState[i] = blank ? 1 : 0
          const sc = blank ? 0 : 1
          dummy.position.set(gx * cellX - w2, h2 - gy * cellY, 0)
          dummy.quaternion.identity()
          dummy.scale.set(sc, sc, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
        }
        i++
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    renderer.render(scene, camera)
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    if (now - last < 1000 / 30) return
    last = now
    resize()
    draw(now)
  }

  function onPointer(e: PointerEvent | TouchEvent) {
    if (!props.interactive) return
    const rect = el.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : e
    if (!point) return
    const px = point.clientX - rect.left, py = point.clientY - rect.top
    if (px < -40 || py < -40 || px > rect.width + 40 || py > rect.height + 40) return
    if (cellX === 0 || cellY === 0) return
    const nx = px / cellX, ny = py / cellY
    if (pointer.energy < 0.05) { pointer.vx = nx; pointer.vy = ny }
    pointer.x = nx; pointer.y = ny; pointer.energy = 1
  }
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('touchmove', onPointer, { passive: true })

  const ro = new ResizeObserver(resize)
  ro.observe(el)
  window.addEventListener('resize', resize)

  let visible = false
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? false
      cancelAnimationFrame(raf)
      if (visible && !document.hidden) {
        resize()
        if (!reduced) raf = requestAnimationFrame(loop)
        else draw(performance.now())
      }
    },
    { rootMargin: '120px' },
  )
  io.observe(el)
  const onVis = () => {
    cancelAnimationFrame(raf)
    if (!document.hidden && visible && !reduced) raf = requestAnimationFrame(loop)
  }
  document.addEventListener('visibilitychange', onVis)

  const offSwatch = onSwatchChange(() => { if (!props.colors) setRamp?.(rampFromSwatch()) })

  resize()
  const retries = [150, 500, 1500].map((ms) => window.setTimeout(resize, ms))

  cleanup = () => {
    cancelAnimationFrame(raf)
    retries.forEach((id) => window.clearTimeout(id))
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('touchmove', onPointer)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVis)
    offSwatch()
    ro.disconnect()
    io.disconnect()
    if (mesh) { scene.remove(mesh); mesh.dispose() }
    geometry?.dispose()
    material.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
})

watch(() => props.colors, (c) => { if (c) setRamp?.(c) })
onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div ref="host" class="ap-dither-field" aria-hidden="true" />
</template>

<style scoped>
.ap-dither-field {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}
.ap-dither-field :deep(canvas) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
