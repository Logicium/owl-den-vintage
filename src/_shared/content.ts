/**
 * Site content type contracts for each archetype.
 * Used by the runtime overlay API (`/v1/sites/:slug/content`)
 * and the wizard payload posted to `/v1/orders`.
 */
import type { ThemeName, SwatchName, SiteVariant } from './themes/tokens'
import type { ArchetypeKey } from './tokens'

export interface PhotoSlot { src: string; alt?: string; caption?: string }
export interface ContactInfo { address: string; phone: string; email: string; mapEmbedUrl?: string }
export interface Story { title: string; paragraphs: string[]; facts?: Array<{ label: string; value: string }> }
export interface Testimonial { quote: string; author: string; source?: string }
export interface SocialLink { label: string; href: string }
export interface HoursRow { day: string; open: string }

/** Mesa (restaurant) */
/** One size of a dish ("12\"" at "$14"). A dish with `sizes` renders them in place of its single price. */
export interface MenuItemSize { label: string; price: string }
export interface MenuItem { name: string; description?: string; price: string; sizes?: MenuItemSize[]; tags?: string[] }
export interface MenuCategory { name: string; description?: string; items: MenuItem[] }
export interface MesaPhotos { hero: PhotoSlot; about: PhotoSlot; gallery: PhotoSlot[] }
export interface MesaSiteConfig {
  brand: string
  tagline: string
  blurb: string
  theme: ThemeName
  swatch: SwatchName
  variant: SiteVariant
  contact: ContactInfo
  hours: HoursRow[]
  photos: MesaPhotos
  story: Story
  menu: { intro?: string; categories: MenuCategory[]; fullMenuUrl?: string }
  testimonials: Testimonial[]
  social: SocialLink[]
}

/** Hearth (hotel) */
export interface Room {
  name: string
  blurb: string
  image: string
  imageAlt?: string
  features: string[]
  rateFrom?: string
  bookUrl?: string
}
export interface HearthPhotos { hero: PhotoSlot; about: PhotoSlot; rooms: PhotoSlot[]; gallery: PhotoSlot[] }
export interface HearthSiteConfig {
  brand: string
  tagline: string
  blurb: string
  theme: ThemeName
  swatch: SwatchName
  variant: SiteVariant
  contact: ContactInfo
  photos: HearthPhotos
  story: Story
  rooms: Room[]
  amenities: Array<{ label: string; description?: string; icon?: string }>
  testimonials: Testimonial[]
  bookingUrl: string
  social: SocialLink[]
}

/** Vault (shop) */
export interface Product {
  name: string
  price: string
  image: string
  imageAlt?: string
  blurb?: string
  badge?: string
  url?: string
}
export interface Category { name: string; image: string; imageAlt?: string; url?: string; count?: number }
export interface VaultPhotos { hero: PhotoSlot; about: PhotoSlot; storefront: PhotoSlot; gallery: PhotoSlot[] }
export interface VaultSiteConfig {
  brand: string
  tagline: string
  blurb: string
  theme: ThemeName
  swatch: SwatchName
  variant: SiteVariant
  contact: ContactInfo
  hours: HoursRow[]
  photos: VaultPhotos
  story: Story
  featured: Product[]
  categories: Category[]
  testimonials: Testimonial[]
  shopUrl: string
  social: SocialLink[]
}

/** Marquee (venues & attractions — theaters, galleries, bands, event spaces) */
export type EventStatus = 'on-sale' | 'sold-out' | 'few-left' | 'free' | 'cancelled' | 'postponed'
export interface EventItem {
  /** Stable slug for URLs and admin keying. */
  id: string
  title: string
  /** ISO 8601 date (YYYY-MM-DD). */
  date: string
  /** 24h time, e.g. "20:00". Optional when doors-only. */
  startTime?: string
  doorsTime?: string
  /** Free-form short label, e.g. "Concert", "Exhibition opening", "Film". */
  category?: string
  /** Display string e.g. "$25 / $20 students" or "Free" or "Donation". */
  priceLabel?: string
  /** External ticket-link (Eventbrite, etgix, box-office, etc). */
  ticketUrl?: string
  status?: EventStatus
  /** Performers / lineup / artists / films. */
  lineup?: string[]
  image: string
  imageAlt?: string
  blurb: string
  /** Long description shown on the detail expansion (markdown-flavored plain text). */
  description?: string
  /** Optional age restriction, e.g. "All ages", "21+", "12A". */
  ageRestriction?: string
  /** Optional runtime in minutes (films, plays). */
  runtimeMinutes?: number
  featured?: boolean
}
export interface EventSeries {
  name: string
  blurb: string
  cadence?: string
  image?: string
}
export interface Performer {
  name: string
  role?: string
  bio?: string
  image?: string
  imageAlt?: string
  links?: SocialLink[]
}
export interface VenueDetail {
  capacity?: string
  ageRestrictions?: string
  parking?: string
  accessibility?: string
  foodAndDrink?: string
  rentalUrl?: string
  rentalBlurb?: string
}
export interface MarqueePhotos {
  hero: PhotoSlot
  about: PhotoSlot
  /** Lifestyle / venue / past-show photos for home + gallery. */
  gallery: PhotoSlot[]
}
export interface MarqueeSiteConfig {
  brand: string
  tagline: string
  blurb: string
  theme: ThemeName
  swatch: SwatchName
  variant: SiteVariant
  contact: ContactInfo
  hours: HoursRow[]
  photos: MarqueePhotos
  story: Story
  venue: VenueDetail
  events: EventItem[]
  /** Recurring programs (open mic, gallery walk, weekly film). */
  series: EventSeries[]
  /** Resident artists, ensemble members, curators (portfolio variant). */
  performers: Performer[]
  testimonials: Testimonial[]
  /** Primary external ticketing platform (used for the masthead CTA). */
  ticketingUrl?: string
  /** Optional newsletter signup endpoint (mailchimp / convertkit URL). */
  newsletterUrl?: string
  social: SocialLink[]
}

export type AnySiteConfig = MesaSiteConfig | HearthSiteConfig | VaultSiteConfig | MarqueeSiteConfig

export type SiteConfigOf<K extends ArchetypeKey> =
  K extends 'mesa' ? MesaSiteConfig :
  K extends 'hearth' ? HearthSiteConfig :
  K extends 'vault' ? VaultSiteConfig :
  K extends 'marquee' ? MarqueeSiteConfig :
  never

/** Wizard / order payload posted to the backend on purchase. */
export interface WizardPayload<K extends ArchetypeKey = ArchetypeKey> {
  archetype: K
  /** A clean, sluggable brand identifier; the backend will dedupe. */
  desiredSlug: string
  config: SiteConfigOf<K>
}

/** Owner-facing form submission shape. */
export interface FormSubmissionPayload {
  type: 'contact' | 'newsletter'
  /** Free-form key/value collected by the form. */
  fields: Record<string, string>
  /** Honeypot — must be empty. */
  hp?: string
  /** hCaptcha response token. */
  captcha?: string
}
