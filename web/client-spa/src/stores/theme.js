import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const themeMode = ref('auto') // 'light' | 'dark' | 'auto'
  const systemPrefersDark = ref(false)

  const isDark = computed(() => {
    if (themeMode.value === 'auto') {
      return systemPrefersDark.value
    }
    return themeMode.value === 'dark'
  })

  const currentTheme = computed(() => (isDark.value ? 'dark' : 'light'))

  function initTheme() {
    // 检测系统偏好
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = mediaQuery.matches

    // 监听系统主题变化
    mediaQuery.addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches
      applyTheme()
    })

    // 从 localStorage 加载用户选择
    const savedMode = localStorage.getItem('themeMode')
    if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
      themeMode.value = savedMode
    }

    applyTheme()
  }

  function setTheme(mode) {
    themeMode.value = mode
    localStorage.setItem('themeMode', mode)
    applyTheme()
  }

  function toggleTheme() {
    const modes = ['light', 'dark', 'auto']
    const currentIndex = modes.indexOf(themeMode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    setTheme(modes[nextIndex])
  }

  function applyTheme() {
    const html = document.documentElement
    if (isDark.value) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  return {
    themeMode,
    systemPrefersDark,
    isDark,
    currentTheme,
    initTheme,
    setTheme,
    toggleTheme
  }
})
