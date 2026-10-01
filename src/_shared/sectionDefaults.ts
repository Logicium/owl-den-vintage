/**
 * Build-time section headings, mirrored for the dashboard.
 *
 * Every template renders its section eyebrows / titles / notes from its own
 * `site.config.ts` `sections` block, and the published content overlay wins
 * over that when a key is present. The Content page, however, builds its
 * editor purely from keys already in the saved draft — so a heading that only
 * ever lived in `site.config` was rendered on the site but invisible (and
 * therefore uneditable) in the dashboard. Owners hit this as "I can't edit
 * this text", e.g. Mesa's "When to come by" note and its Visit subtitle.
 *
 * Seeding the draft from this map makes those headings appear as normal
 * editable fields.
 *
 * ── CONTRACT ──
 * Values here MUST match the corresponding template's `site.config.ts`
 * `sections` block EXACTLY. The dashboard seeds and then publishes these, so
 * a mismatch would silently rewrite copy on a live site. Only list an
 * archetype once its template actually has a `sections` block; an archetype
 * absent from this map is simply not seeded (safe no-op).
 */
export type SectionDefaults = Record<string, Record<string, string>>

/** Mirrors archetype-mesa-ui/src/config/site.config.ts -> sections. */
const mesa: SectionDefaults = {
  story: { eyebrow: 'Our story' },
  gallery: { eyebrow: 'From the kitchen', title: 'A look around' },
  featured: { eyebrow: 'Tonight', title: 'A few favorites' },
  hours: {
    eyebrow: 'Visit',
    title: 'When to come by',
    note: 'Brunch and dinner. Reservations recommended on weekends.',
  },
  reviews: { eyebrow: 'Kind words' },
  galleryPage: { eyebrow: 'Gallery', title: 'The kitchen, the room, the food' },
  menuPage: { eyebrow: 'Eat with us', title: 'The full menu' },
  hero: { ctaPrimary: 'See the menu', ctaSecondary: 'Find us' },
  order: {
    eyebrow: 'Order',
    title: 'Order for pickup',
    intro: 'Pick your items, choose a pickup time, and we\u2019ll have it ready.',
  },
  menu: { fullMenuLabel: 'View full menu' },
  visit: {
    eyebrow: 'Visit',
    title: 'Find your seat',
    subtitle: 'We are easy to find on Main Street, with parking on the cross streets.',
  },
  contact: { title: 'Reservations & questions' },
}

/** Mirrors archetype-vault-ui/src/config/site.config.ts -> sections. */
const vault: SectionDefaults = {
  nav: { home: 'Home', shop: 'Shop', visit: 'Visit', gallery: 'Lookbook', ctaLabel: 'Shop' },
  hero: { ctaPrimary: 'Shop now', ctaSecondary: 'Visit us' },
  categories: { eyebrow: 'Browse', title: 'Browse the shop', countLabel: 'items' },
  featured: { eyebrow: 'Just in', title: 'A few favorites', shopAllLabel: 'Shop everything', ctaLabel: 'View' },
  story: { eyebrow: 'Our shop' },
  gallery: { eyebrow: 'In the wild' },
  hours: { eyebrow: 'Visit', title: 'When we\u2019re open' },
  reviews: { eyebrow: 'Notes from neighbors', title: 'What our guests say' },
  shopPage: {
    eyebrow: 'Shop',
    title: 'Everything in the shop',
    subtitle: 'New arrivals every Friday. Local pickup is free in Trinidad.',
    featuredTitle: 'Featured',
  },
  shop: { eyebrow: 'Shop', title: 'Available now', intro: 'Add to cart, then check out for pickup or shipping.' },
  visit: {
    eyebrow: 'Visit',
    title: 'Stop in',
    subtitle: 'Right on Main Street, two doors down from the post office. Free street parking.',
  },
  galleryPage: { eyebrow: 'Lookbook', title: 'Goods in their habitat' },
  contact: { title: 'Send us a note' },
}

