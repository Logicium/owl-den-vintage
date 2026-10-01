/**
 * Cookieless pageview beacon for deployed sites.
 *
 * Fires one lightweight `sendBeacon` per navigation to the platform's
 * `/collect` endpoint. No cookies, no localStorage, no identifiers — the
 * server derives a per-day visitor hash from request metadata. Silent and
 * best-effort: analytics must never affect the visitor experience.
 *
 * Only active on provisioned sites (PLATFORM_ENABLED + a resolvable site key
 * + a backend URL). Static template demos and dev send nothing.
 */
import type { Router } from 'vue-router'
import { PLATFORM_ENABLED, PLATFORM_API, PLATFORM_SITE_KEY } from './config'

function send(path: string) {
  if (!PLATFORM_API || !PLATFORM_SITE_KEY) return
  const url = `${PLATFORM_API}/sites/${encodeURIComponent(PLATFORM_SITE_KEY)}/collect`
  const body = JSON.stringify({ path, referrer: document.referrer || undefined })
  try {
    // Beacon survives page unload and never blocks navigation.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else {
      void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
    }
  } catch { /* analytics is never allowed to throw into the app */ }
}

/**
 * Wire pageview tracking to a template's router. Call once at app setup.
 * Records the initial load and every subsequent in-app navigation.
 */
export function installAnalytics(router: Router): void {
  if (!PLATFORM_ENABLED || typeof window === 'undefined') return
  let last = ''
  const record = (path: string) => {
    // Collapse duplicate fires (e.g. redirect chains landing on the same path).
    if (path === last) return
    last = path
    send(path)
  }
  // Fire after each successful navigation (covers the initial load too).
  router.afterEach((to) => { record(to.path) })
}
