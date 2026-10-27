<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { LayoutDashboard, ChevronDown } from 'lucide-vue-next'
import type { CatalogMenuItem } from '../../platform/catalogNav'
import { useSiteTheme } from '../../composables/useSiteTheme'
import BrandMark from '../BrandMark.vue'

defineProps<{
  brand: string
  tagline?: string
  links: Array<{ to: string; label: string }>
  ctaLabel?: string
  ctaTo?: string
  /** Optional secondary action rendered as a ghost button before the CTA (e.g. Log in / Dashboard). */
  secondaryLabel?: string
  secondaryTo?: string
  /** Render the secondary action as a bordered icon-only button (label becomes the tooltip / aria-label). */
  secondaryIcon?: boolean
  /**
   * Catalog menu: the link whose `to` matches `catalog.to` becomes a dropdown
   * of categories (each with its subcategories) instead of a plain link.
   * Desktop opens on hover or click; the mobile sheet lists it inline.
   */
  catalog?: { to: string; items: CatalogMenuItem[] }
}>()

const route = useRoute()
const { heroStyle, subheroStyle } = useSiteTheme()
const open = ref(false)
const scrolled = ref(false)
/* Catalog dropdown. Hover opens it on pointer devices (CSS); the click
   toggle covers touch and keyboards. Any click outside, or Escape, closes. */
const menuOpen = ref(false)
const menuEl = useTemplateRef<HTMLElement>('menuEl')
function onDocClick(e: MouseEvent) {
  if (menuOpen.value && menuEl.value && !menuEl.value.contains(e.target as Node)) menuOpen.value = false
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') menuOpen.value = false }
function closeAll() { open.value = false; menuOpen.value = false }
const headerEl = useTemplateRef<HTMLElement>('headerEl')

/**
 * Header sits transparently OVER the page hero when:
 *  - on home (`/`) and the home hero is Overlay (heroStyle '2') or
 *    Broadsheet (heroStyle '3'), OR
 *  - on a subpage and the subhero is Banner ('2') or Broadsheet ('4').
 */
const transparentEligible = computed(() => {
  const isHome = route.path === '/'
  if (isHome) return heroStyle.value === '2' || heroStyle.value === '3'
  return subheroStyle.value === '2' || subheroStyle.value === '4'
})

/**
 * Light-on-dark text only over photo-backed heroes:
 *  - home Overlay ('2'), or subpage Banner ('2').
 * Broadsheet variants keep dark text since they sit on a colored panel.
 */
const lightOnDark = computed(() => {
  const isHome = route.path === '/'
  if (isHome) return heroStyle.value === '2'
  return subheroStyle.value === '2'
})

function onScroll() {
  scrolled.value = window.scrollY > 40
}

let ro: ResizeObserver | undefined
function publishHeight() {
  if (!headerEl.value) return
  const h = headerEl.value.offsetHeight
  document.documentElement.style.setProperty('--ap-header-h', h + 'px')
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, { passive: true })
  publishHeight()
  if (headerEl.value) {
    ro = new ResizeObserver(publishHeight)
    ro.observe(headerEl.value)
  }
  window.addEventListener('resize', publishHeight)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', publishHeight)
  ro?.disconnect()
})
</script>

