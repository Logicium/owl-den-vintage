<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { contentClient, type MenuItemDTO, type MenuItemInput, type MealOrderDTO, type OrderingConfigDTO } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'
import MoneyInput from '../components/inputs/MoneyInput.vue'
import NumberInput from '../components/inputs/NumberInput.vue'
import ToggleInput from '../components/inputs/ToggleInput.vue'
import PosPanel from '../components/PosPanel.vue'
import { useToast } from '../composables/useToast'
import SelectInput from '../components/inputs/SelectInput.vue'
import SearchSelect from '../components/inputs/SearchSelect.vue'
import TimezoneSelect from '../components/inputs/TimezoneSelect.vue'
import ImageInput from '../components/inputs/ImageInput.vue'
import TimePickerInput from '../components/inputs/TimePickerInput.vue'
import ChipsInput from '../components/inputs/ChipsInput.vue'

const CURRENCY_OPTIONS = ['USD', 'CAD', 'EUR', 'GBP', 'MXN'].map(c => ({ value: c, label: c }))

const activeSites = useActiveSiteStore()
const toast = useToast()
const siteId = computed(() => activeSites.activeId)

const loading = ref(false)
const error = ref<string | null>(null)
const saving = ref(false)
const savedAt = ref<string | null>(null)

const resolved = ref<Required<OrderingConfigDTO> | null>(null)
const items = ref<MenuItemDTO[]>([])
const orders = ref<MealOrderDTO[]>([])
const addOnEnabled = ref(false)

// Local editor model for hours: weekday -> list of {open, close} ranges,
// each an "HH:MM" 24-hour string. Serialized back to "HH:MM-HH:MM" on save.
interface HourRange { open: string; close: string }
const hoursRanges = ref<Record<number, HourRange[]>>({})
const dayLabels: Array<{ idx: number; label: string; full: string }> = [
  { idx: 0, label: 'Sun', full: 'Sunday' }, { idx: 1, label: 'Mon', full: 'Monday' },
  { idx: 2, label: 'Tue', full: 'Tuesday' }, { idx: 3, label: 'Wed', full: 'Wednesday' },
  { idx: 4, label: 'Thu', full: 'Thursday' }, { idx: 5, label: 'Fri', full: 'Friday' },
  { idx: 6, label: 'Sat', full: 'Saturday' },
]

// Multiple notification recipients — new orders email everyone in this list.
const notifyEmails = ref<string[]>([])

function addRange(idx: number) {
  (hoursRanges.value[idx] ??= []).push({ open: '11:00', close: '20:00' })
}
function removeRange(idx: number, ri: number) {
  hoursRanges.value[idx]?.splice(ri, 1)
}
/** Copy one day's ranges to every other day — a common "same hours all week" shortcut. */
function copyToAll(idx: number) {
  const src = hoursRanges.value[idx] ?? []
  for (const { idx: d } of dayLabels) {
    hoursRanges.value[d] = src.map(r => ({ ...r }))
  }
}

const newItem = ref<MenuItemInput>({
  sku: '', name: '', description: '', priceCents: 0, currency: 'USD', category: '', imageUrl: '', active: true, sortOrder: 0,
})

/** Categories already in use — the picker offers them and allows new ones. */
const categoryOptions = computed(() => {
  const seen = [...new Set(items.value.map(i => i.category).filter(Boolean))]
  return seen.map(c => ({ value: c, label: c }))
})

