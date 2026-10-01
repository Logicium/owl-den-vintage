<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { resolvePlanTier } from '../../themes/tokens'
import { CalendarClock, BedDouble, ShoppingBag, UtensilsCrossed, Ticket, Sparkles, Check, Bike, ConciergeBell } from 'lucide-vue-next'
import { contentClient } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import { useToast } from '../composables/useToast'

/**
 * Add-ons & upgrades for the active site.
 *  - Premium add-ons: any archetype can turn on any commerce tool. Free
 *    while the program is in beta; beta users are grandfathered in when
 *    it becomes a paid feature.
 *  - Site size: the Portfolio upgrade with real checkout (lands in Billing).
 */
const activeSites = useActiveSiteStore()
const toast = useToast()
const siteId = computed(() => activeSites.activeId)
const activeSite = computed(() => activeSites.sites.find(s => s.id === activeSites.activeId) ?? null)
const enabled = computed(() => activeSite.value?.addOns ?? [])

const ADDONS: Array<{ id: string; label: string; icon: Component; to: string; blurb: string; comingSoon?: boolean }> = [
  { id: 'appointments', label: 'Appointments', icon: CalendarClock, to: '/admin/appointments', blurb: 'Bookable service slots with hours, capacity, and email confirmations.' },
  { id: 'lodging', label: 'Lodging', icon: BedDouble, to: '/admin/lodging', blurb: 'Room reservations with party size, date ranges, and request handling.' },
  { id: 'eshop', label: 'Shop', icon: ShoppingBag, to: '/admin/shop', blurb: 'Sell products with checkout, order history, and stock flags.' },
  { id: 'ordering', label: 'Online ordering', icon: UtensilsCrossed, to: '/admin/ordering', blurb: 'Pickup orders straight from your menu, with kitchen hours and alerts.' },
  { id: 'ticketing', label: 'Ticketing', icon: Ticket, to: '/admin/ticketing', blurb: 'Sell event tickets with tiers, capacity tracking, and door lists.' },
  { id: 'delivery', label: 'Delivery', icon: Bike, to: '', comingSoon: true, blurb: 'Local delivery zones, fees, and driver handoff — on top of online ordering.' },
  { id: 'reservations', label: 'Reservations', icon: ConciergeBell, to: '', comingSoon: true, blurb: 'Table reservations with party size, seating windows, and no-show guards.' },
]

const busy = ref<string | null>(null)
async function toggleAddon(id: string) {
  if (!siteId.value || busy.value) return
  const on = enabled.value.includes(id)
  busy.value = id
  try {
    await contentClient.setSiteAddOn(siteId.value, id, !on)
    await activeSites.refresh()
    toast.success(on ? 'Add-on turned off' : 'Add-on enabled. Set it up from the sidebar.')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = null
  }
}

