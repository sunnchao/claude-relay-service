<template>
  <section id="quickstart" class="py-24 bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 标题 -->
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          三步快速开始
        </h2>
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          简单几步，即可开始使用 AI 服务
        </p>
      </div>

      <!-- 步骤 -->
      <div class="grid md:grid-cols-3 gap-8">
        <div
          v-for="(step, index) in steps"
          :key="step.title"
          class="relative"
        >
          <!-- 连接线 -->
          <div
            v-if="index < steps.length - 1"
            class="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary-500 to-transparent"
          ></div>

          <div class="relative z-10 text-center">
            <!-- 步骤数字 -->
            <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white text-3xl font-bold shadow-lg">
              {{ index + 1 }}
            </div>

            <h3 class="mt-6 text-xl font-bold text-gray-900 dark:text-white">
              {{ step.title }}
            </h3>
            <p class="mt-3 text-gray-600 dark:text-gray-400">
              {{ step.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- 代码示例 -->
      <div class="mt-16">
        <div class="card p-6 max-w-3xl mx-auto">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">使用示例</span>
            <button
              @click="copyCode"
              class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {{ copied ? '已复制' : '复制' }}
            </button>
          </div>
          <pre class="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm"><code class="text-gray-100">{{ codeExample }}</code></pre>
        </div>
      </div>

      <!-- CTA -->
      <div class="mt-12 text-center">
        <router-link
          to="/register"
          class="btn btn-primary px-8 py-3 text-lg"
        >
          立即注册，免费使用
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const steps = [
  {
    title: '注册账号',
    description: '创建您的账户，只需邮箱和密码'
  },
  {
    title: '生成 API Key',
    description: '在控制台创建 API Key，设置使用限制'
  },
  {
    title: '开始调用',
    description: '使用 API Key 调用各平台 AI 服务'
  }
]

const codeExample = `# 使用 Claude API
curl -X POST https://your-relay.com/claude/v1/messages \\
  -H "Authorization: Bearer cr_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`

const copied = ref(false)

function copyCode() {
  navigator.clipboard.writeText(codeExample)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>
