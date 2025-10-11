<template>
  <div class="dashboard-container">
    <h1>{{ $t('dashboard.title') }}</h1>

    <a-row :gutter="[16, 16]" style="margin-bottom: 24px">
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic
            :title="$t('dashboard.stats.apiKeys')"
            :value="stats.apiKeys"
            :prefix="h(KeyOutlined)"
          />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic
            :title="$t('dashboard.stats.totalRequests')"
            :value="stats.totalRequests"
            :prefix="h(ApiOutlined)"
          />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic
            :title="$t('dashboard.stats.tokensUsed')"
            :value="stats.tokensUsed"
            suffix="/ 100,000"
            :prefix="h(FireOutlined)"
          />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card>
          <a-statistic
            :title="$t('dashboard.stats.currentPlan')"
            :value="stats.currentPlan"
            :prefix="h(CrownOutlined)"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="16">
        <a-card :title="$t('dashboard.usageOverview')" :bordered="false">
          <div style="height: 300px; display: flex; align-items: center; justify-content: center">
            <a-empty :description="$t('dashboard.chartPlaceholder')" />
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8">
        <a-card :title="$t('dashboard.quickActions')" :bordered="false">
          <a-space direction="vertical" style="width: 100%">
            <router-link to="/api-keys">
              <a-button type="primary" block>
                <PlusOutlined /> {{ $t('dashboard.createApiKey') }}
              </a-button>
            </router-link>
            <router-link to="/usage">
              <a-button block>
                <BarChartOutlined /> {{ $t('dashboard.viewDetailedUsage') }}
              </a-button>
            </router-link>
            <router-link to="/profile">
              <a-button block>
                <UserOutlined /> {{ $t('dashboard.updateProfile') }}
              </a-button>
            </router-link>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <a-row style="margin-top: 16px">
      <a-col :span="24">
        <a-card :title="$t('dashboard.recentActivity')" :bordered="false">
          <a-table
            :columns="activityColumns"
            :data-source="recentActivity"
            :pagination="{ pageSize: 5 }"
          />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  KeyOutlined,
  ApiOutlined,
  FireOutlined,
  CrownOutlined,
  PlusOutlined,
  BarChartOutlined,
  UserOutlined
} from '@ant-design/icons-vue'
import axios from 'axios'

const { t } = useI18n()

const stats = reactive({
  apiKeys: 0,
  totalRequests: 0,
  tokensUsed: 0,
  currentPlan: 'Free'
})

const activityColumns = computed(() => [
  {
    title: t('dashboard.columns.time'),
    dataIndex: 'time',
    key: 'time'
  },
  {
    title: t('dashboard.columns.apiKey'),
    dataIndex: 'apiKey',
    key: 'apiKey'
  },
  {
    title: t('dashboard.columns.model'),
    dataIndex: 'model',
    key: 'model'
  },
  {
    title: t('dashboard.columns.tokens'),
    dataIndex: 'tokens',
    key: 'tokens'
  },
  {
    title: t('dashboard.columns.status'),
    dataIndex: 'status',
    key: 'status'
  }
])

const recentActivity = ref([])

const loadDashboardData = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/client/users/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data) {
      Object.assign(stats, response.data.stats || {})
      recentActivity.value = response.data.recentActivity || []
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
}

h1 {
  margin-bottom: 24px;
}
</style>