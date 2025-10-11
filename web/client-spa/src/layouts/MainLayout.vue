<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header class="header">
      <div class="logo">{{ $t('layout.title') }}</div>
      <div class="header-right">
        <a-menu
          v-if="!isAuthenticated"
          theme="dark"
          mode="horizontal"
          :selectedKeys="selectedKeys"
          style="line-height: 64px; display: inline-block"
        >
          <a-menu-item key="home">
            <router-link to="/">{{ $t('menu.home') }}</router-link>
          </a-menu-item>
          <a-menu-item key="login">
            <router-link to="/login">{{ $t('menu.login') }}</router-link>
          </a-menu-item>
          <a-menu-item key="register">
            <router-link to="/register">{{ $t('menu.register') }}</router-link>
          </a-menu-item>
        </a-menu>

        <div v-else style="display: inline-block; margin-right: 16px">
          <a-dropdown>
            <a-button type="text" style="color: white">
              <UserOutlined /> {{ userEmail }}
              <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu @click="handleMenuClick">
                <a-menu-item key="profile">
                  <UserOutlined /> {{ $t('menu.profile') }}
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout">
                  <LogoutOutlined /> {{ $t('layout.logout') }}
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        
        <LanguageSwitcher style="display: inline-block" />
      </div>
    </a-layout-header>

    <a-layout v-if="isAuthenticated">
      <a-layout-sider
        v-model:collapsed="collapsed"
        :trigger="null"
        collapsible
        theme="light"
      >
        <a-menu
          mode="inline"
          :selectedKeys="selectedKeys"
          style="height: 100%; borderRight: 0"
        >
          <a-menu-item key="dashboard">
            <DashboardOutlined />
            <span>{{ $t('menu.dashboard') }}</span>
            <router-link to="/dashboard" />
          </a-menu-item>
          <a-menu-item key="api-keys">
            <KeyOutlined />
            <span>{{ $t('menu.apiKeys') }}</span>
            <router-link to="/api-keys" />
          </a-menu-item>
          <a-menu-item key="usage">
            <BarChartOutlined />
            <span>{{ $t('menu.usage') }}</span>
            <router-link to="/usage" />
          </a-menu-item>
          <a-menu-item key="profile">
            <UserOutlined />
            <span>{{ $t('menu.profile') }}</span>
            <router-link to="/profile" />
          </a-menu-item>
        </a-menu>
      </a-layout-sider>
      <a-layout-content style="padding: 24px; minHeight: 280px">
        <router-view />
      </a-layout-content>
    </a-layout>

    <a-layout-content v-else style="padding: 24px; minHeight: 280px">
      <router-view />
    </a-layout-content>

    <a-layout-footer style="text-align: center">
      {{ $t('layout.copyright') }}
    </a-layout-footer>
  </a-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import {
  UserOutlined,
  DownOutlined,
  LogoutOutlined,
  DashboardOutlined,
  KeyOutlined,
  BarChartOutlined
} from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const collapsed = ref(false)
const userEmail = ref(localStorage.getItem('userEmail') || 'User')

const isAuthenticated = computed(() => {
  return !!localStorage.getItem('token')
})

const selectedKeys = computed(() => {
  const path = route.path
  if (path === '/') return ['home']
  if (path === '/login') return ['login']
  if (path === '/register') return ['register']
  if (path === '/dashboard') return ['dashboard']
  if (path === '/api-keys') return ['api-keys']
  if (path === '/usage') return ['usage']
  if (path === '/profile') return ['profile']
  return []
})

const handleMenuClick = ({ key }) => {
  if (key === 'logout') {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    message.success(t('layout.logoutSuccess'))
    router.push('/login')
  } else if (key === 'profile') {
    router.push('/profile')
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 50px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  color: white;
  font-size: 20px;
  font-weight: bold;
}

.ant-layout-sider {
  background: white;
}
</style>