<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentClient, type PaymentProvider, type PaymentsStatusDTO } from '../../platform/contentClient'
import SegmentedInput from '../components/inputs/SegmentedInput.vue'

const route = useRoute()
const router = useRouter()

const status = ref<PaymentsStatusDTO | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const connecting = ref(false)
const connectingSquare = ref(false)
const busy = ref(false)

const PROVIDER_OPTIONS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'square', label: 'Square' },
]

/** Both providers connected: the owner picks which one checkout runs through. */
const canChoose = computed(() => !!status.value?.connected && !!status.value?.square.connected)

const provider = computed({
  get: () => status.value?.provider ?? 'stripe',
  set: (value: string) => { void choose(value as PaymentProvider) },
})

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

async function connectSquare() {
  connectingSquare.value = true
  error.value = null
  try {
    const { url } = await contentClient.connectSquare(window.location.origin)
    window.location.href = url
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    connectingSquare.value = false
  }
}

async function disconnectSquare() {
  if (!window.confirm('Disconnect Square? Checkout on your sites will stop using it.')) return
  busy.value = true
  error.value = null
  try {
    status.value = await contentClient.disconnectSquare()
    notice.value = 'Square disconnected.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

async function choose(next: PaymentProvider) {
  if (!status.value || status.value.provider === next) return
  busy.value = true
  error.value = null
  try {
    status.value = await contentClient.setPaymentProvider(next)
    notice.value = `Checkout now runs through ${next === 'square' ? 'Square' : 'Stripe'}.`
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await load()
  // Returning from Stripe onboarding or the Square OAuth round-trip: status
  // was just refreshed by load(); surface the outcome and clean the URL.
  const { stripe: _s, square, detail, ...rest } = route.query
  if (square === 'connected') notice.value = 'Square connected.'
  if (square === 'error') error.value = typeof detail === 'string' && detail ? detail : 'Square connection failed.'
  if (_s !== undefined || square !== undefined) void router.replace({ query: rest })
})
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow">Setup</span>
        <h1 class="adm-title">Payments</h1>
        <p class="adm-subtitle">Accept payments across all your sites with Stripe or Square. Connect once; every site you own uses it.</p>
      </div>
    </header>

    <p v-if="loading" class="adm-muted">Loading…</p>
    <p v-if="error" class="adm-msg-err">{{ error }}</p>
    <p v-if="notice" class="adm-msg-ok">{{ notice }}</p>

    <template v-if="!loading && status">
      <div v-if="!status.stripeConfigured && !status.squareConfigured" class="adm-card">
        <h3 class="adm-card__title">Payments not available yet</h3>
        <p class="adm-card__sub">The platform operator hasn’t enabled payment processing. Check back soon.</p>
      </div>

      <template v-else>
        <!-- Provider chooser: only meaningful once both are connected -->
        <div v-if="canChoose" class="adm-card">
          <div class="pay-row">
            <div>
              <h3 class="adm-card__title">Checkout runs through</h3>
              <p class="adm-card__sub">Both accounts are connected. New orders on every site are charged through the one you pick here.</p>
            </div>
            <SegmentedInput v-model="provider" :options="PROVIDER_OPTIONS" />
          </div>
        </div>

        <!-- Stripe Connect -->
        <div v-if="status.stripeConfigured" class="adm-card">
          <div class="pay-row">
            <div>
              <h3 class="adm-card__title">
                Stripe
                <span v-if="status.chargesEnabled" class="pay-badge pay-badge--ok">Active</span>
                <span v-else-if="status.connected" class="pay-badge pay-badge--pending">Incomplete</span>
                <span v-else class="pay-badge">Not connected</span>
                <span v-if="canChoose && status.provider === 'stripe'" class="pay-badge pay-badge--use">In use</span>
              </h3>
              <p class="adm-card__sub">
                <template v-if="status.chargesEnabled">
                  You’re ready to accept payments. Orders on any of your sites settle to your Stripe account.
                </template>
                <template v-else-if="status.connected">
                  You started onboarding but Stripe still needs a few details before you can accept payments.
                </template>
                <template v-else>
                  Set up a Stripe account for your business. Stripe collects your details and payout bank during setup.
                </template>
              </p>
            </div>
            <button type="button" class="adm-btn" :class="{ 'adm-btn--primary': !status.square.connected }" :disabled="connecting" @click="connect">
              {{ connecting ? 'Redirecting…' : status.connected ? 'Continue setup' : 'Connect Stripe' }}
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
          <p v-if="status.connected" class="pay-foot">
            <template v-if="status.payoutsEnabled">Your bank account is on file with Stripe. Payouts, refunds and disputes are managed in your Stripe dashboard.</template>
            <template v-else>Your payout bank account is entered during Stripe setup. Once Stripe verifies it, payouts switch on here.</template>
            <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener">Open Stripe dashboard</a>
          </p>
        </div>

        <!-- Square -->
        <div v-if="status.squareConfigured" class="adm-card">
          <div class="pay-row">
            <div>
              <h3 class="adm-card__title">
                Square
                <span v-if="status.square.needsReconnect" class="pay-badge pay-badge--pending">Reconnect needed</span>
                <span v-else-if="status.square.connected" class="pay-badge pay-badge--ok">Connected</span>
                <span v-else class="pay-badge">Not connected</span>
                <span v-if="canChoose && status.provider === 'square'" class="pay-badge pay-badge--use">In use</span>
              </h3>
              <p class="adm-card__sub">
                <template v-if="status.square.needsReconnect">
                  Square stopped accepting our connection to <strong>{{ status.square.merchantName || 'your account' }}</strong>. Reconnect to keep taking online orders.
                </template>
                <template v-else-if="status.square.connected">
                  Connected to <strong>{{ status.square.merchantName || 'your Square account' }}</strong>. Online orders appear in Square Orders and settle into your Square balance; payouts, refunds and disputes stay in your Square dashboard.
                </template>
                <template v-else>
                  Already run your business on Square? Connect it and online orders are charged through your existing Square account.
                </template>
              </p>
            </div>
            <div class="pay-actions">
              <button
                type="button"
                class="adm-btn"
                :class="{ 'adm-btn--primary': !status.connected && !status.square.connected }"
                :disabled="connectingSquare || busy"
                @click="connectSquare"
              >
                {{ connectingSquare ? 'Redirecting…' : status.square.connected ? 'Reconnect' : 'Connect Square' }}
              </button>
              <button v-if="status.square.connected" type="button" class="adm-btn adm-btn--ghost" :disabled="busy" @click="disconnectSquare">
                Disconnect
              </button>
            </div>
          </div>
          <p v-if="status.square.connected" class="pay-foot">
            Refunds, payouts and disputes live in Square.
            <a href="https://squareup.com/dashboard/" target="_blank" rel="noopener">Open Square dashboard</a>
          </p>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.pay-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.pay-row .adm-btn { flex-shrink: 0; }
.pay-actions { display: flex; gap: 0.5rem; flex-shrink: 0; flex-wrap: wrap; }
.pay-badge {
  display: inline-block; margin-left: 0.5rem;
  padding: 0.1rem 0.5rem; border-radius: 999px;
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  background: color-mix(in srgb, var(--adm-text) 12%, transparent); color: var(--adm-text-muted);
  vertical-align: middle;
}
.pay-badge--ok { background: color-mix(in srgb, #16a34a 20%, transparent); color: #15803d; }
.pay-badge--pending { background: color-mix(in srgb, #d97706 20%, transparent); color: #b45309; }
.pay-badge--use { background: color-mix(in srgb, var(--adm-accent) 18%, transparent); color: var(--adm-accent-deep); }
.pay-checks {
  list-style: none; margin: 1rem 0 0; padding: 0;
  display: grid; gap: 0.35rem; font-size: 0.9rem;
}
.pay-checks .is-ok { color: #15803d; }
.pay-checks .is-todo { color: var(--adm-text-muted); }
.pay-foot { margin: 0.9rem 0 0; font-size: 0.85rem; color: var(--adm-text-muted); }
.pay-foot a { margin-left: 0.4rem; color: var(--adm-accent-deep); text-decoration: underline; text-underline-offset: 2px; }
</style>
