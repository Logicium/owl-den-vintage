<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '../../platform/adminAuthStore'
import { contentClient } from '../../platform/contentClient'
import { usePreferences } from '../../composables/usePreferences'

const auth = useAdminAuthStore()
const router = useRouter()
const { state: prefs, setThemePickerVisibility } = usePreferences()

const newPassword = ref('')
const confirmPassword = ref('')
const pwBusy = ref(false)
const pwMsg = ref<string | null>(null)
const pwErr = ref<string | null>(null)

async function savePassword() {
  pwMsg.value = null; pwErr.value = null
  if (newPassword.value.length < 8) { pwErr.value = 'Password must be at least 8 characters.'; return }
  if (newPassword.value !== confirmPassword.value) { pwErr.value = 'Passwords don\u2019t match.'; return }
  pwBusy.value = true
  try {
    await contentClient.setPassword(newPassword.value)
    pwMsg.value = 'Password updated.'
    newPassword.value = ''; confirmPassword.value = ''
    await auth.refresh()
  } catch (e) {
    pwErr.value = e instanceof Error ? e.message : String(e)
  } finally {
    pwBusy.value = false
  }
}

async function doLogout() {
  await auth.logout()
  router.push('/admin/login')
}

// ── Danger zone: safe self-service account + data deletion ──
const delOpen = ref(false)
const delConfirm = ref('')
const delBusy = ref(false)
const delErr = ref<string | null>(null)
const delDone = ref<string | null>(null)
const CONFIRM_WORD = 'DELETE'

async function deleteAccount() {
  delErr.value = null
  if (delConfirm.value.trim().toUpperCase() !== CONFIRM_WORD) {
    delErr.value = `Type ${CONFIRM_WORD} to confirm.`
    return
  }
  delBusy.value = true
  try {
    const r = await contentClient.requestAccountDeletion()
    delDone.value = `Your account is scheduled for deletion. ${r.sitesAffected} site${r.sitesAffected === 1 ? '' : 's'} taken offline and disconnected. All data is permanently removed within ${r.purgeWithinDays} days. Signing you out…`
    setTimeout(async () => { await auth.logout(); router.push('/admin/login') }, 4000)
  } catch (e) {
    delErr.value = e instanceof Error ? e.message : String(e)
  } finally {
    delBusy.value = false
  }
}
</script>