/** Mirrors archetype-hearth-ui/src/config/site.config.ts -> sections. */
const hearth: SectionDefaults = {
  nav: { home: 'Home', rooms: 'Rooms', book: 'Book', gallery: 'Gallery', ctaLabel: 'Book' },
  hero: { ctaPrimary: 'Book a room', ctaSecondary: 'See rooms' },
  story: { eyebrow: 'The inn' },
  rooms: { eyebrow: 'Rooms', title: 'Eight rooms, every one different', rateFromLabel: 'From', ctaLabel: 'Reserve' },
  amenities: { eyebrow: 'Stay', title: 'Everything you need' },
  gallery: { eyebrow: 'A look around' },
  reviews: { eyebrow: 'From past guests', title: 'What our guests say' },
  roomsPage: {
    eyebrow: 'Rooms',
    title: 'Pick your room',
    subtitle: 'Every room has a king or queen bed, fast Wi-Fi, blackout curtains, and a hot shower.',
    amenitiesTitle: 'What is included',
  },
  bookPage: {
    eyebrow: 'Reserve',
    title: 'Book your stay',
    subtitle: 'Use our booking partner for instant confirmation, or send us a note and we will reply the same day.',
    externalCtaLabel: 'Open booking site',
  },
  lodging: {
    eyebrow: 'Reserve',
    title: 'Pick your dates',
    intro: 'Choose your nights and party size \u2014 we\u2019ll show you what\u2019s available.',
  },
  galleryPage: { eyebrow: 'Gallery', title: 'The inn, room by room' },
  contact: { title: 'Or just send us a note' },
}

/** Mirrors archetype-keystone-ui/src/config/site.config.ts -> sections. */
const keystone: SectionDefaults = {
  nav: { home: 'Home', services: 'Services', work: 'Work', contact: 'Contact', ctaLabel: 'Get a quote' },
  hero: { title: 'Tools down. Job done.', ctaPrimary: 'See services', ctaSecondary: 'Get a quote' },
  dispatch: { label: 'Dispatch', emergencyLabel: '24/7 emergency' },
  services: { eyebrow: 'What we do', title: 'Services & rates' },
  capabilities: { eyebrow: 'On paper', title: 'Capabilities' },
  story: { eyebrow: 'The shop' },
  projects: { eyebrow: 'Recent work', title: 'From the yard' },
  hours: {
    eyebrow: 'When we\u2019re open',
    title: 'Shop hours',
    note: 'After-hours dispatch available for fleet contracts.',
  },
  reviews: { eyebrow: 'Word from the lot', title: 'What customers say' },
  servicesPage: {
    eyebrow: 'Services & rates',
    title: 'What we\u2019ll quote, and what we won\u2019t',
    subtitle: 'Three trades under one roof. Flat-rate where we can, time-and-materials where we have to \u2014 always in writing before the wrench turns.',
    capabilitiesEyebrow: 'Spec sheet',
    capabilitiesTitle: 'Equipped for the job',
  },
  projectsPage: {
    eyebrow: 'Recent work',
    title: 'The yard, the shop, the road.',
    subtitle: 'A sample of jobs delivered out of the Trinidad bay. References available in your trade \u2014 just ask.',
    galleryEyebrow: 'From the floor',
    galleryTitle: 'Daily work',
  },
  contactPage: {
    eyebrow: 'Contact & dispatch',
    title: 'Call the shop. Or send a quote request.',
    subtitle: 'Walk-ins welcome during shop hours. Fleet, mobile field service, and emergency dispatch by phone.',
    hoursEyebrow: 'Shop hours',
    hoursNote: 'After-hours emergency dispatch for fleet contracts.',
  },
  booking: {
    eyebrow: 'Book a service',
    title: 'Schedule an appointment online',
    intro: 'Pick a service and a time that works for you \u2014 we\u2019ll send a confirmation right away.',
  },
  contact: {
    title: 'Request a quote',
    intro: 'Tell us what you\u2019ve got. We\u2019ll come back with a written estimate and a realistic start date.',
  },
}

