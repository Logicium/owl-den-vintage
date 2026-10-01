/**
 * In-browser stand-ins for the platform's commerce endpoints, used when
 * `DEMO_MODE` is on (static template deployments with no backend).
 *
 * The goal is a fully clickable premium experience — browse, add to cart,
 * "check out" — with clearly simulated results: ids are `demo-` prefixed,
 * nothing is persisted beyond the tab, and no payment happens. Inventory
 * and ticket counts decrement in-session so the flows feel real.
 */
import type {
  EventDTO, MealOrderDTO, ReservationDTO, ShopOrderDTO, TicketDTO, TicketOrderDTO,
} from './contentClient'

let seq = 0
function demoId(prefix: string): string {
  seq += 1
  return `demo-${prefix}-${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function daysFromNow(days: number, hour = 12, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`

// ── Shop (Vault · E-Shop add-on) ─────────────────────────────────────────

const shopProducts = [
  { id: 'demo-p1', sku: 'CANDLE-01', name: 'Juniper Ridge Candle', description: 'Hand-poured soy candle, 40-hour burn.', priceCents: 2400, currency: 'USD', imageUrl: IMG('photo-1602874801007-bd458bb1b8b6'), inventory: 14, active: true, sortOrder: 1 },
  { id: 'demo-p2', sku: 'MUG-01', name: 'Stoneware Mug', description: 'Wheel-thrown, dishwasher safe, 12 oz.', priceCents: 3200, currency: 'USD', imageUrl: IMG('photo-1514228742587-6b1558fcca3d'), inventory: 22, active: true, sortOrder: 2 },
  { id: 'demo-p3', sku: 'TOTE-01', name: 'Waxed Canvas Tote', description: 'Heavy 18 oz canvas with leather straps.', priceCents: 5800, currency: 'USD', imageUrl: IMG('photo-1544816155-12df9643f363'), inventory: 9, active: true, sortOrder: 3 },
  { id: 'demo-p4', sku: 'PRINT-01', name: 'Fisher’s Peak Print', description: 'Archival giclée, 12×16, signed.', priceCents: 4500, currency: 'USD', imageUrl: IMG('photo-1465101162946-4377e57745c3'), inventory: 30, active: true, sortOrder: 4 },
  { id: 'demo-p5', sku: 'SOAP-01', name: 'Cedar & Sage Soap', description: 'Cold-process bar, essential oils only.', priceCents: 900, currency: 'USD', imageUrl: IMG('photo-1600857544200-b2f666a9a2ec'), inventory: 48, active: true, sortOrder: 5 },
  { id: 'demo-p6', sku: 'HOODIE-01', name: 'Trail Hoodie', description: 'Midweight fleece, embroidered logo.', priceCents: 6400, currency: 'USD', imageUrl: IMG('photo-1556821840-3a63f95609a7'), inventory: 0, active: true, sortOrder: 6 },
]

const SHOP_SHIPPING_CENTS = 800

// ── Ticketing (Marquee · Events add-on) ──────────────────────────────────

interface DemoTier { id: string; label: string; description?: string; priceCents: number; capacity: number; sold: number }
interface DemoEvent {
  id: string; title: string; description: string; startsAt: Date; venue: string
  imageUrl: string; capacity: number; tiers: DemoTier[]
}

const demoEvents: DemoEvent[] = [
  {
    id: 'demo-e1', title: 'Friday Night Live: The Hollow Pines', venue: 'Main stage',
    description: 'Roots-rock double set with local openers. Doors at 7.',
    startsAt: daysFromNow(3, 19, 30), capacity: 180, imageUrl: IMG('photo-1501386761578-eac5c94b800a'),
    tiers: [
      { id: 'demo-e1-ga', label: 'General admission', priceCents: 2500, capacity: 150, sold: 96 },
      { id: 'demo-e1-vip', label: 'VIP · front tables', description: 'Reserved table seating + drink ticket.', priceCents: 6000, capacity: 30, sold: 27 },
    ],
  },
  {
    id: 'demo-e2', title: 'Comedy Night: Altitude Adjustment', venue: 'Cabaret room',
    description: 'Four comics, two hours, one drink minimum.',
    startsAt: daysFromNow(9, 20, 0), capacity: 120, imageUrl: IMG('photo-1585699324551-f6c309eedeca'),
    tiers: [
      { id: 'demo-e2-ga', label: 'General admission', priceCents: 1800, capacity: 120, sold: 41 },
    ],
  },
  {
    id: 'demo-e3', title: 'An Evening with Marisol Vega', venue: 'Main stage',
    description: 'Solo acoustic performance — seated show.',
    startsAt: daysFromNow(16, 19, 0), capacity: 200, imageUrl: IMG('photo-1470229722913-7c0e2dbbafd3'),
    tiers: [
      { id: 'demo-e3-ga', label: 'General admission', priceCents: 3500, capacity: 170, sold: 170 },
      { id: 'demo-e3-bal', label: 'Balcony', priceCents: 2800, capacity: 30, sold: 12 },
    ],
  },
]

function toEventDTO(e: DemoEvent): EventDTO {
  const sold = e.tiers.reduce((s, t) => s + t.sold, 0)
  const remainingTotal = e.tiers.reduce((s, t) => s + (t.capacity - t.sold), 0)
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt.toISOString(),
    venue: e.venue,
    imageUrl: e.imageUrl,
    capacity: e.capacity,
    currency: 'USD',
    status: remainingTotal <= 0 ? 'sold_out' : 'on_sale',
    sold,
    tiers: e.tiers.map(t => ({
      id: t.id, label: t.label, description: t.description,
      priceCents: t.priceCents, capacity: t.capacity, active: true,
      sold: t.sold, remaining: Math.max(0, t.capacity - t.sold),
    })),
  }
}

