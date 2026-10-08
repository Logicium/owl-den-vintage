import type { App, Plugin } from 'vue'
import { vPlx, vGrow, vReveal, vLines } from './motion'
import { vCascade } from './cascade'
import { vFit } from './fit'
import { startLenis, stopLenis } from './lenis'

export * from './motion'
export * from './cascade'
export * from './fit'
export * from './lenis'
export * from './useStack'
export * from './useHorizontal'
export * from './useParallax'
export * from './useReducedMotion'

/**
 * Registers every Archetype motion directive on the app:
 *   v-plx, v-grow, v-reveal, v-lines, v-cascade, v-fit
 * Templates call `app.use(archetypeMotion)` once in main.ts.
 */
export const archetypeMotion: Plugin = {
  install(app: App) {
    app.directive('plx', vPlx)
    app.directive('grow', vGrow)
    app.directive('reveal', vReveal)
    app.directive('lines', vLines)
    app.directive('cascade', vCascade)
    app.directive('fit', vFit)
    // Themes opt into inertial scrolling via data-motion-smooth (applyTheme).
    if (typeof document !== 'undefined') {
      const sync = () => {
        const on = document.documentElement.getAttribute('data-motion-smooth') === 'true'
        if (on) void startLenis()
        else stopLenis()
      }
      new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion-smooth'] })
      sync()
    }
  },
}