async function load() {
  if (!siteId.value) return
  loading.value = true
  error.value = null
  try {
    const [cfg, list, ords, sites] = await Promise.all([
      contentClient.getOrderingConfig(siteId.value),
      contentClient.orderingListSiteMenu(siteId.value).catch(() => [] as MenuItemDTO[]),
      contentClient.orderingListOrders(siteId.value).catch(() => [] as MealOrderDTO[]),
      contentClient.listSites(),
    ])
    resolved.value = cfg.resolved
    items.value = list
    orders.value = ords
    addOnEnabled.value = !!sites.find(s => s.id === siteId.value)?.addOns?.includes('ordering')
    if (cfg.resolved.currency) newItem.value.currency = cfg.resolved.currency
    hoursRanges.value = {}
    for (const { idx } of dayLabels) {
      const ranges = cfg.resolved.hours?.[idx] ?? []
      hoursRanges.value[idx] = ranges.map(r => {
        const [open, close] = r.split('-')
        return { open: (open ?? '').trim(), close: (close ?? '').trim() }
      })
    }
    notifyEmails.value = (cfg.resolved.notifyEmail || '')
      .split(/[,;]/).map(s => s.trim()).filter(Boolean)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/* ── Menu link ──
   Ordering is fed by the site's Menu content: one click imports every dish
   that isn't already sellable, keeping the two in sync without retyping. */
const importing = ref(false)
const importStatus = ref<string | null>(null)
async function importFromMenu() {
  if (!siteId.value || importing.value) return
  importing.value = true
  importStatus.value = null
  try {
    const d = await contentClient.getDraft(siteId.value)
    const cats = (d.payload.menu as { categories?: Array<{ name?: string; items?: Array<{ name?: string; description?: string; price?: string }> }> } | undefined)?.categories ?? []
    const existing = new Set(items.value.map(i => i.name.toLowerCase()))
    let added = 0
    for (const cat of cats) {
      for (const it of cat.items ?? []) {
        const name = (it.name ?? '').trim()
        if (!name || existing.has(name.toLowerCase())) continue
        const priceCents = Math.round((parseFloat(String(it.price ?? '').replace(/[^0-9.]/g, '')) || 0) * 100)
        const created = await contentClient.orderingCreateMenuItem(siteId.value, {
          sku: (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `item-${added + 1}`).slice(0, 40),
          name,
          description: it.description?.trim() || undefined,
          priceCents,
          currency: resolved.value?.currency || 'USD',
          category: cat.name?.trim() || '',
          active: true,
          sortOrder: items.value.length + added,
        })
        items.value.push(created)
        existing.add(name.toLowerCase())
        added++
      }
    }
    importStatus.value = added
      ? `Imported ${added} item${added === 1 ? '' : 's'} from your menu.`
      : 'Everything on your menu is already sellable here.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    importing.value = false
  }
}

async function addItem() {
  if (!siteId.value) return
  const i = newItem.value
  if (!i.sku.trim() || !i.name.trim()) return
  try {
    const created = await contentClient.orderingCreateMenuItem(siteId.value, {
      sku: i.sku.trim(),
      name: i.name.trim(),
      description: i.description?.trim() || undefined,
      priceCents: Math.max(0, Math.round(i.priceCents)),
      currency: i.currency || resolved.value?.currency || 'USD',
      category: i.category?.trim() || '',
      imageUrl: i.imageUrl?.trim() || undefined,
      active: i.active ?? true,
      sortOrder: i.sortOrder ?? 0,
    })
    items.value.push(created)
    newItem.value = { sku: '', name: '', description: '', priceCents: 0, currency: resolved.value?.currency || 'USD', category: '', imageUrl: '', active: true, sortOrder: 0 }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function saveItem(p: MenuItemDTO) {
  if (!siteId.value) return
  try {
    const updated = await contentClient.orderingUpdateMenuItem(siteId.value, p.id, {
      sku: p.sku.trim(),
      name: p.name.trim(),
      description: p.description?.trim() || undefined,
      priceCents: Math.max(0, Math.round(p.priceCents)),
      currency: p.currency,
      category: p.category,
      imageUrl: p.imageUrl?.trim() || undefined,
      active: p.active,
      sortOrder: p.sortOrder,
    })
    const i = items.value.findIndex(x => x.id === updated.id)
    if (i >= 0) items.value[i] = updated
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function deleteItem(p: MenuItemDTO) {
  if (!siteId.value) return
  if (!confirm(`Delete "${p.name}"?`)) return
  try {
    await contentClient.orderingDeleteMenuItem(siteId.value, p.id)
    items.value = items.value.filter(x => x.id !== p.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function parseHoursEditor(): Record<number, string[]> {
  const out: Record<number, string[]> = {}
  const t = /^\d{1,2}:\d{2}$/
  for (const { idx } of dayLabels) {
    const ranges = (hoursRanges.value[idx] ?? [])
      .filter(r => t.test(r.open) && t.test(r.close))
      .map(r => `${r.open}-${r.close}`)
    if (ranges.length) out[idx] = ranges
  }
  return out
}

async function saveConfig() {
  if (!siteId.value || !resolved.value) return
  saving.value = true
  error.value = null
  try {
    const payload: OrderingConfigDTO = {
      timezone: resolved.value.timezone,
      currency: resolved.value.currency,
      hours: parseHoursEditor(),
      slotMinutes: Math.max(5, Math.round(resolved.value.slotMinutes)),
      prepMinutes: Math.max(0, Math.round(resolved.value.prepMinutes)),
      maxOrdersPerSlot: Math.max(1, Math.round(resolved.value.maxOrdersPerSlot)),
      windowDays: Math.max(1, Math.round(resolved.value.windowDays)),
      pickupInstructions: resolved.value.pickupInstructions,
      notifyEmail: notifyEmails.value.join(', ') || undefined,
    }
    const next = await contentClient.saveOrderingConfig(siteId.value, payload)
    resolved.value = next.resolved
    savedAt.value = new Date().toISOString()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

async function toggleAddOn() {
  if (!siteId.value) return
  try {
    const res = await contentClient.setSiteAddOn(siteId.value, 'ordering', !addOnEnabled.value)
    addOnEnabled.value = res.addOns.includes('ordering')
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

const sendingPos = ref<string | null>(null)

/** Push (or retry) one order to the connected POS so its ticket prints. */
async function sendToPos(o: MealOrderDTO) {
  if (!siteId.value || sendingPos.value) return
  sendingPos.value = o.id
  try {
    const r = await contentClient.posSendOrder(siteId.value, o.id)
    o.posOrderId = r.posOrderId
    o.posSyncedAt = r.posSyncedAt
    o.posSyncError = null
    toast.success('Ticket sent to your POS.')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    o.posSyncError = msg
    toast.error(msg)
  } finally {
    sendingPos.value = null
  }
}

async function setOrderStatus(o: MealOrderDTO, status: MealOrderDTO['status']) {
  if (!siteId.value) return
  try {
    const updated = await contentClient.orderingUpdateOrder(siteId.value, o.id, status)
    const i = orders.value.findIndex(x => x.id === o.id)
    if (i >= 0) orders.value[i] = updated
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

function money(cents?: number, currency?: string) {
  if (cents == null) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || resolved.value?.currency || 'USD' }).format(cents / 100)
}

function pickupLocal(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: resolved.value?.timezone || 'America/Denver',
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso))
}

/* Menu → Ordering is a live link: after load, silently pull in any dish
   that isn't sellable yet (idempotent — matches by name). The button in
   the header stays as a manual re-sync. */
async function loadAndSync() {
  await load()
  await importFromMenu()
}
onMounted(loadAndSync)
watch(siteId, loadAndSync)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow adm-eyebrow--premium">★ Premium add-on</span>
        <h1 class="adm-title">Ordering</h1>
        <p class="adm-subtitle">
          Accept pickup orders from your menu. Define your hours, kitchen capacity,
          and items.
        </p>
      </div>
      <div class="head-actions">
        <button
          type="button"
          class="adm-btn"
          :class="addOnEnabled ? 'adm-btn--ghost' : 'adm-btn--primary'"
          @click="toggleAddOn"
        >{{ addOnEnabled ? 'Disable add-on' : 'Enable ordering' }}</button>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <p class="adm-empty__body">Select a site from the header to manage its ordering.</p>
    </div>

    <template v-else>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
      <p v-if="loading" class="adm-muted">Loading…</p>

      <div v-if="!addOnEnabled" class="adm-card adm-card--soft addon-gate">
        <p>
          The Ordering add-on is currently <strong>off</strong> for this site. Enable it
          above to start accepting orders.
        </p>
      </div>

      <section class="adm-card">
        <h2 class="adm-h2">Menu items</h2>
        <div class="ord-import">
          <button type="button" class="adm-btn adm-btn--sm" :disabled="importing" @click="importFromMenu">
            {{ importing ? 'Importing…' : 'Import from your Menu' }}
          </button>
          <span class="adm-muted ord-import__hint">Linked to the Menu editor: pull every dish in, no retyping.</span>
          <span v-if="importStatus" class="adm-msg-ok ord-import__status">{{ importStatus }}</span>
        </div>
        <p class="adm-muted adm-mb">Items appear grouped by category on your ordering page.</p>

        <ul v-if="items.length" class="rm-list">
          <li v-for="p in items" :key="p.id" class="rm-row">
            <input class="adm-input rm-row__sku" v-model="p.sku" placeholder="SKU" />
            <input class="adm-input rm-row__name" v-model="p.name" placeholder="Name" />
            <div class="rm-row__cat"><SearchSelect v-model="p.category" :options="categoryOptions" creatable placeholder="Category" /></div>
            <input class="adm-input rm-row__desc" v-model="p.description" placeholder="Description" />
            <div class="rm-row__price"><MoneyInput v-model="p.priceCents" :currency="resolved?.currency || 'USD'" /></div>
            <div class="rm-row__img"><ImageInput :model-value="p.imageUrl ?? ''" :site-id="siteId" aspect="1 / 1" @update:model-value="(v: string) => p.imageUrl = v" /></div>
            <div class="rm-row__active"><ToggleInput v-model="p.active" label="Live" /></div>
            <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" @click="saveItem(p)">Save</button>
            <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="deleteItem(p)">×</button>
          </li>
        </ul>
        <p v-else class="adm-muted adm-mb">No menu items yet.</p>

        <div class="rm-row rm-row--new">
          <input class="adm-input rm-row__sku" v-model="newItem.sku" placeholder="SKU" />
          <input class="adm-input rm-row__name" v-model="newItem.name" placeholder="Name" />
          <div class="rm-row__cat"><SearchSelect :model-value="newItem.category ?? ''" :options="categoryOptions" creatable placeholder="Category" @update:model-value="(v: string) => newItem.category = v" /></div>
          <input class="adm-input rm-row__desc" v-model="newItem.description" placeholder="Description" />
          <div class="rm-row__price"><MoneyInput v-model="newItem.priceCents" :currency="resolved?.currency || 'USD'" /></div>
          <div class="rm-row__img"><ImageInput :model-value="newItem.imageUrl ?? ''" :site-id="siteId" aspect="1 / 1" @update:model-value="(v: string) => newItem.imageUrl = v" /></div>
          <div class="rm-row__active"><ToggleInput :model-value="newItem.active ?? true" label="Live" @update:model-value="(v: boolean) => newItem.active = v" /></div>
          <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" @click="addItem">Add</button>
          <span />
        </div>
      </section>

      <section v-if="resolved" class="adm-card">
        <h2 class="adm-h2">Ordering settings</h2>
        <div class="meta-grid">
          <TimezoneSelect v-model="resolved.timezone" label="Timezone" />
          <SelectInput v-model="resolved.currency" label="Currency" :options="CURRENCY_OPTIONS" />
          <NumberInput v-model="resolved.slotMinutes" label="Slot length" :min="5" :step="5" unit="min" />
          <NumberInput v-model="resolved.prepMinutes" label="Prep lead time" :min="0" :step="5" unit="min" />
          <NumberInput v-model="resolved.maxOrdersPerSlot" label="Max orders per slot" :min="1" unit="orders" />
          <NumberInput v-model="resolved.windowDays" label="Window forward" :min="1" :max="60" unit="days" />
          <label class="adm-field adm-field--full">
            <span>Pickup instructions</span>
            <textarea class="adm-input" rows="2" v-model="resolved.pickupInstructions" />
          </label>
          <div class="adm-field adm-field--full">
            <span>Notification emails (optional)</span>
            <ChipsInput
              v-model="notifyEmails"
              placeholder="Add an email and press Enter…"
              hint="New orders are emailed to everyone here. Falls back to your account email if empty."
            />
          </div>
        </div>

        <h3 class="adm-h2" style="margin-top: 1rem; font-size: 0.95rem;">Pickup hours</h3>
        <p class="adm-muted" style="font-size: 0.8rem; margin: 0 0 0.75rem;">
          Tap a time to pick it from the clock, or just type it. Add a second range for a lunch/dinner split. No ranges = closed that day.
        </p>
        <div class="hours-editor">
          <div v-for="d in dayLabels" :key="d.idx" class="hours-day">
            <div class="hours-day__label" :title="d.full">{{ d.label }}</div>
            <div class="hours-day__ranges">
              <div v-for="(r, ri) in (hoursRanges[d.idx] ?? [])" :key="ri" class="hours-range">
                <TimePickerInput v-model="r.open" :aria-label="`${d.full} opening time`" />
                <span class="hours-range__dash">–</span>
                <TimePickerInput v-model="r.close" :aria-label="`${d.full} closing time`" />
                <button type="button" class="hours-range__rm" :aria-label="'Remove hours'" @click="removeRange(d.idx, ri)">×</button>
              </div>
              <span v-if="!(hoursRanges[d.idx] ?? []).length" class="hours-day__closed">Closed</span>
              <div class="hours-day__actions">
                <button type="button" class="hours-day__add" @click="addRange(d.idx)">+ Add hours</button>
                <button
                  v-if="(hoursRanges[d.idx] ?? []).length"
                  type="button" class="hours-day__copy"
                  title="Apply these hours to every day"
                  @click="copyToAll(d.idx)"
                >Copy to all days</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="save-bar">
        <button type="button" class="adm-btn adm-btn--primary" :disabled="saving" @click="saveConfig">
          {{ saving ? 'Saving…' : 'Save settings' }}
        </button>
        <span v-if="savedAt" class="adm-muted">Saved {{ new Date(savedAt).toLocaleTimeString() }}</span>
      </div>

      <PosPanel :site-id="siteId" />

      <section class="adm-card">
        <h2 class="adm-h2">Orders</h2>
        <p v-if="!orders.length" class="adm-muted">No orders yet.</p>
        <table v-else class="adm-table">
          <thead>
            <tr><th>Pickup</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Ticket</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id">
              <td>{{ pickupLocal(o.pickupAt) }}</td>
              <td>
                {{ o.name }}<br />
                <small><a :href="`mailto:${o.email}`">{{ o.email }}</a><template v-if="o.phone"> · {{ o.phone }}</template></small>
              </td>
              <td>
                <div v-for="it in o.items" :key="it.menuItemId">
                  {{ it.name }} × {{ it.quantity }}<template v-if="it.notes"> <em>({{ it.notes }})</em></template>
                </div>
              </td>
              <td>{{ money(o.totalCents, o.currency) }}</td>
              <td>
                <span class="adm-badge" :class="o.status === 'cancelled' ? 'adm-badge--warn' : (o.status === 'completed' ? 'adm-badge--ok' : 'adm-badge--info')">{{ o.status }}</span>
              </td>
              <td class="ticket-cell">
                <!-- Reached the POS AND printed. -->
                <span
                  v-if="o.posOrderId && !o.posSyncError"
                  class="adm-badge adm-badge--ok"
                  title="Sent to your POS and the kitchen ticket printed"
                >Printed</span>
                <!-- Reached the POS but the ticket did not print: the order is
                     safe, the kitchen just never saw paper. Say exactly that. -->
                <template v-else-if="o.posOrderId && o.posSyncError">
                  <span class="adm-badge adm-badge--warn" :title="o.posSyncError">Sent, no ticket</span>
                  <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" :disabled="sendingPos === o.id" @click="sendToPos(o)">
                    {{ sendingPos === o.id ? 'Printing…' : 'Print again' }}
                  </button>
                </template>
                <template v-else-if="o.posSyncError">
                  <span class="adm-badge adm-badge--warn" :title="o.posSyncError">Failed</span>
                  <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" :disabled="sendingPos === o.id" @click="sendToPos(o)">
                    {{ sendingPos === o.id ? 'Sending…' : 'Retry' }}
                  </button>
                </template>
                <button v-else type="button" class="adm-btn adm-btn--ghost adm-btn--sm" :disabled="sendingPos === o.id" @click="sendToPos(o)">
                  {{ sendingPos === o.id ? 'Sending…' : 'Send' }}
                </button>
              </td>
              <td class="order-actions">
                <button v-if="o.status === 'pending'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="setOrderStatus(o, 'confirmed')">Confirm</button>
                <button v-if="o.status === 'confirmed'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="setOrderStatus(o, 'ready')">Mark ready</button>
                <button v-if="o.status === 'ready'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="setOrderStatus(o, 'completed')">Complete</button>
                <button v-if="o.status !== 'cancelled' && o.status !== 'completed'" type="button" class="adm-btn adm-btn--ghost adm-btn--sm" @click="setOrderStatus(o, 'cancelled')">Cancel</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </section>
</template>

<style scoped>
.head-actions { margin-left: auto; }
.adm-h2 { margin: 0 0 0.4rem; font-size: 1.05rem; }
.adm-mb { margin-bottom: 0.75rem; }
.addon-gate { padding: 1rem 1.1rem; margin-bottom: 1rem; }

.rm-list { list-style: none; padding: 0; margin: 0 0 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
.rm-row { display: grid; grid-template-columns: 6rem 9rem 7rem 1fr 5rem 1.2fr 3rem auto auto; gap: 0.3rem; align-items: center; }
.rm-row--new { padding-top: 0.5rem; border-top: 1px dashed var(--adm-border); }
.rm-row__active { display: flex; align-items: center; gap: 0.25rem; font-size: 0.78rem; color: var(--adm-text-subtle); }

.meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
.adm-field { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.8rem; color: var(--adm-text-subtle); }
.adm-field--full { grid-column: 1 / -1; }
@media (max-width: 800px) { .meta-grid { grid-template-columns: 1fr; } }

/* Pickup hours — one row per day, each with tap-to-pick clock ranges. */
.hours-editor { display: flex; flex-direction: column; gap: 0.5rem; }
.hours-day {
  display: grid; grid-template-columns: 3.5rem 1fr; gap: 0.75rem; align-items: start;
  padding: 0.6rem 0.7rem;
  background: var(--adm-surface-2);
  border: 1px solid var(--adm-border-soft);
  border-radius: var(--adm-radius);
}
.hours-day__label {
  font-weight: 700; font-size: 0.82rem; color: var(--adm-text);
  padding-top: 0.55rem;
}
.hours-day__ranges { display: flex; flex-direction: column; gap: 0.45rem; min-width: 0; }
.hours-range { display: flex; align-items: center; gap: 0.4rem; }
.hours-range :deep(.tp) { width: 8.5rem; }
.hours-range__dash { color: var(--adm-text-muted); }
.hours-range__rm {
  display: grid; place-items: center;
  width: 1.9rem; height: 1.9rem; flex-shrink: 0;
  background: transparent; border: 1px solid transparent;
  color: var(--adm-text-muted); border-radius: var(--adm-radius-sm);
  font-size: 1.1rem; line-height: 1; cursor: pointer;
}
.hours-range__rm:hover { color: var(--adm-danger); border-color: color-mix(in srgb, var(--adm-danger) 40%, var(--adm-border)); }
.hours-day__closed { color: var(--adm-text-subtle); font-size: 0.82rem; font-style: italic; }
.hours-day__actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.hours-day__add, .hours-day__copy {
  background: none; border: none; cursor: pointer; padding: 0.15rem 0;
  font: inherit; font-size: 0.78rem;
}
.hours-day__add { color: var(--adm-accent); font-weight: 600; }
.hours-day__copy { color: var(--adm-text-subtle); }
.hours-day__copy:hover { color: var(--adm-text-muted); }
@media (max-width: 560px) {
  .hours-range { flex-wrap: wrap; }
  .hours-range :deep(.tp) { width: 7rem; }
}

.save-bar { display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0 1.25rem; }

.adm-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.adm-table th, .adm-table td { text-align: left; padding: 0.55rem 0.5rem; border-bottom: 1px solid var(--adm-border); vertical-align: top; }
.adm-table th { color: var(--adm-text-subtle); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
.order-actions { display: flex; flex-direction: column; gap: 0.25rem; }

.ord-import { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin: 0.4rem 0 0.9rem; }
.ord-import__hint { font-size: 0.78rem; }
.ord-import__status { margin: 0; }
</style>
