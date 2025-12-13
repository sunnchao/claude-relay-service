<template>
  <div class="min-h-screen bg-warm-gray-50 dark:bg-warm-gray-900 font-sans text-stone-800 dark:text-stone-200">
    <!-- 顶部导航栏 -->
    <header class="sticky top-0 z-50 h-[60px] bg-[#fbfbfa] dark:bg-[#191919] border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 lg:px-6 backdrop-blur-md bg-opacity-80">
      <div class="flex items-center gap-8">
        <!-- Logo -->
        <router-link to="/dashboard" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d97757] to-[#c45d44] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
            <span class="text-white text-lg font-serif italic font-bold">C</span>
          </div>
          <span class="text-lg font-medium tracking-tight text-stone-800 dark:text-stone-100 font-serif">Claude Relay</span>
        </router-link>

        <!-- 桌面端导航菜单 -->
        <nav class="hidden md:flex items-center gap-1">
          <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="px-3.5 py-1.5 rounded-md text-[14px] font-medium transition-all duration-200"
            :class="
              isActive(item.path)
                ? 'bg-stone-200/50 dark:bg-stone-800 text-stone-900 dark:text-white font-semibold'
                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-200'
            "
          >
            {{ item.label }}
          </router-link>
        </nav>
      </div>

      <!-- 右侧操作 -->
      <div class="flex items-center gap-3">
        <ThemeToggle />

        <div class="h-4 w-[1px] bg-stone-200 dark:bg-stone-800 mx-1"></div>

        <!-- 用户下拉菜单 (简化版: 暂时直接显示用户名和退出按钮) -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-md bg-[#e3e1da] dark:bg-[#2d2d2d] flex items-center justify-center text-xs font-semibold text-stone-600 dark:text-stone-300">
              {{ userInitial }}
            </div>
            <span class="hidden sm:block text-sm font-medium text-stone-600 dark:text-stone-300">
              {{ authStore.user?.displayName || authStore.user?.username }}
            </span>
          </div>
          <button
            @click="handleLogout"
            class="p-1.5 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="退出登录"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

         <!-- 移动端菜单按钮 -->
         <button
          @click="mobileMenuOpen = !mobileMenuOpen"
          class="md:hidden p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 移动端菜单 -->
    <div v-show="mobileMenuOpen" class="md:hidden border-b border-stone-200 dark:border-stone-800 bg-[#fbfbfa] dark:bg-[#191919]">
      <nav class="flex flex-col p-2 space-y-1">
        <router-link
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            @click="mobileMenuOpen = false"
            class="px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            :class="
              isActive(item.path)
                ? 'bg-stone-200/50 dark:bg-stone-800 text-stone-900 dark:text-white'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200'
            "
          >
            <div class="flex items-center gap-3">
              <span>{{ item.icon }}</span>
              {{ item.label }}
            </div>
          </router-link>
      </nav>
    </div>

    <!-- 主内容区 -->
    <main class="w-full mx-auto p-4 md:p-6 lg:p-8">
      <div v-if="$slots.header" class="mb-8">
        <slot name="header"></slot>
      </div>
      <slot></slot>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/common/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mobileMenuOpen = ref(false)

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/api-keys', label: 'API Keys', icon: '🔑' },
  { path: '/usage', label: 'Usage', icon: '📈' },
  { path: '/settings', label: 'Settings', icon: '⚙️' }
]

const userInitial = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.username || 'U'
  return name.charAt(0).toUpperCase()
})

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
