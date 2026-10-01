/**
 * What the premium storefront sections talk to: the real platform API on
 * provisioned sites, or the in-browser demo data layer on template demos.
 * Admin/auth methods always pass through to the real client — demo mode
 * only intercepts the public commerce surface.
 */
import { contentClient } from './contentClient'
import { demoClient } from './demoClient'
import { DEMO_MODE } from './config'

export const apiClient: typeof contentClient = DEMO_MODE
  ? { ...contentClient, ...demoClient }
  : contentClient
