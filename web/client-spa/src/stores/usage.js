import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useUsageStore = defineStore('usage', () => {
  const stats = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchStats(options = {}) {
    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      if (options.period) params.append('period', options.period)
      if (options.model) params.append('model', options.model)

      const queryString = params.toString()
      const url = `/users/usage-stats${queryString ? `?${queryString}` : ''}`

      const response = await api.get(url)
      // 从响应中提取 stats 数据
      stats.value = response.stats || response
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    loading,
    error,
    fetchStats
  }
})