<template>
  <header
    ref="headerEl"
    class="ap-header"
    :class="{
      'is-scrolled': scrolled,
      'is-transparent-eligible': transparentEligible,
      'is-transparent': transparentEligible && !scrolled,
      'is-light': lightOnDark && !scrolled,
    }"
  >
    <div class="ap-container ap-header__row">
      <RouterLink to="/" class="ap-header__brand" @click="open = false">
        <BrandMark class="ap-header__brand-icon" :size="36" />
        <span class="ap-header__brand-text">
          <span class="ap-header__brand-name">{{ brand }}</span>
          <span v-if="tagline" class="ap-header__brand-tag">{{ tagline }}</span>
        </span>
      </RouterLink>

      <button
        class="ap-header__toggle"
        :aria-expanded="open"
        aria-label="Toggle menu"
        @click="open = !open"
      >
        <span /><span /><span />
      </button>

      <nav class="ap-header__nav" :class="{ 'is-open': open }" @click="open = false">
        <template v-for="link in links" :key="link.to">
          <div
            v-if="catalog && catalog.items.length && link.to === catalog.to"
            ref="menuEl"
            class="ap-header__menu"
            :class="{ 'is-open': menuOpen }"
            @click.stop
          >
            <span class="ap-header__menu-trigger">
              <RouterLink :to="link.to" class="ap-header__link" :class="{ 'is-active': route.path === link.to }" @click="closeAll">
                {{ link.label }}
              </RouterLink>
              <button
                type="button"
                class="ap-header__menu-toggle"
                :aria-expanded="menuOpen"
                :aria-label="link.label + ' categories'"
                @click="menuOpen = !menuOpen"
              >
                <ChevronDown :size="14" :stroke-width="2" />
              </button>
            </span>
            <div class="ap-header__panel" role="menu">
              <div v-for="item in catalog.items" :key="item.to" class="ap-header__panel-col">
                <RouterLink :to="item.to" class="ap-header__panel-head" role="menuitem" @click="closeAll">
                  {{ item.label }}
                </RouterLink>
                <RouterLink
                  v-for="sub in item.children ?? []"
                  :key="sub.to"
                  :to="sub.to"
                  class="ap-header__panel-sub"
                  role="menuitem"
                  @click="closeAll"
                >
                  {{ sub.label }}
                </RouterLink>
              </div>
            </div>
          </div>
          <RouterLink
            v-else
            :to="link.to"
            class="ap-header__link"
            :class="{ 'is-active': route.path === link.to }"
          >
            {{ link.label }}
          </RouterLink>
        </template>
        <RouterLink
          v-if="secondaryLabel && secondaryTo"
          :to="secondaryTo"
          class="ap-btn ap-btn--ghost ap-header__cta ap-header__secondary"
          :class="{ 'ap-header__secondary--icon': secondaryIcon }"
          :aria-label="secondaryLabel"
          :title="secondaryIcon ? secondaryLabel : undefined"
        >
          <LayoutDashboard v-if="secondaryIcon" :size="18" :stroke-width="1.8" />
          <template v-else>{{ secondaryLabel }}</template>
        </RouterLink>
        <RouterLink v-if="ctaLabel && ctaTo" :to="ctaTo" class="ap-btn ap-header__cta">
          {{ ctaLabel }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.ap-header {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in srgb, var(--ap-surface) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--ap-line);
  transition: background 300ms ease, border-color 300ms ease, box-shadow 300ms ease, color 300ms ease;
}
/* Transparent floating navbar for hero-eligible pages (until scrolled). */
.ap-header.is-transparent {
  position: fixed; top: 0; left: 0; right: 0;
  background: transparent;
  backdrop-filter: none;
  border-bottom-color: transparent;
}
/* Light-on-dark variant for nav over photo heroes (overlay/banner). */
.ap-header.is-light,
.ap-header.is-light .ap-header__brand-name,
.ap-header.is-light .ap-header__brand-tag,
.ap-header.is-light .ap-header__link { color: #fff; }
.ap-header.is-light .ap-header__brand-tag { color: rgba(255,255,255,0.78); }
.ap-header.is-light .ap-header__toggle span { background: #fff; }
.ap-header.is-light .ap-header__cta {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.6);
  color: #fff;
}
.ap-header.is-light .ap-header__idx { display: none; }
.ap-header__link.is-active::after { background: #fff; }
.ap-header__row {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 1rem; padding-bottom: 1rem; gap: 1.5rem;
}
.ap-header__brand {
  display: flex; flex-direction: row; align-items: center; gap: 0.7rem;
  color: var(--ap-ink); border-bottom: none;
}
.ap-header__brand-icon {
  width: 36px; height: 36px; display: block; flex: none;
}
.ap-header__brand-text {
  display: flex; flex-direction: column; line-height: 1;
}
.ap-header__brand-name {
  font-family: var(--ap-font-heading);
  font-size: 1.35rem; font-weight: 700;
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
}
.ap-header__brand-tag {
  font-size: 0.72rem; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ap-ink-muted);
  margin-top: 0.35rem;
}
.ap-header__nav {
  display: flex; align-items: center; gap: 1.75rem;
}
.ap-header__link {
  color: var(--ap-ink); border-bottom: none;
  font-family: var(--ap-font-heading);
  font-size: 0.95rem; font-weight: 500;
  letter-spacing: var(--ap-tracking-heading);
  text-transform: var(--ap-heading-transform);
  position: relative;
}
.ap-header__link.is-active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: -6px;
  height: 2px; background: var(--ap-primary);
}
.ap-header__cta { padding: 0.6rem 1.1rem; font-size: 0.85rem; }
/* Icon-only secondary (e.g. Dashboard): square bordered button, icon centered. */
.ap-header__secondary--icon {
  padding: 0.55rem;
  aspect-ratio: 1;
  justify-content: center;
}
.ap-header__secondary--icon :deep(svg) { display: block; }