// ── Ordering (Mesa · Meal Ordering add-on) ───────────────────────────────

const demoMenu = [
  { id: 'demo-m1', sku: 'STR-01', name: 'Green Chile Queso', description: 'Hatch chiles, white cheddar, warm tortilla chips.', priceCents: 950, category: 'Starters', imageUrl: IMG('photo-1541529086526-db283c563270'), active: true, sortOrder: 1 },
  { id: 'demo-m2', sku: 'STR-02', name: 'Charred Corn Elote', description: 'Cotija, lime crema, chile dust.', priceCents: 850, category: 'Starters', imageUrl: IMG('photo-1615870216519-2f9fa575fa5c'), active: true, sortOrder: 2 },
  { id: 'demo-m3', sku: 'MN-01', name: 'Smoked Brisket Plate', description: '12-hour oak smoke, two sides, house pickles.', priceCents: 2200, category: 'Mains', imageUrl: IMG('photo-1529193591184-b1d58069ecdd'), active: true, sortOrder: 3 },
  { id: 'demo-m4', sku: 'MN-02', name: 'Trout Almondine', description: 'Local rainbow trout, brown butter, almonds.', priceCents: 2400, category: 'Mains', imageUrl: IMG('photo-1467003909585-2f8a72700288'), active: true, sortOrder: 4 },
  { id: 'demo-m5', sku: 'MN-03', name: 'Mushroom Pozole', description: 'Hominy, guajillo broth, all the fixings. Vegan.', priceCents: 1600, category: 'Mains', imageUrl: IMG('photo-1547592180-85f173990554'), active: true, sortOrder: 5 },
  { id: 'demo-m6', sku: 'DS-01', name: 'Sopapillas & Honey', description: 'Fried to order, local honey, cinnamon sugar.', priceCents: 700, category: 'Desserts', imageUrl: IMG('photo-1551024601-bec78aea704b'), active: true, sortOrder: 6 },
  { id: 'demo-m7', sku: 'DR-01', name: 'Prickly Pear Agua Fresca', description: 'House-made, not too sweet.', priceCents: 450, category: 'Drinks', imageUrl: IMG('photo-1544145945-f90425340c7e'), active: true, sortOrder: 7 },
  // One dish in two sizes: shows size grouping in the demo, and exercises the
  // path that collapses legacy per-size items into one card with size buttons.
  { id: 'demo-m8', sku: 'MN-04', name: 'Green Chile Stew (Cup)', description: 'Pork, potatoes, plenty of Hatch.', priceCents: 700, category: 'Mains', imageUrl: IMG('photo-1583224944844-5b268c057b72'), active: true, sortOrder: 8 },
  { id: 'demo-m9', sku: 'MN-05', name: 'Green Chile Stew (Bowl)', description: '', priceCents: 1100, category: 'Mains', imageUrl: IMG('photo-1583224944844-5b268c057b72'), active: true, sortOrder: 9 },
]

// ── Lodging (Hearth · Reservations add-on) ───────────────────────────────

const demoRooms = [
  { id: 'demo-r1', label: 'The Aspen Room', description: 'Queen bed, gas fireplace, mountain view.', capacity: 2, nightlyRateCents: 14500, imageUrl: IMG('photo-1590490360182-c33d57733427') },
  { id: 'demo-r2', label: 'The Ponderosa Suite', description: 'King bed, sitting room, clawfoot tub.', capacity: 3, nightlyRateCents: 19500, imageUrl: IMG('photo-1578683010236-d716f9a3f461') },
  { id: 'demo-r3', label: 'The Bunkhouse', description: 'Two queens + bunk, sleeps the whole crew.', capacity: 6, nightlyRateCents: 23900, imageUrl: IMG('photo-1566665797739-1674de7a421a') },
]

