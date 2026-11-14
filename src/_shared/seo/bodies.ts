/**
 * Static page bodies from a template's content.
 *
 * The prerender writes each public page with its real content in `#app`, so a
 * crawler that does not run JavaScript, a link unfurler or an assistant reads
 * the business, not an empty shell. These helpers build that HTML from the
 * same records the Vue sections render; the app replaces it on hydration.
 * Every string is escaped. Browser-safe, pure.
 */
import { esc, truncate } from './text'

export interface BodyPhoto { src: string; alt?: string; caption?: string }
export interface BodyHoursRow { day: string; open: string }
export interface BodyContact { address?: string; phone?: string; email?: string }
export interface BodyTestimonial { quote: string; author: string; source?: string }
export interface BodyFact { label: string; value: string }
export interface BodyStory { title?: string; paragraphs?: string[]; facts?: BodyFact[] }

const has = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0

export function h(level: 1 | 2 | 3, text: string | undefined): string {
  return has(text) ? `<h${level}>${esc(text)}</h${level}>` : ''
}

export function p(text: string | undefined): string {
  return has(text) ? `<p>${esc(text)}</p>` : ''
}

export function paragraphs(list: string[] | undefined): string {
  return (list ?? []).filter(has).map((t) => `<p>${esc(t)}</p>`).join('')
}

export function ul(items: Array<string | undefined>): string {
  const li = items.filter(has).map((t) => `<li>${esc(t)}</li>`)
  return li.length ? `<ul>${li.join('')}</ul>` : ''
}

/** A section with a heading, only when there is something under it. */
export function section(title: string | undefined, inner: string, level: 2 | 3 = 2): string {
  if (!inner.trim()) return ''
  return `<section>${h(level, title)}${inner}</section>`
}

export function story(s: BodyStory | undefined, eyebrow?: string): string {
  if (!s) return ''
  const facts = s.facts?.length ? `<dl>${s.facts.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd>`).join('')}</dl>` : ''
  const inner = `${p(eyebrow)}${paragraphs(s.paragraphs)}${facts}`
  return inner.trim() ? `<section>${h(2, s.title)}${inner}</section>` : ''
}

export function hours(rows: BodyHoursRow[] | undefined, title = 'Hours', note?: string): string {
  const list = (rows ?? []).filter((r) => has(r.day) && has(r.open))
  if (!list.length) return ''
  return `<section>${h(2, title)}<table><tbody>${list.map((r) => `<tr><th scope="row">${esc(r.day)}</th><td>${esc(r.open)}</td></tr>`).join('')}</tbody></table>${p(note)}</section>`
}

export function contact(c: BodyContact | undefined, title = 'Contact'): string {
  if (!c) return ''
  const parts: string[] = []
  if (has(c.address)) parts.push(`<p><strong>Address:</strong> ${esc(c.address)}</p>`)
  if (has(c.phone)) parts.push(`<p><strong>Phone:</strong> <a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a></p>`)
  if (has(c.email)) parts.push(`<p><strong>Email:</strong> <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>`)
  return parts.length ? `<section>${h(2, title)}<address>${parts.join('')}</address></section>` : ''
}

export function photos(list: BodyPhoto[] | undefined, title?: string, limit?: number): string {
  const shots = (list ?? []).filter((ph) => has(ph.src)).slice(0, limit ?? Infinity)
  if (!shots.length) return ''
  return `<section>${h(2, title)}<ul>${shots.map((ph) => `<li><img src="${esc(ph.src)}" alt="${esc(ph.alt ?? ph.caption ?? '')}" loading="lazy">${has(ph.caption) ? `<p>${esc(ph.caption)}</p>` : ''}</li>`).join('')}</ul></section>`
}

export function testimonials(list: BodyTestimonial[] | undefined, title = 'What people say'): string {
  const quotes = (list ?? []).filter((t) => has(t.quote))
  if (!quotes.length) return ''
  return `<section>${h(2, title)}${quotes.map((t) => `<blockquote><p>${esc(t.quote)}</p><footer>${esc(t.author)}${has(t.source) ? `, ${esc(t.source)}` : ''}</footer></blockquote>`).join('')}</section>`
}

export function links(list: Array<{ label: string; href: string }> | undefined, title?: string): string {
  const items = (list ?? []).filter((l) => has(l.href) && has(l.label))
  if (!items.length) return ''
  return `<section>${h(2, title)}<ul>${items.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul></section>`
}

/** The page opening every template shares: title, strap line and lede. */
export function hero(title: string | undefined, strap?: string, lede?: string): string {
  return `<header>${h(1, title)}${p(strap)}${p(lede)}</header>`
}

/** One `<main>` with its parts. */
export function main(...parts: Array<string | undefined>): string {
  return `<main>${parts.filter(has).join('')}</main>`
}

/** "$28" -> 28, "$1,200" -> 1200; nothing for "Quote", "Free" or a blank. */
export function priceNumber(label: string | undefined): number | undefined {
  if (!has(label)) return undefined
  const m = label.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/)
  if (!m) return undefined
  const n = Number(m[0])
  return Number.isFinite(n) ? n : undefined
}

/** "October 29, 2026" or "2026-10-29" to an ISO date, or nothing. */
export function isoDate(input: string | undefined): string | undefined {
  if (!has(input)) return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.slice(0, 10)
  const t = Date.parse(input)
  return Number.isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10)
}

/**
 * A meta description from sentences in order of importance: adds sentences
 * until the text reaches `min` characters, then cuts at a word boundary under
 * `max`. Empty parts are skipped and each part ends with a full stop, so an
 * owner's blank field never leaves a broken sentence behind.
 */
export function compose(parts: Array<string | false | null | undefined>, min = 120, max = 160): string {
  let out = ''
  for (const raw of parts) {
    if (!has(raw)) continue
    const t = raw.replace(/\s+/g, ' ').trim()
    const sentence = /[.!?…]$/.test(t) ? t : `${t}.`
    out = out ? `${out} ${sentence}` : sentence
    if (out.length >= min) break
  }
  return truncate(out, max)
}

/** "a, b and c" */
export function listOf(items: Array<string | undefined>, max = 4): string {
  const list = items.filter(has).slice(0, max)
  if (list.length < 2) return list[0] ?? ''
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}
