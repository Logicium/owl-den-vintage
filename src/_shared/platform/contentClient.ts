/**
 * Thin fetch wrapper around the archetype-service API.
 * Sends credentials (cookie session for admin endpoints); throws on non-2xx.
 */
import { PLATFORM_API, PLATFORM_SITE_KEY } from './config'

export type GooglePlacePreview = {
  placeId: string
  name: string
  address: string
  rating: number | null
  totalRatings: number | null
  url: string | null
  reviews: Array<{ author: string; rating: number; text: string; time: number; relativeTime: string }>
}

const SESSION_KEY = 'archetype_session'
export function getStoredToken(): string | null { try { return localStorage.getItem(SESSION_KEY) } catch { return null } }
export function storeSessionToken(t: string) { try { localStorage.setItem(SESSION_KEY, t) } catch {} }
export function clearSessionToken() { try { localStorage.removeItem(SESSION_KEY) } catch {} }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!PLATFORM_API) throw new Error('VITE_CONTENT_API not configured')
  const token = getStoredToken()
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${PLATFORM_API}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${method} ${path} ${res.status}: ${text}`)
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>)
}

export const contentClient = {
  // --- Public (no auth) ---
  fetchContent: () =>
    request<{ slug: string; archetype: string; plan: string; addOns?: string[]; content: Record<string, unknown> }>(
      'GET',
      `/sites/${encodeURIComponent(PLATFORM_SITE_KEY)}/content`,
    ),
  fetchReviews: () =>
    request<{ rating: number; author: string; text: string; source: string }[]>(
      'GET',
      `/sites/${encodeURIComponent(PLATFORM_SITE_KEY)}/reviews`,
    ).catch(() => [] as Array<{ rating: number; author: string; text: string; source: string }>),
  fetchInstagram: () =>
    request<{ media: InstagramMediaDTO[] }>(
      'GET',
      `/sites/${encodeURIComponent(PLATFORM_SITE_KEY)}/instagram`,
    ).catch(() => ({ media: [] })),
  /** Same feed, for an explicit site id/slug (admin preview). Cache-busted so
      a just-connected account shows immediately despite the 15-min public cache. */
  fetchInstagramFor: (key: string) =>
    request<{ media: InstagramMediaDTO[] }>(
      'GET',
      `/sites/${encodeURIComponent(key)}/instagram?ts=${Date.now()}`,
    ),
  submitForm: (type: 'contact' | 'newsletter', fields: Record<string, string>, captcha?: string) =>
    request<{ ok: true }>('POST', `/sites/${encodeURIComponent(PLATFORM_SITE_KEY)}/submissions`, {
      type,
      fields,
      captcha,
      hp: '',
    }),

  // --- Auth ---
  requestMagicLink: (email: string, name?: string) =>
    request<{ ok: true }>('POST', `/auth/request-link`, { email, name }),
  verifyMagicToken: async (token: string) => {
    const data = await request<{ ok: true; sessionToken: string; owner: { id: string; email: string; name?: string } }>('GET', `/auth/callback?token=${encodeURIComponent(token)}`)
    if (data.sessionToken) storeSessionToken(data.sessionToken)
    return data
  },
  passwordRegister: async (email: string, password: string, name?: string) => {
    const data = await request<{ ok: true; sessionToken: string; owner: { id: string; email: string; name?: string } }>('POST', `/auth/register`, { email, password, name })
    if (data.sessionToken) storeSessionToken(data.sessionToken)
    return data
  },
  passwordLogin: async (email: string, password: string) => {
    const data = await request<{ ok: true; sessionToken: string; owner: { id: string; email: string; name?: string } }>('POST', `/auth/login`, { email, password })
    if (data.sessionToken) storeSessionToken(data.sessionToken)
    return data
  },
  setPassword: (password: string) =>
    request<{ ok: true }>('POST', `/auth/set-password`, { password }),
  /** Owner-initiated deletion of their account + all data. Takes sites offline
      and disconnects third-party integrations immediately; final purge follows. */
  requestAccountDeletion: () =>
    request<{ ok: true; sitesAffected: number; purgeWithinDays: number }>('POST', `/admin/account/deletion-request`),
  me: () => request<{ owner: { id: string; email: string; name?: string; hasPassword?: boolean } }>('GET', '/auth/me'),
  logout: async () => {
    clearSessionToken()
    return request<{ ok: true }>('POST', '/auth/logout')
  },

  // --- Admin ---
  listSites: (opts: { includeDeactivated?: boolean } = {}) => request<Array<{ id: string; slug: string; displayName: string | null; archetype: string; status: string; productionUrl?: string; customDomain?: string; deactivatedAt?: string | null; screenshotUrl?: string | null; screenshotCapturedAt?: string | null; addOns?: string[]; plan?: string; templateCommitSha?: string | null; lastDeployedAt?: string | null }>>('GET', `/admin/sites${opts.includeDeactivated ? '?includeDeactivated=1' : ''}`),
  renameSite: (siteId: string, displayName: string) => request<{ id: string; displayName: string | null }>('PUT', `/admin/sites/${siteId}`, { displayName }),
  deactivateSite: (siteId: string) => request<{ id: string; deactivatedAt: string }>('POST', `/admin/sites/${siteId}/deactivate`),
  activateSite: (siteId: string) => request<{ id: string; deactivatedAt: string | null }>('POST', `/admin/sites/${siteId}/activate`),
  getDraft: (siteId: string) => request<{ version: number; published: boolean; payload: Record<string, unknown> }>('GET', `/admin/sites/${siteId}/content/draft`),
  saveDraft: (siteId: string, payload: Record<string, unknown>) => request<{ version: number; published: boolean }>('PUT', `/admin/sites/${siteId}/content/draft`, { payload }),
  publish: (siteId: string, payload?: Record<string, unknown>) => request<{ version: number; publishedAt: string }>('POST', `/admin/sites/${siteId}/content/publish`, { payload }),
  listVersions: (siteId: string) => request<Array<{ version: number; published: boolean; publishedAt?: string; createdAt: string; changes?: { paths: string[]; count: number } }>>('GET', `/admin/sites/${siteId}/content/versions`),
  restoreVersion: (siteId: string, version: number) => request<{ version: number; publishedAt: string }>('POST', `/admin/sites/${siteId}/content/versions/${version}/restore`),
  uploadMedia: (siteId: string, filename: string, contentType: string, base64: string) => request<{ url: string }>('POST', `/admin/sites/${siteId}/media`, { filename, contentType, base64 }),

  listSubmissions: (siteId: string) => request<Array<{ id: string; type: string; payload: Record<string, string>; readAt?: string; createdAt: string }>>('GET', `/admin/sites/${siteId}/submissions`),
  markSubmissionRead: (siteId: string, subId: string) => request<{ ok: true }>('POST', `/admin/sites/${siteId}/submissions/${subId}/read`),

  /** Checkout for upgrades on an EXISTING site (portfolio plan, photo
      campaigns). Purchases land in the owner's Billing history. */
  createUpgradeCheckout: (siteId: string, items: string[]) =>
    request<{ orderId: string; checkoutUrl: string | null; dryRun?: boolean }>(
      'POST', `/admin/sites/${siteId}/upgrade-checkout`,
      { items, origin: typeof location !== 'undefined' ? location.origin : undefined },
    ),

  /** Google Business Profile onboarding: emails the operator with the
      owner's setup or management request (consent required). */
  submitGbpRequest: (siteId: string, mode: 'setup' | 'manage', fields: Record<string, string>, consent: boolean) =>
    request<{ ok: true }>('POST', `/admin/sites/${siteId}/gbp-request`, { mode, fields, consent }),
  setGooglePlace: (siteId: string, placeId: string) => request<{ ok: true; placeId: string; preview: GooglePlacePreview | null }>('POST', `/admin/sites/${siteId}/google-place`, { placeId }),
  getGooglePlace: (siteId: string) => request<{ placeId: string | null; preview: GooglePlacePreview | null }>('GET', `/admin/sites/${siteId}/google-place`),
  disconnectGooglePlace: (siteId: string) => request<{ ok: true }>('POST', `/admin/sites/${siteId}/google-place/disconnect`),
  searchGooglePlaces: (siteId: string, q: string) => request<{ results: Array<{ placeId: string; name: string; address: string; rating: number | null; totalRatings: number | null }> }>('GET', `/admin/sites/${siteId}/google-places/search?q=${encodeURIComponent(q)}`),
  geocodeAddress: (siteId: string, q: string) => request<{ results: Array<{ placeId: string; address: string }> }>('GET', `/admin/sites/${siteId}/geocode?q=${encodeURIComponent(q)}`),
  listAdminReviews: (siteId: string) => request<Array<{ id: string; rating: number; author: string; text: string; source: string; fetchedAt: string }>>('GET', `/admin/sites/${siteId}/reviews`),

  getInstagramConnect: (siteId: string) => request<{ url: string }>('GET', `/admin/sites/${siteId}/instagram/connect`),
  getInstagramStatus: (siteId: string) => request<{ connected: boolean; expiresAt: string | null }>('GET', `/admin/sites/${siteId}/instagram/status`),
  disconnectInstagram: (siteId: string) => request<{ ok: true }>('POST', `/admin/sites/${siteId}/instagram/disconnect`),

  requestDomain: (siteId: string, domain: string) => request<{ domain: string; dns: DnsInstructionsDTO }>('POST', `/admin/sites/${siteId}/domain`, { domain }),
  verifyDomain: (siteId: string) => request<{
    ok: boolean
    apex: { domain: string; configured: boolean }
    www: { domain: string; configured: boolean }
  }>('POST', `/admin/sites/${siteId}/domain/verify`),
  getDomain: (siteId: string) => request<{ domain?: string; dns?: DnsInstructionsDTO }>('GET', `/admin/sites/${siteId}/domain`),

  getAnalytics: (siteId: string, range: 7 | 30 | 90 = 30) => request<AnalyticsDTO>('GET', `/admin/sites/${siteId}/analytics?range=${range}`),

  // --- Payments (owner-scoped: Stripe Connect + Plaid) ---
  getPaymentsStatus: () => request<PaymentsStatusDTO>('GET', '/admin/payments/status'),
  connectPayments: (returnTo?: string) => request<{ url: string }>('POST', '/admin/payments/connect', { returnTo }),
  createPlaidLinkToken: () => request<{ linkToken: string }>('POST', '/admin/payments/plaid/link-token'),
  exchangePlaidToken: (publicToken: string, accountId: string) =>
    request<{ ok: true; bank: { name: string; mask: string | null } }>('POST', '/admin/payments/plaid/exchange', { publicToken, accountId }),

  generateCopy: (siteId: string, field: string, prompt: string, context?: Record<string, unknown>) =>
    request<{ options: string[] }>('POST', `/admin/sites/${siteId}/ai/copy`, { field, prompt, context }),

  /** Vision: read a photo of a printed menu into structured categories + items (text only). */
  scanMenu: (siteId: string, contentType: string, base64: string) =>
    request<{ categories: Array<{ name: string; description?: string; items: Array<{ name: string; description?: string; price?: string }> }> }>(
      'POST', `/admin/sites/${siteId}/ai/scan-menu`, { contentType, base64 }),

  listOrders: () => request<Array<{ id: string; archetype: string; plan: string; status: string; siteId?: string; createdAt: string; failureReason?: string }>>('GET', '/admin/orders'),
  retryOrder: (orderId: string) => request<{ ok: true }>('POST', `/admin/orders/${orderId}/retry`),
  /** Order-level Stripe diagnostic (works for pending orders with no site yet). */
  getOrderBillingStatus: (orderId: string) => request<{
    orderId: string
    orderStatus: string
    stripeSessionId: string | null
    stripeCustomerId: string | null
    failureReason: string | null
    stripeConfigured?: boolean
    session?: { id: string; paymentStatus: string | null; status: string | null; amountTotal: number | null; currency: string | null; customerEmail: string | null; createdAt: string } | null
    paymentIntent?: { id: string; status: string; amount: number; amountReceived: number; lastPaymentError: string | null } | null
    webhookEvents?: Array<{ id: string; type: string; created: number }>
    canResolve?: boolean
    notes?: string | null
    error?: string
  }>('GET', `/admin/orders/${orderId}/billing-status`),
  /** Order-level resolve — marks paid + enqueues provisioning when Stripe confirms but the webhook never landed. */
  resolveOrderBilling: (orderId: string) => request<{ ok: true; orderId: string; orderStatus: string }>('POST', `/admin/orders/${orderId}/resolve-billing`),
  getDeployLogs: (siteId: string) => request<Array<{ step: string; status: string; message?: string; durationMs?: number; createdAt: string }>>('GET', `/admin/sites/${siteId}/deploy-logs`),
  redeploySite: (siteId: string) => request<{ ok: boolean; deploymentId: string; url: string }>('POST', `/admin/sites/${siteId}/redeploy`),

  /** Live Vercel deployment state for a site (for progress UI). Pass deploymentId to follow a specific deploy. */
  getDeploymentStatus: (siteId: string, deploymentId?: string) => request<{
    state: 'QUEUED' | 'INITIALIZING' | 'BUILDING' | 'UPLOADING' | 'DEPLOYING' | 'READY' | 'ERROR' | 'CANCELED' | 'UNKNOWN'
    deploymentId: string | null
    url: string | null
    createdAt: number | null
    siteStatus: string
    productionUrl: string | null
  }>('GET', `/admin/sites/${siteId}/deployment-status${deploymentId ? `?deploymentId=${encodeURIComponent(deploymentId)}` : ''}`),

  /** Compare the site's recorded template commit against the latest commit on the template repo. */
  getUpdateStatus: (siteId: string) => request<{ current: string | null; latest: string | null; hasUpdate: boolean; neverChecked?: boolean; autoUpdate?: boolean; lastAutoUpdateAt?: string | null }>('GET', `/admin/sites/${siteId}/update-status`),

  setAutoUpdate: (siteId: string, enabled: boolean) => request<{ ok: true; autoUpdate: boolean }>('POST', `/admin/sites/${siteId}/auto-update`, { enabled }),
  /** Queue a job that syncs template files into the customer's repo and triggers a redeploy. */
  updateSite: (siteId: string) => request<{ ok: true; jobId: string | number }>('POST', `/admin/sites/${siteId}/update`),
  /** Force a fresh provisioning run for a stuck site (idempotent — reuses existing repo/project). */
  reprovisionSite: (siteId: string) => request<{ ok: true; orderId: string }>('POST', `/admin/sites/${siteId}/reprovision`),
  /** Stripe diagnostic: session payment status, payment intent, recent webhook events. */
  getBillingStatus: (siteId: string) => request<{
    orderId: string
    orderStatus: string
    stripeSessionId: string | null
    stripeCustomerId: string | null
    failureReason: string | null
    stripeConfigured?: boolean
    session?: { id: string; paymentStatus: string | null; status: string | null; amountTotal: number | null; currency: string | null; customerEmail: string | null; createdAt: string } | null
    paymentIntent?: { id: string; status: string; amount: number; amountReceived: number; lastPaymentError: string | null } | null
    webhookEvents?: Array<{ id: string; type: string; created: number }>
    canResolve?: boolean
    notes?: string | null
    error?: string
  }>('GET', `/admin/sites/${siteId}/billing-status`),
  /** When Stripe confirms paid but the order never advanced, flip it and enqueue. */
  resolveBilling: (siteId: string) => request<{ ok: true; orderId: string; orderStatus: string }>('POST', `/admin/sites/${siteId}/resolve-billing`),
  /** URL of the cached screenshot PNG for a site. Pass fresh=true to force recapture. */
  screenshotUrl: (siteId: string, fresh = false) => `${PLATFORM_API}/admin/sites/${siteId}/screenshot${fresh ? '?fresh=1' : ''}`,

  /** Returns the persisted screenshot metadata `{ url, capturedAt, sourceUrl }` for a site. */
  getScreenshot: (siteId: string) => request<{ url: string | null; capturedAt: string | null; sourceUrl: string | null }>('GET', `/admin/sites/${siteId}/screenshot`),

  /** Triggers a fresh capture of the site's current production URL, persists the result, returns the new metadata. */
  refreshScreenshot: (siteId: string) => request<{ url: string | null; capturedAt: string | null; sourceUrl: string | null; error?: string }>('POST', `/admin/sites/${siteId}/screenshot/refresh`),

  // --- Orders / checkout (public) ---
  createOrder: (payload: {
    archetype: 'mesa' | 'hearth' | 'vault' | 'keystone' | 'marquee'
    plan: string
    addOns: string[]
    wizardPayload: Record<string, unknown>
    owner: { email: string; name?: string }
  }) => request<{ orderId: string; checkoutUrl: string | null; dryRun?: boolean }>('POST', '/orders', payload),
  getOrder: (id: string) => request<{ id: string; status: string; siteId?: string; failureReason?: string }>('GET', `/orders/${id}`),

  // --- AI copy assistant (public — wizard uses this without auth) ---
  aiSuggest: (payload: {
    archetype: string
    brand: string
    field: string
    context?: Record<string, string>
  }) => {
    if (!PLATFORM_API) return Promise.resolve({ text: '' })
    return fetch(`${PLATFORM_API}/ai/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.ok ? r.json() as Promise<{ text: string }> : Promise.resolve({ text: '' }))
  },

  // --- Bookings (public) ---
  bookingAvailability: (siteSlug: string, type: string) =>
    request<{
      slots: string[]
      durationMinutes: number
      timezone: string
      enabledTypes: string[]
      services?: Array<{ id: string; label: string; description?: string; durationMinutes: number }>
    }>('GET', `/bookings/availability?siteSlug=${encodeURIComponent(siteSlug)}&type=${encodeURIComponent(type)}`),
  createBooking: (payload: {
    siteSlug: string
    type: string
    name: string
    email: string
    phone?: string
    notes?: string
    scheduledAt: string
    timezone?: string
  }) => request<{
    id: string
    type: string
    serviceId?: string | null
    serviceLabel?: string | null
    name: string
    email: string
    scheduledAt: string
    durationMinutes: number
    timezone?: string
    status: 'confirmed' | 'cancelled'
    cancelToken: string
    icsUrl: string
  }>('POST', '/bookings', payload),

  // --- Admin: Appointments (Keystone add-on) ---
  listSiteBookings: (siteId: string) =>
    request<Array<{ id: string; type: string; serviceId?: string | null; serviceLabel?: string | null; name: string; email: string; phone?: string; notes?: string; scheduledAt: string; durationMinutes: number; timezone?: string; status: string; siteSlug: string }>>(
      'GET',
      `/admin/sites/${siteId}/bookings`,
    ),
  adminCancelBooking: (bookingId: string) =>
    request<{ id: string; status: string }>('DELETE', `/admin/bookings/${bookingId}`),
  getBookingConfig: (siteId: string) =>
    request<{
      override: BookingConfigDTO | null
      resolved: Required<BookingConfigDTO>
    }>('GET', `/admin/sites/${siteId}/booking-config`),
  saveBookingConfig: (siteId: string, config: BookingConfigDTO | null) =>
    request<{ override: BookingConfigDTO | null; resolved: Required<BookingConfigDTO> }>(
      'PUT',
      `/admin/sites/${siteId}/booking-config`,
      { config },
    ),
  setSiteAddOn: (siteId: string, addOn: string, enabled: boolean) =>
    request<{ addOns: string[] }>('POST', `/admin/sites/${siteId}/addons`, { addOn, enabled }),

  // --- Lodging / Reservations (Hearth add-on) ---
  lodgingAvailability: (siteSlug: string, checkIn: string, checkOut: string, partySize: number) =>
    request<{
      checkIn: string
      checkOut: string
      nights: number
      timezone: string
      currency: string
      checkInTime?: string
      checkOutTime?: string
      rooms: Array<{
        id: string
        label: string
        description?: string
        capacity: number
        imageUrl?: string
        nightlyRateCents?: number
        totalCents?: number
        available: boolean
      }>
    }>(
      'GET',
      `/reservations/availability?siteSlug=${encodeURIComponent(siteSlug)}&checkIn=${checkIn}&checkOut=${checkOut}&partySize=${partySize}`,
    ),
  createReservation: (payload: {
    siteSlug: string
    roomId: string
    checkIn: string
    checkOut: string
    partySize: number
    name: string
    email: string
    phone?: string
    notes?: string
  }) => request<ReservationDTO>('POST', '/reservations', payload),
  listSiteReservations: (siteId: string) =>
    request<ReservationDTO[]>('GET', `/admin/sites/${siteId}/reservations`),
  adminCancelReservation: (siteId: string, reservationId: string) =>
    request<ReservationDTO>('DELETE', `/admin/sites/${siteId}/reservations/${reservationId}`),
  getLodgingConfig: (siteId: string) =>
    request<{ override: LodgingConfigDTO | null; resolved: Required<LodgingConfigDTO> }>(
      'GET', `/admin/sites/${siteId}/lodging-config`,
    ),
  saveLodgingConfig: (siteId: string, config: LodgingConfigDTO | null) =>
    request<{ override: LodgingConfigDTO | null; resolved: Required<LodgingConfigDTO> }>(
      'PUT', `/admin/sites/${siteId}/lodging-config`, { config },
    ),

  // --- Shop (Vault E-Shop add-on) ---
  shopListProducts: (siteSlug: string) =>
    request<{
      currency: string
      fulfillment: Array<'pickup' | 'shipping'>
      shippingFlatCents: number
      products: ShopProductDTO[]
    }>('GET', `/shop/products?siteSlug=${encodeURIComponent(siteSlug)}`),
  shopCreateOrder: (payload: {
    siteSlug: string
    name: string
    email: string
    phone?: string
    notes?: string
    fulfillment: 'pickup' | 'shipping'
    shippingAddress?: ShippingAddressDTO
    items: Array<{ productId: string; quantity: number }>
  }) => request<ShopOrderDTO>('POST', '/shop/orders', payload),
  /** Create a pending order + Stripe Checkout session (destination charge to the owner). */
  shopCheckout: (payload: {
    siteSlug: string
    name: string
    email: string
    phone?: string
    notes?: string
    fulfillment: 'pickup' | 'shipping'
    shippingAddress?: ShippingAddressDTO
    items: Array<{ productId: string; quantity: number }>
  }) => request<{ orderId: string; checkoutUrl: string | null; order: ShopOrderDTO }>('POST', '/shop/checkout', payload),
  shopConfirmOrder: (id: string) => request<ShopOrderDTO>('POST', `/shop/orders/${id}/confirm`),
  shopGetOrder: (id: string) => request<ShopOrderDTO>('GET', `/shop/orders/${id}`),
  shopListSiteProducts: (siteId: string) =>
    request<ShopProductDTO[]>('GET', `/admin/sites/${siteId}/products`),
  shopCreateProduct: (siteId: string, input: ShopProductInput) =>
    request<ShopProductDTO>('POST', `/admin/sites/${siteId}/products`, input),
  shopUpdateProduct: (siteId: string, productId: string, input: Partial<ShopProductInput>) =>
    request<ShopProductDTO>('PATCH', `/admin/sites/${siteId}/products/${productId}`, input),
  shopDeleteProduct: (siteId: string, productId: string) =>
    request<{ ok: true }>('DELETE', `/admin/sites/${siteId}/products/${productId}`),
  shopListOrders: (siteId: string) =>
    request<ShopOrderDTO[]>('GET', `/admin/sites/${siteId}/shop-orders`),
  shopUpdateOrder: (siteId: string, orderId: string, status: ShopOrderDTO['status']) =>
    request<ShopOrderDTO>('PATCH', `/admin/sites/${siteId}/shop-orders/${orderId}`, { status }),
  getShopConfig: (siteId: string) =>
    request<{ override: ShopConfigDTO | null; resolved: Required<ShopConfigDTO> }>(
      'GET', `/admin/sites/${siteId}/shop-config`,
    ),
  saveShopConfig: (siteId: string, config: ShopConfigDTO | null) =>
    request<{ override: ShopConfigDTO | null; resolved: Required<ShopConfigDTO> }>(
      'PUT', `/admin/sites/${siteId}/shop-config`, { config },
    ),

  // --- Ordering (Mesa Meal Ordering add-on) ---
  orderingMenu: (siteSlug: string) =>
    request<{
      currency: string
      categories: string[]
      items: MenuItemDTO[]
    }>('GET', `/ordering/menu?siteSlug=${encodeURIComponent(siteSlug)}`),
  orderingSlots: (siteSlug: string) =>
    request<{
      timezone: string
      currency: string
      slotMinutes: number
      slots: string[]
    }>('GET', `/ordering/slots?siteSlug=${encodeURIComponent(siteSlug)}`),
  orderingCreateOrder: (payload: {
    siteSlug: string
    name: string
    email: string
    phone?: string
    notes?: string
    pickupAt: string
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>
  }) => request<MealOrderDTO>('POST', '/ordering/orders', payload),
  orderingGetOrder: (id: string) => request<MealOrderDTO>('GET', `/ordering/orders/${id}`),
  orderingListSiteMenu: (siteId: string) =>
    request<MenuItemDTO[]>('GET', `/admin/sites/${siteId}/menu-items`),
  orderingCreateMenuItem: (siteId: string, input: MenuItemInput) =>
    request<MenuItemDTO>('POST', `/admin/sites/${siteId}/menu-items`, input),
  orderingUpdateMenuItem: (siteId: string, itemId: string, input: Partial<MenuItemInput>) =>
    request<MenuItemDTO>('PATCH', `/admin/sites/${siteId}/menu-items/${itemId}`, input),
  orderingDeleteMenuItem: (siteId: string, itemId: string) =>
    request<{ ok: true }>('DELETE', `/admin/sites/${siteId}/menu-items/${itemId}`),
  orderingListOrders: (siteId: string) =>
    request<MealOrderDTO[]>('GET', `/admin/sites/${siteId}/meal-orders`),
  orderingUpdateOrder: (siteId: string, orderId: string, status: MealOrderDTO['status']) =>
    request<MealOrderDTO>('PATCH', `/admin/sites/${siteId}/meal-orders/${orderId}`, { status }),
  getOrderingConfig: (siteId: string) =>
    request<{ override: OrderingConfigDTO | null; resolved: Required<OrderingConfigDTO> }>(
      'GET', `/admin/sites/${siteId}/ordering-config`,
    ),
  saveOrderingConfig: (siteId: string, config: OrderingConfigDTO | null) =>
    request<{ override: OrderingConfigDTO | null; resolved: Required<OrderingConfigDTO> }>(
      'PUT', `/admin/sites/${siteId}/ordering-config`, { config },
    ),

  // --- Point of sale (kitchen ticket printing for Mesa ordering) ---
  posStatus: (siteId: string) =>
    request<PosStatusDTO>('GET', `/admin/sites/${siteId}/pos/status`),
  posConnectUrl: (siteId: string, provider: string) =>
    request<{ url: string }>('GET', `/admin/sites/${siteId}/pos/connect?provider=${encodeURIComponent(provider)}`),
  posDisconnect: (siteId: string) =>
    request<{ ok: true }>('POST', `/admin/sites/${siteId}/pos/disconnect`),
  posSaveConfig: (siteId: string, config: PosConfigDTO | null) =>
    request<{ config: Required<PosConfigDTO> }>('PUT', `/admin/sites/${siteId}/pos/config`, { config }),
  posSendOrder: (siteId: string, orderId: string) =>
    request<{ ok: true; posOrderId: string | null; posSyncedAt: string | null }>(
      'POST', `/admin/sites/${siteId}/pos/orders/${orderId}/send`,
    ),

  // --- Ticketing (Marquee Events add-on) — public ---
  ticketingListEvents: (siteSlug: string) =>
    request<EventDTO[]>('GET', `/ticketing/events?siteSlug=${encodeURIComponent(siteSlug)}`),
  ticketingGetEvent: (siteSlug: string, eventId: string) =>
    request<EventDTO>('GET', `/ticketing/events/${eventId}?siteSlug=${encodeURIComponent(siteSlug)}`),
  ticketingPurchase: (payload: {
    siteSlug: string
    eventId: string
    name: string
    email: string
    phone?: string
    items: Array<{ tierId: string; quantity: number }>
  }) => request<TicketOrderDTO>('POST', '/ticketing/purchase', payload),
  ticketingGetOrder: (orderId: string) =>
    request<TicketOrderDTO>('GET', `/ticketing/orders/${orderId}`),
  ticketingCancelByToken: (ticketId: string, token: string) =>
    request<TicketDTO>('GET', `/ticketing/tickets/${ticketId}/cancel?token=${encodeURIComponent(token)}`),

  // --- Admin: Ticketing (Marquee Events add-on) ---
  ticketingListSiteEvents: (siteId: string) =>
    request<EventDTO[]>('GET', `/admin/sites/${siteId}/events`),
  ticketingCreateEvent: (siteId: string, input: EventInput) =>
    request<EventDTO>('POST', `/admin/sites/${siteId}/events`, input),
  ticketingUpdateEvent: (siteId: string, eventId: string, input: Partial<EventInput>) =>
    request<EventDTO>('PUT', `/admin/sites/${siteId}/events/${eventId}`, input),
  ticketingDeleteEvent: (siteId: string, eventId: string) =>
    request<{ ok: true }>('DELETE', `/admin/sites/${siteId}/events/${eventId}`),
  ticketingListEventTickets: (siteId: string, eventId: string) =>
    request<TicketDTO[]>('GET', `/admin/sites/${siteId}/events/${eventId}/tickets`),
  ticketingCancelTicket: (siteId: string, ticketId: string) =>
    request<TicketDTO>('DELETE', `/admin/sites/${siteId}/tickets/${ticketId}`),
  ticketingCheckIn: (siteId: string, ticketId: string) =>
    request<TicketDTO>('PATCH', `/admin/sites/${siteId}/tickets/${ticketId}/check-in`),
}

