/**
 * The public route table, with each page's SEO record.
 *
 * This is the only list of public routes. The router spreads it; the
 * prerender (scripts/prerender.ts) walks it to write one HTML file per page,
 * the sitemap, robots.txt and llms.txt; the runtime applies the same records on
 * navigation. Checkout, order and admin routes live in the router and are
 * never indexed. Every field reads the reactive site config when it is called,
 * so a provisioned build and a hydrated page both describe the owner's
 * business. No browser dependency here: the prerender imports this under Node.
 */
import type { RouteRecordRaw } from 'vue-router'
import { esc } from '@apotome/archetype-shared/seo/index'
import * as b from '@apotome/archetype-shared/seo/bodies'
import { nameListNode, productNodes } from '@apotome/archetype-shared/seo/nodes'
import { categoryHref } from '@apotome/archetype-shared/platform/catalogNav'
import { requireVariant } from '@apotome/archetype-shared/platform/variantGuard'
import { variantAtLeast } from '@apotome/archetype-shared/themes/tokens'
import { siteConfig as c, type Category, type Product } from './config/site.config'

const town = () => c.contact.address.split(',')[1]?.trim() ?? ''
const place = () => (town() ? `${c.brand} in ${town()}` : c.brand)
const portfolio = () => variantAtLeast(c.variant, 'portfolio')

function productsBody(list: Product[], title?: string): string {
  const items = list.filter((p) => p.name)
  if (!items.length) return ''
  return `<section>${b.h(2, title)}<ul>${items
    .map((p) => `<li><strong>${esc(p.name)}</strong>${p.blurb ? `, ${esc(p.blurb)}` : ''}${p.price ? ` (${esc(p.price)})` : ''}</li>`)
    .join('')}</ul></section>`
}

function categoriesBody(list: Category[], title?: string): string {
  const cats = list.filter((cat) => cat.name)
  if (!cats.length) return ''
  return `<section>${b.h(2, title)}<ul>${cats
    .map((cat) => {
      const subs = cat.children?.map((s) => s.name).filter(Boolean) ?? []
      return `<li><a href="${esc(categoryHref(cat.name))}">${esc(cat.name)}</a>${subs.length ? `: ${esc(subs.join(', '))}` : ''}</li>`
    })
    .join('')}</ul></section>`
}

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./views/HomeView.vue'),
    meta: {
      seo: {
        description: () => b.compose([c.blurb, `Shop online or visit us${town() ? ` in ${town()}` : ''}: what is new, opening hours and directions`, c.tagline]),
        schema: ({ site }) => productNodes(site, '/shop', c.featured),
        body: () =>
          b.main(
            b.hero(c.brand, c.tagline, c.blurb),
            categoriesBody(c.categories, c.sections.categories.title),
            productsBody(c.featured.slice(0, portfolio() ? 4 : 3), c.sections.featured.title),
            b.story(c.story, c.sections.story.eyebrow),
            b.hours(c.hours, c.sections.hours.title),
            b.testimonials(c.testimonials, c.sections.reviews.title),
            b.contact(c.contact, c.sections.contact.title),
          ),
      },
    },
  },
  {
    path: '/shop',
    name: 'shop',
    component: () => import('./views/ShopView.vue'),
    meta: {
      seo: {
        title: () => c.sections.shopPage.title,
        description: () => {
          const cats = b.listOf(c.categories.map((cat) => cat.name.toLowerCase()))
          return b.compose([`Shop ${place()}${cats ? `: ${cats}` : ''}`, c.sections.shopPage.subtitle, c.blurb])
        },
        schema: ({ site, path }) => [
          ...productNodes(site, path, c.featured),
          nameListNode(site, path, `${c.brand} categories`, c.categories.map((cat) => ({ name: cat.name, image: cat.image }))),
        ].filter((n): n is object => Boolean(n)),
        body: () =>
          b.main(
            b.hero(c.sections.shopPage.title, c.sections.shopPage.eyebrow, c.sections.shopPage.subtitle),
            categoriesBody(c.categories, c.sections.categories.title),
            productsBody(c.featured, c.sections.shopPage.featuredTitle),
          ),
      },
    },
  },
  {
    path: '/visit',
    name: 'visit',
    component: () => import('./views/VisitView.vue'),
    meta: {
      seo: {
        title: () => c.sections.visit.title,
        description: () =>
          b.compose([
            `How to find ${c.brand}${c.contact.address ? ` at ${c.contact.address}` : ''}: opening hours, directions and how to reach the shop`,
            c.sections.visit.subtitle,
          ]),
        body: () =>
          b.main(
            b.hero(c.sections.visit.title, c.sections.visit.eyebrow, c.sections.visit.subtitle),
            b.hours(c.hours, c.sections.hours.title),
            b.contact(c.contact, c.sections.contact.title),
          ),
      },
    },
  },
  {
    // Always registered; the guard keeps it paid-only. Omitting the route
    // here would strand upgraded sites, whose variant only arrives after
    // this module has already been evaluated. Out of the index until then.
    path: '/gallery',
    name: 'gallery',
    component: () => import('./views/GalleryView.vue'),
    beforeEnter: requireVariant('portfolio', () => c.variant),
    meta: {
      seo: {
        title: () => c.sections.galleryPage.title,
        description: () => {
          const shots = b.listOf(c.photos.gallery.map((ph) => ph.alt?.toLowerCase()), 5)
          return b.compose([`The ${c.brand} lookbook${shots ? `: ${shots}` : ''}`, c.tagline, c.blurb])
        },
        image: () => c.photos.about.src || undefined,
        noindex: () => !portfolio(),
        body: () => b.main(b.hero(c.sections.galleryPage.title, c.sections.galleryPage.eyebrow), b.photos(c.photos.gallery)),
      },
    },
  },
]

/** The catch-all: a real not-found page, noindex, never a redirect home. */
export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('./views/NotFoundView.vue'),
  meta: { seo: { title: 'Page not found', description: () => `That page is not on the ${c.brand} website.`, noindex: true } },
}
