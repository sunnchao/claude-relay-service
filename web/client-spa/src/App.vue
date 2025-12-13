<template>
  <div id="app" :class="{ dark: isDark }">
    <router-view />
    <ToastNotification ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { useThemeStore } from '@/stores/theme'
import ToastNotification from '@/components/common/ToastNotification.vue'

const themeStore = useThemeStore()
const isDark = ref(false)
const toastRef = ref(null)

// 提供 toast 方法给子组件
provide('toast', {
  success: (message) => toastRef.value?.show(message, 'success'),
  error: (message) => toastRef.value?.show(message, 'error'),
  warning: (message) => toastRef.value?.show(message, 'warning'),
  info: (message) => toastRef.value?.show(message, 'info')
})

onMounted(() => {
  themeStore.initTheme()
  isDark.value = themeStore.isDark

  // 监听主题变化
  themeStore.$subscribe(() => {
    isDark.value = themeStore.isDark
  })

  // 移除 Loading Spinner
  const spinner = document.getElementById('loading-spinner')
  if (spinner) {
    spinner.classList.add('fade-out')
    setTimeout(() => {
      spinner.remove()
    }, 300)
  }
})
</script>

<style>
/* 确保 spinner 样式在 Vue 加载前生效，这里保留是为了组件内的样式隔离，
   实际 index.html 中的样式已经起作用。
   我们添加一个淡出类来处理移除动画 */
.fade-out {
  opacity: 0;
  pointer-events: none;
}
</style>

<style scoped>
#app {
  min-height: 100vh;
}
</style>