export interface DnsInstructionsDTO {
  instructions: Array<{ type: string; name: string; value: string; note: string }>
}

export interface InstagramMediaDTO {
  id: string
  media_url: string
  permalink: string
  caption?: string
}

export interface AnalyticsDTO {
  range: number
  series: Array<{ date: string; visitors: number; pageviews: number; latencyMs: number; up: boolean | null }>
  totals: { visitors: number; pageviews: number; prevVisitors: number; prevPageviews: number }
  uptimePct: number | null
  avgLatencyMs: number | null
  topPages: Array<{ label: string; views: number }>
  sources: Array<{ label: string; views: number }>
  devices: Array<{ label: string; views: number }>
  byHour: Array<{ hour: number; views: number }>
}

export interface PaymentsStatusDTO {
  stripeConfigured: boolean
  plaidConfigured: boolean
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  bank: { name: string; mask: string | null } | null
}

export interface BookingServiceDTO {
  id: string
  label: string
  description?: string
  durationMinutes: number
}

export interface BookingConfigDTO {
  timezone?: string
  hours?: Record<number, string[]>
  slotMinutes?: number
  durations?: Record<string, number>
  minLeadHours?: number
  windowDays?: number
  enabledTypes?: string[]
  services?: BookingServiceDTO[]
}

