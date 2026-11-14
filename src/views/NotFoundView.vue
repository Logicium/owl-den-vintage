<script setup lang="ts">
/**
 * The 404. A real page with a real status in the prerendered 404.html, never
 * a redirect home: a broken link should show up in Search Console, and a
 * visitor should land somewhere useful.
 */
import { RouterLink } from 'vue-router'
import { siteConfig } from '../config/site.config'

const links = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/visit', label: 'Visit' },
]
</script>

<template>
  <section class="ap-section not-found">
    <div class="ap-container not-found__wrap">
      <p class="ap-eyebrow">404</p>
      <h1>Not here.</h1>
      <p class="not-found__lede">That page is not on the {{ siteConfig.brand }} website. It may have moved, or the link may have a typo.</p>
      <nav aria-label="Main pages" class="not-found__links">
        <ul>
          <li v-for="l in links" :key="l.to"><RouterLink :to="l.to">{{ l.label }}</RouterLink></li>
        </ul>
      </nav>
      <RouterLink to="/" class="ap-btn">Back to the home page</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.not-found__wrap {
  display: grid;
  gap: 1.5rem;
  max-width: 60ch;
  padding-block: clamp(4rem, 12vh, 8rem);
}
.not-found__lede {
  font-size: 1.15rem;
  line-height: 1.5;
}
.not-found__links ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
}
.not-found__links a {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.not-found .ap-btn {
  justify-self: start;
}
</style>
