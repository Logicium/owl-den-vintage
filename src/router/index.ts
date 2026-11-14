import { createRouter, createWebHistory } from 'vue-router'
import { PLATFORM_ENABLED } from '@apotome/archetype-shared/platform/config'
import { adminRoutes } from '@apotome/archetype-shared/admin/routes'
import { installAnalytics } from '@apotome/archetype-shared/platform/track'
import { notFoundRoute, publicRoutes } from '../routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public pages and their SEO records live in src/routes.ts; the prerender
    // walks the same list.
    ...publicRoutes,
    // Private: never indexed, never prerendered.
    { path: '/checkout', name: 'checkout', component: () => import('../views/CheckoutView.vue') },
    { path: '/order/:id', name: 'order', component: () => import('../views/OrderView.vue'), props: true },
    // Admin is only mounted when the platform switch is on.
    ...(PLATFORM_ENABLED ? adminRoutes : []),
    notFoundRoute,
  ],
  scrollBehavior: () => ({ top: 0 }),
})

installAnalytics(router)

export default router