.ap-header__toggle {
  display: none; background: none; border: 0;
  width: 36px; height: 36px; flex-direction: column;
  justify-content: center; gap: 5px; padding: 0;
}
.ap-header__toggle span {
  display: block; height: 2px; background: var(--ap-ink); width: 22px; margin: 0 auto;
}
/* ── Catalog dropdown ───────────────────────────────────────
   The menu is the ordinary link plus a chevron; the panel floats under the
   row and lays categories out as columns with their subcategories beneath.
   Hover opens it on pointer devices, the chevron toggles it elsewhere. */
.ap-header__menu { position: relative; display: inline-flex; align-items: center; }
.ap-header__menu-trigger { display: inline-flex; align-items: center; gap: 0.25rem; }
.ap-header__menu-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.4rem; height: 1.4rem; padding: 0;
  border: 0; background: transparent; color: inherit; cursor: pointer;
  border-radius: 999px;
  transition: transform 160ms ease, background 140ms ease;
}
.ap-header__menu-toggle:hover { background: color-mix(in srgb, var(--ap-ink) 8%, transparent); }
.ap-header__menu.is-open .ap-header__menu-toggle { transform: rotate(180deg); }
.ap-header__panel {
  position: absolute; top: calc(100% + 0.9rem); left: 50%;
  transform: translate(-50%, -6px);
  display: flex; gap: 2rem;
  min-width: max-content;
  padding: 1.1rem 1.4rem 1.2rem;
  background: var(--ap-surface);
  color: var(--ap-ink);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius, 12px);
  box-shadow: 0 18px 48px -20px color-mix(in srgb, var(--ap-ink) 35%, transparent);
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease, visibility 0s linear 160ms;
  z-index: 30;
}
.ap-header__panel::before {
  /* invisible bridge so the pointer can travel from the link to the panel */
  content: ''; position: absolute; left: 0; right: 0; top: -1rem; height: 1rem;
}
.ap-header__menu.is-open .ap-header__panel {
  opacity: 1; visibility: visible; pointer-events: auto; transform: translate(-50%, 0); transition-delay: 0s;
}
@media (hover: hover) {
  .ap-header__menu:hover .ap-header__panel,
  .ap-header__menu:focus-within .ap-header__panel {
    opacity: 1; visibility: visible; pointer-events: auto; transform: translate(-50%, 0); transition-delay: 0s;
  }
}
.ap-header__panel-col { display: flex; flex-direction: column; gap: 0.35rem; min-width: 8.5rem; }
.ap-header__panel-head {
  font-family: var(--ap-font-heading); font-weight: 600; font-size: 0.9rem;
  letter-spacing: var(--ap-tracking-heading); text-transform: var(--ap-heading-transform);
  color: var(--ap-ink); padding-bottom: 0.3rem; margin-bottom: 0.2rem;
  border-bottom: 1px solid var(--ap-line);
}
.ap-header__panel-head:hover, .ap-header__panel-sub:hover { color: var(--ap-primary); }
.ap-header__panel-sub { font-size: 0.88rem; color: var(--ap-ink-muted); }

@media (max-width: 760px) {
  .ap-header__toggle { display: inline-flex; }
  /* Mobile sheet: the catalog lists inline under its link, always expanded. */
  .ap-header__menu { flex-direction: column; align-items: stretch; }
  .ap-header__menu-trigger { justify-content: space-between; border-bottom: 1px solid var(--ap-line); }
  .ap-header__menu-trigger .ap-header__link { border-bottom: 0; flex: 1; }
  .ap-header__menu-toggle { display: none; }
  .ap-header__panel {
    position: static; transform: none; opacity: 1; visibility: visible; pointer-events: auto;
    flex-direction: column; gap: 0.6rem;
    padding: 0.6rem 0 0.8rem 1rem; border: 0; border-radius: 0; box-shadow: none;
    border-bottom: 1px solid var(--ap-line);
    background: transparent;
  }
  .ap-header__panel::before { display: none; }
  .ap-header__panel-head { border-bottom: 0; padding-bottom: 0; margin-bottom: 0; }
  .ap-header__nav {
    position: absolute; top: 100%; left: 0; right: 0;
    flex-direction: column; align-items: stretch; gap: 0;
    background: var(--ap-surface);
    border-bottom: 1px solid var(--ap-line);
    padding: 1rem clamp(1rem, 4vw, 2.5rem);
    transform: translateY(-12px); opacity: 0; pointer-events: none;
    transition: opacity 160ms ease, transform 160ms ease;
  }
  .ap-header__nav.is-open { opacity: 1; transform: none; pointer-events: auto; }
  .ap-header__link { padding: 0.85rem 0; border-bottom: 1px solid var(--ap-line); }
  .ap-header__link:last-of-type { border-bottom: 0; }
  .ap-header__cta { margin-top: 0.75rem; align-self: flex-start; }
}

