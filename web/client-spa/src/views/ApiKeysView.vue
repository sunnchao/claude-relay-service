<template>
  <ClientLayout>
    <div class="space-y-6">
      <!-- 页头 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p class="mt-1 text-gray-600 dark:text-gray-400">管理您的 API Keys</p>
        </div>
        <button @click="showCreateModal = true" class="btn btn-primary">
          <span class="mr-2">+</span>
          创建 API Key
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center py-12">
        <LoadingSpinner text="加载中..." />
      </div>

      <!-- API Keys 列表 -->
      <div v-else-if="apiKeysStore.keys.length > 0" class="space-y-4">
        <div
          v-for="key in apiKeysStore.keys"
          :key="key.id"
          class="card p-6"
        >
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ key.name }}</h3>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="key.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                >
                  {{ key.status === 'active' ? '活跃' : '禁用' }}
                </span>
              </div>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ key.description || '暂无描述' }}</p>
              <div class="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>创建: {{ formatDate(key.createdAt) }}</span>
                <span v-if="key.expiresAt">过期: {{ formatDate(key.expiresAt) }}</span>
              </div>
            </div>

            <!-- 使用统计 -->
            <div class="flex flex-wrap gap-4 text-center">
              <div class="px-4">
                <div class="text-xl font-bold text-gray-900 dark:text-white">{{ key.usage?.total?.requests || 0 }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">请求数</div>
              </div>
              <div class="px-4">
                <div class="text-xl font-bold text-gray-900 dark:text-white">${{ (key.totalCost || 0).toFixed(2) }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">费用</div>
              </div>
            </div>

            <!-- 操作 -->
            <div class="flex items-center gap-2">
              <button
                @click="copyKey(key)"
                class="btn btn-secondary text-sm"
              >
                复制
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="card p-12 text-center">
        <div class="text-4xl mb-4">🔑</div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">暂无 API Key</h3>
        <p class="mt-2 text-gray-600 dark:text-gray-400">创建您的第一个 API Key 开始使用</p>
        <button @click="showCreateModal = true" class="btn btn-primary mt-4">
          创建 API Key
        </button>
      </div>
    </div>

    <!-- 创建 Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showCreateModal = false"></div>
        <div class="relative card p-6 w-full max-w-md">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">创建 API Key</h2>

          <form @submit.prevent="handleCreateKey" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                名称 <span class="text-red-500">*</span>
              </label>
              <input v-model="newKey.name" type="text" required class="input" placeholder="例如：我的应用" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述
              </label>
              <input v-model="newKey.description" type="text" class="input" placeholder="可选描述" />
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showCreateModal = false" class="btn btn-secondary">
                取消
              </button>
              <button type="submit" class="btn btn-primary" :disabled="creating">
                {{ creating ? '创建中...' : '创建' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- 显示新 Key Modal -->
    <Teleport to="body">
      <div v-if="showNewKeyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showNewKeyModal = false"></div>
        <div class="relative card p-6 w-full max-w-md">
          <div class="text-center mb-4">
            <div class="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-3xl">
              ✓
            </div>
          </div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">API Key 创建成功！</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
            请立即复制保存，此 Key 仅显示一次
          </p>

          <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm break-all">
            {{ createdKeyValue }}
          </div>

          <div class="flex justify-center gap-3 mt-4">
            <button @click="copyCreatedKey" class="btn btn-primary">
              {{ copiedCreatedKey ? '已复制' : '复制' }}
            </button>
            <button @click="showNewKeyModal = false" class="btn btn-secondary">
              关闭
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientLayout>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue'
import { useApiKeysStore } from '@/stores/apiKeys'
import ClientLayout from '@/components/layout/ClientLayout.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const apiKeysStore = useApiKeysStore()
const toast = inject('toast')

const loading = ref(false)
const showCreateModal = ref(false)
const showNewKeyModal = ref(false)
const creating = ref(false)
const createdKeyValue = ref('')
const copiedCreatedKey = ref(false)

const newKey = reactive({
  name: '',
  description: ''
})

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

async function copyKey(key) {
  const keyValue = key.maskedKey || key.key || `${key.id.slice(0, 8)}...`
  await navigator.clipboard.writeText(keyValue)
  toast.info('已复制（仅显示部分）')
}

async function copyCreatedKey() {
  await navigator.clipboard.writeText(createdKeyValue.value)
  copiedCreatedKey.value = true
  setTimeout(() => {
    copiedCreatedKey.value = false
  }, 2000)
}

async function handleCreateKey() {
  if (!newKey.name) return

  creating.value = true
  const result = await apiKeysStore.createKey({
    name: newKey.name,
    description: newKey.description
  })

  if (result.success) {
    showCreateModal.value = false
    createdKeyValue.value = result.apiKey?.key || result.apiKey?.id || ''
    showNewKeyModal.value = true
    newKey.name = ''
    newKey.description = ''
    toast.success('API Key 创建成功')
  } else {
    toast.error(result.error || '创建失败')
  }

  creating.value = false
}

onMounted(async () => {
  loading.value = true
  await apiKeysStore.fetchKeys()
  loading.value = false
})
</script>
