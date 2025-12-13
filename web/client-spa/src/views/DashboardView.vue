<template>
  <ClientLayout>
    <div class="space-y-4">
      <!-- 欢迎卡片 -->
      <div class="card p-4 md:p-5 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
        <h2 class="text-2xl font-bold">
          欢迎回来, {{ authStore.user?.displayName || authStore.user?.username }}! 👋
        </h2>
        <p class="mt-2 text-white/80">管理您的 API Keys 和查看使用统计</p>
      </div>

      <!-- 统计卡片 -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="API Keys" :value="stats.apiKeyCount" icon="🔑" color="primary" />
        <StatCard title="总请求数" :value="stats.totalRequests" icon="📊" color="green" />
        <StatCard
          title="总 Token 使用"
          :value="formatNumber(stats.totalTokens)"
          icon="💬"
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

      <!-- 快捷操作 -->
      <div class="card p-4 md:p-5">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">快捷操作</h3>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <router-link
            to="/api-keys"
            class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div
              class="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl"
            >
              🔑
            </div>
            <div>
              <div class="font-medium text-gray-900 dark:text-white">管理 API Keys</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">创建和管理您的 API Keys</div>
            </div>
          </router-link>

          <router-link
            to="/usage"
            class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div
              class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-2xl"
            >
              📈
            </div>
            <div>
              <div class="font-medium text-gray-900 dark:text-white">查看统计</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">详细的使用统计和分析</div>
            </div>
          </router-link>

          <router-link
            to="/settings"
            class="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div
              class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-2xl"
            >
              ⚙️
            </div>
            <div>
              <div class="font-medium text-gray-900 dark:text-white">账户设置</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">修改密码和个人信息</div>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </ClientLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUsageStore } from '@/stores/usage'
import ClientLayout from '@/components/layout/ClientLayout.vue'
import StatCard from '@/components/common/StatCard.vue'

const authStore = useAuthStore()
const usageStore = useUsageStore()

const stats = ref({
  apiKeyCount: 0,
  totalRequests: 0,
  totalTokens: 0,
  totalCost: 0
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

onMounted(async () => {
  await usageStore.fetchStats()
  if (usageStore.stats) {
    stats.value = {
      apiKeyCount: authStore.user?.apiKeyCount || 0,
      totalRequests: usageStore.stats.totalRequests || 0,
      totalTokens:
        (usageStore.stats.totalInputTokens || 0) + (usageStore.stats.totalOutputTokens || 0),
      totalCost: usageStore.stats.totalCost || 0
    }
  }
})
</script>
