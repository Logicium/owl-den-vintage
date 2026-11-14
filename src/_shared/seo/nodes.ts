/**
 * JSON-LD for the content records the archetypes carry and the module's
 * builders do not cover one to one: a restaurant's menu, an inn's rooms, a
 * list of names. Products, events and services go through the module's own
 * builders. Browser-safe.
 */
import { priceNumber } from './bodies'
import { compact, entityId, eventNode, productNode } from './schema'
import { isPlaceholder } from './siteConfig'
import { absUrl } from './text'
import type { SiteConfig } from './types'

export interface MenuLikeItem { name: string; description?: string; price?: string; sizes?: Array<{ label: string; price: string }>; tags?: string[] }
export interface MenuLikeCategory { name: string; description?: string; items: MenuLikeItem[] }

/** A schema.org Menu with its sections and items; linked from the Restaurant through hasMenu. */
export function menuNode(site: SiteConfig, path: string, categories: MenuLikeCategory[], name = 'Menu'): object | undefined {
  const sections = categories.filter((c) => c.items?.length)
  if (!sections.length) return undefined
  const url = absUrl(site, path)
  return {
    '@type': 'Menu',
    '@id': `${url}#menu`,
    name,
    url,
    inLanguage: 'en-US',
    hasMenuSection: sections.map((c) =>
      compact({
        '@type': 'MenuSection',
        name: c.name,
        description: c.description,
        hasMenuItem: c.items.map((it) => {
          const price = priceNumber(it.price) ?? priceNumber(it.sizes?.[0]?.price)
          return compact({
            '@type': 'MenuItem',
            name: it.name,
            description: it.description,
            offers: price !== undefined ? { '@type': 'Offer', price: String(price), priceCurrency: 'USD' } : undefined,
            suitableForDiet: it.tags?.some((t) => /^(v|vegetarian)$/i.test(t))
              ? 'https://schema.org/VegetarianDiet'
              : it.tags?.some((t) => /^(vg|vegan)$/i.test(t))
                ? 'https://schema.org/VeganDiet'
                : it.tags?.some((t) => /^gf$/i.test(t))
                  ? 'https://schema.org/GlutenFreeDiet'
                  : undefined,
          })
        }),
      }),
    ),
  }
}

export interface RoomLike { name: string; blurb?: string; image?: string; features?: string[]; rateFrom?: string }

/** HotelRoom nodes with a nightly offer, contained in the lodging entity. */
export function roomNodes(site: SiteConfig, path: string, rooms: RoomLike[]): object[] {
  const url = absUrl(site, path)
  return rooms
    .filter((r) => r.name)
    .map((r, i) => {
      const price = priceNumber(r.rateFrom)
      return compact({
        '@type': 'HotelRoom',
        '@id': `${url}#room-${i + 1}`,
        name: r.name,
        description: r.blurb,
        image: r.image ? absUrl(site, r.image) : undefined,
        amenityFeature: r.features?.map((f) => ({ '@type': 'LocationFeatureSpecification', name: f, value: true })),
        containedInPlace: { '@id': entityId(site) },
        offers: price !== undefined ? { '@type': 'Offer', price: String(price), priceCurrency: 'USD', url, availability: 'https://schema.org/InStock' } : undefined,
      })
    })
}

export interface ProductLike { name: string; price?: string; image?: string; blurb?: string; url?: string }

/** Product nodes for the goods a shop lists; items without a price or image are skipped. */
export function productNodes(site: SiteConfig, path: string, products: ProductLike[]): object[] {
  const out: object[] = []
  for (const pr of products) {
    const price = priceNumber(pr.price)
    if (!pr.name || price === undefined || !pr.image) continue
    const node = productNode(site, { path, name: pr.name, description: pr.blurb, image: pr.image, price }) as Record<string, unknown>
    // several products share one page: give each its own @id
    node['@id'] = `${absUrl(site, path)}#product-${out.length + 1}`
    out.push(node)
  }
  return out
}

export interface EventLike {
  id?: string
  title: string
  date: string
  startTime?: string
  blurb?: string
  description?: string
  image?: string
  priceLabel?: string
  ticketUrl?: string
  status?: string
  lineup?: string[]
}

/** Event nodes for the shows still ahead; needs a venue address, so an entity without one yields nothing. */
export function eventNodes(site: SiteConfig, path: string, events: EventLike[], today = new Date().toISOString().slice(0, 10)): object[] {
  if (!site.entity.address) return []
  const out: object[] = []
  for (const ev of events) {
    if (!ev.title || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date) || ev.date < today) continue
    const price = priceNumber(ev.priceLabel)
    const free = /free/i.test(ev.priceLabel ?? '')
    const status = ev.status === 'cancelled' ? 'EventCancelled' : ev.status === 'postponed' ? 'EventPostponed' : 'EventScheduled'
    const node = eventNode(site, {
      path,
      name: ev.title,
      description: ev.description || ev.blurb,
      image: ev.image,
      startDate: ev.startTime ? `${ev.date}T${ev.startTime}:00` : ev.date,
      status,
      offers: price !== undefined || free ? { price: price ?? 0, url: ev.ticketUrl && !isPlaceholder(ev.ticketUrl) ? ev.ticketUrl : undefined, availability: ev.status === 'sold-out' ? 'SoldOut' : 'InStock' } : undefined,
      performer: ev.lineup?.length ? ev.lineup : undefined,
    }) as Record<string, unknown>
    node['@id'] = `${absUrl(site, path)}#event-${ev.id ?? out.length + 1}`
    out.push(node)
  }
  return out
}

/** An ItemList of names, for records that have no page of their own. */
export function nameListNode(site: SiteConfig, path: string, name: string, items: Array<{ name: string; description?: string; image?: string }>): object | undefined {
  const list = items.filter((it) => it.name)
  if (!list.length) return undefined
  return {
    '@type': 'ItemList',
    '@id': `${absUrl(site, path)}#list`,
    name,
    numberOfItems: list.length,
    itemListElement: list.map((it, i) =>
      compact({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        description: it.description,
        image: it.image ? absUrl(site, it.image) : undefined,
      }),
    ),
  }
}
