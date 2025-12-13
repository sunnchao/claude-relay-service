<template>
  <button
    @click="toggleTheme"
    class="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300"
    :class="buttonClass"
    :title="themeTitle"
  >
    <Transition name="icon" mode="out-in">
      <svg v-if="currentIcon === 'sun'" key="sun" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      <svg
        v-else-if="currentIcon === 'moon'"
        key="moon"
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
      <svg v-else key="auto" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    </Transition>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const props = defineProps({
  variant: {
    type: String,
    default: 'default' // 'default' | 'glass' | 'outline'
  }
})

const themeStore = useThemeStore()

const toggleTheme = () => themeStore.toggleTheme()

const currentIcon = computed(() => {
  if (themeStore.themeMode === 'auto') return 'auto'
  return themeStore.isDark ? 'moon' : 'sun'
})

const themeTitle = computed(() => {
  const titles = {
    light: '浅色模式 (点击切换)',
    dark: '深色模式 (点击切换)',
    auto: '跟随系统 (点击切换)'
  }
  return titles[themeStore.themeMode]
})

const buttonClass = computed(() => {
  const variants = {
    default:
      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
    glass: 'bg-white/20 dark:bg-gray-800/50 backdrop-blur text-white hover:bg-white/30 dark:hover:bg-gray-700/50',
    outline:
      'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
  }
  return variants[props.variant] || variants.default
})
</script>

<style scoped>
.icon-enter-active,
.icon-leave-active {
  transition: all 0.2s ease;
}

.icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}
</style>
