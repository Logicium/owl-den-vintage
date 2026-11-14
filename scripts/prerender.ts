/**
 * Post-build: one HTML file per public route, sitemap.xml, robots.txt,
 * llms.txt and 404.html, from the route table and the site's content.
 *
 *   npm run build-only   runs this through the postbuild-only hook (the
 *                        tenant Vercel projects build with build-only, so the
 *                        hook sits there and `npm run build` reaches it too)
 *   npx vite-node scripts/prerender.ts
 *
 * A provisioned site (VITE_SITE_ID or VITE_SITE_SLUG set) has its wizard
 * record in public/tenant.config.json; it is laid over the demo content before
 * the pages are written, so titles, bodies and JSON-LD describe the tenant.
 * The origin comes from VITE_SITE_URL, which the provisioner sets and swaps
 * for the custom domain; without any origin the build still passes but marks
 * the site noindex. The Apotome Labs SEO + AEO Standard, section 13.
 */
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { prerender } from '@apotome/archetype-shared/seo/node'
import { buildSiteConfig, withCheckedImages } from '@apotome/archetype-shared/seo/build'
import { publicRoutes } from '../src/routes'
import { siteConfig } from '../src/config/site.config'
import { archetype, fallback } from '../src/seo.site'

const root = fileURLToPath(new URL('..', import.meta.url))
// env files: the monorepo's shared .env.local one level up (vite.config sets
// envDir '..'), the site's own, then the process (Vercel's variables)
const env = {
  ...loadEnv('production', fileURLToPath(new URL('../..', import.meta.url)), 'VITE_'),
  ...loadEnv('production', root, 'VITE_'),
  ...process.env,
}

const site = buildSiteConfig({ root, env, archetype, fallback, siteConfig: siteConfig as unknown as Record<string, unknown> })

await prerender({ site, routes: withCheckedImages(publicRoutes, root), root })
