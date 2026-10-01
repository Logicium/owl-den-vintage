/**
 * Per-archetype content shape + tab descriptors used by ContentView.
 *
 * Each archetype shares the common tabs (brand, contact, hours, photos, story,
 * testimonials, social) and adds one archetype-specific tab (menu, rooms,
 * services, products, mission).
 */

export type TabId =
  | 'brand'
  | 'contact'
  | 'hours'
  | 'photos'
  | 'story'
  | 'menu'
  | 'rooms'
  | 'services'
  | 'products'
  | 'events'
  | 'mission'
  | 'testimonials'
  | 'social'

export interface TabDef {
  id: TabId
  label: string
}

export type ArchetypeName = 'mesa' | 'hearth' | 'keystone' | 'vault' | 'marquee' | 'project'

// Photos moved to the dedicated Photos & Instagram admin page
// (slot-mapped gallery at /admin/instagram).
const COMMON_HEAD: TabDef[] = [
  { id: 'brand',   label: 'Brand'   },
  { id: 'contact', label: 'Contact' },
  { id: 'hours',   label: 'Hours'   },
  { id: 'story',   label: 'Story'   },
]
// Testimonials moved to the standalone "Reviews" admin tab (it was redundant
// to have both a Reviews tab and a Testimonials content tab). Source choice
// (hand-written vs live Google) now lives there too.
const COMMON_TAIL: TabDef[] = [
  { id: 'social',       label: 'Social'       },
]

const PER_ARCHETYPE: Record<ArchetypeName, TabDef[]> = {
  mesa:     [{ id: 'menu',     label: 'Menu'     }],
  hearth:   [{ id: 'rooms',    label: 'Rooms'    }],
  keystone: [{ id: 'services', label: 'Services' }],
  vault:    [{ id: 'products', label: 'Products' }],
  marquee:  [{ id: 'events',   label: 'Events'   }],
  project:  [{ id: 'mission',  label: 'Mission'  }],
}

export function tabsForArchetype(archetype: string | undefined | null): TabDef[] {
  const a = (archetype ?? 'mesa').toLowerCase() as ArchetypeName
  const extra = PER_ARCHETYPE[a] ?? []
  return [...COMMON_HEAD, ...extra, ...COMMON_TAIL]
}
