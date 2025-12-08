<template>
  <div class="usage-logs-admin space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">全局使用日志</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">查看所有 API Key 的实时用量</p>
      </div>
      <button class="refresh-btn" :disabled="loading" @click="handleRefresh">
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }" />
        刷新
      </button>
    </div>

    <div class="glass-strong rounded-2xl p-4 shadow-lg sm:p-5">
      <div class="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="filter-field">
          <label>关键词</label>
          <input
            v-model="filters.search"
            class="filter-input"
            placeholder="请求ID / API Key ID / 模型"
            type="text"
          />
        </div>
        <div class="filter-field">
          <label>模型</label>
          <input v-model="filters.model" class="filter-input" placeholder="模型名称" type="text" />
        </div>
        <div class="filter-field">
          <label>API Key ID</label>
          <input
            v-model="filters.apiKeyId"
            class="filter-input"
            placeholder="API Key ID"
            type="text"
          />
        </div>
        <div class="filter-field">
          <label>用户 ID</label>
          <input v-model="filters.userId" class="filter-input" placeholder="用户 ID" type="text" />
        </div>
        <div class="filter-field">
          <label>账户 ID</label>
          <input
            v-model="filters.accountId"
            class="filter-input"
            placeholder="账户 ID"
            type="text"
          />
        </div>
        <div class="filter-field">
          <label>账户类型</label>
          <select v-model="filters.accountType" class="filter-input">
            <option value="">全部</option>
            <option value="claude">Claude</option>
            <option value="claude-console">Claude Console</option>
            <option value="openai">OpenAI</option>
            <option value="azure_openai">Azure OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="bedrock">Bedrock</option>
            <option value="droid">Droid</option>
          </select>
        </div>
        <div class="filter-field">
          <label>起始日期</label>
          <input v-model="filters.startDate" class="filter-input" type="date" />
        </div>
        <div class="filter-field">
          <label>结束日期</label>
          <input v-model="filters.endDate" class="filter-input" type="date" />
        </div>
      </div>
      <div class="flex flex-wrap gap-3">
        <button class="primary-btn" :disabled="loading" @click="applyFilters">
          <i class="fas fa-search" /> 查询
        </button>
        <button class="ghost-btn" :disabled="loading" @click="resetAllFilters">
          <i class="fas fa-undo" /> 重置
        </button>
      </div>
    </div>

    <div class="glass-strong rounded-2xl p-4 shadow-lg sm:p-5">
      <div
        v-if="error"
        class="rounded-xl border border-red-400 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/50 dark:bg-red-900/30 dark:text-red-200"
      >
        <i class="fas fa-exclamation-triangle mr-2" />
        {{ error }}
      </div>

      <template v-else>
        <div class="summary-grid mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div class="summary-card">
            <p>总记录</p>
            <h3>{{ pagination.total.toLocaleString() }}</h3>
          </div>
          <div class="summary-card">
            <p>总费用</p>
            <h3 class="text-emerald-500">{{ summary.formattedCost }}</h3>
          </div>
          <div class="summary-card">
            <p>总 Tokens</p>
            <h3>{{ formatNumber(summary.totalTokens) }}</h3>
          </div>
          <div class="summary-card">
            <p>输入 Tokens</p>
            <h3>{{ formatNumber(summary.totalInputTokens) }}</h3>
          </div>
          <div class="summary-card">
            <p>输出 Tokens</p>
            <h3>{{ formatNumber(summary.totalOutputTokens) }}</h3>
          </div>
          <div class="summary-card">
            <p>缓存 Tokens</p>
            <h3>
              {{ formatNumber(summary.totalCacheCreateTokens + summary.totalCacheReadTokens) }}
            </h3>
          </div>
        </div>

        <div v-if="loading && !logs.length" class="flex justify-center py-16 text-gray-500">
          <div class="flex items-center gap-3">
            <i class="fas fa-spinner fa-spin text-2xl text-indigo-500" />
            正在加载使用日志...
          </div>
        </div>

        <template v-else>
          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table class="usage-table w-full">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>API Key</th>
                  <th>用户</th>
                  <th>模型</th>
                  <th class="text-right">输入</th>
                  <th class="text-right">输出</th>
                  <th class="text-right">缓存创建</th>
                  <th class="text-right">缓存读取</th>
                  <th class="text-right">总计</th>
                  <th class="text-right">费用</th>
                  <th>账户</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="log in logs"
                  :key="log.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <td>
                    <div class="flex flex-col text-xs">
                      <span class="font-semibold text-gray-900 dark:text-gray-100">{{
                        formatDate(log.usageTimestamp)
                      }}</span>
                      <span class="text-gray-500 dark:text-gray-400">{{
                        formatTime(log.usageTimestamp)
                      }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="flex flex-col text-xs">
                      <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                        log.apiKeyName || '未命名 Key'
                      }}</span>
                      <span class="text-gray-500 dark:text-gray-400">{{
                        shortId(log.apiKeyId)
                      }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="flex flex-col text-xs">
                      <span>{{ log.userId || '-' }}</span>
                      <span v-if="log.requestId" class="text-gray-400">{{
                        shortId(log.requestId)
                      }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="model-badge">{{ formatModel(log.model) }}</span>
                    <span
                      v-if="log.isLongContext"
                      class="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
                      >Long</span
                    >
                  </td>
                  <td class="text-right">
                    <span class="token-text">{{ formatNumber(log.inputTokens) }}</span>
                  </td>
                  <td class="text-right">
                    <span class="token-text">{{ formatNumber(log.outputTokens) }}</span>
                  </td>
                  <td class="text-right">
                    <span v-if="log.cacheCreateTokens" class="cache-badge">{{
                      formatNumber(log.cacheCreateTokens)
                    }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="text-right">
                    <span v-if="log.cacheReadTokens" class="cache-badge">{{
                      formatNumber(log.cacheReadTokens)
                    }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="text-right font-semibold">{{ formatNumber(log.totalTokens) }}</td>
                  <td class="text-right">
                    <span class="cost-badge">{{ formatCost(log.cost) }}</span>
                  </td>
                  <td>
                    <div class="flex flex-col text-xs">
                      <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                        log.accountName || '未命名账户'
                      }}</span>
                      <span class="uppercase tracking-wide text-gray-600 dark:text-gray-300">{{
                        log.accountType || '-'
                      }}</span>
                      <span class="text-gray-400">{{ shortId(log.accountId) }}</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="!logs.length">
                  <td
                    class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                    colspan="11"
                  >
                    <i class="fas fa-inbox mb-2 text-lg" />
                    暂无记录，调整筛选条件后重试
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              显示 {{ tableRange }} / 共 {{ pagination.total.toLocaleString() }} 条
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <label class="text-sm text-gray-500 dark:text-gray-400">
                每页
                <select class="filter-input" :value="pagination.limit" @change="handleLimitChange">
                  <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
                </select>
              </label>
              <div class="flex gap-2">
                <button
                  class="pager-btn"
                  :disabled="pagination.offset === 0 || loading"
                  @click="previousPage"
                >
                  <i class="fas fa-chevron-left" /> 上一页
                </button>
                <button
                  class="pager-btn"
                  :disabled="pagination.offset + pagination.limit >= pagination.total || loading"
                  @click="nextPage"
                >
                  下一页 <i class="fas fa-chevron-right" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUsageLogsStore } from '@/stores/usageLogs'
import { formatNumber } from '@/utils/format'

const usageLogsStore = useUsageLogsStore()
const { logs, loading, error, summary, pagination, filters } = storeToRefs(usageLogsStore)
const { fetchUsageLogs, resetFilters } = usageLogsStore

const pageSizes = [25, 50, 100, 150, 200]

const tableRange = computed(() => {
  if (!pagination.value.total || !logs.value.length) {
    return '0-0'
  }
  const start = pagination.value.offset + 1
  const end = Math.min(pagination.value.offset + pagination.value.limit, pagination.value.total)
  return `${start}-${end}`
})

const applyFilters = () => {
  pagination.value.offset = 0
  fetchUsageLogs()
}

const resetAllFilters = () => {
  resetFilters()
  pagination.value.offset = 0
  fetchUsageLogs()
}

const handleRefresh = () => {
  pagination.value.offset = 0
  fetchUsageLogs()
}

const nextPage = () => {
  if (pagination.value.offset + pagination.value.limit >= pagination.value.total) return
  pagination.value.offset += pagination.value.limit
  fetchUsageLogs()
}

const previousPage = () => {
  if (pagination.value.offset === 0) return
  pagination.value.offset = Math.max(0, pagination.value.offset - pagination.value.limit)
  fetchUsageLogs()
}

const handleLimitChange = (event) => {
  const newLimit = Number(event.target.value) || pagination.value.limit
  pagination.value.limit = newLimit
  pagination.value.offset = 0
  fetchUsageLogs()
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatCost = (value) => `$${Number(value || 0).toFixed(6)}`

const shortId = (value) => {
  if (!value) return '-'
  const text = String(value)
  if (text.length <= 10) return text
  return `${text.slice(0, 4)}...${text.slice(-4)}`
}

const formatModel = (model) => {
  if (!model) return 'unknown'
  return model
    .replace('claude-3-5-sonnet-', 'sonnet-')
    .replace('claude-3-opus-', 'opus-')
    .replace('claude-3-haiku-', 'haiku-')
}

onMounted(() => {
  fetchUsageLogs()
})
</script>

<style scoped>
.usage-logs-admin {
  min-height: 60vh;
}

.refresh-btn {
  @apply inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-400;
}

.filter-field label {
  @apply mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400;
}

.filter-input {
  @apply w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200;
}

.primary-btn {
  @apply inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60;
}

.ghost-btn {
  @apply inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800;
}

.summary-card {
  @apply rounded-2xl border border-gray-200 bg-white/70 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/60;
}

.summary-card p {
  @apply text-xs uppercase tracking-wide text-gray-500;
}

.summary-card h3 {
  @apply mt-2 text-xl font-bold text-gray-900 dark:text-white;
}

.usage-table th {
  @apply bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300;
}

.usage-table td {
  @apply px-4 py-3 text-sm text-gray-700 dark:text-gray-200;
}

.model-badge {
  @apply inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200;
}

.token-text {
  @apply font-mono text-xs text-gray-700 dark:text-gray-300;
}

.cache-badge {
  @apply inline-flex items-center rounded bg-purple-100 px-2 py-0.5 font-mono text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-200;
}

.cost-badge {
  @apply inline-flex items-center rounded bg-green-100 px-2 py-0.5 font-mono text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-200;
}

.pager-btn {
  @apply inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200;
}
</style>
