/**
 * Shared Vue app bootstrap. Each template's `main.ts` calls `bootstrap()` with
 * its own `App`, `router`, and build-time `siteConfig`.
 */
import { createApp, type Component } from 'vue'
import { createPinia } from 'pinia'
import type { Router } from 'vue-router'
import { PLATFORM_ENABLED } from './platform/config'
import { useSiteContentStore } from './platform/siteContentStore'

export interface BootstrapOptions {
  App: Component
  router: Router
  /** Build-time siteConfig used as the fallback / initial value of the content store. */
  buildTimeConfig?: unknown
  /** Mount selector. Defaults to `#app`. */
  mount?: string
}

export async function bootstrap(opts: BootstrapOptions) {
  const app = createApp(opts.App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(opts.router)

  const store = useSiteContentStore(pinia)
  if (opts.buildTimeConfig !== undefined) store.setBuildTimeConfig(opts.buildTimeConfig)

  if (PLATFORM_ENABLED) {
    try { await store.hydrate() } catch { /* fall back to build-time config */ }
  }

  app.mount(opts.mount ?? '#app')
}
