<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { onMounted, computed, watch, ref, onBeforeUnmount, type Component } from 'vue'
import {
  ExternalLink, PanelLeftClose, PanelLeftOpen, Menu, X,
  LayoutGrid, FileText, Images, Inbox as InboxIcon, Star, LineChart,
  Globe, CreditCard, Receipt, Rocket, UserRound, Gem, BookOpenText, Puzzle,
  CalendarClock, BedDouble, ShoppingBag, UtensilsCrossed, Ticket,
} from 'lucide-vue-next'
import { useAdminAuthStore } from '../platform/adminAuthStore'
import { useActiveSiteStore } from '../platform/activeSiteStore'
import ToastHost from './components/ToastHost.vue'
import './admin.css'

const auth = useAdminAuthStore()
const activeSites = useActiveSiteStore()
const route = useRoute()
const router = useRouter()

onMounted(async () => {
  await auth.refresh()
  if (auth.owner) await activeSites.refresh()
})

watch(() => auth.owner?.id, async (id) => { if (id) await activeSites.refresh() })

interface NavItem { to: string; label: string; icon: Component; exact?: boolean; premium?: boolean }
interface NavGroup { id: string; label: string; items: NavItem[] }

/** Label of the archetype-specific catalog editor (menu, rooms, …). */
const CATALOG_LABEL: Record<string, string> = {
  mesa: 'Menu', hearth: 'Rooms', keystone: 'Services', vault: 'Products', marquee: 'Events', project: 'Mission',
}

/** Everything that edits or watches the CURRENTLY SELECTED site. */
const siteNav: NavItem[] = [
  { to: '/admin/brand', label: 'Brand', icon: Gem },
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/instagram', label: 'Photos', icon: Images },
  { to: '/admin/inbox', label: 'Inbox', icon: InboxIcon },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/analytics', label: 'Analytics', icon: LineChart },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/domain', label: 'Domain', icon: Globe },
  { to: '/admin/deployments', label: 'Deployments', icon: Rocket },
]

/** Owner-level tools that span every site. */
const workspaceNav: NavItem[] = [
  { to: '/admin', label: 'Sites', icon: LayoutGrid, exact: true },
  { to: '/admin/billing', label: 'Billing', icon: Receipt },
  { to: '/admin/account', label: 'Account', icon: UserRound },
]

/** Each archetype's premium commerce feature — marked so the nav renders
    the ★ Premium badge and owners can tell it apart from included tools. */
const PREMIUM_NAV: Record<string, NavItem> = {
  keystone: { to: '/admin/appointments', label: 'Appointments', icon: CalendarClock, premium: true },
  hearth:   { to: '/admin/lodging', label: 'Lodging', icon: BedDouble, premium: true },
  vault:    { to: '/admin/shop', label: 'Shop', icon: ShoppingBag, premium: true },
  mesa:     { to: '/admin/ordering', label: 'Ordering', icon: UtensilsCrossed, premium: true },
  marquee:  { to: '/admin/ticketing', label: 'Ticketing', icon: Ticket, premium: true },
}

/** Add-on id → its admin tool nav item. */
const ADDON_NAV: Record<string, NavItem> = {
  appointments: PREMIUM_NAV.keystone!,
  lodging: PREMIUM_NAV.hearth!,
  eshop: PREMIUM_NAV.vault!,
  ordering: PREMIUM_NAV.mesa!,
  ticketing: PREMIUM_NAV.marquee!,
}

const navGroups = computed<NavGroup[]>(() => {
  const site = activeSites.sites.find(s => s.id === activeSites.activeId)
  const arche = site?.archetype
  const items = [...siteNav]
  // The archetype's catalog editor slots in right after Content.
  items.splice(2, 0, { to: '/admin/catalog', label: CATALOG_LABEL[arche ?? ''] ?? 'Catalog', icon: BookOpenText })
  // Premium tools: the archetype's native one plus anything enabled from
  // the Add-ons page (beta: any archetype can run any tool).
  const premiumTos = new Set<string>()
  const native = arche ? PREMIUM_NAV[arche] : undefined
  if (native) { items.push(native); premiumTos.add(native.to) }
  for (const id of site?.addOns ?? []) {
    const nav = ADDON_NAV[id]
    if (nav && !premiumTos.has(nav.to)) { items.push(nav); premiumTos.add(nav.to) }
  }
  items.push({ to: '/admin/addons', label: 'Add-ons', icon: Puzzle })
  return [
    { id: 'site', label: 'This site', items },
    { id: 'workspace', label: 'Workspace', items: workspaceNav },
  ]
})

