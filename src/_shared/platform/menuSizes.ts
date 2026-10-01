/**
 * Size handling for food menus.
 *
 * Owners have been modelling sizes as separate items ("Pepperoni 12\"",
 * "Pepperoni 16\"" …), which triples a pizza menu's length everywhere it
 * renders. Two tools fix that:
 *
 *  - `groupByBase` detects those families at DISPLAY time, so every menu that
 *    was set up the old way collapses to one line per dish with its sizes
 *    beside it, on the site and in ordering, without touching stored data.
 *  - `combineSizedItems` applies the same detection to a content draft in the
 *    admin editor, converting a legacy family into one item with an explicit
 *    `sizes` array the owner can edit from then on.
 *
 * Detection is deliberately conservative: a family only forms when at least
 * two items in the same category share a base name and carry DISTINCT,
 * recognisable size tokens. One odd name can never merge into another item,
 * and an unparsed item always passes through untouched.
 */

/** An explicit size on a content-menu item. Price is display text ("$14"). */
export interface MenuSizePrice { label: string; price: string }

/* ── Token recognition ───────────────────────────────────────────────── */

/** Known size words → display rank (small before large). Ambiguous words that
 *  appear in real dish names (single, double, triple) are deliberately absent:
 *  a "Double Cheeseburger" is a dish, not a size of "Cheeseburger". */
const SIZE_WORDS: Record<string, number> = {
  mini: 0, kids: 1, personal: 2, individual: 2, cup: 2,
  sm: 3, small: 3,
  md: 4, med: 4, medium: 4,
  reg: 5, regular: 5, half: 5, pint: 5,
  lg: 6, large: 6, bowl: 6,
  whole: 7, full: 7, quart: 7,
  xl: 8, 'x-large': 8, 'extra-large': 8, 'extra large': 8,
  xxl: 9, family: 10, party: 11,
}

/** Numeric sizes: 12", 12 in, 12-inch, 16 oz, 1 l, 6 pc, 8 piece, 10 ct … */
const NUM_SIZE = /^(\d{1,3}(?:\.\d+)?)\s*(?:"|”|''|-?\s*(?:in|inch|inches|oz|ounce|ounces|ml|l|ltr|liter|litre|pc|pcs|piece|pieces|ct|count))\.?$/i

/** Rank a recognised token so families sort small → large. Word ranks sit
 *  below 50; numeric sizes order among themselves by magnitude. */
function sizeRank(token: string): number | null {
  const w = SIZE_WORDS[token.toLowerCase().replace(/\s+/g, ' ').trim()]
  if (w !== undefined) return w
  const m = NUM_SIZE.exec(token.trim())
  if (m) return 50 + parseFloat(m[1]!)
  return null
}

export interface ParsedSizeName { base: string; label: string; rank: number }

/**
 * Splits "Pepperoni 12\"" / "Large Greek Salad" / "Calzone (Sm)" /
 * "Wings - 12 pc" into base + size token. Returns null when the name does not
 * end or start with a recognisable size, which is most names.
 */
export function parseSizedName(name: string): ParsedSizeName | null {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!clean) return null

  // Trailing parenthetical: "Calzone (Small)"
  const paren = /^(.{2,}?)\s*\(([^()]{1,14})\)$/.exec(clean)
  if (paren) {
    const rank = sizeRank(paren[2]!)
    if (rank !== null) return { base: paren[1]!.trim(), label: paren[2]!.trim(), rank }
  }

  // Separator form: "Pizza - Large", "Wings – 12 pc", "Cut | Half"
  const sep = /^(.{2,}?)\s*[-–—·|,:]\s*(.{1,14})$/.exec(clean)
  if (sep) {
    const rank = sizeRank(sep[2]!)
    if (rank !== null) return { base: sep[1]!.trim(), label: sep[2]!.trim(), rank }
  }

  const words = clean.split(' ')
  // Trailing token, up to two words: "Greek Salad Large", "Pepperoni 12\"",
  // "Sub 12 inch", "Feast Extra Large"
  for (const n of [2, 1]) {
    if (words.length > n) {
      const token = words.slice(-n).join(' ')
      const rank = sizeRank(token)
      if (rank !== null) return { base: words.slice(0, -n).join(' '), label: token, rank }
    }
  }
  // Leading token: "Large Greek Salad", "Half Rack"
  for (const n of [2, 1]) {
    if (words.length > n) {
      const token = words.slice(0, n).join(' ')
      const rank = sizeRank(token)
      if (rank !== null) return { base: words.slice(n).join(' '), label: token, rank }
    }
  }
  return null
}

/* ── Generic display grouping ────────────────────────────────────────── */

export type SizedEntry<T> =
  | { kind: 'single'; item: T }
  | { kind: 'sized'; base: string; variants: Array<{ label: string; item: T }> }