/* Portfolio upgrade */
const portfolioPaid = computed(() => {
  const plan = (activeSite.value as { plan?: string } | null)?.plan ?? 'essentials'
  return resolvePlanTier(plan) === 'portfolio'
})
const upgrading = ref(false)
async function upgrade() {
  if (!siteId.value || upgrading.value) return
  upgrading.value = true
  try {
    const r = await contentClient.createUpgradeCheckout(siteId.value, ['website-portfolio-upgrade'])
    if (r.checkoutUrl) window.location.href = r.checkoutUrl
    else {
      toast.success('Upgraded. Portfolio is live on your site.')
      await activeSites.refresh()
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    upgrading.value = false
  }
}
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div class="adm-page__title-block">
        <span class="adm-eyebrow">Grow</span>
        <h1 class="adm-title">Add-ons &amp; upgrades</h1>
        <p class="adm-subtitle">Turn on more tools for this site, or move up to the Portfolio size.</p>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <div class="adm-empty__icon">⌗</div>
      <h2 class="adm-empty__title">No active site</h2>
      <p class="adm-empty__body">Select a site from the header dropdown first.</p>
    </div>

    <template v-else>
      <!-- Portfolio upgrade -->
      <div class="adm-card ao-plan">
        <div>
          <span class="adm-eyebrow">Site size</span>
          <h3 class="adm-card__title">
            {{ portfolioPaid ? 'Portfolio' : 'Essentials' }}
            <Check v-if="portfolioPaid" :size="15" class="ao-plan__check" />
          </h3>
          <p class="adm-card__sub" v-if="portfolioPaid">
            You have the photo-forward site: hero carousel, 16 gallery slots, and the larger layouts.
          </p>
          <p class="adm-card__sub" v-else>
            Portfolio doubles your gallery to 16 photos, turns on the hero carousel, and unlocks
            the photo-forward layouts. $50, one time.
          </p>
        </div>
        <button v-if="!portfolioPaid" type="button" class="adm-btn adm-btn--primary" :disabled="upgrading" @click="upgrade">
          <Sparkles :size="14" /> {{ upgrading ? 'Starting checkout…' : 'Upgrade to Portfolio' }}
        </button>
      </div>

      <!-- Premium add-ons -->
      <div class="ao-head">
        <h2 class="adm-h2">Premium add-ons</h2>
        <span class="ao-beta">Free during beta · you keep them when pricing begins</span>
      </div>
      <div class="ao-grid">
        <div
          v-for="a in ADDONS"
          :key="a.id"
          class="adm-card ao-card"
          :class="{ 'is-on': enabled.includes(a.id), 'is-soon': a.comingSoon }"
        >
          <span class="ao-card__icon"><component :is="a.icon" :size="19" :stroke-width="1.7" /></span>
          <h3 class="ao-card__name">{{ a.label }}</h3>
          <p class="ao-card__blurb">{{ a.blurb }}</p>
          <div class="ao-card__actions">
            <span v-if="a.comingSoon" class="ao-card__soon">Coming soon</span>
            <template v-else>
              <button
                type="button"
                class="adm-btn adm-btn--sm"
                :class="enabled.includes(a.id) ? '' : 'adm-btn--primary'"
                :disabled="busy === a.id"
                @click="toggleAddon(a.id)"
              >
                {{ busy === a.id ? 'Saving…' : enabled.includes(a.id) ? 'Turn off' : 'Enable free' }}
              </button>
              <RouterLink v-if="enabled.includes(a.id)" :to="a.to" class="adm-btn adm-btn--sm">Open</RouterLink>
            </template>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ao-plan {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.25rem; flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.ao-plan__check { color: var(--adm-success, #6fcf97); }
.ao-head {
  display: flex; align-items: baseline; gap: 0.9rem; flex-wrap: wrap;
  margin: 0 0 0.9rem;
}
.ao-head .adm-h2 { margin: 0; }
.ao-beta {
  font-family: var(--adm-font-mono);
  font-size: 0.66rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--adm-accent);
  border: 1px dashed color-mix(in srgb, var(--adm-accent) 55%, transparent);
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
}
.ao-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}
.ao-card { display: flex; flex-direction: column; gap: 0.5rem; }
.ao-card__icon {
  width: 38px; height: 38px;
  display: grid; place-items: center;
  border-radius: var(--adm-radius-sm);
  background: color-mix(in srgb, var(--adm-accent) 10%, transparent);
  color: var(--adm-accent);
}
.ao-card.is-on { border-color: color-mix(in srgb, var(--adm-accent) 45%, var(--adm-border)); }
.ao-card__name { margin: 0.25rem 0 0; font-family: var(--adm-font-serif); font-weight: 500; font-size: 1.15rem; }
.ao-card__blurb { margin: 0; color: var(--adm-text-muted); font-size: 0.86rem; line-height: 1.5; flex: 1; }
.ao-card__actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.ao-card.is-soon { opacity: 0.72; }
.ao-card.is-soon .ao-card__icon { filter: grayscale(0.4); }
.ao-card__soon {
  display: inline-flex; align-items: center;
  padding: 0.3rem 0.7rem;
  border: 1px dashed var(--adm-border-strong);
  border-radius: 999px;
  font-family: var(--adm-font-mono);
  font-size: 0.62rem; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--adm-text-subtle);
}
</style>
