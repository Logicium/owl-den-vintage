/**
 * Admin routes. These are only registered when `PLATFORM_ENABLED` is true.
 * All routes live under `/admin` and share `AdminLayout`.
 */
import type { RouteRecordRaw } from 'vue-router'

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('./AdminLayout.vue'),
    children: [
      { path: '', name: 'admin-sites', component: () => import('./views/SitesView.vue') },
      { path: 'login', name: 'admin-login', component: () => import('./views/LoginView.vue') },
      { path: 'verify', name: 'admin-verify', component: () => import('./views/VerifyView.vue') },
      { path: 'content', name: 'admin-content', component: () => import('./views/ContentView.vue'), meta: { contentSection: 'content' } },
      { path: 'brand', name: 'admin-brand', component: () => import('./views/ContentView.vue'), meta: { contentSection: 'brand' } },
      { path: 'catalog', name: 'admin-catalog', component: () => import('./views/ContentView.vue'), meta: { contentSection: 'catalog' } },
      { path: 'addons', name: 'admin-addons', component: () => import('./views/AddonsView.vue') },
      { path: 'inbox', name: 'admin-inbox', component: () => import('./views/InboxView.vue') },
      { path: 'reviews', name: 'admin-reviews', component: () => import('./views/ReviewsView.vue') },
      { path: 'instagram', name: 'admin-instagram', component: () => import('./views/InstagramView.vue') },
      { path: 'analytics', name: 'admin-analytics', component: () => import('./views/AnalyticsView.vue') },
      { path: 'domain', name: 'admin-domain', component: () => import('./views/DomainView.vue') },
      { path: 'payments', name: 'admin-payments', component: () => import('./views/PaymentsView.vue') },
      { path: 'billing', name: 'admin-billing', component: () => import('./views/BillingView.vue') },
      { path: 'deployments', name: 'admin-deployments', component: () => import('./views/DeploymentsView.vue') },
      { path: 'appointments', name: 'admin-appointments', component: () => import('./views/AppointmentsView.vue') },
      { path: 'lodging', name: 'admin-lodging', component: () => import('./views/LodgingView.vue') },
      { path: 'shop', name: 'admin-shop', component: () => import('./views/ShopView.vue') },
      { path: 'ordering', name: 'admin-ordering', component: () => import('./views/OrderingView.vue') },
      { path: 'ticketing', name: 'admin-ticketing', component: () => import('./views/TicketingView.vue') },
      { path: 'account', name: 'admin-account', component: () => import('./views/AccountView.vue') },
    ],
  },
]
