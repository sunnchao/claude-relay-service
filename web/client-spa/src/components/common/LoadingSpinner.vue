<template>
  <div class="flex items-center justify-center" :class="sizeClass">
    <div class="relative">
      <div
        class="animate-spin rounded-full border-2 border-current border-t-transparent"
        :class="[spinnerSize, colorClass]"
      ></div>
    </div>
    <span v-if="text" class="ml-3" :class="textClass">{{ text }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: 'md' // 'sm' | 'md' | 'lg'
  },
  text: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'primary' // 'primary' | 'white' | 'gray'
  }
})

const sizeClass = computed(() => {
  const sizes = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12'
  }
  return sizes[props.size]
})

const spinnerSize = computed(() => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }
  return sizes[props.size]
})

const colorClass = computed(() => {
  const colors = {
    primary: 'text-primary-600',
    white: 'text-white',
    gray: 'text-gray-400'
  }
  return colors[props.color]
})

const textClass = computed(() => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }
  return sizes[props.size]
})
</script>