export interface LodgingRoomDTO {
  id: string
  label: string
  description?: string
  capacity: number
  nightlyRateCents?: number
  imageUrl?: string
}

export interface LodgingConfigDTO {
  timezone?: string
  currency?: string
  minNights?: number
  maxNights?: number
  windowDays?: number
  checkInTime?: string
  checkOutTime?: string
  rooms?: LodgingRoomDTO[]
}

export interface ReservationDTO {
  id: string
  roomId: string
  roomLabel: string
  checkIn: string
  checkOut: string
  nights: number
  partySize: number
  name: string
  email: string
  phone?: string
  notes?: string
  totalCents?: number
  currency?: string
  status: 'confirmed' | 'cancelled'
  cancelToken: string
}

export interface ShopProductDTO {
  id: string
  sku: string
  name: string
  description?: string
  priceCents: number
  currency: string
  imageUrl?: string
  inventory: number
  active: boolean
  sortOrder: number
}

export interface ShopProductInput {
  sku: string
  name: string
  description?: string
  priceCents: number
  currency?: string
  imageUrl?: string
  inventory?: number
  active?: boolean
  sortOrder?: number
}

export interface ShippingAddressDTO {
  line1: string
  line2?: string
  city: string
  region?: string
  postalCode: string
  country: string
}

