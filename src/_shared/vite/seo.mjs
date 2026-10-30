// Build-time half of the site SEO (the runtime half is platform/seo.ts).
//
// Vite plugin that bakes the business into the shipped index.html so crawlers
// that do not run JavaScript, and link previews, see the site's name and
// description instead of the template's. It also emits robots.txt and a
// sitemap.xml for the public routes.
//
// Data comes from public/tenant.config.json, which provisioning writes from
// the wizard (brand, tagline, blurb, contact, hero photo) and template updates
// never overwrite. The owner's later dashboard edits are applied at runtime.
//
// Plain JavaScript on purpose: vite.config.ts loads it with a dynamic import
// from either ../archetype-shared/src/vite (monorepo) or ./src/_shared/vite
// (published site), and Node has to run it without a TypeScript step.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const oneLine = (s, max = 160) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : t
}

/**
 * @param {object} [options]
 * @param {string[]} [options.routes]   Public paths for the sitemap, e.g. ['/', '/shop'].
 * @param {{ brand: string, tagline?: string, description?: string, image?: string }} [options.fallback]
 *   Used when the build is not a provisioned site (template demos, local dev).
 */
export function archetypeSeo(options = {}) {
  const routes = options.routes ?? ['/']
  const fallback = options.fallback ?? null
  let root = process.cwd()
  let site = null

  /** Provisioned sites carry a site id/slug; anything else is a demo build. */
  const provisioned = () => !!(process.env.VITE_SITE_ID || process.env.VITE_SITE_SLUG)

  function siteUrl() {
    const explicit = process.env.VITE_SITE_URL
    if (explicit) return explicit.replace(/\/$/, '')
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
    return vercel ? `https://${vercel.replace(/\/$/, '')}` : ''
  }

  function load() {
    site = null
    const p = resolve(root, 'public/tenant.config.json')
    if (!existsSync(p)) return
    try {
      const t = JSON.parse(readFileSync(p, 'utf8'))
      if (t && typeof t.brand === 'string' && t.brand.trim()) {
        site = {
          brand: t.brand.trim(),
          tagline: oneLine(t.tagline, 90),
          description: oneLine(t.blurb) || oneLine(t.mission),
          image: t.photos?.hero?.src || '',
          phone: t.contact?.phone || '',
          email: t.contact?.email || '',
          address: t.contact?.address || '',
          social: Array.isArray(t.social) ? t.social.map((s) => s?.href).filter((h) => /^https?:\/\//.test(h || '')) : [],
        }
      }
    } catch {
      /* unreadable tenant config: fall back */
    }
  }

  function info() {
    if (provisioned() && site) return site
    if (fallback) return { ...fallback, description: oneLine(fallback.description), tagline: oneLine(fallback.tagline, 90), social: [] }
    return site
  }

  return {
    name: 'archetype-seo',
    configResolved(config) {
      root = config.root
      load()
    },
    transformIndexHtml(html) {
      const s = info()
      if (!s) return html
      const base = siteUrl()
      const title = s.tagline ? `${s.brand} · ${s.tagline}` : s.brand
      const description = s.description || (s.tagline ? `${s.brand}. ${s.tagline}` : s.brand)
      const image = s.image ? (base && s.image.startsWith('/') ? base + s.image : s.image) : ''

      let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`)
      out = out.replace(/<html lang="">/i, '<html lang="en">')

      const tags = [
        { tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:site_name', content: s.brand }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' }, injectTo: 'head' },
      ]
      if (base) tags.push({ tag: 'meta', attrs: { property: 'og:url', content: `${base}/` }, injectTo: 'head' })
      if (image) tags.push({ tag: 'meta', attrs: { property: 'og:image', content: image }, injectTo: 'head' })
      return { html: out, tags }
    },
    generateBundle() {
      const base = siteUrl()
      const lines = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /checkout', 'Disallow: /order/']
      if (base) lines.push('', `Sitemap: ${base}/sitemap.xml`)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: lines.join('\n') + '\n' })

      if (!base) return
      const today = new Date().toISOString().slice(0, 10)
      const urls = routes
        .filter((r) => typeof r === 'string' && r.startsWith('/'))
        .map((r) => `  <url><loc>${esc(base + (r === '/' ? '/' : r))}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${r === '/' ? '1.0' : '0.7'}</priority></url>`)
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml })
    },
  }
}
