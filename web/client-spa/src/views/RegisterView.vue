<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <router-link to="/" class="inline-flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <span class="text-white text-2xl font-bold">C</span>
          </div>
          <span class="text-2xl font-bold text-white">Claude Relay</span>
        </router-link>
      </div>

      <!-- 注册卡片 -->
      <div class="card p-8">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">创建账户</h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">开始使用 AI API 服务</p>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <!-- 用户名 -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              用户名 <span class="text-red-500">*</span>
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              required
              class="input"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>

          <!-- 邮箱 -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              邮箱（可选）
            </label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="input"
              placeholder="请输入邮箱"
              autocomplete="email"
            />
          </div>

          <!-- 密码 -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              密码 <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="input pr-10"
                placeholder="请输入密码"
                autocomplete="new-password"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
            <!-- 密码强度 -->
            <div class="mt-2">
              <div class="flex gap-1">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="i <= passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-200 dark:bg-gray-700'"
                ></div>
              </div>
              <p class="mt-1 text-xs" :class="strengthTextColors[passwordStrength - 1] || 'text-gray-400'">
                {{ strengthLabels[passwordStrength] || '请输入密码' }}
              </p>
            </div>
          </div>

          <!-- 确认密码 -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              确认密码 <span class="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              required
              class="input"
              placeholder="请再次输入密码"
              autocomplete="new-password"
            />
          </div>

          <!-- 错误提示 -->
          <div v-if="error" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
          </div>

          <!-- 提交按钮 -->
          <button
            type="submit"
            class="btn btn-primary w-full py-3"
            :disabled="loading"
          >
            <LoadingSpinner v-if="loading" size="sm" color="white" class="mr-2" />
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>

        <!-- 分隔线 -->
        <div class="my-6 flex items-center">
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          <span class="px-4 text-sm text-gray-500 dark:text-gray-400">或</span>
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        <!-- 登录链接 -->
        <p class="text-center text-gray-600 dark:text-gray-400">
          已有账户？
          <router-link to="/login" class="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
            立即登录
          </router-link>
        </p>
      </div>

      <!-- 主题切换 -->
      <div class="mt-6 flex justify-center">
        <ThemeToggle variant="glass" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const authStore = useAuthStore()
const toast = inject('toast')

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
const strengthTextColors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500']
const strengthLabels = ['', '弱', '一般', '良好', '强']

const passwordStrength = computed(() => {
  const pwd = form.password
  if (!pwd) return 0

  let strength = 0
  if (pwd.length >= 8) strength++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
  if (/\d/.test(pwd)) strength++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++

  return strength
})

async function handleRegister() {
  // 验证
  if (!form.username || !form.password) {
    error.value = '请填写必填字段'
    return
  }

  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (form.password.length < 8) {
    error.value = '密码至少需要 8 个字符'
    return
  }

  loading.value = true
  error.value = ''

  const result = await authStore.register({
    username: form.username,
    email: form.email || undefined,
    password: form.password,
    displayName: form.username
  })

  if (result.success) {
    toast.success('注册成功')
    router.push('/dashboard')
  } else {
    error.value = result.error || '注册失败，请稍后重试'
  }

  loading.value = false
}
</script>
