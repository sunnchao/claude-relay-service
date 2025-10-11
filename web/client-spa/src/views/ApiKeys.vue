<template>
  <div class="api-keys-container">
    <div class="page-header">
      <h1>{{ $t('apiKeys.title') }}</h1>
      <a-button type="primary" @click="showCreateModal">
        <PlusOutlined /> {{ $t('apiKeys.createNewKey') }}
      </a-button>
    </div>

    <a-card>
      <a-table :columns="columns" :data-source="apiKeys" :loading="loading">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'key'">
            <a-space>
              <a-typography-text
                :copyable="{ text: record.isRevealed ? record.key : '' }"
                v-if="record.isRevealed"
              >
                {{ record.key }}
              </a-typography-text>
              <a-typography-text v-else>
                {{ maskKey(record.key) }}
              </a-typography-text>
              <a-button
                size="small"
                @click="toggleReveal(record)"
                :icon="h(record.isRevealed ? EyeInvisibleOutlined : EyeOutlined)"
              />
            </a-space>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'">
              {{ record.status === 'active' ? $t('apiKeys.active') : $t('apiKeys.inactive') }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="editKey(record)">
                <EditOutlined />
              </a-button>
              <a-popconfirm
                :title="$t('apiKeys.confirmDelete')"
                @confirm="deleteKey(record.id)"
                :okText="$t('common.yes')"
                :cancelText="$t('common.no')"
              >
                <a-button size="small" danger>
                  <DeleteOutlined />
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingKey ? $t('apiKeys.editModalTitle') : $t('apiKeys.createModalTitle')"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :model="formState" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item :label="$t('apiKeys.name')" name="name" :rules="[{ required: true, message: $t('apiKeys.nameRequired') }]">
          <a-input v-model:value="formState.name" :placeholder="$t('apiKeys.namePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('apiKeys.description')" name="description">
          <a-textarea
            v-model:value="formState.description"
            :placeholder="$t('apiKeys.descriptionPlaceholder')"
            :rows="3"
          />
        </a-form-item>
        <a-form-item :label="$t('apiKeys.permissions')" name="permissions">
          <a-checkbox-group v-model:value="formState.permissions">
            <a-checkbox value="claude">Claude</a-checkbox>
            <a-checkbox value="gemini">Gemini</a-checkbox>
            <a-checkbox value="openai">OpenAI</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- New Key Display Modal -->
    <a-modal
      v-model:open="newKeyModalVisible"
      :title="$t('apiKeys.newKeyTitle')"
      :footer="[
        h(
          AButton,
          { key: 'ok', type: 'primary', onClick: () => (newKeyModalVisible = false) },
          () => t('apiKeys.confirmSaved')
        )
      ]"
    >
      <a-alert
        :message="$t('apiKeys.importantNotice')"
        :description="$t('apiKeys.saveKeyNotice')"
        type="warning"
        showIcon
        style="margin-bottom: 16px"
      />
      <a-typography-paragraph :copyable="{ text: newApiKey }">
        <pre>{{ newApiKey }}</pre>
      </a-typography-paragraph>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import { Button as AButton } from 'ant-design-vue'
import axios from 'axios'

const { t } = useI18n()

const loading = ref(false)
const modalVisible = ref(false)
const newKeyModalVisible = ref(false)
const editingKey = ref(null)
const newApiKey = ref('')
const apiKeys = ref([])

const formState = reactive({
  name: '',
  description: '',
  permissions: ['claude']
})

const columns = computed(() => [
  {
    title: t('apiKeys.name'),
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: t('apiKeys.key'),
    dataIndex: 'key',
    key: 'key'
  },
  {
    title: t('apiKeys.status'),
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: t('apiKeys.created'),
    dataIndex: 'createdAt',
    key: 'createdAt'
  },
  {
    title: t('apiKeys.lastUsed'),
    dataIndex: 'lastUsed',
    key: 'lastUsed'
  },
  {
    title: t('apiKeys.actions'),
    key: 'actions'
  }
])

const maskKey = (key) => {
  if (!key) return '••••••••'
  return key.substring(0, 8) + '••••••••'
}

const toggleReveal = (record) => {
  record.isRevealed = !record.isRevealed
}

const showCreateModal = () => {
  editingKey.value = null
  formState.name = ''
  formState.description = ''
  formState.permissions = ['claude']
  modalVisible.value = true
}

const editKey = (record) => {
  editingKey.value = record
  formState.name = record.name
  formState.description = record.description
  formState.permissions = record.permissions
  modalVisible.value = true
}

const handleModalOk = async () => {
  try {
    const token = localStorage.getItem('token')
    if (editingKey.value) {
      // Update existing key
      await axios.put(
        `/api/client/keys/${editingKey.value.id}`,
        formState,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      message.success(t('apiKeys.keyUpdatedSuccess'))
    } else {
      // Create new key
      const response = await axios.post(
        '/api/client/keys',
        formState,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      newApiKey.value = response.data.key
      newKeyModalVisible.value = true
      message.success(t('apiKeys.keyCreatedSuccess'))
    }
    modalVisible.value = false
    loadApiKeys()
  } catch (error) {
    message.error(error.response?.data?.error || t('apiKeys.operationFailed'))
  }
}

const handleModalCancel = () => {
  modalVisible.value = false
}

const deleteKey = async (keyId) => {
  try {
    const token = localStorage.getItem('token')
    await axios.delete(`/api/client/keys/${keyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    message.success(t('apiKeys.keyDeletedSuccess'))
    loadApiKeys()
  } catch (error) {
    message.error(error.response?.data?.error || t('apiKeys.operationFailed'))
  }
}

const loadApiKeys = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/client/keys', {
      headers: { Authorization: `Bearer ${token}` }
    })
    apiKeys.value = response.data.data.map((key) => ({
      ...key,
      isRevealed: false
    }))
  } catch (error) {
    message.error(t('apiKeys.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadApiKeys()
})
</script>

<style scoped>
.api-keys-container {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

h1 {
  margin: 0;
}
</style>