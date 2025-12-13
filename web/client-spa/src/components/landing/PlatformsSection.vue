<template>
  <section id="platforms" class="py-24 bg-white dark:bg-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 标题 -->
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          支持的 AI 平台
        </h2>
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          统一接入主流 AI 服务商，无缝切换不同模型
        </p>
      </div>

      <!-- 平台列表 -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div
          v-for="platform in platforms"
          :key="platform.name"
          class="group flex flex-col items-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300"
        >
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold transition-transform group-hover:scale-110"
            :class="platform.bgClass"
          >
            {{ platform.icon }}
          </div>
          <h3 class="mt-4 font-semibold text-gray-900 dark:text-white">
            {{ platform.name }}
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
            {{ platform.description }}
          </p>
        </div>
      </div>

      <!-- 更多平台提示 -->
      <div class="mt-12 text-center">
        <p class="text-gray-500 dark:text-gray-400">
          更多平台持续接入中...
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
const platforms = [
  {
    name: 'Claude',
    description: 'Anthropic',
    icon: 'C',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  },
  {
    name: 'Gemini',
    description: 'Google',
    icon: 'G',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
  },
  {
    name: 'OpenAI',
    description: 'GPT 系列',
    icon: 'O',
    bgClass: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
  },
  {
    name: 'Bedrock',
    description: 'AWS',
    icon: 'B',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
  },
  {
    name: 'Azure',
    description: 'Microsoft',
    icon: 'A',
    bgClass: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
  }
]
</script>
