import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiStatsClient } from '@/config/apiStats.js'
import { showToast } from '@/utils/toast'

const defaultSummary = () => ({
  totalCost: 0,
  formattedCost: '$0.000000',
  totalTokens: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheCreateTokens: 0,
  totalCacheReadTokens: 0
})

const defaultPagination = () => ({
  total: 0,
  limit: 50,
  offset: 0,
  hasMore: false
})

const defaultFilters = () => ({
  search: '',
  model: '',
  accountType: '',
  apiKeyId: '',
  userId: '',
  accountId: '',
  startDate: '',
  endDate: ''
})

export const useUsageLogsStore = defineStore('usageLogs', () => {
  const logs = ref([])
  const loading = ref(false)
  const error = ref('')
  const pagination = ref(defaultPagination())
  const summary = ref(defaultSummary())
  const filters = ref(defaultFilters())

  const buildParams = () => {
    const params = {
      limit: pagination.value.limit,
      offset: pagination.value.offset
    }

    const currentFilters = filters.value

    const addParam = (key, value) => {
      if (value && value.toString().trim() !== '') {
        params[key] = value.toString().trim()
      }
    }

    addParam('search', currentFilters.search)
    addParam('model', currentFilters.model)
    addParam('accountType', currentFilters.accountType)
    addParam('apiKeyId', currentFilters.apiKeyId)
    addParam('userId', currentFilters.userId)
    addParam('accountId', currentFilters.accountId)

    if (currentFilters.startDate) {
      const start = new Date(currentFilters.startDate)
      if (!isNaN(start.getTime())) {
        params.startDate = start.toISOString()
      }
    }

    if (currentFilters.endDate) {
      const end = new Date(currentFilters.endDate)
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999)
        params.endDate = end.toISOString()
      }
    }

    return params
  }

  const fetchUsageLogs = async () => {
    loading.value = true
    error.value = ''
    try {
      const response = await apiStatsClient.getUsageLogs({ params: buildParams() })

      if (response.success) {
        logs.value = response.data.records || []
        pagination.value = response.data.pagination || defaultPagination()
        summary.value = response.data.summary || defaultSummary()
      } else {
        error.value = response.message || '加载使用日志失败'
      }
    } catch (err) {
      console.error('Failed to load usage logs:', err)
      error.value = err.message || '加载使用日志失败'
      showToast(error.value, 'error')
    } finally {
      loading.value = false
    }
  }

  const resetFilters = () => {
    filters.value = defaultFilters()
  }

  const resetSummaryAndLogs = () => {
    logs.value = []
    summary.value = defaultSummary()
    pagination.value = defaultPagination()
  }

  const refresh = async () => {
    pagination.value.offset = 0
    await fetchUsageLogs()
  }

  const setLimit = async (value) => {
    pagination.value.limit = value
    pagination.value.offset = 0
    await fetchUsageLogs()
  }

  const setOffset = async (value) => {
    pagination.value.offset = Math.max(0, value)
    await fetchUsageLogs()
  }

  return {
    logs,
    loading,
    error,
    summary,
    pagination,
    filters,
    fetchUsageLogs,
    refresh,
    resetFilters,
    resetSummaryAndLogs,
    setLimit,
    setOffset
  }
})
