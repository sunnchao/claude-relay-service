<template>
  <section id="features" class="py-24 bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 标题 -->
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          强大的功能特性
        </h2>
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          一站式 AI API 管理平台，为您的应用提供稳定、高效的 AI 能力
        </p>
      </div>

      <!-- 功能卡片 -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="(feature, index) in features"
          :key="feature.title"
          class="group card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 transition-transform group-hover:scale-110"
            :class="feature.bgClass"
          >
            {{ feature.icon }}
          </div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {{ feature.title }}
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            {{ feature.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const features = [
  {
    icon: '🌐',
    title: '多平台支持',
    description: '一个 API Key 访问 Claude、Gemini、OpenAI、Bedrock、Azure 等多个 AI 平台',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30'
  },
  {
    icon: '🔑',
    title: 'API Key 管理',
    description: '创建、管理多个 API Key，设置使用配额和过期时间，灵活控制访问权限',
    bgClass: 'bg-green-100 dark:bg-green-900/30'
  },
  {
    icon: '📊',
    title: '使用监控',
    description: '实时查看 API 调用统计、Token 使用量和成本分析，掌握资源消耗情况',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30'
  },
  {
    icon: '💰',
    title: '成本控制',
    description: '设置日限额和总限额，防止意外超支，合理规划 AI 使用预算',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30'
  },
  {
    icon: '🔒',
    title: '企业安全',
    description: '支持 LDAP 认证集成，完善的权限控制和审计日志，满足企业安全需求',
    bgClass: 'bg-red-100 dark:bg-red-900/30'
  },
  {
    icon: '⚡',
    title: '实时统计',
    description: '毫秒级延迟监控，实时查看请求状态和响应时间，确保服务稳定运行',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900/30'
  }
]
</script>
