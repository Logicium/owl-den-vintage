/**
 * useContentEditor — the live, in-situ content editor that powers the theme
 * picker's "Edit content" mode.
 *
 * The whole thing hangs off one fact: every template's `siteConfig` is a single
 * `reactive()` object that all sections read from (and that the content store
 * holds as `config`). So editing that object updates the page instantly, with
 * zero changes to any section component.
 *
 * Two ways to edit, both writing to the same reactive source:
 *   1. In situ — when edit mode is on we match each editable string value to the
 *      DOM element that renders it and make that element contenteditable.
 *   2. A generated form — we walk the config for editable string leaves and
 *      expose a labeled field for each; the field links + scrolls to its element
 *      on the page and edits flow through instantly.
 *
 * Persistence reuses the owner content draft/publish flow (owners only).
 */
import { computed, nextTick, ref } from 'vue'
import { useSiteContentStore } from '../platform/siteContentStore'
import { useAdminAuthStore } from '../platform/adminAuthStore'
import { contentClient } from '../platform/contentClient'

export interface EditField {
  path: string
  label: string
  group: string
  value: string
  multiline: boolean
  type: 'text' | 'image'
  /** Soft word target for multiline fields, shown as the "y" in an x/y counter. */
  softMax?: number
}

export function wordCount(s: string): number {
  const t = (s ?? '').trim()
  return t ? t.split(/\s+/).length : 0
}

// ── Module-level singletons (shared by the directive-free binder + the panel) ──
const editMode = ref(false)
const dirty = ref<Set<string>>(new Set())
const activePath = ref<string | null>(null)
const saving = ref(false)
const saveMsg = ref<string | null>(null)

interface Bound { el: HTMLElement; cleanup: () => void }
let bound: Bound[] = []
let fileInput: HTMLInputElement | null = null

// A single floating "Replace photo" control shown when hovering a bound image,
// so we never fire a file dialog just because someone clicked a picture.
let imgOverlay: HTMLButtonElement | null = null
let overlayPath: string | null = null
let overlayHideTimer = 0

// Keys / values we never expose as editable text (ids, colors, urls, images…).
const SKIP_KEYS = new Set([
  'theme', 'swatch', 'variant', 'favicon', 'icon', 'src', 'image', 'href', 'url',
  'mapEmbedUrl', 'productionUrl', 'customDomain', 'id', 'slug', 'permalink',
  'reviewsSource', 'heroStyle', 'footerStyle', 'siteStyle', 'alignment', 'date',
])
const URLISH = /^(https?:|\/|data:|mailto:|tel:|#|[\w.-]+\.(jpg|jpeg|png|webp|svg|gif|pdf))/i
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i
const IMAGE_KEY = /(^|_)(src|image|img|photo|logo|cover|thumb|thumbnail|avatar|banner|hero)$/i

function isEditableValue(key: string, val: unknown): val is string {
  if (typeof val !== 'string') return false
  const t = val.trim()
  if (!t || t.length < 2) return false
  if (SKIP_KEYS.has(key)) return false
  if (URLISH.test(t)) return false
  return true
}

/** True for string values that point at an image we can offer to replace. */
function isImageValue(key: string, val: unknown): val is string {
  if (typeof val !== 'string') return false
  const t = val.trim()
  if (!t) return false
  if (t.startsWith('data:image/')) return true
  if (IMAGE_EXT.test(t)) return true
  return IMAGE_KEY.test(key) && (t.startsWith('/') || t.startsWith('http'))
}

function prettify(seg: string): string {
  if (/^\d+$/.test(seg)) return `#${Number(seg) + 1}`
  return seg.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase())
}
function labelFor(path: string): string {
  const segs = path.split('.')
  return segs.slice(-2).map(prettify).join(' · ')
}
function norm(s: string): string { return s.replace(/\s+/g, ' ').trim() }
/** A gentle word target derived from the field's initial length (the "y" in x/y). */
function softTarget(value: string): number { return Math.max(24, Math.ceil(wordCount(value) * 1.6)) }

