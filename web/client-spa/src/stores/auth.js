import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const sessionToken = ref(localStorage.getItem('sessionToken') || null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!sessionToken.value && !!user.value)
  const isLoading = computed(() => loading.value)

  async function login(username, password) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/users/login', { username, password })
      if (response.success) {
        user.value = response.user
        sessionToken.value = response.sessionToken
        localStorage.setItem('sessionToken', response.sessionToken)
        return { success: true }
      }
      throw new Error(response.message || 'Login failed')
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Login failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function register(userData) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/users/register', userData)
      if (response.success) {
        user.value = response.user
        sessionToken.value = response.sessionToken
        localStorage.setItem('sessionToken', response.sessionToken)
        return { success: true }
      }
      throw new Error(response.message || 'Registration failed')
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Registration failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await api.post('/users/logout')
    } catch {
      // 忽略登出错误
    } finally {
      user.value = null
      sessionToken.value = null
      localStorage.removeItem('sessionToken')
    }
  }

  async function fetchProfile() {
    if (!sessionToken.value) return

    loading.value = true
    try {
      const response = await api.get('/users/profile')
      user.value = response.user || response
      return { success: true }
    } catch (err) {
      // Token 无效，清除登录状态
      if (err.response?.status === 401) {
        user.value = null
        sessionToken.value = null
        localStorage.removeItem('sessionToken')
      }
      return { success: false }
    } finally {
      loading.value = false
    }
  }

  async function checkAuth() {
    if (sessionToken.value && !user.value) {
      await fetchProfile()
    }
  }

  return {
    user,
    sessionToken,
    loading,
    error,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    fetchProfile,
    checkAuth
  }
})
