<template>
  <ClientLayout>
    <div class="space-y-6">
      <!-- 页头 -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">账户设置</h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">管理您的账户信息和安全设置</p>
      </div>

      <!-- 个人信息 -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">个人信息</h3>

        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span class="text-2xl text-primary-600 dark:text-primary-400 font-bold">
                {{ userInitial }}
              </span>
            </div>
            <div>
              <div class="font-medium text-gray-900 dark:text-white">{{ authStore.user?.displayName }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">@{{ authStore.user?.username }}</div>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400">邮箱</label>
              <div class="mt-1 text-gray-900 dark:text-white">{{ authStore.user?.email || '未设置' }}</div>
            </div>
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400">角色</label>
              <div class="mt-1 text-gray-900 dark:text-white">{{ authStore.user?.role === 'admin' ? '管理员' : '普通用户' }}</div>
            </div>
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400">注册时间</label>
              <div class="mt-1 text-gray-900 dark:text-white">{{ formatDate(authStore.user?.createdAt) }}</div>
            </div>
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400">上次登录</label>
              <div class="mt-1 text-gray-900 dark:text-white">{{ formatDate(authStore.user?.lastLoginAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 修改密码 -->
      <div v-if="authStore.user?.isLocalUser" class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">修改密码</h3>

        <form @submit.prevent="handleChangePassword" class="space-y-4 max-w-md">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              当前密码
            </label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              required
              class="input"
              placeholder="请输入当前密码"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新密码
            </label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              required
              class="input"
              placeholder="请输入新密码"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              确认新密码
            </label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              required
              class="input"
              placeholder="请再次输入新密码"
            />
          </div>

          <div v-if="passwordError" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p class="text-sm text-red-600 dark:text-red-400">{{ passwordError }}</p>
          </div>

          <div v-if="passwordSuccess" class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p class="text-sm text-green-600 dark:text-green-400">密码修改成功</p>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="changingPassword">
            {{ changingPassword ? '修改中...' : '修改密码' }}
          </button>
        </form>
      </div>

      <!-- 主题设置 -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">外观设置</h3>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900 dark:text-white">主题模式</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">选择您喜欢的界面主题</div>
          </div>
          <div class="flex gap-2">
            <button
              v-for="mode in themeModes"
              :key="mode.value"
              @click="themeStore.setTheme(mode.value)"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="themeStore.themeMode === mode.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
            >
              {{ mode.icon }} {{ mode.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </ClientLayout>
</template>

<script setup>
import { ref, reactive, computed, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import ClientLayout from '@/components/layout/ClientLayout.vue'
import api from '@/utils/api'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const toast = inject('toast')

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const changingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

const themeModes = [
  { value: 'light', label: '浅色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'auto', label: '自动', icon: '💻' }
]

const userInitial = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.username || 'U'
  return name.charAt(0).toUpperCase()
})

function formatDate(dateStr) {
  if (!dateStr) return '未知'
  return new Date(dateStr).toLocaleString('zh-CN')
}

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = false

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }

  if (passwordForm.newPassword.length < 8) {
    passwordError.value = '新密码至少需要 8 个字符'
    return
  }

  changingPassword.value = true

  try {
    await api.post('/users/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    passwordSuccess.value = true
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    toast.success('密码修改成功')
  } catch (error) {
    passwordError.value = error.response?.data?.message || '密码修改失败'
  }

  changingPassword.value = false
}
</script>