/* ── Navbar layout variants (data-nav-style on <html>) ──
   1 Classic   — default row (above)
   2 Editorial — logo left, links dead-center, action anchored right
   3 Command   — full-bleed ruled bar: every item is a hairline cell,
                 the CTA is an inverted ink cell (index-table nav)
   4 Pill      — floating inset capsule, always centered */

@media (min-width: 761px) {
  /* 2 · Editorial: links dead-center in flow; brand and the primary
     action pin to the edges so the centering is optical and exact. */
  [data-nav-style='2'] .ap-header__row {
    position: relative;
    justify-content: center;
    min-height: 64px;
  }
  [data-nav-style='2'] .ap-header__brand {
    position: absolute;
    left: clamp(1rem, 4vw, 2.5rem);
    top: 50%;
    transform: translateY(-50%);
  }
  [data-nav-style='2'] .ap-header__nav { justify-content: center; }
  [data-nav-style='2'] .ap-header__link {
    font-family: var(--ap-font-heading);
    font-size: 0.95rem;
    letter-spacing: 0.02em;
  }
  [data-nav-style='2'] .ap-header__nav .ap-header__cta:not(.ap-header__secondary) {
    position: absolute;
    right: clamp(1rem, 4vw, 2.5rem);
    top: 50%;
    transform: translateY(-50%);
    margin: 0;
  }

  /* 3 · Command bar */
  [data-nav-style='3'] .ap-header {
    background: var(--ap-surface);
    backdrop-filter: none;
    border-bottom: 1px solid var(--ap-ink);
    box-shadow: none;
  }
  [data-nav-style='3'] .ap-header__row {
    max-width: none;
    padding: 0;
    gap: 0;
    align-items: stretch;
    min-height: 58px;
  }
  [data-nav-style='3'] .ap-header__brand {
    padding: 0.45rem clamp(1rem, 3vw, 2rem);
    border-right: 1px solid var(--ap-line);
    align-self: stretch;
    display: inline-flex;
    align-items: center;
  }
  [data-nav-style='3'] .ap-header__nav {
    flex: 1;
    gap: 0;
    align-items: stretch;
    justify-content: flex-end;
  }
  [data-nav-style='3'] .ap-header__link {
    display: inline-flex;
    align-items: center;
    padding: 0 clamp(1rem, 2.2vw, 1.75rem);
    border-left: 1px solid var(--ap-line);
    font-family: var(--ap-font-mono);
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    border-bottom: 0;
  }
  [data-nav-style='3'] .ap-header__link.is-active {
    background: color-mix(in srgb, var(--ap-ink) 6%, transparent);
  }
  [data-nav-style='3'] .ap-header__nav .ap-header__cta {
    align-self: stretch;
    display: inline-flex;
    align-items: center;
    margin: 0;
    padding: 0 clamp(1.25rem, 3vw, 2.25rem);
    border: 0;
    border-left: 1px solid var(--ap-ink);
    border-radius: 0;
    background: var(--ap-ink);
    color: var(--ap-surface);
    font-family: var(--ap-font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    box-shadow: none;
  }
  [data-nav-style='3'] .ap-header__nav .ap-header__cta:hover {
    background: var(--ap-primary);
    color: var(--ap-on-primary);
    transform: none;
  }
  [data-nav-style='3'] .ap-header__nav .ap-header__secondary {
    background: transparent;
    color: var(--ap-ink);
  }

  /* 4 · Pill — centered via left:50% so it survives position:fixed and
     the scrolled state without drifting flush-left. */
  [data-nav-style='4'] .ap-header {
    left: 50%;
    transform: translateX(-50%);
    top: 0.8rem;
    width: min(calc(100% - 2.5rem), var(--ap-container, 1200px));
    border: 1px solid var(--ap-line);
    border-radius: 999px;
    box-shadow: 0 14px 40px -22px color-mix(in srgb, var(--ap-ink) 45%, transparent);
    background: color-mix(in srgb, var(--ap-surface) 88%, transparent);
    backdrop-filter: blur(14px);
  }
  [data-nav-style='4'] .ap-header__row { padding-block: 0.35rem; }
  [data-nav-style='4'] .ap-header__cta { border-radius: 999px; }
  [data-nav-style='4'][data-theme='atlas'] .ap-header,
  [data-nav-style='4'][data-theme='ironwood'] .ap-header { border-radius: 0; }
  [data-nav-style='4'][data-theme='atlas'] .ap-header__cta,
  [data-nav-style='4'][data-theme='ironwood'] .ap-header__cta { border-radius: 0; }
}

</style>