function walk(obj: Record<string, unknown>, prefix: string, out: EditField[]): void {
  const group = (p: string, k: string) => p.split('.')[0] || k
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (isImageValue(k, v)) {
      out.push({ path, label: labelFor(path), group: group(prefix, k), value: v, multiline: false, type: 'image' })
    } else if (isEditableValue(k, v)) {
      const ml = v.length > 70
      out.push({ path, label: labelFor(path), group: group(prefix, k), value: v, multiline: ml, type: 'text', softMax: ml ? softTarget(v) : undefined })
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        const ip = `${path}.${i}`
        if (isImageValue(k, item)) {
          out.push({ path: ip, label: `${prettify(k)} #${i + 1}`, group: group(prefix, k), value: item as string, multiline: false, type: 'image' })
        } else if (isEditableValue(k, item)) {
          const ml = (item as string).length > 70
          out.push({ path: ip, label: `${prettify(k)} #${i + 1}`, group: group(prefix, k), value: item as string, multiline: ml, type: 'text', softMax: ml ? softTarget(item as string) : undefined })
        } else if (item && typeof item === 'object') {
          walk(item as Record<string, unknown>, ip, out)
        }
      })
    } else if (v && typeof v === 'object') {
      walk(v as Record<string, unknown>, path, out)
    }
  }
}

function traverse(root: Record<string, unknown>, path: string): { parent: Record<string, unknown> | unknown[]; key: string } | null {
  const segs = path.split('.')
  let cur: unknown = root
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') return null
    cur = (cur as Record<string, unknown>)[segs[i]!]
  }
  if (cur == null || typeof cur !== 'object') return null
  return { parent: cur as Record<string, unknown>, key: segs[segs.length - 1]! }
}

