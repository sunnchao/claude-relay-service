<template>
  <section class="relative min-h-screen flex items-center overflow-hidden">
    <!-- 背景渐变 -->
    <div class="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700"></div>

    <!-- 装饰图案 -->
    <div class="absolute inset-0 opacity-30">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-400/20 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 1s"></div>
    </div>

    <!-- 内容 -->
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
      <div class="grid lg:grid-cols-2 gap-12 items-center">
        <!-- 左侧文字 -->
        <div class="text-center lg:text-left">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight animate-fade-in-up">
            统一的 AI API
            <span class="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-primary-200">
              中转服务
            </span>
          </h1>

          <p class="mt-6 text-lg sm:text-xl text-white/80 max-w-xl animate-fade-in-up" style="animation-delay: 0.1s">
            支持 Claude、Gemini、OpenAI、AWS Bedrock 等多平台。
            一个 API Key，访问所有 AI 服务。
          </p>

          <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up" style="animation-delay: 0.2s">
            <router-link
              to="/register"
              class="btn px-8 py-3 text-lg bg-white text-primary-600 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all"
            >
              免费开始
              <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </router-link>

            <a
              href="#features"
              class="btn px-8 py-3 text-lg border-2 border-white/30 text-white hover:bg-white/10"
            >
              了解更多
            </a>
          </div>

          <!-- 统计数据 -->
          <div class="mt-12 grid grid-cols-3 gap-8 animate-fade-in-up" style="animation-delay: 0.3s">
            <div class="text-center lg:text-left">
              <div class="text-3xl font-bold text-white">5+</div>
              <div class="text-sm text-white/60">支持平台</div>
            </div>
            <div class="text-center lg:text-left">
              <div class="text-3xl font-bold text-white">99.9%</div>
              <div class="text-sm text-white/60">可用性</div>
            </div>
            <div class="text-center lg:text-left">
              <div class="text-3xl font-bold text-white">0</div>
              <div class="text-sm text-white/60">服务费用</div>
            </div>
          </div>
        </div>

        <!-- 右侧插图 -->
        <div class="hidden lg:block animate-fade-in-up" style="animation-delay: 0.4s">
          <div class="relative">
            <!-- API 连接示意图 -->
            <div class="rounded-2xl p-8 shadow-2xl bg-gray-900/80 backdrop-blur-sm border border-white/10">
              <div class="space-y-4">
                <div class="flex items-center gap-4 p-4 bg-white/20 rounded-xl">
                  <div class="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">C</div>
                  <div>
                    <div class="text-white font-semibold">Claude</div>
                    <div class="text-gray-300 text-sm">Anthropic API</div>
                  </div>
                  <div class="ml-auto w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                </div>

                <div class="flex items-center gap-4 p-4 bg-white/20 rounded-xl">
                  <div class="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">G</div>
                  <div>
                    <div class="text-white font-semibold">Gemini</div>
                    <div class="text-gray-300 text-sm">Google AI</div>
                  </div>
                  <div class="ml-auto w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                </div>

                <div class="flex items-center gap-4 p-4 bg-white/20 rounded-xl">
                  <div class="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold">O</div>
                  <div>
                    <div class="text-white font-semibold">OpenAI</div>
                    <div class="text-gray-300 text-sm">GPT & DALL-E</div>
                  </div>
                  <div class="ml-auto w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                </div>

                <div class="flex items-center gap-4 p-4 bg-white/20 rounded-xl">
                  <div class="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center text-white font-bold">B</div>
                  <div>
                    <div class="text-white font-semibold">Bedrock</div>
                    <div class="text-gray-300 text-sm">AWS AI Services</div>
                  </div>
                  <div class="ml-auto w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部波浪 -->
    <div class="absolute bottom-0 left-0 right-0">
      <svg class="w-full h-24 text-gray-50 dark:text-gray-900" preserveAspectRatio="none" viewBox="0 0 1440 74">
        <path fill="currentColor" d="M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,42.7C960,43,1056,53,1152,53.3C1248,53,1344,43,1392,37.3L1440,32L1440,74L1392,74C1344,74,1248,74,1152,74C1056,74,960,74,864,74C768,74,672,74,576,74C480,74,384,74,288,74C192,74,96,74,48,74L0,74Z"></path>
      </svg>
    </div>
  </section>
</template>