<template>
  <section class="adm-page">
    <header class="adm-page__head">
      <div class="adm-page__title-block">
        <span class="adm-eyebrow">You</span>
        <h1 class="adm-title">Account</h1>
        <p class="adm-subtitle">Manage your sign-in details and session.</p>
      </div>
    </header>

    <div v-if="!auth.owner" class="adm-empty">
      <p class="adm-empty__body">You aren\u2019t signed in.</p>
    </div>

    <template v-else>
      <div class="acct-grid">
        <div class="adm-card">
          <h3 class="adm-card__title">Profile</h3>
          <p class="adm-card__sub">These are the details we use to sign you in and contact you.</p>
          <dl class="acct-list">
            <div>
              <dt>Email</dt>
              <dd>{{ auth.owner.email }}</dd>
            </div>
            <div v-if="auth.owner.name">
              <dt>Name</dt>
              <dd>{{ auth.owner.name }}</dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd class="acct-mono">{{ auth.owner.id }}</dd>
            </div>
          </dl>
        </div>

        <div class="adm-card">
          <h3 class="adm-card__title">
            {{ auth.owner.hasPassword ? 'Change password' : 'Set a password' }}
          </h3>
          <p class="adm-card__sub">
            {{
              auth.owner.hasPassword
                ? 'Pick a new password \u2014 at least 8 characters.'
                : 'You currently sign in with a magic link. Add a password for faster access.'
            }}
          </p>
          <form class="acct-form" @submit.prevent="savePassword">
            <label class="adm-label">
              New password
              <input
                v-model="newPassword"
                type="password"
                minlength="8"
                autocomplete="new-password"
                class="adm-input"
                required
              />
            </label>
            <label class="adm-label">
              Confirm
              <input
                v-model="confirmPassword"
                type="password"
                minlength="8"
                autocomplete="new-password"
                class="adm-input"
                required
              />
            </label>
            <button type="submit" class="adm-btn adm-btn--primary" :disabled="pwBusy">
              {{ pwBusy ? 'Saving\u2026' : 'Save password' }}
            </button>
            <p v-if="pwMsg" class="adm-msg-ok">{{ pwMsg }}</p>
            <p v-if="pwErr" class="adm-msg-err">{{ pwErr }}</p>
          </form>
        </div>

        <div class="adm-card">
          <h3 class="adm-card__title">Session</h3>
          <p class="adm-card__sub">Sign out of this browser. Other devices stay signed in.</p>
          <button type="button" class="adm-btn adm-btn--danger" @click="doLogout">Sign out</button>
        </div>

        <div class="adm-card">
          <h3 class="adm-card__title">Theme picker</h3>
          <p class="adm-card__sub">
            The floating theme picker lets you tune your site's colors and styles.
            By default it shows when you're signed in. You can override that here.
          </p>
          <div class="acct-radios">
            <label class="acct-radio">
              <input
                type="radio"
                name="theme-picker-visible"
                value="auto"
                :checked="prefs.themePickerVisible === 'auto'"
                @change="setThemePickerVisibility('auto')"
              />
              <span><strong>Auto</strong> — show only when signed in (recommended)</span>
            </label>
            <label class="acct-radio">
              <input
                type="radio"
                name="theme-picker-visible"
                value="on"
                :checked="prefs.themePickerVisible === 'on'"
                @change="setThemePickerVisibility('on')"
              />
              <span><strong>Always show</strong></span>
            </label>
            <label class="acct-radio">
              <input
                type="radio"
                name="theme-picker-visible"
                value="off"
                :checked="prefs.themePickerVisible === 'off'"
                @change="setThemePickerVisibility('off')"
              />
              <span><strong>Always hide</strong></span>
            </label>
          </div>
        </div>

        <div class="adm-card">
          <h3 class="adm-card__title">Support</h3>
          <p class="adm-card__sub">Need help? We're here.</p>
          <ul class="acct-support">
            <li>
              <span class="acct-support__label">Email us</span>
              <a href="mailto:kisora@apotomelabs.com" class="acct-support__link">kisora@apotomelabs.com</a>
            </li>
            <li>
              <span class="acct-support__label">Report a bug</span>
              <a
                href="mailto:kisora@apotomelabs.com?subject=Bug%20Report&body=Describe%20the%20bug%20and%20steps%20to%20reproduce%3A"
                class="acct-support__link"
              >Submit a bug report</a>
            </li>
            <li>
              <span class="acct-support__label">Request a feature</span>
              <a
                href="mailto:kisora@apotomelabs.com?subject=Feature%20Request&body=Describe%20the%20feature%20you%27d%20like%3A"
                class="acct-support__link"
              >Submit a feature request</a>
            </li>
          </ul>
        </div>
      </div>

      <!-- ── Danger zone: delete account & data ── -->
      <div class="adm-card acct-danger">
        <h3 class="adm-card__title acct-danger__title">Delete account &amp; data</h3>
        <p class="adm-card__sub">
          Permanently deletes your account and everything tied to it — sites,
          content, orders, and any connected Instagram or Google data. Your
          sites go offline immediately; all data is erased within 30 days. This
          can't be undone once the purge completes. See our
          <RouterLink to="/data-deletion" class="acct-support__link">data deletion policy</RouterLink>.
        </p>

        <template v-if="!delDone">
          <button v-if="!delOpen" type="button" class="adm-btn adm-btn--danger" @click="delOpen = true">
            Delete my account
          </button>
          <div v-else class="acct-danger__confirm">
            <label class="adm-label">
              Type <strong>DELETE</strong> to confirm
              <input v-model="delConfirm" type="text" class="adm-input" placeholder="DELETE" autocomplete="off" />
            </label>
            <div class="acct-danger__actions">
              <button type="button" class="adm-btn adm-btn--danger" :disabled="delBusy" @click="deleteAccount">
                {{ delBusy ? 'Deleting…' : 'Permanently delete' }}
              </button>
              <button type="button" class="adm-btn" :disabled="delBusy" @click="delOpen = false; delConfirm = ''; delErr = null">
                Cancel
              </button>
            </div>
            <p v-if="delErr" class="adm-msg-err">{{ delErr }}</p>
          </div>
        </template>
        <p v-else class="adm-msg-ok">{{ delDone }}</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.acct-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
}
.acct-list {
  display: flex; flex-direction: column; gap: 0.6rem; margin: 0;
}
.acct-list > div { display: flex; flex-direction: column; gap: 0.15rem; }
.acct-list dt {
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--adm-text-subtle);
}
.acct-list dd { margin: 0; color: var(--adm-text); font-size: 0.9rem; word-break: break-all; }
.acct-mono { font-family: var(--adm-font-mono); font-size: 0.78rem; }
.acct-form { display: flex; flex-direction: column; gap: 0.75rem; }
.acct-radios { display: flex; flex-direction: column; gap: 0.5rem; }
.acct-radio { display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer; font-size: 0.88rem; }
.acct-radio input { margin-top: 0.15rem; }
.acct-support {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0;
}
.acct-support li {
  display: flex; flex-direction: column; gap: 0.1rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--adm-border);
}
.acct-support li:last-child { border-bottom: 0; padding-bottom: 0; }
.acct-support__label {
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--adm-text-subtle);
}
.acct-support__link {
  font-size: 0.9rem;
  color: var(--adm-accent);
  text-decoration: none;
}
.acct-support__link:hover { text-decoration: underline; }

/* Danger zone */
.acct-danger {
  margin-top: 1.25rem;
  border-color: color-mix(in srgb, var(--adm-danger) 40%, var(--adm-border));
}
.acct-danger__title { color: var(--adm-danger); }
.acct-danger__confirm { display: flex; flex-direction: column; gap: 0.75rem; max-width: 360px; }
.acct-danger__actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
</style>
