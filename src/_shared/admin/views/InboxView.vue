<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { contentClient } from '../../platform/contentClient'
import { useActiveSiteStore } from '../../platform/activeSiteStore'

const activeSites = useActiveSiteStore()
const siteId = computed(() => activeSites.activeId)
const items = ref<Awaited<ReturnType<typeof contentClient.listSubmissions>>>([])
const error = ref<string | null>(null)

async function load() {
  if (!siteId.value) { items.value = []; return }
  try { items.value = await contentClient.listSubmissions(siteId.value) }
  catch (e) { error.value = e instanceof Error ? e.message : String(e) }
}
async function markRead(id: string) {
  await contentClient.markSubmissionRead(siteId.value, id)
  await load()
}

onMounted(load)
watch(siteId, load)
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div>
        <span class="adm-eyebrow">Submissions</span>
        <h1 class="adm-title">Inbox</h1>
        <p class="adm-subtitle">Every form submission across this site, newest first.</p>
      </div>
    </header>

    <div v-if="!siteId" class="adm-empty">
      <p class="adm-empty__body">Select a site from the header to view its inbox.</p>
    </div>
    <template v-else>
      <p v-if="error" class="adm-msg-err">{{ error }}</p>
      <div v-if="!items.length" class="adm-empty">
        <p class="adm-empty__body">No submissions yet.</p>
      </div>
      <ul v-else class="inbox">
        <li v-for="m in items" :key="m.id" class="adm-card inbox-item" :class="{ 'is-unread': !m.readAt }">
          <header class="inbox-item__head">
            <span class="adm-badge" :class="!m.readAt ? 'adm-badge--info' : ''">{{ m.type }}</span>
            <time class="adm-muted">{{ new Date(m.createdAt).toLocaleString() }}</time>
            <button
              v-if="!m.readAt"
              type="button"
              class="adm-btn adm-btn--ghost adm-btn--sm"
              @click="markRead(m.id)"
            >Mark read</button>
          </header>
          <dl class="inbox-item__body">
            <template v-for="(v, k) in m.payload" :key="k">
              <dt>{{ k }}</dt><dd>{{ v }}</dd>
            </template>
          </dl>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.inbox { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.inbox-item { padding: 1rem 1.1rem; }
.inbox-item.is-unread { border-color: color-mix(in srgb, var(--adm-info) 55%, var(--adm-border)); }
.inbox-item__head { display: flex; gap: 0.85rem; align-items: center; margin-bottom: 0.6rem; }
.inbox-item__head time { flex: 1; font-size: 0.8rem; }
.inbox-item__body { display: grid; grid-template-columns: max-content 1fr; gap: 0.3rem 1rem; margin: 0; font-size: 0.9rem; }
.inbox-item__body dt { color: var(--adm-text-subtle); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.7rem; padding-top: 0.15rem; }
.inbox-item__body dd { color: var(--adm-text); margin: 0; word-break: break-word; }
</style>
