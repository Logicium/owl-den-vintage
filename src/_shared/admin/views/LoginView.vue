<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { contentClient } from '../../platform/contentClient'
import { useAdminAuthStore } from '../../platform/adminAuthStore'

type Mode = 'login' | 'register' | 'magic'
const mode = ref<Mode>('login')
const email = ref('')
const password = ref('')
const name = ref('')
const sent = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)

const auth = useAdminAuthStore()
const router = useRouter()

async function submit() {
  error.value = null
  busy.value = true
  try {
    if (mode.value === 'magic') {
      await contentClient.requestMagicLink(email.value.trim())
      sent.value = true
    } else if (mode.value === 'login') {
      await contentClient.passwordLogin(email.value.trim(), password.value)
      await auth.refresh()
      router.replace('/admin')
    } else {
      await contentClient.passwordRegister(email.value.trim(), password.value, name.value || undefined)
      await auth.refresh()
      router.replace('/admin')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="login adm-page">
    <div class="adm-card login__card">
      <header class="login__head">
        <span class="adm-eyebrow">Apotome</span>
        <h1 class="adm-title login__title">Sign in</h1>
        <p class="adm-subtitle">Manage your sites, content, and reviews.</p>
      </header>

      <nav class="login__tabs" role="tablist">
        <button type="button" :class="{ 'is-active': mode === 'login' }" @click="mode = 'login'">Password</button>
        <button type="button" :class="{ 'is-active': mode === 'register' }" @click="mode = 'register'">Create account</button>
        <button type="button" :class="{ 'is-active': mode === 'magic' }" @click="mode = 'magic'">Email link</button>
      </nav>

      <form v-if="mode !== 'magic' || !sent" class="login__form" @submit.prevent="submit">
        <label class="adm-label">
          Email
          <input v-model="email" class="adm-input" type="email" required placeholder="you@example.com" autocomplete="email" />
        </label>
        <label v-if="mode === 'register'" class="adm-label">
          Name <span class="adm-subtle">(optional)</span>
          <input v-model="name" class="adm-input" type="text" autocomplete="name" />
        </label>
        <label v-if="mode !== 'magic'" class="adm-label">
          Password
          <input
            v-model="password"
            class="adm-input"
            type="password"
            required
            minlength="8"
            placeholder="Min 8 characters"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
          />
        </label>
        <button type="submit" class="adm-btn adm-btn--primary" :disabled="busy">
          {{ busy ? 'Working…' : mode === 'magic' ? 'Email me a link' : mode === 'register' ? 'Create account' : 'Sign in' }}
        </button>
        <p v-if="error" class="adm-msg-err">{{ error }}</p>
      </form>
      <p v-else class="adm-msg-ok login__sent">
        Check <strong>{{ email }}</strong> for your sign-in link.
      </p>
    </div>
  </section>
</template>

<style scoped>
.login { display: flex; align-items: flex-start; justify-content: center; min-height: 60vh; padding-top: 3rem; }
.login__card { max-width: 440px; width: 100%; padding: 2rem 2.1rem; }
.login__head { margin-bottom: 1.25rem; }
.login__title { margin-top: 0.3rem; }
.login__tabs {
  display: flex; gap: 0;
  margin: 1rem 0 1.25rem;
  border-bottom: 1px solid var(--adm-border);
}
.login__tabs button {
  flex: 1; padding: 0.55rem 0.4rem;
  background: transparent; border: 0;
  border-bottom: 2px solid transparent;
  color: var(--adm-text-muted);
  cursor: pointer; font: inherit;
  font-size: 0.85rem; letter-spacing: 0.04em;
  transition: color 140ms ease, border-color 140ms ease;
}
.login__tabs button.is-active {
  color: var(--adm-text);
  border-bottom-color: var(--adm-accent);
}
.login__form { display: flex; flex-direction: column; gap: 0.85rem; }
.login__sent { margin-top: 1rem; }
</style>
