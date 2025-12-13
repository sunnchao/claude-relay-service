<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <NavHeader />
    <HeroSection />
    <FeaturesSection />
    <PlatformsSection />
    <QuickStartSection />
    <FooterSection />
  </div>
</template>

<script setup>
import NavHeader from '@/components/landing/NavHeader.vue'
import HeroSection from '@/components/landing/HeroSection.vue'
import FeaturesSection from '@/components/landing/FeaturesSection.vue'
import PlatformsSection from '@/components/landing/PlatformsSection.vue'
import QuickStartSection from '@/components/landing/QuickStartSection.vue'
import FooterSection from '@/components/landing/FooterSection.vue'
</script>