/** Mirrors archetype-marquee-ui/src/config/site.config.ts -> sections. */
const marquee: SectionDefaults = {
  nav: { home: 'Home', events: 'Events', visit: 'Visit', tickets: 'Tickets', lineup: 'Lineup', gallery: 'Gallery', ctaLabel: 'Tickets' },
  hero: {
    nextShowLabel: 'Next on the marquee',
    ctaPrimary: 'Get tickets',
    ctaSecondary: 'All events',
    emptyCtaPrimary: 'See upcoming events',
    emptyCtaSecondary: 'Visit',
  },
  events: {
    eyebrow: "What's on",
    title: 'Coming up',
    allFilterLabel: 'All',
    emptyText: 'No upcoming events in this category \u2014 check back soon.',
  },
  story: { eyebrow: 'About' },
  series: { eyebrow: 'Every month', title: 'Programs you can count on' },
  gallery: { eyebrow: 'On stage' },
  reviews: { eyebrow: 'What people say', title: 'What our guests say' },
  eventsPage: {
    eyebrow: 'Events',
    title: 'Every show on the calendar',
    subtitle: 'Tickets open the moment a show is announced. Sign up for our newsletter to hear about new dates first.',
    calendarEyebrow: 'Month view',
    listTitle: 'All upcoming events',
    seriesEyebrow: 'Recurring',
    seriesTitle: 'Programs that come back around',
  },
  ticketsPage: {
    eyebrow: 'Tickets',
    title: 'Get in',
    subtitle: 'Most events ticket through our partner platform. For group requests, accessibility, or holds \u2014 reach out directly.',
    ctaLabel: 'Get tickets',
    doorNote: 'Tickets are also available at the door when capacity allows.',
    listEyebrow: 'On sale now',
    listTitle: 'Pick your night',
  },
  visitPage: {
    eyebrow: 'Visit',
    title: 'Plan your night out',
    subtitle: 'The basics for getting here, getting in, and getting comfortable.',
    venueEyebrow: 'The venue',
    venueTitle: 'What to expect',
    hoursEyebrow: 'Hours',
    hoursTitle: 'When we\u2019re open',
    contactEyebrow: 'Find us',
    contactTitle: 'Get in touch',
  },
  lineupPage: {
    eyebrow: 'Lineup',
    title: 'Artists & company',
    subtitle: 'The people who make this place go \u2014 residents, regulars, and the company behind the curtain.',
  },
  galleryPage: { eyebrow: 'Gallery', title: 'From past performances' },
  contact: {
    eyebrow: 'Get in touch',
    title: 'Group sales, holds, or access requests',
    intro: 'Tell us the event and how many spots; we\u2019ll get back within one business day.',
  },
}

export const SECTION_DEFAULTS: Record<string, SectionDefaults> = { mesa, vault, hearth, keystone, marquee }

/**
 * Fills in section headings the draft has never stored, without touching
 * anything the owner has already edited. Returns a new object; the input is
 * left alone. Unknown archetypes pass through unchanged.
 */
export function withSectionDefaults(
  archetype: string,
  sections: unknown,
): SectionDefaults | undefined {
  const defaults = SECTION_DEFAULTS[archetype]
  if (!defaults) return (sections as SectionDefaults) ?? undefined

  const current = (sections && typeof sections === 'object' && !Array.isArray(sections))
    ? (sections as SectionDefaults)
    : {}

  const out: SectionDefaults = {}
  for (const [group, fields] of Object.entries(defaults)) {
    const existing = current[group]
    out[group] = { ...fields, ...(existing && typeof existing === 'object' ? existing : {}) }
  }
  // Preserve any groups the template added that this map doesn't know about.
  for (const [group, fields] of Object.entries(current)) {
    if (!out[group] && fields && typeof fields === 'object') out[group] = fields
  }
  return out
}
