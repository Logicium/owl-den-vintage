<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentClient, type PaymentsStatusDTO } from '../../platform/contentClient'

const route = useRoute()
const router = useRouter()

const status = ref<PaymentsStatusDTO | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const connecting = ref(false)
const linkingBank = ref(false)
const bankMsg = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    status.value = await contentClient.getPaymentsStatus()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function connect() {
  connecting.value = true
  error.value = null
  try {
    const { url } = await contentClient.connectPayments()
    window.location.href = url
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    connecting.value = false
  }
}

// ── Plaid Link ──
const PLAID_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
type PlaidHandler = { open: () => void; exit: () => void }
interface PlaidGlobal {
  create(opts: {
    token: string
    onSuccess: (publicToken: string, metadata: { accounts?: Array<{ id: string }> }) => void
    onExit?: (err: unknown) => void
  }): PlaidHandler
}
function loadPlaidScript(): Promise<PlaidGlobal> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { Plaid?: PlaidGlobal }
    if (w.Plaid) return resolve(w.Plaid)
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PLAID_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => w.Plaid ? resolve(w.Plaid) : reject(new Error('Plaid failed to load')))
      return
    }
    const s = document.createElement('script')
    s.src = PLAID_SRC
    s.onload = () => (window as unknown as { Plaid?: PlaidGlobal }).Plaid
      ? resolve((window as unknown as { Plaid: PlaidGlobal }).Plaid)
      : reject(new Error('Plaid failed to load'))
    s.onerror = () => reject(new Error('Could not load Plaid'))
    document.head.appendChild(s)
  })
}

async function linkBank() {
  linkingBank.value = true
  error.value = null
  bankMsg.value = null
  try {
    const [{ linkToken }, Plaid] = await Promise.all([
      contentClient.createPlaidLinkToken(),
      loadPlaidScript(),
    ])
    const handler = Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken, metadata) => {
        const accountId = metadata.accounts?.[0]?.id
        if (!accountId) { error.value = 'No bank account selected.'; linkingBank.value = false; return }
        try {
          const res = await contentClient.exchangePlaidToken(publicToken, accountId)
          bankMsg.value = `Linked ${res.bank.name}${res.bank.mask ? ` ••${res.bank.mask}` : ''}.`
          await load()
        } catch (e) {
          error.value = e instanceof Error ? e.message : String(e)
        } finally {
          linkingBank.value = false
        }
      },
      onExit: () => { linkingBank.value = false },
    })
    handler.open()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    linkingBank.value = false
  }
}

onMounted(async () => {
  await load()
  // Returning from Stripe onboarding — status was just refreshed by load().
  if (route.query.stripe) {
    const { stripe: _s, ...rest } = route.query
    void router.replace({ query: rest })
  }
})
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow">Setup</span>
        <h1 class="adm-title">Payments</h1>
        <p class="adm-subtitle">Accept payments across all your sites and get paid out to your bank.</p>
      </div>
    </header>

    <p v-if="loading" class="adm-muted">Loading…</p>
    <p v-else-if="error" class="adm-msg-err">{{ error }}</p>

    <template v-else-if="status">
      <div v-if="!status.stripeConfigured" class="adm-card">
        <h3 class="adm-card__title">Payments not available yet</h3>
        <p class="adm-card__sub">The platform operator hasn’t enabled payment processing. Check back soon.</p>
      </div>

      <template v-else>
        <!-- Stripe Connect -->
        <div class="adm-card">
          <div class="pay-row">
            <div>
              <h3 class="adm-card__title">
                Payment account
                <span v-if="status.chargesEnabled" class="pay-badge pay-badge--ok">Active</span>
                <span v-else-if="status.connected" class="pay-badge pay-badge--pending">Incomplete</span>
                <span v-else class="pay-badge">Not started</span>
              </h3>
              <p class="adm-card__sub">
                <template v-if="status.chargesEnabled">
                  You’re ready to accept payments. Orders on any of your sites settle to your connected account.
                </template>
                <template v-else-if="status.connected">
                  You started onboarding but Stripe still needs a few details before you can accept payments.
                </template>
                <template v-else>
                  Connect a Stripe account once — it powers checkout on every site you own, now and in the future.
                </template>
              </p>
            </div>
            <button type="button" class="adm-btn adm-btn--primary" :disabled="connecting" @click="connect">
              {{ connecting ? 'Redirecting…' : status.connected ? 'Continue setup' : 'Connect payments' }}
            </button>
          </div>
          <ul v-if="status.connected" class="pay-checks">
            <li :class="status.detailsSubmitted ? 'is-ok' : 'is-todo'">
              {{ status.detailsSubmitted ? '✓' : '○' }} Business details submitted
            </li>
            <li :class="status.chargesEnabled ? 'is-ok' : 'is-todo'">
              {{ status.chargesEnabled ? '✓' : '○' }} Accepting charges
            </li>
            <li :class="status.payoutsEnabled ? 'is-ok' : 'is-todo'">
              {{ status.payoutsEnabled ? '✓' : '○' }} Payouts enabled
            </li>
          </ul>
        </div>

        <!-- Plaid bank link -->
        <div v-if="status.plaidConfigured" class="adm-card">
          <div class="pay-row">
            <div>
              <h3 class="adm-card__title">Payout bank account</h3>
              <p class="adm-card__sub">
                <template v-if="status.bank">
                  Linked: <strong>{{ status.bank.name }}</strong>
                  <span v-if="status.bank.mask">••{{ status.bank.mask }}</span>
                </template>
                <template v-else>
                  Securely connect your bank with Plaid — we never see your account number.
                </template>
              </p>
            </div>
            <button type="button" class="adm-btn" :disabled="linkingBank" @click="linkBank">
              {{ linkingBank ? 'Opening…' : status.bank ? 'Relink bank' : 'Link bank account' }}
            </button>
          </div>
          <p v-if="bankMsg" class="adm-msg-ok">{{ bankMsg }}</p>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.pay-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.pay-row .adm-btn { flex-shrink: 0; }
.pay-badge {
  display: inline-block; margin-left: 0.5rem;
  padding: 0.1rem 0.5rem; border-radius: 999px;
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  background: color-mix(in srgb, var(--adm-text) 12%, transparent); color: var(--adm-text-muted);
  vertical-align: middle;
}
.pay-badge--ok { background: color-mix(in srgb, #16a34a 20%, transparent); color: #15803d; }
.pay-badge--pending { background: color-mix(in srgb, #d97706 20%, transparent); color: #b45309; }
.pay-checks {
  list-style: none; margin: 1rem 0 0; padding: 0;
  display: grid; gap: 0.35rem; font-size: 0.9rem;
}
.pay-checks .is-ok { color: #15803d; }
.pay-checks .is-todo { color: var(--adm-text-muted); }
</style>
