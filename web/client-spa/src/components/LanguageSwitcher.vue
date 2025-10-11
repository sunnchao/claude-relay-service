<template>
  <a-dropdown placement="bottomRight">
    <a-button type="text">
      <TranslationOutlined />
      {{ currentLanguageLabel }}
      <DownOutlined />
    </a-button>
    <template #overlay>
      <a-menu @click="handleLanguageChange" :selectedKeys="[locale]">
        <a-menu-item key="zh-CN">
          <span>🇨🇳 中文</span>
        </a-menu-item>
        <a-menu-item key="en-US">
          <span>🇺🇸 English</span>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TranslationOutlined, DownOutlined } from '@ant-design/icons-vue'
import { setLanguage } from '@/locales'

const { locale, t } = useI18n()

const currentLanguageLabel = computed(() => {
  return locale.value === 'zh-CN' ? '中文' : 'English'
})

const handleLanguageChange = ({ key }) => {
  setLanguage(key)
}
</script>

<style scoped>
.ant-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>