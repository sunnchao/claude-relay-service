<template>
  <header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300" :class="headerClass">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <span class="text-white text-xl font-bold">C</span>
          </div>
          <span class="text-xl font-bold" :class="scrolled ? 'text-gray-900 dark:text-white' : 'text-white'">
            Claude Relay
          </span>
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-8">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="text-sm font-medium transition-colors"
            :class="scrolled ? 'text-gray-600 hover:text-primary-600 dark:text-gray-300' : 'text-white/80 hover:text-white'"
          >
            {{ link.label }}
          </a>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-4">
          <ThemeToggle :variant="scrolled ? 'default' : 'glass'" />

          <router-link
            to="/login"
            class="hidden sm:inline-flex text-sm font-medium transition-colors"
            :class="scrolled ? 'text-gray-600 hover:text-primary-600 dark:text-gray-300' : 'text-white/80 hover:text-white'"
          >
            登录
          </router-link>

          <router-link
            to="/register"
            class="btn text-sm"
            :class="scrolled ? 'btn-primary' : 'bg-white text-primary-600 hover:bg-white/90'"
          >
            立即开始
          </router-link>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

const scrolled = ref(false)

const navLinks = [
  { href: '#features', label: '功能特性' },
  { href: '#platforms', label: '支持平台' },
  { href: '#quickstart', label: '快速开始' }
]

const headerClass = computed(() => {
  if (scrolled.value) {
    return 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-sm'
  }
  return 'bg-transparent'
})

function handleScroll() {
  scrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
