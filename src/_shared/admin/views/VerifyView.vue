<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAdminAuthStore } from '../../platform/adminAuthStore'
import { contentClient } from '../../platform/contentClient'

const route = useRoute()
const router = useRouter()
const auth = useAdminAuthStore()
const state = ref<'verifying' | 'ok' | 'fail'>('verifying')
const message = ref('')

onMounted(async () => {
  const token = String(route.query.token || '')
  if (!token) { state.value = 'fail'; message.value = 'Missing token'; return }
  try {
    // verifyMagicToken calls /auth/callback, gets the session token in the
    // response body, and stores it in localStorage for all subsequent requests.
    await contentClient.verifyMagicToken(token)
    await auth.refresh()
    state.value = 'ok'
    setTimeout(() => router.replace('/admin'), 500)
  } catch (e) {
    state.value = 'fail'
    message.value = e instanceof Error ? e.message : String(e)
  }
})
</script>

<template>
  <section class="verify adm-page">
    <div class="adm-card verify__card">
      <template v-if="state === 'verifying'">
        <span class="adm-eyebrow">One moment</span>
        <h1 class="adm-title verify__title">Verifying your link…</h1>
      </template>
      <template v-else-if="state === 'ok'">
        <span class="adm-eyebrow">Welcome back</span>
        <h1 class="adm-title verify__title">Signed in</h1>
        <p class="adm-subtitle">Redirecting to your dashboard…</p>
      </template>
      <template v-else>
        <span class="adm-eyebrow">Trouble signing in</span>
        <h1 class="adm-title verify__title">That link didn’t work</h1>
        <p class="adm-msg-err verify__msg">{{ message }}</p>
        <RouterLink to="/admin/login" class="adm-btn adm-btn--primary verify__btn">Back to sign in</RouterLink>
      </template>
    </div>
  </section>
</template>

<style scoped>
.verify { display: flex; align-items: flex-start; justify-content: center; padding-top: 4rem; }
.verify__card { max-width: 440px; width: 100%; padding: 2rem 2.1rem; text-align: center; }
.verify__title { margin-top: 0.4rem; }
.verify__msg { margin-top: 0.6rem; }
.verify__btn { margin-top: 1rem; display: inline-flex; }
</style>
