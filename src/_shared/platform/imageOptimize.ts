/**
 * Client-side image optimization — every photo is normalized here before it
 * ships to blob storage: downscaled to a sane web resolution and re-encoded
 * as WebP, but ONLY when that actually wins (a naive canvas re-encode of an
 * already-tight camera JPEG can come out larger — in that case the original
 * bytes are kept). SVG and GIF pass through untouched (vector / animation).
 *
 * The same pipeline we hand-ran for photo-campaign deliveries, automated.
 */

/** Generous ceiling — reject obviously-wrong files (videos, RAWs) early. */
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024

/** Longest edge after resize. 2560 covers full-bleed retina heroes. */
const MAX_EDGE = 2560

/** WebP quality — visually transparent for photos, far lighter than PNG/90+ JPEG. */
const WEBP_QUALITY = 0.84

export interface OptimizedUpload {
  filename: string
  contentType: string
  /** Raw base64 (no data: prefix) ready for the media endpoint. */
  base64: string
  bytes: number
  /** True when the WebP re-encode was used (vs. original passthrough). */
  converted: boolean
}

export function validateUploadSize(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)
    throw new Error(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${mb} MB. Export a smaller copy and try again.`)
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res((fr.result as string).split(',')[1] ?? '')
    fr.onerror = rej
    fr.readAsDataURL(blob)
  })
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file) } catch { /* fall through to <img> */ }
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); res(img) }
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e) }
    img.src = url
  })
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(res => canvas.toBlob(res, type, quality))
}

function swapExt(name: string, ext: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '') + ext
}

/**
 * Optimize a photo for upload. Throws (with a user-readable message) when the
 * file is over the size ceiling or not an image.
 */
export async function optimizeImage(file: File): Promise<OptimizedUpload> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  validateUploadSize(file)

  const passthrough = async (): Promise<OptimizedUpload> => ({
    filename: file.name,
    contentType: file.type || 'image/jpeg',
    base64: await blobToBase64(file),
    bytes: file.size,
    converted: false,
  })

  // Vectors stay vectors; GIFs may animate — canvas would flatten them.
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return passthrough()

  let source: ImageBitmap | HTMLImageElement
  try { source = await decode(file) } catch { return passthrough() }

  const w = 'naturalWidth' in source ? source.naturalWidth : source.width
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height
  if (!w || !h) return passthrough()

  const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
  const outW = Math.max(1, Math.round(w * scale))
  const outH = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return passthrough()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, outW, outH)
  if ('close' in source) source.close()

  const webp = await encode(canvas, 'image/webp', WEBP_QUALITY)

  // Keep whichever is actually lighter. A downscale means the WebP is the
  // only correctly-sized rendition, so it wins even on rare byte ties.
  const downscaled = scale < 1
  if (!webp || (!downscaled && webp.size >= file.size)) return passthrough()

  return {
    filename: swapExt(file.name, '.webp'),
    contentType: 'image/webp',
    base64: await blobToBase64(webp),
    bytes: webp.size,
    converted: true,
  }
}
