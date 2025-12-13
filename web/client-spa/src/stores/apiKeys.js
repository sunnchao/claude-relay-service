import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useApiKeysStore = defineStore('apiKeys', () => {
  const keys = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchKeys() {
    loading.value = true
    error.value = null

    try {
      const response = await api.get('/users/api-keys')
      keys.value = response.apiKeys || response || []
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function createKey(keyData) {
    loading.value = true
    error.value = null

    try {
      const response = await api.post('/users/api-keys', keyData)
      // 重新获取列表以更新
      await fetchKeys()
      return { success: true, apiKey: response.apiKey || response }
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function deleteKey(keyId) {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/users/api-keys/${keyId}`)
      keys.value = keys.value.filter((k) => k.id !== keyId)
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  return {
    keys,
    loading,
    error,
    fetchKeys,
    createKey,
    deleteKey
  }
})
