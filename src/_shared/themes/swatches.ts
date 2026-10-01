import type { ColorSwatch, LegacySwatchName, SwatchGroup, SwatchName } from './tokens'

/**
 * Curated color swatches, organized by category (see SWATCH_THEORIES).
 *
 * Design rules for the system:
 *  • Every family exists in a light and a dark version ("<family>-light" /
 *    "<family>-dark") so any palette works in either register.
 *  • Surfaces carry real pigment. The page background belongs to the
 *    palette, never a default white or default black.
 *  • Families inside a category share a temperature, not a look. Switching
 *    families should feel like changing the brand, not shuffling tints.
 *  • Bold-category surfaces go all the way: the color IS the page.
 */
export const SWATCHES: Record<SwatchName, ColorSwatch> = {
  /* ── Terra · clay, pine, olive ─────────────────────────────── */
  'adobe-light': {
    name: 'adobe-light', label: 'Adobe', mode: 'light', group: 'terra', family: 'adobe',
    feel: 'Sun-baked clay and ochre on warm adobe cream',
    primary: '#B24A21', accent: '#E0952F',
    surface: '#F6E7CE', surfaceAlt: '#FDF7EA',
    ink: '#251204', inkMuted: '#7A5230', line: '#E5CBA0',
  },
  'adobe-dark': {
    name: 'adobe-dark', label: 'Adobe', mode: 'dark', group: 'terra', family: 'adobe',
    feel: 'Fired clay glowing against an espresso night',
    primary: '#F09055', accent: '#E8B45A',
    surface: '#1E1006', surfaceAlt: '#2C1A0D',
    ink: '#FBEEDD', inkMuted: '#C09A76', line: '#46301C',
  },
  'pine-light': {
    name: 'pine-light', label: 'Pine', mode: 'light', group: 'terra', family: 'pine',
    feel: 'Deep pine and brass on green-washed paper',
    primary: '#0E5A31', accent: '#D9A93C',
    surface: '#E4EEDF', surfaceAlt: '#F4FAF0',
    ink: '#0D1F14', inkMuted: '#4A6252', line: '#C4D6BE',
  },
  'pine-dark': {
    name: 'pine-dark', label: 'Pine', mode: 'dark', group: 'terra', family: 'pine',
    feel: 'Forest at dusk, moss light and brass trim',
    primary: '#52C287', accent: '#D9A93C',
    surface: '#0A140E', surfaceAlt: '#12211A',
    ink: '#E8F5EA', inkMuted: '#8FAF9A', line: '#24382C',
  },
  'matcha-light': {
    name: 'matcha-light', label: 'Matcha', mode: 'light', group: 'terra', family: 'matcha',
    feel: 'Olive ink and mustard gold on citron paper',
    primary: '#55671B', accent: '#E0B41E',
    surface: '#EFF3D3', surfaceAlt: '#FAFCEB',
    ink: '#1B2008', inkMuted: '#6A743F', line: '#D6DCA8',
  },
  'matcha-dark': {
    name: 'matcha-dark', label: 'Matcha', mode: 'dark', group: 'terra', family: 'matcha',
    feel: 'Chartreuse glow over a dark olive grove',
    primary: '#C6DA4E', accent: '#E8B45A',
    surface: '#151805', surfaceAlt: '#222811',
    ink: '#F2F6DC', inkMuted: '#A2AC78', line: '#383F1C',
  },

  'cacao-light': {
    name: 'cacao-light', label: 'Cacao', mode: 'light', group: 'terra', family: 'cacao',
    feel: 'Dark chocolate and burnt caramel on café-au-lait cream',
    primary: '#5E3117', accent: '#C77E3D',
    surface: '#F1E3D3', surfaceAlt: '#FAF3E9',
    ink: '#201005', inkMuted: '#775539', line: '#DFC8AC',
  },
  'cacao-dark': {
    name: 'cacao-dark', label: 'Cacao', mode: 'dark', group: 'terra', family: 'cacao',
    feel: 'Roasted espresso, caramel light, cream type',
    primary: '#D89B6A', accent: '#E8C08A',
    surface: '#171009', surfaceAlt: '#251A10',
    ink: '#F8EFE4', inkMuted: '#B4977C', line: '#3E2D1C',
  },

  /* ── Coast · deep blues, teal, violet ──────────────────────── */
  'ultramarine-light': {
    name: 'ultramarine-light', label: 'Ultramarine', mode: 'light', group: 'coast', family: 'ultramarine',
    feel: 'True ultramarine and coral on porcelain blue',
    primary: '#1D3ECC', accent: '#E85C34',
    surface: '#E4EAFA', surfaceAlt: '#F4F7FE',
    ink: '#0A102E', inkMuted: '#47528A', line: '#C6D1F0',
  },
  'ultramarine-dark': {
    name: 'ultramarine-dark', label: 'Ultramarine', mode: 'dark', group: 'coast', family: 'ultramarine',
    feel: 'Midnight sea, periwinkle light, a coral flare',
    primary: '#7C96FF', accent: '#FF7C52',
    surface: '#080D26', surfaceAlt: '#111838',
    ink: '#EAEEFC', inkMuted: '#8B96C6', line: '#222E5E',
  },
  'lagoon-light': {
    name: 'lagoon-light', label: 'Lagoon', mode: 'light', group: 'coast', family: 'lagoon',
    feel: 'Deep teal and sunlit gold on seafoam',
    primary: '#036A5E', accent: '#E2A63C',
    surface: '#DDF0E9', surfaceAlt: '#F0FAF6',
    ink: '#07211C', inkMuted: '#3E6159', line: '#BCDCD2',
  },
  'lagoon-dark': {
    name: 'lagoon-dark', label: 'Lagoon', mode: 'dark', group: 'coast', family: 'lagoon',
    feel: 'Bioluminescent teal in still night water',
    primary: '#33D6BE', accent: '#E8B44A',
    surface: '#051D19', surfaceAlt: '#0C2B26',
    ink: '#E0F7F1', inkMuted: '#77A69C', line: '#17423A',
  },
  'iris-light': {
    name: 'iris-light', label: 'Iris', mode: 'light', group: 'coast', family: 'iris',
    feel: 'Saturated violet and apricot on lavender mist',
    primary: '#5936C2', accent: '#E8895A',
    surface: '#ECE8FA', surfaceAlt: '#F8F6FE',
    ink: '#170F33', inkMuted: '#5A5382', line: '#D4CCF0',
  },
  'iris-dark': {
    name: 'iris-dark', label: 'Iris', mode: 'dark', group: 'coast', family: 'iris',
    feel: 'Electric orchid over a deep violet night',
    primary: '#A88FFF', accent: '#F0A268',
    surface: '#110A28', surfaceAlt: '#1B1240',
    ink: '#F0EBFC', inkMuted: '#9184BC', line: '#302156',
  },

  'fjord-light': {
    name: 'fjord-light', label: 'Fjord', mode: 'light', group: 'coast', family: 'fjord',
    feel: 'Nordic slate and salmon on glacial ice',
    primary: '#2E5468', accent: '#E8886A',
    surface: '#E5EDF1', surfaceAlt: '#F4F9FB',
    ink: '#0E1C24', inkMuted: '#4C6270', line: '#C6D6DE',
  },
  'fjord-dark': {
    name: 'fjord-dark', label: 'Fjord', mode: 'dark', group: 'coast', family: 'fjord',
    feel: 'Deep water at dusk, ice light, salmon ember',
    primary: '#7FB4D4', accent: '#F09A78',
    surface: '#0A141B', surfaceAlt: '#12212B',
    ink: '#E8F1F7', inkMuted: '#84A0B0', line: '#213542',
  },

  /* ── Solar · vermilion, wine, saffron ──────────────────────── */
  'vermilion-light': {
    name: 'vermilion-light', label: 'Vermilion', mode: 'light', group: 'solar', family: 'vermilion',
    feel: 'Vermilion heat and marigold on evening cream',
    primary: '#D0330F', accent: '#F0A030',
    surface: '#FAE7CE', surfaceAlt: '#FEF6E8',
    ink: '#290F04', inkMuted: '#82492C', line: '#EFD0A4',
  },
  'vermilion-dark': {
    name: 'vermilion-dark', label: 'Vermilion', mode: 'dark', group: 'solar', family: 'vermilion',
    feel: 'Live coals and honeyed light on charred cedar',
    primary: '#FF6B3B', accent: '#F8C77E',
    surface: '#1D0D05', surfaceAlt: '#2C160A',
    ink: '#FCEEE2', inkMuted: '#C08F74', line: '#472614',
  },
  'rosewood-light': {
    name: 'rosewood-light', label: 'Rosewood', mode: 'light', group: 'solar', family: 'rosewood',
    feel: 'Wine red and terracotta on a blush ground',
    primary: '#A5153F', accent: '#E08A64',
    surface: '#F9E4E8', surfaceAlt: '#FEF4F5',
    ink: '#290812', inkMuted: '#7E4A58', line: '#EFC8D0',
  },
  'rosewood-dark': {
    name: 'rosewood-dark', label: 'Rosewood', mode: 'dark', group: 'solar', family: 'rosewood',
    feel: 'Candlelit rose and amber in a velvet room',
    primary: '#F26D93', accent: '#E8A878',
    surface: '#200711', surfaceAlt: '#300F1C',
    ink: '#FBE9EE', inkMuted: '#BC8494', line: '#4C1D30',
  },
  'saffron-light': {
    name: 'saffron-light', label: 'Saffron', mode: 'light', group: 'solar', family: 'saffron',
    feel: 'Deep saffron with a fuchsia bite on golden paper',
    primary: '#B35F00', accent: '#C81E82',
    surface: '#FAEBC8', surfaceAlt: '#FEF8E8',
    ink: '#241402', inkMuted: '#7C5A28', line: '#EBD49E',
  },
  'saffron-dark': {
    name: 'saffron-dark', label: 'Saffron', mode: 'dark', group: 'solar', family: 'saffron',
    feel: 'Amber neon and hot pink over dark honey',
    primary: '#FFB23C', accent: '#FF4FA8',
    surface: '#1D1303', surfaceAlt: '#2C1F08',
    ink: '#FBF0DC', inkMuted: '#BC9E6C', line: '#443413',
  },

  'hibiscus-light': {
    name: 'hibiscus-light', label: 'Hibiscus', mode: 'light', group: 'solar', family: 'hibiscus',
    feel: 'Hot hibiscus pink and tangerine on blush',
    primary: '#CE1461', accent: '#F28C28',
    surface: '#FBE2EA', surfaceAlt: '#FEF3F7',
    ink: '#2A0714', inkMuted: '#8A3A58', line: '#F2C2D2',
  },
  'hibiscus-dark': {
    name: 'hibiscus-dark', label: 'Hibiscus', mode: 'dark', group: 'solar', family: 'hibiscus',
    feel: 'Tropical pink glowing against a midnight garden',
    primary: '#FF5C9E', accent: '#F0A040',
    surface: '#200512', surfaceAlt: '#320C1F',
    ink: '#FDE8F1', inkMuted: '#C27C98', line: '#521832',
  },

  /* ── Bold · the palette takes the page ─────────────────────── */
  'klein-light': {
    name: 'klein-light', label: 'Klein', mode: 'light', group: 'bold', family: 'klein',
    feel: 'Klein blue and safety orange on periwinkle field',
    primary: '#1B34E8', accent: '#FF6A00',
    surface: '#DFE5FF', surfaceAlt: '#F2F5FF',
    ink: '#080D33', inkMuted: '#3B478E', line: '#BEC9F6',
  },
  'klein-dark': {
    name: 'klein-dark', label: 'Klein', mode: 'dark', group: 'bold', family: 'klein',
    feel: 'Ultramarine depth with an orange signal flare',
    primary: '#6D84FF', accent: '#FF7A1F',
    surface: '#050A38', surfaceAlt: '#0D1550',
    ink: '#E8ECFF', inkMuted: '#7E8CCA', line: '#1F2B72',
  },
  'riot-light': {
    name: 'riot-light', label: 'Riot', mode: 'light', group: 'bold', family: 'riot',
    feel: 'Hot magenta and lime static on a pink field',
    primary: '#DE0C6B', accent: '#6FBE00',
    surface: '#FBDFEF', surfaceAlt: '#FEF2F8',
    ink: '#26031A', inkMuted: '#7C2E58', line: '#F2BCD9',
  },
  'riot-dark': {
    name: 'riot-dark', label: 'Riot', mode: 'dark', group: 'bold', family: 'riot',
    feel: 'Magenta afterglow and lime sparks in the dark',
    primary: '#FF4F9E', accent: '#B4F02B',
    surface: '#1F0416', surfaceAlt: '#310A24',
    ink: '#FDE8F3', inkMuted: '#BC7A9C', line: '#521434',
  },
  'signal-light': {
    name: 'signal-light', label: 'Signal', mode: 'light', group: 'bold', family: 'signal',
    feel: 'Coral-tinted paper, ink type, a full-strength coral signal',
    primary: '#E03E17', accent: '#17100B',
    surface: '#FFDCCE', surfaceAlt: '#FFF2EC',
    ink: '#220D05', inkMuted: '#77361F', line: '#F4B9A3',
  },
  'signal-dark': {
    name: 'signal-dark', label: 'Signal', mode: 'dark', group: 'bold', family: 'signal',
    feel: 'Coral signal burning on near-black newsprint',
    primary: '#FF5C33', accent: '#FFD9C8',
    surface: '#16100C', surfaceAlt: '#251610',
    ink: '#FFF0E8', inkMuted: '#C89078', line: '#46281C',
  },

  'cadmium-light': {
    name: 'cadmium-light', label: 'Cadmium', mode: 'light', group: 'bold', family: 'cadmium',
    feel: 'Cadmium-tinted paper, black type, taxi-yellow accents',
    primary: '#171203', accent: '#F5CE0F',
    surface: '#FFF0AC', surfaceAlt: '#FFFAE3',
    ink: '#191203', inkMuted: '#5A4A10', line: '#EDD976',
  },
  'cadmium-dark': {
    name: 'cadmium-dark', label: 'Cadmium', mode: 'dark', group: 'bold', family: 'cadmium',
    feel: 'Hazard yellow cutting through blackout',
    primary: '#FFD91F', accent: '#FFF3B8',
    surface: '#131004', surfaceAlt: '#221C08',
    ink: '#FFF8E0', inkMuted: '#C4B26A', line: '#453A0E',
  },

  /* ── Noir · near-black luxury, one jewel accent ────────────── */
  'onyx-light': {
    name: 'onyx-light', label: 'Onyx', mode: 'light', group: 'noir', family: 'onyx',
    feel: 'Porcelain gallery, near-black ink, old gold',
    primary: '#1B1B1E', accent: '#B8862B',
    surface: '#F2F0EA', surfaceAlt: '#FCFBF8',
    ink: '#131316', inkMuted: '#64625C', line: '#DEDACE',
  },
  'onyx-dark': {
    name: 'onyx-dark', label: 'Onyx', mode: 'dark', group: 'noir', family: 'onyx',
    feel: 'True black gallery, bone type, old gold',
    primary: '#EDEAE2', accent: '#C09040',
    surface: '#0A0A0B', surfaceAlt: '#151517',
    ink: '#F2F0EB', inkMuted: '#98958D', line: '#262629',
  },
  'midnight-light': {
    name: 'midnight-light', label: 'Midnight', mode: 'light', group: 'noir', family: 'midnight',
    feel: 'Cold porcelain, deep navy ink, brass trim',
    primary: '#24347A', accent: '#B08430',
    surface: '#EBEFF8', surfaceAlt: '#F8FAFE',
    ink: '#0E1430', inkMuted: '#525C82', line: '#CFD8EC',
  },
  'midnight-dark': {
    name: 'midnight-dark', label: 'Midnight', mode: 'dark', group: 'noir', family: 'midnight',
    feel: 'Navy-black velvet, periwinkle glow, brass trim',
    primary: '#8CA9FF', accent: '#D8B36A',
    surface: '#0B1020', surfaceAlt: '#141C36',
    ink: '#EDF1FB', inkMuted: '#98A2C6', line: '#26304E',
  },
  'velvet-light': {
    name: 'velvet-light', label: 'Velvet', mode: 'light', group: 'noir', family: 'velvet',
    feel: 'Lilac porcelain with plum ink and amber',
    primary: '#63258F', accent: '#B87326',
    surface: '#F0EAF6', surfaceAlt: '#FAF7FD',
    ink: '#1C0F2A', inkMuted: '#63577A', line: '#DCD2EA',
  },
  'velvet-dark': {
    name: 'velvet-dark', label: 'Velvet', mode: 'dark', group: 'noir', family: 'velvet',
    feel: 'Midnight orchid, candlelit amber, velvet depth',
    primary: '#C88CF0', accent: '#E8A84F',
    surface: '#160D22', surfaceAlt: '#221436',
    ink: '#F4ECFB', inkMuted: '#A48EC0', line: '#372350',
  },

  'garnet-light': {
    name: 'garnet-light', label: 'Garnet', mode: 'light', group: 'noir', family: 'garnet',
    feel: 'Garnet ink and champagne bronze on warm porcelain',
    primary: '#701A22', accent: '#B08048',
    surface: '#F4EEEA', surfaceAlt: '#FCF9F6',
    ink: '#1C0E0F', inkMuted: '#6E5A55', line: '#E2D5CC',
  },
  'garnet-dark': {
    name: 'garnet-dark', label: 'Garnet', mode: 'dark', group: 'noir', family: 'garnet',
    feel: 'Garnet and candlelight in a black-lacquer room',
    primary: '#E08A90', accent: '#C89058',
    surface: '#120B0C', surfaceAlt: '#1F1315',
    ink: '#F7ECEB', inkMuted: '#A88A88', line: '#3A2426',
  },

  /* ── Neon · signal hues that glow ──────────────────────────── */
  'volt-light': {
    name: 'volt-light', label: 'Volt', mode: 'light', group: 'neon', family: 'volt',
    feel: 'Green ink and magenta on printworks paper',
    primary: '#007A40', accent: '#D4147E',
    surface: '#EFF8EE', surfaceAlt: '#FBFEFA',
    ink: '#0A1F14', inkMuted: '#4A6A58', line: '#CCE4CE',
  },
  'volt-dark': {
    name: 'volt-dark', label: 'Volt', mode: 'dark', group: 'neon', family: 'volt',
    feel: 'Signal green burning through a dark room',
    primary: '#00E87A', accent: '#FF3CAC',
    surface: '#04100A', surfaceAlt: '#0A2115',
    ink: '#DCFFEE', inkMuted: '#67B98E', line: '#10402A',
  },
  'aurora-light': {
    name: 'aurora-light', label: 'Aurora', mode: 'light', group: 'neon', family: 'aurora',
    feel: 'Cyan ink and violet on arctic paper',
    primary: '#0770B8', accent: '#7C1FD4',
    surface: '#EAF4FB', surfaceAlt: '#F8FCFE',
    ink: '#0A1A26', inkMuted: '#47647A', line: '#C8DEEC',
  },
  'aurora-dark': {
    name: 'aurora-dark', label: 'Aurora', mode: 'dark', group: 'neon', family: 'aurora',
    feel: 'Arctic cyan and violet sheets across night sky',
    primary: '#35C8FF', accent: '#B44CFF',
    surface: '#060814', surfaceAlt: '#0E1428',
    ink: '#E4F4FF', inkMuted: '#7CA2C2', line: '#1A2A50',
  },
  'acid-light': {
    name: 'acid-light', label: 'Acid', mode: 'light', group: 'neon', family: 'acid',
    feel: 'Acid green ink with a magenta afterimage',
    primary: '#4F7A00', accent: '#C4189E',
    surface: '#F3F9DA', surfaceAlt: '#FBFDEE',
    ink: '#171E06', inkMuted: '#5F6C3A', line: '#DCE6AC',
  },
  'acid-dark': {
    name: 'acid-dark', label: 'Acid', mode: 'dark', group: 'neon', family: 'acid',
    feel: 'Chartreuse strike with a magenta afterimage',
    primary: '#BEF22B', accent: '#FF2BC9',
    surface: '#0C1004', surfaceAlt: '#161F09',
    ink: '#F0FBDA', inkMuted: '#93A46C', line: '#2C3A12',
  },
  'plasma-light': {
    name: 'plasma-light', label: 'Plasma', mode: 'light', group: 'neon', family: 'plasma',
    feel: 'International orange with an electric blue trace',
    primary: '#C74505', accent: '#1B4FFF',
    surface: '#FCF2E4', surfaceAlt: '#FEFAF2',
    ink: '#221204', inkMuted: '#7C5434', line: '#F0D8B6',
  },
  'plasma-dark': {
    name: 'plasma-dark', label: 'Plasma', mode: 'dark', group: 'neon', family: 'plasma',
    feel: 'Infrared glow with a cobalt afterimage',
    primary: '#FF6A1F', accent: '#4F7CFF',
    surface: '#140803', surfaceAlt: '#231008',
    ink: '#FFEFE2', inkMuted: '#C08C6C', line: '#46200C',
  },
}

