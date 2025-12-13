<template>
  <div class="card p-6" :class="cardClass">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ title }}</p>
        <p class="mt-1 text-2xl font-bold" :class="valueClass">{{ formattedValue }}</p>
        <p v-if="subtitle" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
      </div>
      <div
        v-if="icon"
        class="flex items-center justify-center w-12 h-12 rounded-xl"
        :class="iconBgClass"
      >
        <span class="text-2xl">{{ icon }}</span>
      </div>
    </div>
    <div v-if="change !== undefined" class="mt-4 flex items-center">
      <span
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        :class="changeClass"
      >
        {{ changePrefix }}{{ Math.abs(change) }}%
      </span>
      <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">{{ changeLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [Number, String], required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  color: { type: String, default: 'primary' },
  change: { type: Number, default: undefined },
  changeLabel: { type: String, default: '较上期' },
  format: { type: String, default: 'number' } // 'number' | 'currency' | 'percent'
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value

  switch (props.format) {
    case 'currency':
      return `$${props.value.toFixed(2)}`
    case 'percent':
      return `${props.value}%`
    default:
      return props.value.toLocaleString()
  }
})

const cardClass = computed(() => {
  return ''
})

const valueClass = computed(() => {
  const colors = {
    primary: 'text-primary-600 dark:text-primary-400',
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400'
  }
  return colors[props.color] || colors.primary
})

const iconBgClass = computed(() => {
  const colors = {
    primary: 'bg-primary-100 dark:bg-primary-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30'
  }
  return colors[props.color] || colors.primary
})

const changeClass = computed(() => {
  if (props.change > 0) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  } else if (props.change < 0) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
})

const changePrefix = computed(() => (props.change > 0 ? '+' : ''))
</script>