export interface ShopOrderItemDTO {
  productId: string
  sku: string
  name: string
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
}

export interface ShopOrderDTO {
  id: string
  name: string
  email: string
  phone?: string
  notes?: string
  fulfillment: 'pickup' | 'shipping'
  shippingAddress?: ShippingAddressDTO
  items: ShopOrderItemDTO[]
  subtotalCents: number
  shippingCents: number
  totalCents: number
  currency: string
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
  createdAt: string
}

export interface ShopConfigDTO {
  currency?: string
  fulfillment?: Array<'pickup' | 'shipping'>
  pickupInstructions?: string
  shippingFlatCents?: number
  notifyEmail?: string
}

export interface MenuItemDTO {
  id: string
  sku: string
  name: string
  description?: string
  priceCents: number
  currency: string
  category: string
  imageUrl?: string
  active: boolean
  sortOrder: number
}

export interface MenuItemInput {
  sku: string
  name: string
  description?: string
  priceCents: number
  currency?: string
  category?: string
  imageUrl?: string
  active?: boolean
  sortOrder?: number
}

export interface MealOrderLineDTO {
  menuItemId: string
  sku: string
  name: string
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
  notes?: string
}

export interface MealOrderDTO {
  id: string
  name: string
  email: string
  phone?: string
  notes?: string
  pickupAt: string
  items: MealOrderLineDTO[]
  subtotalCents: number
  totalCents: number
  currency: string
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled'
  createdAt: string
  /** Set once the order exists in the connected POS. */
  posOrderId?: string | null
  posSyncedAt?: string | null
  /** Last POS push failure, shown in the dashboard with a resend button. */
  posSyncError?: string | null
}