export const SWATCH_LIST: ColorSwatch[] = Object.values(SWATCHES)

/** A family card for pickers: one palette idea, both modes attached. */
export interface SwatchFamilyCard {
  family: string
  label: string
  group: SwatchGroup
  light: ColorSwatch
  dark: ColorSwatch
}

const FAMILY_ORDER = [
  'adobe', 'pine', 'matcha',
  'ultramarine', 'lagoon', 'iris',
  'vermilion', 'rosewood', 'saffron',
  'klein', 'riot', 'signal',
  'onyx', 'midnight', 'velvet',
  'volt', 'aurora', 'acid',
] as const

export const SWATCH_FAMILIES: SwatchFamilyCard[] = FAMILY_ORDER.map(f => {
  const light = SWATCHES[`${f}-light` as SwatchName]
  const dark = SWATCHES[`${f}-dark` as SwatchName]
  return { family: f, label: light.label, group: light.group, light, dark }
})

/**
 * Old swatch names → their closest swatch in the current system.
 * Resolution order everywhere: SWATCHES → LEGACY_SWATCH_ALIASES → custom.
 */
export const LEGACY_SWATCH_ALIASES: Record<LegacySwatchName, SwatchName> = {
  sand: 'adobe-light',
  sage: 'matcha-light',
  forest: 'pine-light',
  citrus: 'matcha-light',
  stone: 'ultramarine-light',
  glacier: 'ultramarine-light',
  tide: 'lagoon-light',
  lilac: 'iris-light',
  sunset: 'vermilion-light',
  rose: 'rosewood-light',
  fiesta: 'vermilion-light',
  mango: 'saffron-light',
  electric: 'klein-light',
  punch: 'riot-light',
  carnival: 'riot-light',
  midnight: 'midnight-dark',
  obsidian: 'onyx-dark',
  ember: 'vermilion-dark',
  plum: 'velvet-dark',
  neon: 'volt-dark',
  aurora: 'aurora-dark',
  acid: 'acid-dark',
  synthwave: 'aurora-dark',
}

/** Resolve any preset name, current or legacy, to a swatch (or undefined). */
export function resolvePresetSwatch(name: string): ColorSwatch | undefined {
  return SWATCHES[name as SwatchName]
    ?? SWATCHES[LEGACY_SWATCH_ALIASES[name as LegacySwatchName]]
}
