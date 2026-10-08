<script setup lang="ts">
/**
 * IsoGrid — a one-ink isometric line lattice, the drafting-table backdrop
 * for the Ironwood theme. A field of wire boxes laid along the screen-
 * horizontal diagonal; heights breathe slowly and the pointer raises the
 * blocks it passes. Reduced motion renders one still frame.
 */
import { ref, onBeforeUnmount } from 'vue'
import { useGLField, readSwatchPalette, onSwatchChange, isoCamera, isoSlot, containOrtho, type GLContext } from './useGLField'
import type * as ThreeNS from 'three'

const props = withDefaults(defineProps<{ count?: number; depth?: number }>(), { count: 14, depth: 5 })
const host = ref<HTMLElement | null>(null)

let group: ThreeNS.Group | null = null
let boxes: { mesh: ThreeNS.LineSegments; x: number; z: number; base: number }[] = []
let offSwatch: (() => void) | null = null
const pointer = { u: 1e4, v: 1e4 }

useGLField(host, {
  fps: 30,
  setup(ctx) {
    const cam = isoCamera(ctx.THREE, 0)
    build(ctx)
    offSwatch = onSwatchChange(() => build(ctx))
    return cam
  },
  layout(ctx, camera) {
    const span = props.count * 1.35
    containOrtho(camera as ThreeNS.OrthographicCamera, ctx.width, ctx.height, span * 1.45, span * 0.9)
  },
  paint(t, ctx) {
    if (!group) return
    for (const b of boxes) {
      const du = b.x - pointer.u, dv = b.z - pointer.v
      const lift = Math.exp(-(du * du + dv * dv) / 6) * 1.8
      const breathe = ctx.reduced ? 0 : Math.sin(t * 0.6 + b.x * 0.7 + b.z * 0.5) * 0.25
      const h = Math.max(0.15, b.base + breathe + lift)
      b.mesh.scale.y = h
      b.mesh.position.y = h / 2
    }
    if (ctx.reduced) return false
  },
  teardown() {
    offSwatch?.()
    for (const b of boxes) { b.mesh.geometry.dispose(); (b.mesh.material as ThreeNS.Material).dispose() }
    boxes = []
    group = null
  },
})

function build(ctx: GLContext) {
  const { THREE, scene } = ctx
  if (group) { scene.remove(group); for (const b of boxes) { b.mesh.geometry.dispose(); (b.mesh.material as ThreeNS.Material).dispose() } }
  boxes = []
  group = new THREE.Group()
  const pal = readSwatchPalette()
  const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(pal.ink), transparent: true, opacity: pal.mode === 'dark' ? 0.32 : 0.22 })
  const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))
  for (let d = 0; d < props.depth; d++) {
    for (let i = 0; i < props.count; i++) {
      const s = isoSlot(i, props.count, 1.35)
      const off = (d - (props.depth - 1) / 2) * 1.35
      const x = s.x + off, z = s.z + off
      const seed = Math.abs(Math.sin(i * 12.9898 + d * 78.233) * 43758.5453) % 1
      const base = 0.2 + seed * 1.4
      const m = new THREE.LineSegments(geo, mat)
      m.position.set(x, base / 2, z)
      m.scale.y = base
      group.add(m)
      boxes.push({ mesh: m, x, z, base })
    }
  }
  scene.add(group)
}

function onPointer(e: PointerEvent) {
  const el = host.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const nx = (e.clientX - r.left) / r.width - 0.5
  const ny = (e.clientY - r.top) / r.height - 0.5
  if (nx < -0.6 || nx > 0.6 || ny < -0.6 || ny > 0.6) { pointer.u = 1e4; pointer.v = 1e4; return }
  // screen x maps to the (1,0,-1) diagonal, screen y to the (1,0,1) diagonal
  const span = props.count * 1.35
  const along = nx * span * 0.9
  const across = ny * span * 0.5
  pointer.u = along + across
  pointer.v = -along + across
}
if (typeof window !== 'undefined') window.addEventListener('pointermove', onPointer, { passive: true })
onBeforeUnmount(() => window.removeEventListener('pointermove', onPointer))
</script>

<template>
  <div ref="host" class="ap-iso-grid" aria-hidden="true" />
</template>

<style scoped>
.ap-iso-grid { position: relative; width: 100%; height: 100%; overflow: hidden; }
.ap-iso-grid :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>