export interface PosConfigDTO {
  /** Push each new online order to the POS automatically. */
  autoSend?: boolean
  /** Fire the vendor's print event so a kitchen ticket prints. */
  autoPrint?: boolean
  /** Prefix on the POS order title, e.g. "ONLINE - Jane D." */
  titlePrefix?: string
}

export interface PosStatusDTO {
  connected: boolean
  provider: 'clover' | 'square' | 'toast' | null
  merchantId: string | null
  merchantName: string | null
  connectedAt: string | null
  accessTokenExpiresAt: string | null
  /** True when the refresh token itself has expired — owner must reconnect. */
  needsReconnect: boolean
  config: Required<PosConfigDTO>
  providers: Array<{ id: 'clover' | 'square' | 'toast'; label: string; configured: boolean }>
}

export interface OrderingConfigDTO {
  timezone?: string
  currency?: string
  hours?: Record<number, string[]>
  slotMinutes?: number
  prepMinutes?: number
  maxOrdersPerSlot?: number
  windowDays?: number
  pickupInstructions?: string
  notifyEmail?: string
}

// --- Ticketing (Marquee Events add-on) ---

export type EventStatusDTO = 'draft' | 'on_sale' | 'sold_out' | 'cancelled' | 'past'

export interface TicketTierDTO {
  id: string
  label: string
  description?: string
  priceCents: number
  /** -1 = unlimited. */
  capacity: number
  active?: boolean
  /** Present on server reads (admin + public event). */
  sold?: number
  /** -1 = unlimited. Present on server reads. */
  remaining?: number
}

export interface EventDTO {
  id: string
  title: string
  description?: string
  startsAt: string
  endsAt?: string
  venue?: string
  imageUrl?: string
  /** -1 = unlimited. */
  capacity: number
  currency: string
  status: EventStatusDTO
  sold: number
  tiers: TicketTierDTO[]
}

export interface EventInput {
  title: string
  description?: string
  startsAt: string
  endsAt?: string
  venue?: string
  imageUrl?: string
  capacity?: number
  currency?: string
  tiers: TicketTierDTO[]
  status?: EventStatusDTO
}

export interface TicketDTO {
  id: string
  eventId: string
  orderId: string
  tierId: string
  tierLabel: string
  unitPriceCents: number
  currency: string
  name: string
  email: string
  phone?: string
  status: 'confirmed' | 'checked_in' | 'cancelled'
  cancelToken?: string
  createdAt: string
}

export interface TicketOrderDTO {
  orderId: string
  eventId: string
  eventTitle: string
  eventStartsAt?: string
  currency: string
  totalCents: number
  tickets: TicketDTO[]
}