// ── Booking (Keystone · Appointments add-on) ─────────────────────────────

const DEMO_TZ = 'America/Denver'

function demoSlots(days = 14): string[] {
  const out: string[] = []
  const now = Date.now()
  for (let d = 1; d <= days; d++) {
    const date = daysFromNow(d)
    const dow = date.getDay()
    if (dow === 0 || dow === 6) continue // weekdays only
    for (const hour of [9, 10, 11, 13, 14, 15, 16]) {
      // Thin the grid deterministically so days don't look uniformly packed.
      if ((d + hour) % 3 === 0) continue
      const slot = new Date(date)
      slot.setHours(hour, 0, 0, 0)
      if (slot.getTime() > now) out.push(slot.toISOString())
    }
  }
  return out
}

function icsDataUrl(title: string, startIso: string, durationMinutes: number): string {
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const start = new Date(startIso)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apotome Demo//EN', 'BEGIN:VEVENT',
    `UID:${demoId('ics')}@apotome-demo`, `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`, `DTEND:${dt(end)}`, `SUMMARY:${title} (demo)`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}

const latency = (ms = 350) => new Promise<void>(resolve => setTimeout(resolve, ms))

// ── The client ───────────────────────────────────────────────────────────

export const demoClient = {
  // --- Shop ---
  shopListProducts: async (_siteSlug: string) => {
    await latency()
    return {
      currency: 'USD',
      fulfillment: ['pickup', 'shipping'] as Array<'pickup' | 'shipping'>,
      shippingFlatCents: SHOP_SHIPPING_CENTS,
      products: shopProducts.map(p => ({ ...p })),
    }
  },

  shopCreateOrder: async (payload: {
    siteSlug: string; name: string; email: string; phone?: string; notes?: string
    fulfillment: 'pickup' | 'shipping'
    shippingAddress?: { line1: string; line2?: string; city: string; region?: string; postalCode: string; country: string }
    items: Array<{ productId: string; quantity: number }>
  }): Promise<ShopOrderDTO> => {
    await latency(600)
    const items = payload.items.map(i => {
      const p = shopProducts.find(sp => sp.id === i.productId)
      if (!p) throw new Error('Product not found')
      const quantity = Math.min(i.quantity, p.inventory)
      p.inventory = Math.max(0, p.inventory - quantity)
      return {
        productId: p.id, sku: p.sku, name: p.name,
        unitPriceCents: p.priceCents, quantity,
        lineTotalCents: p.priceCents * quantity,
      }
    }).filter(i => i.quantity > 0)
    const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0)
    const shippingCents = payload.fulfillment === 'shipping' ? SHOP_SHIPPING_CENTS : 0
    return {
      id: demoId('order'),
      name: payload.name, email: payload.email, phone: payload.phone, notes: payload.notes,
      fulfillment: payload.fulfillment, shippingAddress: payload.shippingAddress,
      items, subtotalCents, shippingCents,
      totalCents: subtotalCents + shippingCents,
      currency: 'USD', status: 'pending', createdAt: new Date().toISOString(),
    }
  },

  // --- Ticketing ---
  ticketingListEvents: async (_siteSlug: string): Promise<EventDTO[]> => {
    await latency()
    return demoEvents.map(toEventDTO)
  },

  ticketingGetEvent: async (_siteSlug: string, eventId: string): Promise<EventDTO> => {
    await latency()
    const e = demoEvents.find(ev => ev.id === eventId)
    if (!e) throw new Error('Event not found')
    return toEventDTO(e)
  },

  ticketingPurchase: async (payload: {
    siteSlug: string; eventId: string; name: string; email: string; phone?: string
    items: Array<{ tierId: string; quantity: number }>
  }): Promise<TicketOrderDTO> => {
    await latency(600)
    const event = demoEvents.find(e => e.id === payload.eventId)
    if (!event) throw new Error('Event not found')
    const orderId = demoId('tickets')
    const tickets: TicketDTO[] = []
    for (const item of payload.items) {
      const tier = event.tiers.find(t => t.id === item.tierId)
      if (!tier) continue
      const quantity = Math.min(item.quantity, tier.capacity - tier.sold)
      tier.sold += quantity
      for (let n = 0; n < quantity; n++) {
        tickets.push({
          id: demoId('tkt'), eventId: event.id, orderId,
          tierId: tier.id, tierLabel: tier.label,
          unitPriceCents: tier.priceCents, currency: 'USD',
          name: payload.name, email: payload.email, phone: payload.phone,
          status: 'confirmed', createdAt: new Date().toISOString(),
        })
      }
    }
    if (!tickets.length) throw new Error('Those tickets just sold out.')
    return {
      orderId, eventId: event.id, eventTitle: event.title,
      eventStartsAt: event.startsAt.toISOString(), currency: 'USD',
      totalCents: tickets.reduce((s, t) => s + t.unitPriceCents, 0),
      tickets,
    }
  },

  // --- Ordering ---
  orderingMenu: async (_siteSlug: string) => {
    await latency()
    return {
      currency: 'USD',
      categories: ['Starters', 'Mains', 'Desserts', 'Drinks'],
      items: demoMenu.map(m => ({ ...m, currency: 'USD' })),
    }
  },

  orderingSlots: async (_siteSlug: string) => {
    await latency()
    // Pickup every 15 minutes for the next few hours of "service".
    const out: string[] = []
    const start = new Date(Date.now() + 45 * 60_000)
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0)
    for (let i = 0; i < 14; i++) out.push(new Date(start.getTime() + i * 15 * 60_000).toISOString())
    return { timezone: DEMO_TZ, currency: 'USD', slotMinutes: 15, slots: out }
  },

  orderingCreateOrder: async (payload: {
    siteSlug: string; name: string; email: string; phone?: string; notes?: string
    pickupAt: string
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>
  }): Promise<MealOrderDTO> => {
    await latency(600)
    const items = payload.items.map(i => {
      const m = demoMenu.find(mi => mi.id === i.menuItemId)
      if (!m) throw new Error('Menu item not found')
      return {
        menuItemId: m.id, sku: m.sku, name: m.name,
        unitPriceCents: m.priceCents, quantity: i.quantity,
        lineTotalCents: m.priceCents * i.quantity, notes: i.notes,
      }
    })
    const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0)
    return {
      id: demoId('meal'),
      name: payload.name, email: payload.email, phone: payload.phone, notes: payload.notes,
      pickupAt: payload.pickupAt, items, subtotalCents,
      totalCents: subtotalCents, currency: 'USD',
      status: 'confirmed', createdAt: new Date().toISOString(),
    }
  },

  // --- Lodging ---
  lodgingAvailability: async (_siteSlug: string, checkIn: string, checkOut: string, partySize: number) => {
    await latency()
    const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000))
    return {
      checkIn, checkOut, nights,
      timezone: DEMO_TZ, currency: 'USD',
      checkInTime: '3:00 PM', checkOutTime: '11:00 AM',
      rooms: demoRooms.map((r, idx) => ({
        ...r,
        totalCents: r.nightlyRateCents * nights,
        // Keep one room "booked" so the availability search feels real.
        available: partySize <= r.capacity && !(idx === 1 && nights <= 2),
      })),
    }
  },

  createReservation: async (payload: {
    siteSlug: string; roomId: string; checkIn: string; checkOut: string
    partySize: number; name: string; email: string; phone?: string; notes?: string
  }): Promise<ReservationDTO> => {
    await latency(600)
    const room = demoRooms.find(r => r.id === payload.roomId)
    if (!room) throw new Error('Room not found')
    const nights = Math.max(1, Math.round((new Date(payload.checkOut).getTime() - new Date(payload.checkIn).getTime()) / 86_400_000))
    return {
      id: demoId('resv'),
      roomId: room.id, roomLabel: room.label,
      checkIn: payload.checkIn, checkOut: payload.checkOut, nights,
      partySize: payload.partySize,
      name: payload.name, email: payload.email, phone: payload.phone, notes: payload.notes,
      totalCents: room.nightlyRateCents * nights, currency: 'USD',
      status: 'confirmed', cancelToken: demoId('cancel'),
    }
  },

  // --- Booking ---
  bookingAvailability: async (_siteSlug: string, _type: string) => {
    await latency()
    return {
      slots: demoSlots(),
      durationMinutes: 30,
      timezone: DEMO_TZ,
      enabledTypes: ['demo', 'walkthrough', 'photo-campaign'],
      services: undefined as undefined | Array<{ id: string; label: string; description?: string; durationMinutes: number }>,
    }
  },

  createBooking: async (payload: {
    siteSlug: string; type: string; name: string; email: string
    phone?: string; notes?: string; scheduledAt: string; timezone?: string
  }) => {
    await latency(600)
    return {
      id: demoId('bkg'),
      type: payload.type,
      serviceId: null as string | null,
      serviceLabel: null as string | null,
      name: payload.name, email: payload.email,
      scheduledAt: payload.scheduledAt,
      durationMinutes: 30,
      timezone: payload.timezone || DEMO_TZ,
      status: 'confirmed' as const,
      cancelToken: demoId('cancel'),
      icsUrl: icsDataUrl('Session with Apotome', payload.scheduledAt, 30),
    }
  },
}
