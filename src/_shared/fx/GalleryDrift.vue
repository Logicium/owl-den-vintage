<script setup lang="ts">
/**
 * GalleryDrift — photos hung in space on a CSS3D stage.
 *
 * Real DOM images placed at three depth bands drift slowly across the
 * viewport; dragging, wheel or touch pans the camera; anything leaving
 * one edge re-enters from the other. Because the planes are DOM, images
 * stay crisp at any size and clicks work. three.js and its CSS3DRenderer
 * are loaded lazily. Under reduced motion the wall is still and only
 * pans on drag. If three fails to load, a plain strip of images renders.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type * as ThreeNS from 'three'

interface Photo { src: string; alt?: string }
const props = withDefaults(defineProps<{ photos: Photo[]; height?: string }>(), { height: 'clamp(520px, 78vh, 820px)' })

const host = ref<HTMLElement | null>(null)
const fallback = ref(false)
let cleanup: (() => void) | null = null

function jitter(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

async function build() {
  cleanup?.()
  const el = host.value
  if (!el || !props.photos.length) return
  let THREE: typeof ThreeNS
  let addon: typeof import('three/addons/renderers/CSS3DRenderer.js')
  try {
    ;[THREE, addon] = await Promise.all([import('three'), import('three/addons/renderers/CSS3DRenderer.js')])
  } catch {
    fallback.value = true
    return
  }
  if (!host.value) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000)
  camera.position.set(0, 0, 1500)
  const renderer = new addon.CSS3DRenderer()
  renderer.domElement.style.cssText = 'position:absolute;inset:0;'
  el.appendChild(renderer.domElement)

  // field: wide enough that wrapping is invisible
  const FIELD = 3600
  const bands = [
    { z: -700, w: 300, speed: 0.22 },
    { z: -250, w: 380, speed: 0.36 },
    { z: 200, w: 440, speed: 0.5 },
  ]
  const objs: { o: InstanceType<typeof addon.CSS3DObject>; speed: number }[] = []
  props.photos.forEach((p, i) => {
    const band = bands[i % bands.length]!
    const wrap = document.createElement('figure')
    wrap.className = 'ap-drift__item'
    const img = document.createElement('img')
    img.src = p.src
    img.alt = p.alt ?? ''
    img.loading = 'eager'
    img.decoding = 'async'
    img.draggable = false
    const ratio = 0.72 + jitter(i, 3) * 0.6 // 0.72 (portrait) … 1.32 (landscape)
    wrap.style.width = `${band.w}px`
    wrap.style.height = `${Math.round(band.w / ratio)}px`
    wrap.appendChild(img)
    if (p.alt) {
      const cap = document.createElement('figcaption')
      cap.textContent = `${String(i + 1).padStart(2, '0')} · ${p.alt}`
      wrap.appendChild(cap)
    }
    const o = new addon.CSS3DObject(wrap)
    const col = i / props.photos.length
    o.position.set((col - 0.5) * FIELD + (jitter(i, 1) - 0.5) * 420, (jitter(i, 2) - 0.5) * 560, band.z)
    scene.add(o)
    objs.push({ o, speed: band.speed })
  })

  let width = 1, height = 1
  function resize() {
    width = el!.clientWidth || 1
    height = el!.clientHeight || 1
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    renderer.render(scene, camera)
  }
  resize()

  // pan: drag / wheel / touch move the camera; drift adds a slow current
  let panX = 0, panY = 0, vX = 0
  let dragging = false, lastX = 0, lastY = 0
  const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; el!.setPointerCapture(e.pointerId) }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX, dy = e.clientY - lastY
    lastX = e.clientX; lastY = e.clientY
    panX -= dx * 1.6; panY += dy * 1.6; vX = -dx * 0.6
  }
  const onUp = () => { dragging = false }
  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { panX += e.deltaX * 1.2; e.preventDefault() }
  }
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
  el.addEventListener('wheel', onWheel, { passive: false })

  let raf = 0, onScreen = true
  function frame() {
    if (!onScreen || document.hidden) { raf = 0; return }
    vX *= 0.92
    panX += vX
    const drift = reduced ? 0 : 0.35
    for (const { o, speed } of objs) {
      o.position.x -= drift * speed
      // wrap around the field relative to the camera
      const rel = o.position.x - panX
      if (rel < -FIELD / 2) o.position.x += FIELD
      else if (rel > FIELD / 2) o.position.x -= FIELD
    }
    camera.position.x += (panX - camera.position.x) * 0.08
    camera.position.y += (Math.max(-300, Math.min(300, panY)) - camera.position.y) * 0.08
    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }
  const play = () => { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame) }
  play()
  const onVis = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : play())
  document.addEventListener('visibilitychange', onVis)
  const ro = new ResizeObserver(resize)
  ro.observe(el)
  const io = new IntersectionObserver((entries) => {
    onScreen = entries[0]?.isIntersecting ?? false
    if (!onScreen) { cancelAnimationFrame(raf); raf = 0 } else play()
  }, { threshold: 0.02 })
  io.observe(el)

  cleanup = () => {
    cancelAnimationFrame(raf)
    document.removeEventListener('visibilitychange', onVis)
    ro.disconnect()
    io.disconnect()
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    el.removeEventListener('wheel', onWheel)
    if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
    cleanup = null
  }
}

onMounted(build)
watch(() => props.photos.map((p) => p.src).join('|'), build)
onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div class="ap-drift" :style="{ height }">
    <div v-if="!fallback" ref="host" class="ap-drift__stage" />
    <div v-else class="ap-drift__fallback">
      <figure v-for="(p, i) in photos" :key="p.src + i"><img :src="p.src" :alt="p.alt ?? ''" /></figure>
    </div>
    <span class="ap-drift__hint" aria-hidden="true">drag</span>
  </div>
</template>

<style scoped>
.ap-drift {
  position: relative;
  width: 100%;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: pan-y;
}
.ap-drift:active { cursor: grabbing; }
.ap-drift__stage { position: absolute; inset: 0; }
.ap-drift__stage :deep(.ap-drift__item) {
  margin: 0;
  background: var(--ap-surface-alt);
  outline: 1px solid var(--ap-line);
  border-radius: 2px;
  overflow: visible;
}
.ap-drift__stage :deep(.ap-drift__item img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 2px;
  pointer-events: none;
}
.ap-drift__stage :deep(.ap-drift__item figcaption) {
  position: absolute;
  left: 0;
  top: 100%;
  margin-top: 0.5rem;
  font-family: var(--ap-font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ap-ink-muted);
  white-space: nowrap;
}
.ap-drift__fallback {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  height: 100%;
  align-items: center;
  padding: 0 clamp(1rem, 4vw, 2.5rem);
}
.ap-drift__fallback figure { margin: 0; flex: 0 0 auto; height: 70%; }
.ap-drift__fallback img { height: 100%; width: auto; border-radius: 2px; }
.ap-drift__hint {
  position: absolute;
  right: clamp(1rem, 4vw, 2.5rem);
  bottom: 1.25rem;
  font-family: var(--ap-font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ap-ink-muted);
  pointer-events: none;
}
</style>
