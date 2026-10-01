<script setup lang="ts">
import { computed } from 'vue'
import { siteConfig } from '../config/site.config'
import { VARIANT_PHOTO_COUNT, resolveVariant, variantAtLeast } from '@apotome/archetype-shared/themes/tokens'
import { useSiteContentStore } from '@apotome/archetype-shared/platform/siteContentStore'
import { useSiteTheme } from '@apotome/archetype-shared/composables/useSiteTheme'
import HeroSection from '@apotome/archetype-shared/components/sections/HeroSection.vue'
import AboutSection from '@apotome/archetype-shared/components/sections/AboutSection.vue'
import CategoriesSection from '../components/sections/CategoriesSection.vue'
import ProductsSection from '../components/sections/ProductsSection.vue'
import GallerySection from '@apotome/archetype-shared/components/sections/GallerySection.vue'
import HoursSection from '@apotome/archetype-shared/components/sections/HoursSection.vue'
import TestimonialsSection from '@apotome/archetype-shared/components/sections/TestimonialsSection.vue'

const { variant: liveVariant } = useSiteTheme()
const galleryLimit = computed(() => VARIANT_PHOTO_COUNT[resolveVariant(liveVariant.value)].gallery)
const isPortfolio = computed(() => variantAtLeast(liveVariant.value, 'portfolio'))
const content = useSiteContentStore()
const reviewItems = computed(() =>
  content.reviewsSource === 'google' && content.googleReviews.length
    ? content.googleReviews
    : siteConfig.testimonials,
)
</script>

<template>
  <HeroSection
    :eyebrow="siteConfig.tagline"
    :title="siteConfig.brand"
    :subtitle="siteConfig.blurb"
    :image="siteConfig.photos.hero.src"
    :image-alt="siteConfig.photos.hero.alt"
    :images="isPortfolio ? [siteConfig.photos.hero, ...siteConfig.photos.gallery.slice(0, 3)] : []"
    :cta-primary="{ label: siteConfig.sections.hero.ctaPrimary, to: '/shop' }"
    :cta-secondary="{ label: siteConfig.sections.hero.ctaSecondary, to: '/visit' }"
    :layout="isPortfolio ? 'stage' : 'split'"
  />
  <CategoriesSection
    :eyebrow="siteConfig.sections.categories.eyebrow"
    :title="siteConfig.sections.categories.title"
    :count-label="siteConfig.sections.categories.countLabel"
    :categories="siteConfig.categories"
  />
  <ProductsSection
    :eyebrow="siteConfig.sections.featured.eyebrow"
    :title="siteConfig.sections.featured.title"
    :shop-all-label="siteConfig.sections.featured.shopAllLabel"
    :cta-label="siteConfig.sections.featured.ctaLabel"
    :products="siteConfig.featured.slice(0, isPortfolio ? 4 : 3)"
    :shop-all-url="siteConfig.shopUrl"
  />
  <AboutSection
    :eyebrow="siteConfig.sections.story.eyebrow"
    :title="siteConfig.story.title"
    :paragraphs="siteConfig.story.paragraphs"
    :facts="siteConfig.story.facts"
    :image="siteConfig.photos.about.src"
    :image-alt="siteConfig.photos.about.alt"
    reverse
  />
  <GallerySection
    :eyebrow="siteConfig.sections.gallery.eyebrow"
    :photos="siteConfig.photos.gallery"
    :limit="galleryLimit"
    :layout="isPortfolio ? 'masonry' : 'grid'"
  />
  <HoursSection
    :eyebrow="siteConfig.sections.hours.eyebrow"
    :title="siteConfig.sections.hours.title"
    :hours="siteConfig.hours"
  />
  <TestimonialsSection
    :eyebrow="siteConfig.sections.reviews.eyebrow"
    :title="siteConfig.sections.reviews.title"
    :items="reviewItems"
  />
</template>
