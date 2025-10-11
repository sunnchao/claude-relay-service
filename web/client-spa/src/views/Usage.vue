<template>
  <div class="usage-container">
    <h1>Usage Statistics</h1>

    <a-row :gutter="[16, 16]" style="margin-bottom: 24px">
      <a-col :span="24">
        <a-card>
          <a-row :gutter="16">
            <a-col :xs="24" :sm="8">
              <a-statistic
                title="Current Month Tokens"
                :value="monthlyUsage.tokens"
                :suffix="`/ ${monthlyUsage.limit}`"
              />
              <a-progress
                :percent="monthlyUsage.percent"
                :status="monthlyUsage.percent > 90 ? 'exception' : 'active'"
              />
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-statistic title="Total Requests" :value="totalRequests" />
            </a-col>
            <a-col :xs="24" :sm="8">
              <a-statistic title="Average Tokens/Request" :value="avgTokensPerRequest" />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="16">
        <a-card title="Daily Usage Trend">
          <a-date-picker
            v-model:value="selectedDateRange"
            range-picker
            style="margin-bottom: 16px"
            @change="onDateRangeChange"
          />
          <div style="height: 300px; display: flex; align-items: center; justify-content: center">
            <a-empty description="Usage chart will be displayed here" />
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8">
        <a-card title="Usage by Model">
          <a-list :data-source="modelUsage" :loading="loading">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :title="item.model">
                  <template #description>
                    <div>
                      <span>{{ item.requests }} requests</span>
                      <br />
                      <span>{{ item.tokens }} tokens</span>
                    </div>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <a-row style="margin-top: 16px">
      <a-col :span="24">
        <a-card title="Detailed Usage History">
          <a-table
            :columns="columns"
            :data-source="usageHistory"
            :loading="loading"
            :pagination="{ pageSize: 10 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="record.status === 'success' ? 'green' : 'red'">
                  {{ record.status }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import axios from 'axios'
import dayjs from 'dayjs'

const loading = ref(false)
const selectedDateRange = ref([dayjs().subtract(7, 'day'), dayjs()])

const monthlyUsage = reactive({
  tokens: 45000,
  limit: 100000,
  percent: 45
})

const totalRequests = ref(1234)
const avgTokensPerRequest = ref(36)

const modelUsage = ref([
  { model: 'claude-3-opus', requests: 450, tokens: 25000 },
  { model: 'claude-3-sonnet', requests: 300, tokens: 15000 },
  { model: 'claude-3-haiku', requests: 484, tokens: 5000 }
])

const columns = [
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date'
  },
  {
    title: 'API Key',
    dataIndex: 'apiKey',
    key: 'apiKey'
  },
  {
    title: 'Model',
    dataIndex: 'model',
    key: 'model'
  },
  {
    title: 'Requests',
    dataIndex: 'requests',
    key: 'requests'
  },
  {
    title: 'Tokens',
    dataIndex: 'tokens',
    key: 'tokens'
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status'
  }
]

const usageHistory = ref([])

const onDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    loadUsageData(dates[0], dates[1])
  }
}

const loadUsageData = async (startDate, endDate) => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/client/users/usage', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        startDate: startDate?.format('YYYY-MM-DD'),
        endDate: endDate?.format('YYYY-MM-DD')
      }
    })

    if (response.data) {
      // Update usage data
      if (response.data.monthly) {
        monthlyUsage.tokens = response.data.monthly.tokens
        monthlyUsage.limit = response.data.monthly.limit
        monthlyUsage.percent = Math.round(
          (response.data.monthly.tokens / response.data.monthly.limit) * 100
        )
      }
      if (response.data.total) {
        totalRequests.value = response.data.total.requests
        avgTokensPerRequest.value = Math.round(
          response.data.total.tokens / response.data.total.requests
        )
      }
      if (response.data.byModel) {
        modelUsage.value = response.data.byModel
      }
      if (response.data.history) {
        usageHistory.value = response.data.history
      }
    }
  } catch (error) {
    message.error('Failed to load usage data')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUsageData(selectedDateRange.value[0], selectedDateRange.value[1])
})
</script>

<style scoped>
.usage-container {
  padding: 24px;
}

h1 {
  margin-bottom: 24px;
}
</style>