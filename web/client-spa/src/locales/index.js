import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

// 获取浏览器语言
const getBrowserLanguage = () => {
  const lang = navigator.language || navigator.userLanguage
  if (lang.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

// 获取存储的语言设置，如果没有则使用中文作为默认语言
const getStoredLanguage = () => {
  return localStorage.getItem('language') || 'zh-CN'
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: getStoredLanguage(), // 默认使用存储的语言或中文
  fallbackLocale: 'zh-CN', // 备用语言
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

// 导出一个函数用于切换语言
export const setLanguage = (lang) => {
  i18n.global.locale.value = lang
  localStorage.setItem('language', lang)
  
  // 更新 Ant Design Vue 的语言配置
  // 这将在组件中处理
}

// 导出当前语言
export const getCurrentLanguage = () => {
  return i18n.global.locale.value
}

export default i18n