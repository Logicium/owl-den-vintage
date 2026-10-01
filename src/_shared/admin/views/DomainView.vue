<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { contentClient } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)
const domain = ref('')
const dns = ref<{ instructions: Array<{ type: string; name: string; value: string; note: string }> } | null>(null)
const verifying = ref(false)
const verifyResult = ref<{ ok: boolean; apex: { domain: string; configured: boolean }; www: { domain: string; configured: boolean } } | null>(null)
const error = ref<string | null>(null)

async function loadCurrent() {
  domain.value = ''; dns.value = null; verifyResult.value = null; error.value = null
  if (!siteId.value) return
  try {
    const r = await contentClient.getDomain(siteId.value)
    if (r.domain) domain.value = r.domain
    if (r.dns) dns.value = r.dns
  } catch (e) { error.value = e instanceof Error ? e.message : String(e) }
}
async function request() {
  error.value = null; verifyResult.value = null
  try { dns.value = (await contentClient.requestDomain(siteId.value, domain.value.trim())).dns }
  catch (e) { error.value = e instanceof Error ? e.message : String(e) }
}
async function verify() {
  error.value = null
  verifying.value = true
  try {
    verifyResult.value = await contentClient.verifyDomain(siteId.value)
  } catch (e) {
    verifyResult.value = null
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    verifying.value = false
  }
}
onMounted(loadCurrent)
watch(siteId, loadCurrent)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow">Setup</span>
        <h1 class="adm-title">Domain</h1>
        <p class="adm-subtitle">Point your own domain at this site — we handle the SSL.</p>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <p class="adm-empty__body">Select a site from the header to attach a domain.</p>
    </div>
    <template v-else>
      <div class="adm-card">
        <h3 class="adm-card__title">Attach a domain</h3>
        <p class="adm-card__sub">Use the full hostname — e.g. <code>www.yoursite.com</code>.</p>
        <form class="dn-form" @submit.prevent="request">
          <input v-model="domain" class="adm-input" placeholder="www.yoursite.com" />
          <button type="submit" class="adm-btn adm-btn--primary">Attach domain</button>
        </form>
      </div>

      <div v-if="dns" class="adm-card">
        <h3 class="adm-card__title">DNS records</h3>
        <p class="adm-card__sub">Add these at your registrar, then come back and verify.</p>
        <div class="dn-table-wrap">
          <table class="adm-table dn-table">
            <thead><tr><th>Type</th><th>Name</th><th>Value</th><th>Note</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in dns.instructions" :key="i">
                <td><span class="adm-badge">{{ r.type }}</span></td>
                <td class="dn-mono">{{ r.name }}</td>
                <td class="dn-mono">{{ r.value }}</td>
                <td class="adm-muted">{{ r.note }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button type="button" class="adm-btn adm-btn--primary" :disabled="verifying" @click="verify">
          {{ verifying ? 'Checking DNS…' : 'I’ve added the records — verify' }}
        </button>
        <template v-if="verifyResult">
          <p v-if="verifyResult.ok" class="adm-msg-ok">
            Domain connected — DNS looks correct. SSL is issued automatically; your site should be live on {{ verifyResult.apex.domain }} within a few minutes.
          </p>
          <div v-else class="dn-status">
            <p class="adm-msg-err">DNS isn’t resolving to your site yet. Records can take up to an hour to propagate — check again later.</p>
            <ul class="dn-status__list">
              <li :class="verifyResult.apex.configured ? 'is-ok' : 'is-bad'">
                {{ verifyResult.apex.configured ? '✓' : '✗' }} {{ verifyResult.apex.domain }} — {{ verifyResult.apex.configured ? 'configured' : 'A record not detected' }}
              </li>
              <li :class="verifyResult.www.configured ? 'is-ok' : 'is-bad'">
                {{ verifyResult.www.configured ? '✓' : '✗' }} {{ verifyResult.www.domain }} — {{ verifyResult.www.configured ? 'configured' : 'CNAME record not detected' }}
              </li>
            </ul>
          </div>
        </template>
      </div>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
    </template>
  </section>
</template>

<style scoped>
.dn-form { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.dn-form .adm-input { flex: 1; min-width: 220px; }
.dn-table-wrap { overflow-x: auto; margin: 0.4rem 0 1rem; }
.dn-table { min-width: 540px; }
.dn-status { margin-top: 0.75rem; }
.dn-status__list {
  list-style: none; margin: 0.5rem 0 0; padding: 0;
  display: grid; gap: 0.3rem;
  font-family: var(--adm-font-mono); font-size: 0.82rem;
}
.dn-status__list .is-ok { color: var(--adm-accent); }
.dn-status__list .is-bad { color: rgb(185, 28, 28); }
.dn-mono { font-family: var(--adm-font-mono); font-size: 0.82rem; word-break: break-all; }
code { font-family: var(--adm-font-mono); color: var(--adm-accent); }
</style>
