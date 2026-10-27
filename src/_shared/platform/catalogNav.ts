/**
 * The shop's catalog navigation: one vocabulary shared by the header
 * dropdown, the category tiles, the shop page filter and the admin.
 *
 * A category is addressed by its slug, a subcategory by category + sub slug:
 *   /shop?category=apparel&sub=hats
 * Products carry a free-text `category` of the form "Apparel / Hats"; the
 * slugs on both sides are compared, so capitalisation and spacing in the
 * admin never break a link.
 */

export interface CatalogChild { name: string; url?: string }
export interface CatalogCategory { name: string; url?: string; children?: CatalogChild[] }

export interface CatalogMenuItem { label: string; to: string; children?: Array<{ label: string; to: string }> }

export function categorySlug(name: string): string {
  return name.trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function categoryHref(category: string, sub?: string, shopPath = '/shop'): string {
  const q = new URLSearchParams({ category: categorySlug(category) })
  if (sub) q.set('sub', categorySlug(sub))
  return `${shopPath}?${q.toString()}`
}

/** Header dropdown items from the site's category tiles. */
export function catalogMenu(categories: CatalogCategory[], shopPath = '/shop'): CatalogMenuItem[] {
  return categories
    .filter(c => c.name?.trim())
    .map(c => ({
      label: c.name,
      to: categoryHref(c.name, undefined, shopPath),
      children: (c.children ?? [])
        .filter(s => s.name?.trim())
        .map(s => ({ label: s.name, to: categoryHref(c.name, s.name, shopPath) })),
    }))
}

/** Splits a product's "Apparel / Hats" into its two levels. */
export function splitProductCategory(value?: string | null): { category: string; sub?: string } | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const [category, ...rest] = raw.split(/\s*[/>›]\s*/)
  const sub = rest.join(' / ').trim()
  return category ? { category: category.trim(), sub: sub || undefined } : null
}

/** Does a product's category match the selected category (and sub) slugs? */
export function productMatches(productCategory: string | undefined | null, categorySlugWanted?: string, subSlugWanted?: string): boolean {
  if (!categorySlugWanted) return true
  const parts = splitProductCategory(productCategory)
  if (!parts) return false
  if (categorySlug(parts.category) !== categorySlugWanted) return false
  if (!subSlugWanted) return true
  return !!parts.sub && categorySlug(parts.sub) === subSlugWanted
}

/** Human labels for the current selection, resolved against known names. */
export function selectionLabels(
  categories: CatalogCategory[],
  categorySlugWanted?: string,
  subSlugWanted?: string,
): { category?: string; sub?: string } {
  const cat = categories.find(c => categorySlug(c.name) === categorySlugWanted)
  const sub = cat?.children?.find(s => categorySlug(s.name) === subSlugWanted)
  return { category: cat?.name ?? categorySlugWanted, sub: sub?.name ?? subSlugWanted }
}