export function useContentEditor() {
  const store = useSiteContentStore()
  const auth = useAdminAuthStore()

  // Edit the LIVE reactive siteConfig (the object sections read), not the
  // store's hydrated snapshot — so edits show on the page immediately.
  const root = computed(() => (store.liveConfig ?? store.config) as Record<string, unknown> | null)
  const canPersist = computed(() => store.isPlatform && !!auth.owner)

  const fields = computed<EditField[]>(() => {
    const out: EditField[] = []
    if (root.value) walk(root.value, '', out)
    return out
  })

  const groups = computed(() => {
    const m = new Map<string, EditField[]>()
    for (const f of fields.value) {
      if (!m.has(f.group)) m.set(f.group, [])
      m.get(f.group)!.push(f)
    }
    return [...m.entries()].map(([name, items]) => ({ name, label: prettify(name), items }))
  })

  function getByPath(path: string): string {
    const loc = root.value ? traverse(root.value, path) : null
    if (!loc) return ''
    const v = (loc.parent as Record<string, unknown>)[loc.key]
    return typeof v === 'string' ? v : ''
  }

  function setByPath(path: string, value: string): void {
    // 1) Write to the config root — this is what the save payload reads from.
    if (root.value) {
      const loc = traverse(root.value, path)
      if (loc) (loc.parent as Record<string, unknown>)[loc.key] = value
    }
    dirty.value = new Set(dirty.value).add(path)
    // 2) Write straight to every bound element on the page (except one being
    //    actively typed in) so the change is visible instantly, independent of
    //    the template's reactive wiring. Images get their src set; text nodes
    //    get their textContent set.
    if (typeof document === 'undefined') return
    const active = document.activeElement
    document.querySelectorAll<HTMLElement>(`[data-edit-path="${CSS.escape(path)}"]`).forEach(el => {
      if (el instanceof HTMLImageElement) {
        if (el.getAttribute('src') !== value) el.src = value
      } else if (el !== active && norm(el.innerText) !== norm(value)) {
        el.textContent = value
      }
    })
  }

  // ── In-situ binder: match config values to on-page elements ──
  function unbind(): void {
    for (const b of bound) {
      b.cleanup()
      b.el.classList.remove('ap-editable', 'ap-editable-img')
      delete b.el.dataset.editPath
    }
    bound = []
    if (imgOverlay) { imgOverlay.style.display = 'none'; overlayPath = null }
  }

  function scan(): void {
    unbind()
    if (typeof document === 'undefined') return
    // Normalized text value -> path, and image value -> path.
    const textToPath = new Map<string, string>()
    const imgToPath = new Map<string, string>()
    for (const f of fields.value) {
      if (f.type === 'image') { if (!imgToPath.has(f.value)) imgToPath.set(f.value, f.path) }
      else { const k = norm(f.value); if (k.length >= 2 && !textToPath.has(k)) textToPath.set(k, f.path) }
    }

    // Text: bind EVERY leaf element whose full text matches a field value (so
    // the same string in several places — brand in header + footer — all update).
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const seen = new Set<HTMLElement>()
    let node: Node | null
    while ((node = walker.nextNode())) {
      const el = node.parentElement
      if (!el || seen.has(el) || el.closest('.ap-switcher')) continue
      const path = textToPath.get(norm(el.textContent ?? ''))
      if (path) { seen.add(el); bindText(el, path) }
    }

    // Images: match each <img> to an image field by its src (raw attr, resolved
    // URL, or filename), then make it click-to-replace.
    if (imgToPath.size) {
      document.querySelectorAll<HTMLImageElement>('img').forEach(img => {
        if (img.closest('.ap-switcher') || img.dataset.editPath) return
        const path = matchImage(img, imgToPath)
        if (path) bindImg(img, path)
      })
    }
  }

  function matchImage(img: HTMLImageElement, imgToPath: Map<string, string>): string | null {
    const raw = img.getAttribute('src') ?? ''
    const resolved = img.src
    for (const [value, path] of imgToPath) {
      if (value === raw || value === resolved) return path
      // Endswith handles relative-vs-absolute; also compare bare filenames.
      if (resolved.endsWith(value) || (value.startsWith('/') && resolved.endsWith(value))) return path
      const vf = value.split('/').pop(); const rf = raw.split('/').pop()
      if (vf && vf === rf) return path
    }
    return null
  }

  function bindText(el: HTMLElement, path: string): void {
    el.dataset.editPath = path
    el.contentEditable = 'plaintext-only'
    el.classList.add('ap-editable')
    // Commit on blur (not on input) so the reactive re-render never yanks the
    // caret mid-edit.
    const onBlur = () => { const txt = norm(el.innerText); if (txt !== norm(getByPath(path))) setByPath(path, txt) }
    const onFocus = () => { activePath.value = path }
    el.addEventListener('blur', onBlur, true)
    el.addEventListener('focus', onFocus, true)
    bound.push({ el, cleanup: () => { el.removeEventListener('blur', onBlur, true); el.removeEventListener('focus', onFocus, true); el.contentEditable = 'inherit' } })
  }

  function ensureOverlay(): HTMLButtonElement {
    if (imgOverlay) return imgOverlay
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = '⤢ Replace photo'
    btn.style.cssText = [
      'position:fixed', 'z-index:2147483000', 'display:none',
      'transform:translate(-50%,-50%)', 'align-items:center', 'gap:6px',
      'padding:8px 14px', 'border:0', 'border-radius:999px',
      'background:rgba(15,15,17,0.86)', 'color:#fff',
      'font:600 12px/1 system-ui,-apple-system,sans-serif', 'cursor:pointer',
      'box-shadow:0 6px 20px rgba(0,0,0,0.4)', 'backdrop-filter:blur(6px)',
    ].join(';')
    btn.addEventListener('mouseenter', () => window.clearTimeout(overlayHideTimer))
    btn.addEventListener('mouseleave', hideOverlaySoon)
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation()
      if (overlayPath) { activePath.value = overlayPath; replaceImage(overlayPath) }
    })
    document.body.appendChild(btn)
    imgOverlay = btn
    return btn
  }
  function showOverlayOver(img: HTMLElement, path: string): void {
    window.clearTimeout(overlayHideTimer)
    overlayPath = path
    const r = img.getBoundingClientRect()
    const btn = ensureOverlay()
    btn.style.left = `${r.left + r.width / 2}px`
    btn.style.top = `${r.top + r.height / 2}px`
    btn.style.display = 'inline-flex'
  }
  function hideOverlaySoon(): void {
    overlayHideTimer = window.setTimeout(() => { if (imgOverlay) imgOverlay.style.display = 'none'; overlayPath = null }, 140)
  }

  function bindImg(img: HTMLImageElement, path: string): void {
    img.dataset.editPath = path
    img.classList.add('ap-editable-img')
    const onEnter = () => { activePath.value = path; showOverlayOver(img, path) }
    const onLeave = () => hideOverlaySoon()
    img.addEventListener('mouseenter', onEnter)
    img.addEventListener('mouseleave', onLeave)
    bound.push({ el: img, cleanup: () => {
      img.removeEventListener('mouseenter', onEnter)
      img.removeEventListener('mouseleave', onLeave)
      img.classList.remove('ap-editable-img')
      delete img.dataset.editPath
    } })
  }

  /** Open a file picker and set `path` to the chosen image (as a data URL, so it
   *  previews instantly and rides along in the saved content payload). */
  function replaceImage(path: string): void {
    if (typeof document === 'undefined') return
    if (!fileInput) {
      fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = 'image/*'
      fileInput.style.display = 'none'
      document.body.appendChild(fileInput)
    }
    const input = fileInput
    input.value = ''
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      // Same optimization pipeline as the admin uploaders: downscale + WebP
      // (when smaller) so the data URL riding in the payload stays light.
      void import('../platform/imageOptimize').then(async ({ optimizeImage, validateUploadSize }) => {
        validateUploadSize(file) // hard reject oversize regardless of fallback
        try {
          const opt = await optimizeImage(file)
          setByPath(path, `data:${opt.contentType};base64,${opt.base64}`)
        } catch {
          // Decode/encode hiccup — fall back to the original bytes.
          const reader = new FileReader()
          reader.onload = () => { if (typeof reader.result === 'string') setByPath(path, reader.result) }
          reader.readAsDataURL(file)
        }
      }).catch((e) => { window.alert(e instanceof Error ? e.message : String(e)) })
    }
    input.click()
  }

  function focusField(path: string): void {
    activePath.value = path
    let el = document.querySelector<HTMLElement>(`[data-edit-path="${CSS.escape(path)}"]`)
    if (!el) { scan(); el = document.querySelector<HTMLElement>(`[data-edit-path="${CSS.escape(path)}"]`) }
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.remove('ap-edit-flash')
    // reflow to restart the animation
    void el.offsetWidth
    el.classList.add('ap-edit-flash')
    setTimeout(() => el?.classList.remove('ap-edit-flash'), 1400)
  }

  function enable(): void { editMode.value = true; document.documentElement.classList.add('ap-editing'); void nextTick(scan) }
  function disable(): void { editMode.value = false; document.documentElement.classList.remove('ap-editing'); unbind() }
  function toggle(): void { editMode.value ? disable() : enable() }
  function rescan(): void { if (editMode.value) void nextTick(scan) }

  // ── Persistence (owners only) ──
  /**
   * Publish (or draft-save) a FULL snapshot of the live content. `root.value` is
   * the reactive siteConfig that already holds build-time defaults + the server
   * overlay + every edit made this session (each `setByPath` writes into it), so
   * a plain deep-clone captures everything. This replaced an earlier getDraft +
   * per-path merge that could silently drop edits — the bug where the editor said
   * "Published" but nothing actually persisted.
   */
  async function save(publish: boolean): Promise<void> {
    if (!canPersist.value || !dirty.value.size) return
    saving.value = true
    saveMsg.value = null
    try {
      const id = await store.resolveOwnedSiteId()
      if (!id) throw new Error('Could not resolve this site.')
      if (!root.value) throw new Error('No content loaded to save.')
      const payload = JSON.parse(JSON.stringify(root.value)) as Record<string, unknown>
      if (publish) await contentClient.publish(id, payload)
      else await contentClient.saveDraft(id, payload)
      dirty.value = new Set()
      saveMsg.value = publish ? 'Published — live in a moment' : 'Draft saved'
      setTimeout(() => { saveMsg.value = null }, 3000)
    } catch (e) {
      saveMsg.value = e instanceof Error ? e.message : String(e)
    } finally {
      saving.value = false
    }
  }

  return {
    editMode, fields, groups, dirty, activePath, saving, saveMsg, canPersist,
    getByPath, setByPath, enable, disable, toggle, rescan, focusField, replaceImage, save,
    wordCount,
  }
}