/**
 * Collapses a flat list into display entries, replacing each size family with
 * one `sized` entry at the position of its first member. Order is otherwise
 * preserved. A family needs 2+ members with distinct size labels; anything
 * else stays a `single` untouched.
 */
export function groupByBase<T>(list: T[], nameOf: (t: T) => string): Array<SizedEntry<T>> {
  const parsed = list.map(item => ({ item, p: parseSizedName(nameOf(item)) }))

  // Families keyed by lowercased base name.
  const families = new Map<string, Array<{ item: T; p: ParsedSizeName }>>()
  for (const row of parsed) {
    if (!row.p || !row.p.base) continue
    const key = row.p.base.toLowerCase()
    const fam = families.get(key) ?? []
    fam.push(row as { item: T; p: ParsedSizeName })
    families.set(key, fam)
  }

  // A family is real only with 2+ members and no duplicate size labels.
  const real = new Set<string>()
  for (const [key, fam] of families) {
    const labels = new Set(fam.map(f => f.p.label.toLowerCase()))
    if (fam.length >= 2 && labels.size === fam.length) real.add(key)
  }

  const emitted = new Set<string>()
  const out: Array<SizedEntry<T>> = []
  for (const row of parsed) {
    const key = row.p?.base.toLowerCase()
    if (!row.p || !key || !real.has(key)) {
      out.push({ kind: 'single', item: row.item })
      continue
    }
    if (emitted.has(key)) continue
    emitted.add(key)
    const fam = families.get(key)!
    const variants = [...fam]
      .sort((a, b) => a.p.rank - b.p.rank)
      .map(f => ({ label: f.p.label, item: f.item }))
    out.push({ kind: 'sized', base: fam[0]!.p.base, variants })
  }
  return out
}

/* ── Content-menu display normalisation ──────────────────────────────── */

export interface ContentMenuItem {
  name: string; description?: string; price?: string
  sizes?: MenuSizePrice[]; tags?: string[]; image?: string
}
export interface ContentMenuCategory { name: string; description?: string; items?: ContentMenuItem[] }

/** "Small $9 · Large $14" — one line that fits every menu style's price slot. */
function sizesText(sizes: MenuSizePrice[]): string {
  return sizes.map(s => [s.label, s.price].filter(Boolean).join(' ')).join(' · ')
}

/**
 * Prepares content categories for rendering: explicit `sizes` collapse into
 * the item's price text, then legacy same-base items merge the same way. The
 * result keeps the plain `{ name, description, price, tags }` shape every
 * menu layout already renders, so styles need no changes.
 */
export function displayMenuCategories(categories: ContentMenuCategory[]): ContentMenuCategory[] {
  return categories.map(cat => {
    const items = (cat.items ?? []).map(it =>
      it.sizes?.length ? { ...it, price: sizesText(it.sizes) } : it)
    const grouped = groupByBase(items, it => it.name ?? '').map((entry): ContentMenuItem => {
      if (entry.kind === 'single') return entry.item
      const first = entry.variants[0]!.item
      return {
        ...first,
        name: entry.base,
        description: entry.variants.map(v => v.item.description).find(Boolean),
        tags: entry.variants.map(v => v.item.tags).find(t => t?.length),
        image: entry.variants.map(v => v.item.image).find(Boolean),
        price: sizesText(entry.variants.map(v => ({ label: v.label, price: v.item.price ?? '' }))),
      }
    })
    return { ...cat, items: grouped }
  })
}

/* ── Draft migration (admin editor) ──────────────────────────────────── */

/**
 * Converts legacy size families in a content draft into single items with an
 * explicit `sizes` array. Returns the new categories plus how many families
 * were combined, so the editor can say what happened. Items outside a family
 * are passed through by reference; nothing is touched unless a family formed.
 */
export function combineSizedItems(categories: ContentMenuCategory[]): { categories: ContentMenuCategory[]; combined: number } {
  let combined = 0
  const next = categories.map(cat => {
    const entries = groupByBase(cat.items ?? [], it => it.name ?? '')
    if (!entries.some(e => e.kind === 'sized')) return cat
    const items = entries.map((entry): ContentMenuItem => {
      if (entry.kind === 'single') return entry.item
      combined++
      const first = entry.variants[0]!.item
      return {
        ...first,
        name: entry.base,
        description: entry.variants.map(v => v.item.description).find(Boolean) ?? '',
        tags: entry.variants.map(v => v.item.tags).find(t => t?.length) ?? [],
        image: entry.variants.map(v => v.item.image).find(Boolean) ?? '',
        price: '',
        sizes: entry.variants.map(v => ({ label: v.label, price: v.item.price ?? '' })),
      }
    })
    return { ...cat, items }
  })
  return { categories: next, combined }
}
