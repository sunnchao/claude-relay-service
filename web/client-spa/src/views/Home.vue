1<template>
  <div class="home-container">
    <a-row :gutter="[24, 24]">
      <a-col :span="24">
        <div class="hero-section">
          <h1 class="hero-title">Claude Relay Service</h1>
          <p class="hero-subtitle">
            Access Claude AI and other AI models through our secure relay service
          </p>
          <div class="hero-actions">
            <router-link to="/register">
              <a-button type="primary" size="large">Get Started</a-button>
            </router-link>
            <router-link to="/login">
              <a-button size="large">Sign In</a-button>
            </router-link>
          </div>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="[24, 24]" style="margin-top: 60px">
      <a-col :xs="24" :sm="12" :lg="8">
        <a-card hoverable>
          <template #title>
            <ApiOutlined /> Easy Integration
          </template>
          <p>Simple API integration with your existing applications</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="8">
        <a-card hoverable>
          <template #title>
            <SafetyCertificateOutlined /> Secure & Reliable
          </template>
          <p>Enterprise-grade security with encrypted API keys</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="8">
        <a-card hoverable>
          <template #title>
            <DashboardOutlined /> Usage Analytics
          </template>
          <p>Detailed usage statistics and monitoring dashboard</p>
        </a-card>
      </a-col>
    </a-row>

    <a-row style="margin-top: 60px">
      <a-col :span="24">
        <a-card>
          <template #title>Available Plans</template>
          <a-table :columns="planColumns" :data-source="plans" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <router-link to="/register">
                  <a-button type="primary">Choose {{ record.name }}</a-button>
                </router-link>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ApiOutlined, SafetyCertificateOutlined, DashboardOutlined } from '@ant-design/icons-vue'

const planColumns = [
  {
    title: 'Plan',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: 'Monthly Tokens',
    dataIndex: 'tokens',
    key: 'tokens'
  },
  {
    title: 'API Keys',
    dataIndex: 'keys',
    key: 'keys'
  },
  {
    title: 'Rate Limit',
    dataIndex: 'rate',
    key: 'rate'
  },
  {
    title: 'Price',
    dataIndex: 'price',
    key: 'price'
  },
  {
    title: 'Action',
    key: 'action'
  }
]

const plans = [
  {
    key: 'free',
    name: 'Free',
    tokens: '100,000',
    keys: '3',
    rate: '60 req/min',
    price: 'Free'
  },
  {
    key: 'basic',
    name: 'Basic',
    tokens: '1,000,000',
    keys: '10',
    rate: '120 req/min',
    price: '$9.99/month'
  },
  {
    key: 'pro',
    name: 'Pro',
    tokens: '10,000,000',
    keys: 'Unlimited',
    rate: '300 req/min',
    price: '$49.99/month'
  }
]
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.hero-section {
  text-align: center;
  padding: 60px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.hero-title {
  font-size: 48px;
  margin-bottom: 16px;
  font-weight: bold;
}

.hero-subtitle {
  font-size: 20px;
  margin-bottom: 32px;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}
</style>