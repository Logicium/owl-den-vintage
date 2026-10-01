<script setup lang="ts">
import { computed } from 'vue'
import { siteConfig } from '../config/site.config'
import HeroSection from '@apotome/archetype-shared/components/sections/HeroSection.vue'
import ShopSection from '@apotome/archetype-shared/components/sections/ShopSection.vue'
import CategoriesSection from '../components/sections/CategoriesSection.vue'
import ProductsSection from '../components/sections/ProductsSection.vue'
import { useSiteContentStore } from '@apotome/archetype-shared/platform/siteContentStore'

const store = useSiteContentStore()
const showShop = computed(() => store.hasAddOn('eshop'))
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
  />

  <template v-else>
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
