<template>
  <ClientLayout>
    <div class="space-y-6">
      <!-- 页头 -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">使用统计</h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">查看您的 API 使用情况和费用</p>
      </div>

      <!-- 时间范围选择 -->
      <div class="flex gap-2">
        <button
          v-for="period in periods"
          :key="period.value"
          @click="selectedPeriod = period.value"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="selectedPeriod === period.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
        >
          {{ period.label }}
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center py-12">
        <LoadingSpinner text="加载统计数据..." />
      </div>

      <template v-else>
        <!-- 概览卡片 -->
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总请求数"
            :value="stats.totalRequests"
            icon="📊"
            color="primary"
          />
          <StatCard
            title="输入 Token"
            :value="formatNumber(stats.totalInputTokens)"
            icon="📥"
            color="green"
          />
          <StatCard
            title="输出 Token"
            :value="formatNumber(stats.totalOutputTokens)"
            icon="📤"
            color="blue"
          />
          <StatCard
            title="总费用"
            :value="stats.totalCost"
            icon="💰"
            color="purple"
            format="currency"
          />
        </div>

        <!-- 按模型统计 -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">按模型统计</h3>

          <div v-if="stats.byModel && Object.keys(stats.byModel).length > 0" class="space-y-4">
            <div
              v-for="(modelStats, model) in stats.byModel"
              :key="model"
              class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-lg">
                  🤖
                </div>
                <div>
                  <div class="font-medium text-gray-900 dark:text-white">{{ model }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ modelStats.requests }} 请求
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-semibold text-gray-900 dark:text-white">${{ (modelStats.cost || 0).toFixed(4) }}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatNumber((modelStats.inputTokens || 0) + (modelStats.outputTokens || 0)) }} tokens
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无使用数据
          </div>
        </div>

        <!-- 按日期统计 -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">每日统计</h3>

          <div v-if="stats.byDate && Object.keys(stats.byDate).length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th class="pb-3 font-medium">日期</th>
                  <th class="pb-3 font-medium">请求数</th>
                  <th class="pb-3 font-medium">Token</th>
                  <th class="pb-3 font-medium text-right">费用</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr
                  v-for="(dayStats, date) in sortedByDate"
                  :key="date"
                  class="text-sm"
                >
                  <td class="py-3 text-gray-900 dark:text-white">{{ date }}</td>
                  <td class="py-3 text-gray-600 dark:text-gray-400">{{ dayStats.requests }}</td>
                  <td class="py-3 text-gray-600 dark:text-gray-400">
                    {{ formatNumber((dayStats.inputTokens || 0) + (dayStats.outputTokens || 0)) }}
                  </td>
                  <td class="py-3 text-right text-gray-900 dark:text-white">${{ (dayStats.cost || 0).toFixed(4) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无使用数据
          </div>
        </div>
      </template>
    </div>
  </ClientLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useUsageStore } from '@/stores/usage'
import ClientLayout from '@/components/layout/ClientLayout.vue'
import StatCard from '@/components/common/StatCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const usageStore = useUsageStore()

const loading = ref(false)
const selectedPeriod = ref('week')

const periods = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '今年' }
]

const stats = computed(() => usageStore.stats || {
  totalRequests: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCost: 0,
  byModel: {},
  byDate: {}
})

const sortedByDate = computed(() => {
  if (!stats.value.byDate) return {}
  const entries = Object.entries(stats.value.byDate)
  entries.sort((a, b) => b[0].localeCompare(a[0]))
  return Object.fromEntries(entries)
})

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

async function fetchStats() {
  loading.value = true
  await usageStore.fetchStats({ period: selectedPeriod.value })
  loading.value = false
}

watch(selectedPeriod, fetchStats)

onMounted(fetchStats)
</script>
