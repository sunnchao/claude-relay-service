# 多语言功能实现说明 / Multi-language Implementation Guide

## 功能概述 / Feature Overview

已为 client-spa 项目成功实现多语言支持，支持中文和英文切换，默认显示中文。

Multi-language support has been successfully implemented for the client-spa project, supporting Chinese and English switching with Chinese as the default language.

## 实现内容 / Implementation Details

### 1. 安装的依赖 / Installed Dependencies
- `vue-i18n@^9.8.0` - Vue.js 国际化插件

### 2. 创建的文件 / Created Files
- `src/locales/zh-CN.js` - 中文语言包
- `src/locales/en-US.js` - 英文语言包  
- `src/locales/index.js` - i18n 配置文件
- `src/components/LanguageSwitcher.vue` - 语言切换组件

### 3. 修改的文件 / Modified Files
- `package.json` - 添加 vue-i18n 依赖
- `src/main.js` - 集成 i18n
- `src/App.vue` - 配置 Ant Design Vue 语言包自动切换
- `src/layouts/MainLayout.vue` - 添加语言切换器，使用 i18n
- `src/views/Login.vue` - 使用 i18n 实现多语言
- `src/views/Dashboard.vue` - 使用 i18n 实现多语言
- `src/views/ApiKeys.vue` - 使用 i18n 实现多语言
- `vite.config.js` - 配置路径别名

## 核心功能 / Core Features

### 1. 语言切换 / Language Switching
- 页面右上角有语言切换下拉菜单
- 支持中文（🇨🇳）和英文（🇺🇸）切换
- 切换后立即生效，无需刷新页面

### 2. 语言持久化 / Language Persistence
- 用户选择的语言会保存在 localStorage
- 刷新页面后保持用户选择的语言
- 首次访问默认使用中文

### 3. 组件国际化 / Component Internationalization
- Ant Design Vue 组件语言自动同步切换
- 所有自定义文本支持多语言
- 表单验证消息支持多语言

## 测试方法 / How to Test

1. 启动开发服务器 / Start the development server:
```bash
cd web/client-spa
npm run dev
```

2. 访问应用 / Visit the application:
   - 打开浏览器访问 http://localhost:3000/
   - Open browser and visit http://localhost:3000/

3. 测试语言切换 / Test language switching:
   - 点击右上角的语言切换按钮
   - 选择 "English" 切换到英文
   - 选择 "中文" 切换回中文
   - 刷新页面验证语言设置是否保持

## 语言包结构 / Language Pack Structure

每个语言包包含以下模块：
- `common` - 通用词汇
- `layout` - 布局相关
- `menu` - 菜单项
- `login` - 登录页面
- `register` - 注册页面
- `dashboard` - 控制台页面
- `apiKeys` - API密钥管理页面
- `usage` - 使用统计页面
- `profile` - 个人资料页面
- `home` - 首页
- `errors` - 错误消息
- `success` - 成功消息
- `language` - 语言设置

## 添加新的翻译 / Adding New Translations

1. 在 `src/locales/zh-CN.js` 和 `src/locales/en-US.js` 中添加对应的翻译文本
2. 在组件中使用 `$t('key.path')` 或 `t('key.path')` 引用翻译

示例 / Example:
```vue
<template>
  <h1>{{ $t('dashboard.title') }}</h1>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

// 在 JavaScript 中使用
const message = t('common.loading')
</script>
```

## 注意事项 / Notes

1. ESLint 警告：项目中存在一些关于 `v-model:value` 的 ESLint 警告，这是 Ant Design Vue 4.x 的正常用法，不影响功能
2. 所有新增页面和组件都应该支持多语言
3. 建议保持语言包的键名结构清晰、层次分明