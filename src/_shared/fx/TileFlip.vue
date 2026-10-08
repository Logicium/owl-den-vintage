<script setup lang="ts">
/**
 * TileFlip — a flat field of primary/accent tiles. Tiles sit still; the
 * pointer flips the ones it passes around the /// diagonal so their back
 * face (the other ink) shows, and a sparse ambient flip keeps the field
 * alive. Reduced motion renders one still frame.
 */
import { ref, onBeforeUnmount } from 'vue'
import { useGLField, readSwatchPalette, onSwatchChange, type GLContext } from './useGLField'
import type * as ThreeNS from 'three'

const props = withDefaults(defineProps<{ cell?: number; interactive?: boolean; density?: number }>(), { cell: 36, interactive: true, density: 0.42 })
const host = ref<HTMLElement | null>(null)

let mesh: ThreeNS.InstancedMesh | null = null
let cols = 0, rows = 0, cellX = 0, cellY = 0
let phase = new Float32Array(0)   // 0 = front, 1 = back (eased)
let target = new Uint8Array(0)
let face = new Uint8Array(0)      // which ink is showing: 0 = own, 1 = other
let alive = new Uint8Array(0)     // sparse field: dead tiles stay collapsed
let inks: [ThreeNS.Color, ThreeNS.Color] | null = null
let offSwatch: (() => void) | null = null
const pointer = { x: -1e4, y: -1e4 }
const axis = { x: Math.SQRT1_2, y: Math.SQRT1_2, z: 0 }

useGLField(host, {
  fps: 30,
  setup(ctx) {
    const { THREE, scene } = ctx
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000)
    cam.position.set(0, 0, 1000)
    cam.lookAt(0, 0, 0)
    scene.add(new THREE.AmbientLight(0xffffff, 2.2))
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(0.3, 0.5, 1)
    scene.add(key)
    offSwatch = onSwatchChange(() => build(ctx))
    return cam
  },
  layout(ctx, camera) {
    const cam = camera as ThreeNS.OrthographicCamera
    cam.left = -ctx.width / 2; cam.right = ctx.width / 2
    cam.top = ctx.height / 2; cam.bottom = -ctx.height / 2
    cam.updateProjectionMatrix()
    build(ctx)
  },
  paint(t, ctx) {
    if (!mesh) return
    const { THREE } = ctx
    const dummy = new THREE.Object3D()
    const w2 = ((cols - 1) / 2) * cellX
    const h2 = ((rows - 1) / 2) * cellY
    const q = new THREE.Quaternion()
    const ax = new THREE.Vector3(axis.x, axis.y, axis.z)
    let i = 0
    let dirty = false
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // pointer: flip tiles within ~1.6 cells
        if (!alive[i]) { i++; continue }
        const dx = x - pointer.x, dy = y - pointer.y
        if (props.interactive && dx * dx + dy * dy < 2.6) target[i] = 1
        // ambient: rare random flips back and forth
        else if (!ctx.reduced && Math.random() < 0.0008) target[i] = target[i] ? 0 : 1
        const p = phase[i]!
        const goal = target[i]!
        if (Math.abs(goal - p) > 0.002) {
          const np = p + (goal - p) * 0.14
          phase[i] = np
          // the back face carries the other ink: swap colour at the half turn
          const showOther = np > 0.5 ? 1 : 0
          if (showOther !== face[i] && inks) {
            face[i] = showOther
            const own = (x + y) % 2
            mesh.setColorAt(i, inks[(own + showOther) % 2]!)
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
          }
          q.setFromAxisAngle(ax, np * Math.PI)
          dummy.position.set(x * cellX - w2, h2 - y * cellY, 0)
          dummy.quaternion.copy(q)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
          dirty = true
        } else if (goal === 1 && !(props.interactive && dx * dx + dy * dy < 2.6) && Math.random() < 0.01) {
          target[i] = 0 // drift back after the pointer leaves
        }
        i++
      }
    }
    if (dirty) mesh.instanceMatrix.needsUpdate = true
    if (ctx.reduced) return false
  },
  teardown() {
    offSwatch?.()
    mesh?.geometry.dispose()
    ;(mesh?.material as ThreeNS.Material | undefined)?.dispose()
    mesh = null
  },
})

function build(ctx: GLContext) {
  const { THREE, scene, width, height } = ctx
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); (mesh.material as ThreeNS.Material).dispose() }
  const pal = readSwatchPalette()
  cols = Math.max(2, Math.round(width / props.cell))
  rows = Math.max(2, Math.round(height / props.cell))
  cellX = width / cols
  cellY = height / rows
  const geo = new THREE.PlaneGeometry(cellX * 0.9, cellY * 0.9)
  // two-material planes are not instanceable; encode front/back by flipping
  // and using a double-sided material whose back is the accent via vertex colors.
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: false })
  mesh = new THREE.InstancedMesh(geo, mat, cols * rows)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  phase = new Float32Array(cols * rows)
  target = new Uint8Array(cols * rows)
  face = new Uint8Array(cols * rows)
  alive = new Uint8Array(cols * rows)
  const dummy = new THREE.Object3D()
  const w2 = ((cols - 1) / 2) * cellX
  const h2 = ((rows - 1) / 2) * cellY
  const primary = new THREE.Color(pal.primary)
  const accent = new THREE.Color(pal.accent)
  inks = [accent, primary]
  let i = 0
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // stable hash decides which cells exist, so the field is sparse but still
      const hsh = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
      alive[i] = hsh < props.density ? 1 : 0
      dummy.position.set(x * cellX - w2, h2 - y * cellY, 0)
      dummy.quaternion.identity()
      const sc = alive[i] ? 1 : 0
      dummy.scale.set(sc, sc, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      // checker of primary/accent so a flip always reveals a change
      mesh.setColorAt(i, (x + y) % 2 ? primary : accent)
      i++
    }
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  scene.add(mesh)
}

function onPointer(e: PointerEvent) {
  const el = host.value
  if (!el || !cellX) return
  const r = el.getBoundingClientRect()
  const px = e.clientX - r.left, py = e.clientY - r.top
  if (px < -40 || py < -40 || px > r.width + 40 || py > r.height + 40) { pointer.x = -1e4; pointer.y = -1e4; return }
  pointer.x = px / cellX - 0.5
  pointer.y = py / cellY - 0.5
}
if (typeof window !== 'undefined') window.addEventListener('pointermove', onPointer, { passive: true })
onBeforeUnmount(() => window.removeEventListener('pointermove', onPointer))
</script>

<template>
  <div ref="host" class="ap-tile-flip" aria-hidden="true" />
</template>

<style scoped>
.ap-tile-flip { position: relative; width: 100%; height: 100%; overflow: hidden; }
.ap-tile-flip :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>
