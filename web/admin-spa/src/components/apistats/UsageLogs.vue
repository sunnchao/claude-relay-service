<template>
  <div class="usage-logs-container">
    <!-- 标题 -->
    <div
      class="mb-4 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <i class="fas fa-history text-lg text-purple-500" />
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">使用日志</h3>
      </div>
      <button
        class="refresh-button flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
        :disabled="loading"
        @click="loadUsageLogs"
      >
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }" />
        刷新
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !logs.length" class="flex justify-center py-12">
      <div class="flex items-center gap-3">
        <i class="fas fa-spinner fa-spin text-2xl text-purple-500" />
        <span class="text-gray-600 dark:text-gray-300">加载中...</span>
      </div>
    </div>

    <!-- 错误提示 -->
    <div
      v-else-if="error"
      class="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200"
    >
      <i class="fas fa-exclamation-triangle mr-2" />
      {{ error }}
    </div>

    <!-- 日志列表 -->
    <div v-else-if="logs.length > 0">
      <!-- 摘要信息 -->
      <div class="summary-grid mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <div class="summary-card">
          <div class="summary-label">总请求数</div>
          <div class="summary-value">{{ pagination.total }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">总费用</div>
          <div class="summary-value text-green-600 dark:text-green-400">
            {{ summary.formattedCost }}
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">总 Tokens</div>
          <div class="summary-value">{{ formatNumber(summary.totalTokens) }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">输入 Tokens</div>
          <div class="summary-value">{{ formatNumber(summary.totalInputTokens) }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">输出 Tokens</div>
          <div class="summary-value">{{ formatNumber(summary.totalOutputTokens) }}</div>
        </div>
      </div>

      <!-- 日志表格 -->
      <div
        class="logs-table-container overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="table-header">时间</th>
              <th class="table-header">模型</th>
              <th class="table-header text-right">输入</th>
              <th class="table-header text-right">输出</th>
              <th class="table-header text-right">缓存创建</th>
              <th class="table-header text-right">缓存读取</th>
              <th class="table-header text-right">总计</th>
              <th class="table-header text-right">费用</th>
              <th class="table-header">账户</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="(log, index) in logs" :key="index" class="log-row">
              <td class="table-cell whitespace-nowrap">
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {{ formatDate(log.timestamp) }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatTime(log.timestamp) }}
                  </span>
                </div>
              </td>
              <td class="table-cell">
                <div class="model-badge">
                  {{ formatModel(log.model) }}
                </div>
              </td>
              <td class="table-cell text-right">
                <span class="token-badge">{{ formatNumber(log.inputTokens) }}</span>
              </td>
              <td class="table-cell text-right">
                <span class="token-badge">{{ formatNumber(log.outputTokens) }}</span>
              </td>
              <td class="table-cell text-right">
                <span v-if="log.cacheCreateTokens > 0" class="cache-badge">
                  {{ formatNumber(log.cacheCreateTokens) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="table-cell text-right">
                <span v-if="log.cacheReadTokens > 0" class="cache-badge">
                  {{ formatNumber(log.cacheReadTokens) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="table-cell text-right font-semibold text-gray-900 dark:text-gray-100">
                {{ formatNumber(log.totalTokens) }}
              </td>
              <td class="table-cell text-right">
                <span class="cost-badge">${{ log.cost.toFixed(6) }}</span>
              </td>
              <td class="table-cell">
                <div v-if="log.accountId" class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-600 dark:text-gray-300">
                    {{ log.accountType || 'unknown' }}
                  </span>
                  <span class="font-mono text-xs text-gray-400 dark:text-gray-500">
                    {{ log.accountId.substring(0, 8) }}...
                  </span>
                </div>
                <span v-else class="text-gray-400">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页控制 -->
      <div class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          显示 {{ offset + 1 }}-{{ Math.min(offset + limit, pagination.total) }} / 共
          {{ pagination.total }} 条
        </div>
        <div class="flex gap-2">
          <button
            class="pagination-button"
            :disabled="offset === 0 || loading"
            @click="previousPage"
          >
            <i class="fas fa-chevron-left" />
            上一页
          </button>
          <button
            class="pagination-button"
            :disabled="!pagination.hasMore || loading"
            @click="nextPage"
          >
            下一页
            <i class="fas fa-chevron-right" />
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
    >
      <i class="fas fa-inbox mb-3 text-4xl" />
      <p>暂无使用日志</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useApiStatsStore } from '@/stores/apistats'
import { apiStatsClient } from '@/config/apiStats'

const apiStatsStore = useApiStatsStore()
const { apiId, apiKey } = storeToRefs(apiStatsStore)

const logs = ref([])
const loading = ref(false)
const error = ref(null)
const pagination = ref({
  total: 0,
  limit: 50,
  offset: 0,
  hasMore: false
})
const summary = ref({
  totalCost: 0,
  formattedCost: '$0.000000',
  totalTokens: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheCreateTokens: 0,
  totalCacheReadTokens: 0
})

const limit = computed(() => pagination.value.limit)
const offset = computed(() => pagination.value.offset)

// 加载使用日志
const loadUsageLogs = async () => {
  if (!apiId.value && !apiKey.value) {
    error.value = '请先输入 API Key 或 API ID'
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await apiStatsClient.getUsageLogs({
      apiId: apiId.value || undefined,
      apiKey: apiKey.value || undefined,
      limit: pagination.value.limit,
      offset: pagination.value.offset
    })

    if (response.success) {
      logs.value = response.data.records
      pagination.value = response.data.pagination
      summary.value = response.data.summary
    } else {
      error.value = response.message || '加载失败'
    }
  } catch (err) {
    console.error('Failed to load usage logs:', err)
    error.value = err.message || '加载使用日志失败'
  } finally {
    loading.value = false
  }
}

// 分页控制
const nextPage = () => {
  if (pagination.value.hasMore) {
    pagination.value.offset += pagination.value.limit
    loadUsageLogs()
  }
}

const previousPage = () => {
  if (pagination.value.offset > 0) {
    pagination.value.offset = Math.max(0, pagination.value.offset - pagination.value.limit)
    loadUsageLogs()
  }
}

// 格式化函数
const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

const formatModel = (model) => {
  if (!model) return 'unknown'
  // 缩短模型名称
  return model
    .replace('claude-3-5-sonnet-', 'sonnet-')
    .replace('claude-3-opus-', 'opus-')
    .replace('claude-3-haiku-', 'haiku-')
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 监听 API Key 变化
watch([apiId, apiKey], () => {
  // 重置分页
  pagination.value.offset = 0
  logs.value = []
  summary.value = {
    totalCost: 0,
    formattedCost: '$0.000000',
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreateTokens: 0,
    totalCacheReadTokens: 0
  }

  // 如果有 API Key，自动加载
  if (apiId.value || apiKey.value) {
    loadUsageLogs()
  }
})

// 暴露方法供外部调用
defineExpose({
  loadUsageLogs
})
</script>

<style scoped>
.usage-logs-container {
  /* 容器样式由父组件控制 */
}

.refresh-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
}

.refresh-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.summary-grid {
  /* Grid布局 */
}

.summary-card {
  @apply rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800;
}

.summary-label {
  @apply text-xs text-gray-500 dark:text-gray-400;
  margin-bottom: 4px;
}

.summary-value {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100;
}

.logs-table-container {
  background: white;
}

:global(.dark) .logs-table-container {
  background: #1f2937;
}

.table-header {
  @apply px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300;
}

.table-cell {
  @apply px-4 py-3 text-sm text-gray-600 dark:text-gray-300;
}

.log-row {
  @apply transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50;
}

.model-badge {
  @apply inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300;
}

.token-badge {
  @apply font-mono text-xs text-gray-700 dark:text-gray-300;
}

.cache-badge {
  @apply inline-flex items-center rounded bg-purple-100 px-2 py-0.5 font-mono text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-300;
}

.cost-badge {
  @apply inline-flex items-center rounded bg-green-100 px-2 py-0.5 font-mono text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300;
}

.pagination-button {
  @apply flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700;
}

.pagination-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
