<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { siteConfig } from '../config/site.config'
import { selectionLabels } from '@apotome/archetype-shared/platform/catalogNav'
import HeroSection from '@apotome/archetype-shared/components/sections/HeroSection.vue'
import ShopSection from '@apotome/archetype-shared/components/sections/ShopSection.vue'
import CategoriesSection from '../components/sections/CategoriesSection.vue'
import ProductsSection from '../components/sections/ProductsSection.vue'
import { useSiteContentStore } from '@apotome/archetype-shared/platform/siteContentStore'

const store = useSiteContentStore()
const showShop = computed(() => store.hasAddOn('eshop'))

/* The header's catalog menu and the category tiles land here with
   ?category=apparel&sub=hats. The e-shop filters its products by it; the
   content storefront shows what was picked and lets the visitor clear it. */
const route = useRoute()
const categorySlug = computed(() => (typeof route.query.category === 'string' ? route.query.category : undefined))
const subSlug = computed(() => (typeof route.query.sub === 'string' ? route.query.sub : undefined))
const picked = computed(() => selectionLabels(siteConfig.categories, categorySlug.value, subSlug.value))
</script>

<template>
  <HeroSection
    subpage
    :eyebrow="siteConfig.sections.shopPage.eyebrow"
    :title="siteConfig.sections.shopPage.title"
    :subtitle="siteConfig.sections.shopPage.subtitle"
    :image="siteConfig.photos.hero.src"
    :image-alt="siteConfig.photos.hero.alt"
  />

  <ShopSection
    v-if="showShop"
    :eyebrow="siteConfig.sections.shop.eyebrow"
    :title="siteConfig.sections.shop.title"
    :intro="siteConfig.sections.shop.intro"
    :category="categorySlug"
    :subcategory="subSlug"
    :categories="siteConfig.categories"
  />

  <template v-else>
    <div v-if="categorySlug" class="ap-container ap-shop-pick">
      <span class="ap-shop-pick__label">Browsing</span>
      <strong>{{ picked.category }}</strong>
      <template v-if="picked.sub"><span class="ap-shop-pick__sep">›</span><strong>{{ picked.sub }}</strong></template>
      <RouterLink to="/shop" class="ap-shop-pick__clear">Show everything</RouterLink>
    </div>
    <CategoriesSection
      :categories="siteConfig.categories"
      :title="siteConfig.sections.categories.title"
      :count-label="siteConfig.sections.categories.countLabel"
    />
    <ProductsSection
      :title="siteConfig.sections.shopPage.featuredTitle"
      :products="siteConfig.featured"
      :shop-all-url="siteConfig.shopUrl"
      :shop-all-label="siteConfig.sections.featured.shopAllLabel"
      :cta-label="siteConfig.sections.featured.ctaLabel"
    />
  </template>
</template>

<style scoped>
.ap-shop-pick {
  display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;
  padding: 1.1rem 0 0; font-size: 0.95rem;
}
.ap-shop-pick__label { color: var(--ap-ink-muted); }
.ap-shop-pick__sep { color: var(--ap-ink-muted); }
.ap-shop-pick__clear { margin-left: 0.4rem; font-size: 0.85rem; color: var(--ap-primary); }
</style>