/* ── Fullscreen-overlay behavior: the dashboard slides in over the public
   site and can be closed back out of. ── */
const closing = ref(false)
function closeAdmin() {
  if (closing.value) return
  closing.value = true
  window.setTimeout(() => { void router.push('/') }, 300)
}

/* ── Sidebar state: collapsible to an icon rail; overlay drawer on mobile ── */
const NAV_COLLAPSE_KEY = 'admin.navCollapsed'
const navCollapsed = ref(localStorage.getItem(NAV_COLLAPSE_KEY) === '1')
function toggleNavCollapsed() {
  navCollapsed.value = !navCollapsed.value
  try { localStorage.setItem(NAV_COLLAPSE_KEY, navCollapsed.value ? '1' : '0') } catch { /* */ }
}
const drawerOpen = ref(false)
watch(() => route.fullPath, () => { drawerOpen.value = false })

// Don't gate the verify page — it handles its own session flow and must always render.
const requiresLogin = computed(() => !auth.owner && !auth.loading && route.name !== 'admin-login' && route.name !== 'admin-verify')
const showSiteSwitcher = computed(() => !!auth.owner && activeSites.sites.length > 0)

const activeSite = computed(() => activeSites.sites.find(s => s.id === activeSites.activeId) ?? null)
function siteLabel(s: { slug: string; displayName?: string | null }) {
  return (s.displayName && s.displayName.trim()) || s.slug
}
/** Live URL for a site: prefer the custom domain, fall back to the production deploy. */
function siteUrl(s: { customDomain?: string; productionUrl?: string }): string | null {
  const raw = s.customDomain || s.productionUrl
  if (!raw) return null
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

// User menu (account dropdown)
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
function toggleMenu() { menuOpen.value = !menuOpen.value; if (menuOpen.value) siteMenuOpen.value = false }
function closeMenu() { menuOpen.value = false }

// Site switcher dropdown
const siteMenuOpen = ref(false)
const siteMenuRef = ref<HTMLElement | null>(null)
function toggleSiteMenu() { siteMenuOpen.value = !siteMenuOpen.value; if (siteMenuOpen.value) menuOpen.value = false }
function closeSiteMenu() { siteMenuOpen.value = false }
function pickSite(id: string) { activeSites.setActive(id); closeSiteMenu() }

function onDocClick(e: MouseEvent) {
  const target = e.target as Node
  if (menuOpen.value && menuRef.value && !menuRef.value.contains(target)) closeMenu()
  if (siteMenuOpen.value && siteMenuRef.value && !siteMenuRef.value.contains(target)) closeSiteMenu()
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

/* While the dashboard overlay is up, the public page underneath must not
   scroll — otherwise the wheel chains through to it and the whole site
   appears to move behind the panel. */
onMounted(() => { document.documentElement.classList.add('ap-admin-open') })
onBeforeUnmount(() => { document.documentElement.classList.remove('ap-admin-open') })

async function doLogout() {
  closeMenu()
  await auth.logout()
  router.push('/admin/login')
}

function initials(email?: string) {
  if (!email) return '·'
  const local = email.split('@')[0] || ''
  const parts = local.split(/[._-]/).filter(Boolean)

  if (parts.length === 0) {
    return local[0]?.toUpperCase() ?? '·'
  }

  const firstInitial = parts[0]?.[0]?.toUpperCase() ?? ''
  const secondInitial = parts[1]?.[0]?.toUpperCase() ?? ''

  return (firstInitial + secondInitial) || '·'
}
</script>

<template>
  <div class="admin-shell" :class="{ 'is-closing': closing }">
    <header class="admin-bar">
      <div class="admin-bar__top">
        <div class="admin-bar__inner admin-bar__inner--top">
          <button
            v-if="auth.owner"
            type="button"
            class="nav-burger"
            :aria-expanded="drawerOpen"
            aria-label="Toggle navigation"
            @click="drawerOpen = !drawerOpen"
          >
            <component :is="drawerOpen ? X : Menu" :size="18" />
          </button>
          <RouterLink to="/admin" class="brand">
            <span class="brand__mark">A</span>
            <span class="brand__name">Apotome</span>
            <span class="brand__divider">·</span>
            <span class="brand__suffix">Admin</span>
          </RouterLink>

          <div class="admin-bar__top-spacer" />

          <div v-if="showSiteSwitcher" class="site-switcher" ref="siteMenuRef">
            <a
              v-if="activeSite && siteUrl(activeSite)"
              :href="siteUrl(activeSite)!"
              target="_blank"
              rel="noopener"
              class="site-view-btn"
              :title="`View ${siteLabel(activeSite)} live`"
              :aria-label="`View ${siteLabel(activeSite)} live`"
            >
              <ExternalLink :size="14" />
            </a>
            <button
              type="button"
              class="site-pill"
              :class="{ 'is-open': siteMenuOpen }"
              :aria-expanded="siteMenuOpen"
              aria-haspopup="listbox"
              :title="activeSite ? `Active site: ${siteLabel(activeSite)}` : 'Active site'"
              @click.stop="toggleSiteMenu"
            >
              <span class="site-pill__mark" aria-hidden="true">◇</span>
              <span class="site-pill__label">
                <span class="site-pill__name">{{ activeSite ? siteLabel(activeSite) : 'Select site' }}</span>
                <span v-if="activeSite" class="site-pill__sub">{{ activeSite.archetype }}</span>
              </span>
              <span class="site-pill__caret" aria-hidden="true">▾</span>
            </button>
            <div v-if="siteMenuOpen" class="site-menu" role="listbox" @click.stop>
              <div
                v-for="s in activeSites.sites"
                :key="s.id"
                class="site-menu__row"
                :class="{ 'site-menu__row--active': s.id === activeSites.activeId }"
              >
                <button
                  type="button"
                  role="option"
                  :aria-selected="s.id === activeSites.activeId"
                  class="site-menu__item"
                  @click="pickSite(s.id)"
                >
                  <span class="site-menu__name">{{ siteLabel(s) }}</span>
                  <span class="site-menu__meta">{{ s.archetype }}<template v-if="s.displayName && s.displayName !== s.slug"> · {{ s.slug }}</template></span>
                </button>
                <a
                  v-if="siteUrl(s)"
                  :href="siteUrl(s)!"
                  target="_blank"
                  rel="noopener"
                  class="site-menu__view"
                  :title="`View ${siteLabel(s)} live`"
                  :aria-label="`View ${siteLabel(s)} live`"
                  @click.stop
                >
                  <ExternalLink :size="14" />
                </a>
              </div>
            </div>
          </div>

          <div class="admin-user" ref="menuRef">
            <template v-if="auth.owner">
              <button
                type="button"
                class="user-pill"
                :class="{ 'is-open': menuOpen }"
                @click.stop="toggleMenu"
                :aria-expanded="menuOpen"
                aria-haspopup="menu"
              >
                <span class="user-pill__avatar">{{ initials(auth.owner.email) }}</span>
                <span class="user-pill__email">{{ auth.owner.email }}</span>
                <span class="user-pill__caret" aria-hidden="true">▾</span>
              </button>
              <div v-if="menuOpen" class="user-menu" role="menu" @click.stop>
                <div class="user-menu__head">
                  <span class="user-menu__email">{{ auth.owner.email }}</span>
                  <span class="user-menu__name" v-if="auth.owner.name">{{ auth.owner.name }}</span>
                </div>
                <RouterLink to="/admin/account" class="user-menu__item" role="menuitem" @click="closeMenu">Account</RouterLink>
                <RouterLink to="/admin/billing" class="user-menu__item" role="menuitem" @click="closeMenu">Billing</RouterLink>
                <RouterLink to="/admin/domain" class="user-menu__item" role="menuitem" @click="closeMenu">Domain</RouterLink>
                <div class="user-menu__divider" />
                <button type="button" class="user-menu__item user-menu__item--danger" role="menuitem" @click="doLogout">Sign out</button>
              </div>
            </template>
            <template v-else-if="route.name !== 'admin-login' && route.name !== 'admin-verify'">
              <RouterLink to="/admin/login" class="adm-btn adm-btn--primary adm-btn--sm">Sign in</RouterLink>
            </template>
          </div>

          <button
            type="button"
            class="admin-close"
            title="Close the dashboard and return to your site"
            aria-label="Close dashboard"
            @click="closeAdmin"
          >
            <X :size="17" />
          </button>
        </div>
      </div>

    </header>

    <div class="admin-body" :class="{ 'is-collapsed': navCollapsed, 'is-drawer-open': drawerOpen }">
      <div v-if="drawerOpen" class="admin-scrim" @click="drawerOpen = false" />
      <nav v-if="auth.owner" class="admin-side" aria-label="Admin sections">
        <div class="admin-side__scroll">
          <div v-for="g in navGroups" :key="g.id" class="admin-side__group">
            <p class="admin-side__group-label">{{ g.label }}</p>
            <RouterLink
              v-for="n in g.items" :key="n.to" :to="n.to"
              class="admin-side__link"
              :exact-active-class="n.exact ? 'is-active' : ''" active-class="is-active"
              :class="{ 'is-premium': n.premium }"
              :title="navCollapsed ? n.label : (n.premium ? 'Premium add-on' : undefined)"
            >
              <span class="admin-side__icon"><component :is="n.icon" :size="17" :stroke-width="1.8" /></span>
              <span class="admin-side__label">{{ n.label }}</span>
              <span v-if="n.premium" class="admin-side__star" aria-label="Premium add-on">★</span>
            </RouterLink>
          </div>
        </div>
        <button
          type="button"
          class="admin-side__collapse"
          :title="navCollapsed ? 'Expand menu' : 'Collapse menu'"
          @click="toggleNavCollapsed"
        >
          <span class="admin-side__icon"><component :is="navCollapsed ? PanelLeftOpen : PanelLeftClose" :size="17" :stroke-width="1.8" /></span>
          <span class="admin-side__label">Collapse</span>
        </button>
      </nav>

      <main class="admin-main">
        <!-- The <main> is the scroll viewport (full width, so its scrollbar
             rides the right edge of the window); this inner box carries the
             reading width. Keeping those on one element put the scrollbar in
             the middle of the screen. -->
        <div class="admin-main__inner">
          <div v-if="requiresLogin" class="admin-gate">
            <div class="adm-empty">
              <div class="adm-empty__icon">⌬</div>
              <h2 class="adm-empty__title">Sign in to your studio</h2>
              <p class="adm-empty__body">Your sites, content, inbox and analytics live behind a secure sign-in.</p>
              <RouterLink to="/admin/login" class="adm-btn adm-btn--primary">Sign in</RouterLink>
            </div>
          </div>
          <RouterView v-else />
        </div>
      </main>
    </div>
    <ToastHost />
  </div>
</template>

<style scoped>
/* The dashboard is a fullscreen overlay above the public site: it blooms in
   on entry and settles out when closed. */
.admin-shell {
  position: fixed; inset: 0; z-index: 90;
  /* The shell itself never scrolls: the top bar and sidebar stay planted
     and only .admin-main scrolls its page contents. */
  overflow: hidden;
  display: flex; flex-direction: column;
  background: var(--adm-bg);
  color: var(--adm-text);
  font-family: var(--adm-font-sans);
  animation: admin-shell-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.admin-shell.is-closing {
  animation: admin-shell-out 300ms cubic-bezier(0.55, 0, 0.55, 0.2) both;
  pointer-events: none;
}
@keyframes admin-shell-in {
  from { opacity: 0; transform: translateY(26px) scale(0.985); filter: blur(6px); }
  to   { opacity: 1; transform: none; filter: none; }
}
@keyframes admin-shell-out {
  from { opacity: 1; transform: none; }
  to   { opacity: 0; transform: translateY(20px) scale(0.99); }
}
@media (prefers-reduced-motion: reduce) {
  .admin-shell, .admin-shell.is-closing { animation: none; }
}

.admin-close {
  width: 34px; height: 34px; flex: 0 0 auto;
  display: grid; place-items: center;
  background: transparent;
  border: 1px solid var(--adm-border-strong);
  border-radius: 50%;
  color: var(--adm-text-muted);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, transform 200ms ease;
}
.admin-close svg { display: block; }
.admin-close:hover {
  background: var(--adm-surface-2);
  color: var(--adm-text);
  transform: rotate(90deg);
}

.site-view-btn {
  width: 34px; height: 34px; flex: 0 0 auto;
  display: grid; place-items: center;
  margin-right: 0.4rem;
  border: 1px solid var(--adm-border-strong);
  border-radius: var(--adm-radius-sm);
  color: var(--adm-text-muted);
  transition: color 140ms ease, border-color 140ms ease, background 140ms ease;
}
.site-view-btn svg { display: block; }
.site-view-btn:hover { color: var(--adm-accent); border-color: var(--adm-accent-deep); background: var(--adm-surface-2); }
.site-switcher { display: inline-flex; align-items: center; }

/* ── Top bar (two rows) ─────────────────────────────────
   Row 1 (top): brand, site picker, user pill — same compact height as the
   public site navbar so it visually replaces it. Always visible.
   Row 2 (bottom): full dashboard nav, scrolls horizontally on small screens.
   The whole admin shell overlays the public layout (router renders it as a
   full route, the public AppHeader doesn't render under /admin). */
.admin-bar {
  display: flex; flex-direction: column;
  border-bottom: 1px solid var(--adm-border);
  background: color-mix(in srgb, var(--adm-bg) 78%, transparent);
  backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 50;
}
/* Match content width + horizontal padding used by `.admin-main` (1280 / 1.5rem). */
.admin-bar__inner {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex; align-items: center; gap: 1rem;
}
.admin-bar__top {
  padding: 0.5rem 0;
  min-height: 52px;
}
.admin-bar__top-spacer { flex: 1; }
.nav-burger {
  display: none;
  width: 34px; height: 34px;
  place-items: center;
  background: transparent;
  border: 1px solid var(--adm-border-strong);
  border-radius: var(--adm-radius-sm);
  color: var(--adm-text);
  cursor: pointer;
}
.nav-burger svg { display: block; }

.brand {
  display: inline-flex; align-items: center; gap: 0.55rem;
  color: var(--adm-text); text-decoration: none;
  font-family: var(--adm-font-serif); font-size: 1.02rem;
  letter-spacing: -0.005em;
}
.brand__mark {
  width: 26px; height: 26px; display: grid; place-items: center;
  background: var(--adm-accent);
  color: var(--adm-on-accent);
  border-radius: var(--adm-radius-sm); font-weight: 700;
  font-family: var(--adm-font-mono); font-size: 0.78rem;
}
.brand__name { font-weight: 500; }
.brand__divider { color: var(--adm-text-subtle); margin: 0 0.05rem; }
.brand__suffix {
  font-family: var(--adm-font-mono);
  color: var(--adm-text-muted); font-size: 0.68rem;
  letter-spacing: 0.18em; text-transform: uppercase;
  transform: translateY(1px);
}

/* ── Body: sidebar + main ───────────────────────────────
   The sidebar is a sticky icon+label rail, collapsible to icons only.
   On small screens it becomes an overlay drawer toggled from the top bar. */
.admin-body {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
}
.admin-side {
  --side-w: 218px;
  width: var(--side-w);
  flex: 0 0 auto;
  height: 100%;
  display: flex; flex-direction: column;
  border-right: 1px solid var(--adm-border);
  background: color-mix(in srgb, var(--adm-surface) 55%, var(--adm-bg));
  transition: width 220ms cubic-bezier(0.2, 0.7, 0.3, 1);
  overflow: hidden;
}
.admin-body.is-collapsed .admin-side { --side-w: 58px; }
.admin-side__scroll {
  flex: 1; min-height: 0;
  overflow-y: auto; overflow-x: hidden;
  padding: 0.9rem 0.55rem 0.5rem;
  scrollbar-width: thin;
}
.admin-side__group { margin-bottom: 1.1rem; }
.admin-side__group-label {
  margin: 0 0 0.35rem;
  padding: 0 0.55rem;
  font-family: var(--adm-font-mono);
  font-size: 0.6rem; font-weight: 600;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--adm-text-subtle);
  white-space: nowrap;
  transition: opacity 160ms ease;
}
.admin-body.is-collapsed .admin-side__group-label { opacity: 0; }
.admin-body.is-collapsed .admin-side__group {
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--adm-border-soft);
}
.admin-body.is-collapsed .admin-side__group:last-child { border-bottom: 0; }

.admin-side__link,
.admin-side__collapse {
  display: flex; align-items: center; gap: 0.6rem;
  width: 100%;
  padding: 0.48rem 0.55rem;
  border: 0; border-radius: var(--adm-radius-sm);
  background: transparent;
  color: var(--adm-text-muted);
  font: inherit; font-size: 0.84rem; font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  position: relative;
  transition: background 140ms ease, color 140ms ease;
}
.admin-side__link:hover,
.admin-side__collapse:hover { background: var(--adm-surface-2); color: var(--adm-text); }
.admin-side__link.is-active {
  background: color-mix(in srgb, var(--adm-accent) 11%, transparent);
  color: var(--adm-text);
}
.admin-side__link.is-active::before {
  content: '';
  position: absolute; left: -0.55rem; top: 20%; bottom: 20%;
  width: 2px; border-radius: 2px;
  background: var(--adm-accent);
}
.admin-side__icon {
  width: 22px; height: 22px;
  display: grid; place-items: center;
  flex: 0 0 auto;
}
.admin-side__icon svg { display: block; }
.admin-side__link.is-active .admin-side__icon { color: var(--adm-accent); }
.admin-side__label {
  overflow: hidden; text-overflow: ellipsis;
  transition: opacity 140ms ease;
}
.admin-body.is-collapsed .admin-side__label,
.admin-body.is-collapsed .admin-side__star { opacity: 0; pointer-events: none; }
/* Premium feature — gold-tinted with a star so it reads as an add-on. */
.admin-side__link.is-premium { color: var(--adm-accent); font-weight: 600; }
.admin-side__star { font-size: 0.6rem; margin-left: auto; opacity: 0.9; color: var(--adm-accent); }
.admin-body.is-collapsed .admin-side__link.is-premium .admin-side__icon { color: var(--adm-accent); }

.admin-side__collapse {
  margin: 0.4rem 0.55rem 0.7rem;
  width: calc(100% - 1.1rem);
  border-top: 1px solid var(--adm-border-soft);
  border-radius: 0;
  padding-top: 0.65rem;
  color: var(--adm-text-subtle);
}
.admin-scrim { display: none; }

/* ── Site switcher (custom pill + popover, mirrors user pill) ───────────── */
.site-switcher { position: relative; }
.site-pill {
  display: inline-flex; align-items: center; gap: 0.55rem;
  padding: 0.3rem 0.6rem 0.3rem 0.4rem;
  background: transparent;
  border: 1px solid var(--adm-border-strong);
  border-radius: var(--adm-radius);
  color: var(--adm-text); cursor: pointer;
  font: inherit; font-size: 0.82rem;
  max-width: 280px;
  transition: background 140ms, border-color 140ms;
}
.site-pill:hover, .site-pill.is-open {
  background: var(--adm-surface-2);
  border-color: var(--adm-accent-deep);
}
.site-pill__mark {
  width: 24px; height: 24px; border-radius: var(--adm-radius-sm);
  display: grid; place-items: center;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border);
  color: var(--adm-accent); font-size: 0.85rem; line-height: 1;
  flex: 0 0 auto;
}
.site-pill__label {
  display: inline-flex; align-items: baseline; gap: 0.35rem;
  min-width: 0; flex: 1;
}
.site-pill__name {
  font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.site-pill__sub { color: var(--adm-text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; }
.site-pill__caret { color: var(--adm-text-subtle); font-size: 0.7rem; flex: 0 0 auto; }

.site-menu {
  position: absolute; top: calc(100% + 0.4rem); left: 0;
  min-width: 260px; max-width: 360px; padding: 0.35rem;
  background: var(--adm-surface);
  border: 1px solid var(--adm-border-strong);
  border-radius: var(--adm-radius);
  box-shadow: var(--adm-shadow-lg);
  z-index: 100;
  max-height: 60vh; overflow-y: auto;
}
.site-menu__row {
  display: flex; align-items: stretch; gap: 2px;
  border-radius: 6px;
}
.site-menu__row--active { background: color-mix(in srgb, var(--adm-accent) 10%, transparent); }
.site-menu__item {
  display: flex; flex-direction: column; align-items: flex-start; gap: 0.1rem;
  flex: 1; min-width: 0; text-align: left;
  padding: 0.5rem 0.65rem;
  background: transparent; border: 0; border-radius: 6px;
  color: var(--adm-text); font: inherit; font-size: 0.85rem;
  cursor: pointer;
}
.site-menu__item:hover { background: var(--adm-surface-2); }
.site-menu__row--active .site-menu__item:hover { background: color-mix(in srgb, var(--adm-accent) 14%, transparent); }
.site-menu__view {
  flex: 0 0 auto; width: 34px;
  display: grid; place-items: center;
  border-radius: 6px;
  color: var(--adm-text-muted);
  transition: background 120ms ease, color 120ms ease;
}
.site-menu__view:hover { background: var(--adm-surface-2); color: var(--adm-accent); }
.site-menu__name {
  font-weight: 600;
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.site-menu__meta { color: var(--adm-text-muted); font-size: 0.74rem; letter-spacing: 0.04em; }

/* ── User pill + menu ──────────────────────────────────── */
.admin-user { position: relative; display: flex; align-items: center; gap: 0.5rem; }

.user-pill {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.3rem 0.55rem 0.3rem 0.3rem;
  background: transparent;
  border: 1px solid var(--adm-border-strong);
  border-radius: var(--adm-radius);
  color: var(--adm-text); cursor: pointer;
  font: inherit; font-size: 0.82rem;
  transition: background 140ms, border-color 140ms;
}
.user-pill:hover, .user-pill.is-open {
  background: var(--adm-surface-2);
  border-color: var(--adm-accent-deep);
}
.user-pill__avatar {
  width: 24px; height: 24px; border-radius: var(--adm-radius-sm);
  display: grid; place-items: center;
  background: var(--adm-surface-3);
  border: 1px solid var(--adm-border-strong);
  color: var(--adm-accent); font-weight: 700; font-size: 0.66rem;
  font-family: var(--adm-font-mono);
}
.user-pill__email { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-pill__caret { color: var(--adm-text-subtle); font-size: 0.7rem; }

.user-menu {
  position: absolute; top: calc(100% + 0.4rem); right: 0;
  min-width: 220px; padding: 0.4rem;
  background: var(--adm-surface);
  border: 1px solid var(--adm-border-strong);
  border-radius: var(--adm-radius);
  box-shadow: var(--adm-shadow-lg);
  z-index: 100;
}
.user-menu__head {
  padding: 0.5rem 0.6rem 0.6rem;
  border-bottom: 1px solid var(--adm-border-soft);
  margin-bottom: 0.3rem;
  display: flex; flex-direction: column; gap: 0.15rem;
}
.user-menu__email { color: var(--adm-text); font-size: 0.85rem; }
.user-menu__name { color: var(--adm-text-muted); font-size: 0.78rem; }

.user-menu__item {
  display: block; width: 100%; text-align: left;
  padding: 0.5rem 0.6rem;
  background: transparent; border: 0; border-radius: 6px;
  color: var(--adm-text); font: inherit; font-size: 0.85rem;
  cursor: pointer; text-decoration: none;
}
.user-menu__item:hover { background: var(--adm-surface-2); }
.user-menu__item--danger { color: var(--adm-danger); }
.user-menu__item--danger:hover { background: rgba(240,122,122,0.08); }
.user-menu__divider { height: 1px; background: var(--adm-border-soft); margin: 0.3rem 0; }

/* ── Main ──────────────────────────────────────────────── */
/* The scroll viewport: full width so its scrollbar sits at the window's
   right edge, and `overscroll-behavior: contain` so reaching the end does
   not chain the wheel through to the public page behind the overlay. */
.admin-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
/* The reading column. */
.admin-main__inner {
  padding: 2rem 1.5rem 4rem;
  max-width: 1280px; width: 100%;
  margin: 0 auto;
}
.admin-gate { padding-top: 2rem; }

@media (max-width: 880px) {
  .admin-bar__inner { padding: 0 0.85rem; }
  .admin-bar__top { gap: 0.5rem; }
  .user-pill__email, .site-pill__sub { display: none; }
  .site-pill { max-width: 180px; }
  .nav-burger { display: grid; }
  /* Sidebar becomes an overlay drawer. */
  .admin-side {
    position: fixed;
    left: 0; top: 53px; bottom: 0;
    height: auto;
    z-index: 60;
    --side-w: 240px;
    transform: translateX(-100%);
    transition: transform 240ms cubic-bezier(0.2, 0.7, 0.3, 1);
    box-shadow: var(--adm-shadow-lg);
  }
  .admin-body.is-collapsed .admin-side { --side-w: 240px; }
  .admin-body.is-collapsed .admin-side__label,
  .admin-body.is-collapsed .admin-side__group-label,
  .admin-body.is-collapsed .admin-side__star { opacity: 1; pointer-events: auto; }
  .admin-body.is-drawer-open .admin-side { transform: translateX(0); }
  .admin-side__collapse { display: none; }
  .admin-scrim {
    display: block;
    position: fixed; inset: 53px 0 0 0;
    background: color-mix(in srgb, var(--adm-bg) 55%, transparent);
    backdrop-filter: blur(2px);
    z-index: 55;
  }
}
</style>
