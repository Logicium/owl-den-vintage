<script setup lang="ts">
import { siteConfig } from '../config/site.config'
import HeroSection from '@apotome/archetype-shared/components/sections/HeroSection.vue'
import ContactSection from '../components/sections/ContactSection.vue'
import HoursSection from '@apotome/archetype-shared/components/sections/HoursSection.vue'
</script>

<template>
  <HeroSection
    subpage
    :eyebrow="siteConfig.sections.visit.eyebrow"
    :title="siteConfig.sections.visit.title"
    :subtitle="siteConfig.sections.visit.subtitle"
    :image="siteConfig.photos.hero.src"
    :image-alt="siteConfig.photos.hero.alt"
  />
  <HoursSection
    :eyebrow="siteConfig.sections.hours.eyebrow"
    :title="siteConfig.sections.hours.title"
    :hours="siteConfig.hours"
  />
  <ContactSection
    :title="siteConfig.sections.contact.title"
    :address="siteConfig.contact.address"
    :phone="siteConfig.contact.phone"
    :email="siteConfig.contact.email"
    :map-embed-url="siteConfig.contact.mapEmbedUrl"
  />
</template>
