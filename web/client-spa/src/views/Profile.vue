<template>
  <div class="profile-container">
    <h1>Profile Settings</h1>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="16">
        <a-card title="Personal Information" :bordered="false">
          <a-form
            :model="formState"
            :label-col="{ span: 6 }"
            :wrapper-col="{ span: 18 }"
            @finish="onUpdateProfile"
          >
            <a-form-item label="Username" name="username">
              <a-input v-model:value="formState.username" />
            </a-form-item>
            <a-form-item label="Email" name="email">
              <a-input v-model:value="formState.email" disabled />
              <template #extra>
                <span v-if="formState.emailVerified">
                  <CheckCircleOutlined style="color: #52c41a" /> Verified
                </span>
                <span v-else>
                  <ExclamationCircleOutlined style="color: #faad14" /> Not verified
                  <a @click="sendVerificationEmail" style="margin-left: 8px">Send verification</a>
                </span>
              </template>
            </a-form-item>
            <a-form-item label="Created At">
              <a-input :value="formState.createdAt" disabled />
            </a-form-item>
            <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
              <a-button type="primary" html-type="submit" :loading="updateLoading">
                Update Profile
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>

        <a-card title="Change Password" style="margin-top: 16px" :bordered="false">
          <a-form
            :model="passwordForm"
            :label-col="{ span: 6 }"
            :wrapper-col="{ span: 18 }"
            @finish="onChangePassword"
          >
            <a-form-item
              label="Current Password"
              name="currentPassword"
              :rules="[{ required: true, message: 'Please enter current password' }]"
            >
              <a-input-password v-model:value="passwordForm.currentPassword" />
            </a-form-item>
            <a-form-item
              label="New Password"
              name="newPassword"
              :rules="[
                { required: true, message: 'Please enter new password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]"
            >
              <a-input-password v-model:value="passwordForm.newPassword" />
            </a-form-item>
            <a-form-item
              label="Confirm Password"
              name="confirmPassword"
              :rules="[
                { required: true, message: 'Please confirm new password' },
                { validator: validateConfirmPassword }
              ]"
            >
              <a-input-password v-model:value="passwordForm.confirmPassword" />
            </a-form-item>
            <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
              <a-button type="primary" html-type="submit" :loading="passwordLoading">
                Change Password
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="8">
        <a-card title="Plan Information" :bordered="false">
          <a-descriptions :column="1">
            <a-descriptions-item label="Current Plan">
              <a-tag color="blue">{{ planInfo.name }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Monthly Tokens">
              {{ planInfo.monthlyTokens }}
            </a-descriptions-item>
            <a-descriptions-item label="API Keys Limit">
              {{ planInfo.maxKeys }}
            </a-descriptions-item>
            <a-descriptions-item label="Rate Limit">
              {{ planInfo.rateLimit }}
            </a-descriptions-item>
          </a-descriptions>
          <a-button type="primary" block style="margin-top: 16px">
            Upgrade Plan
          </a-button>
        </a-card>

        <a-card title="Security Settings" style="margin-top: 16px" :bordered="false">
          <a-space direction="vertical" style="width: 100%">
            <div>
              <a-switch v-model:checked="securitySettings.twoFactorEnabled" />
              <span style="margin-left: 8px">Two-Factor Authentication</span>
            </div>
            <div>
              <a-switch v-model:checked="securitySettings.emailNotifications" />
              <span style="margin-left: 8px">Email Notifications</span>
            </div>
          </a-space>
          <a-button type="primary" block style="margin-top: 16px" @click="saveSecuritySettings">
            Save Settings
          </a-button>
        </a-card>

        <a-card title="Danger Zone" style="margin-top: 16px" :bordered="false">
          <a-alert
            message="Delete Account"
            description="Once you delete your account, there is no going back."
            type="error"
            showIcon
            style="margin-bottom: 16px"
          />
          <a-popconfirm
            title="Are you sure you want to delete your account?"
            ok-text="Yes, delete my account"
            cancel-text="Cancel"
            @confirm="deleteAccount"
          >
            <a-button danger block>Delete Account</a-button>
          </a-popconfirm>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import axios from 'axios'

const router = useRouter()
const updateLoading = ref(false)
const passwordLoading = ref(false)

const formState = reactive({
  username: '',
  email: '',
  emailVerified: false,
  createdAt: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const planInfo = reactive({
  name: 'Free',
  monthlyTokens: '100,000',
  maxKeys: '3',
  rateLimit: '60 req/min'
})

const securitySettings = reactive({
  twoFactorEnabled: false,
  emailNotifications: true
})

const validateConfirmPassword = async (rule, value) => {
  if (value && value !== passwordForm.newPassword) {
    return Promise.reject('Passwords do not match')
  }
  return Promise.resolve()
}

const onUpdateProfile = async () => {
  updateLoading.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.put(
      '/api/client/users/profile',
      { username: formState.username },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    message.success('Profile updated successfully')
  } catch (error) {
    message.error(error.response?.data?.error || 'Update failed')
  } finally {
    updateLoading.value = false
  }
}

const onChangePassword = async () => {
  passwordLoading.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      '/api/client/users/change-password',
      {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    message.success('Password changed successfully')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    message.error(error.response?.data?.error || 'Password change failed')
  } finally {
    passwordLoading.value = false
  }
}

const sendVerificationEmail = async () => {
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      '/api/client/users/resend-verification',
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    message.success('Verification email sent')
  } catch (error) {
    message.error(error.response?.data?.error || 'Failed to send verification email')
  }
}

const saveSecuritySettings = async () => {
  try {
    const token = localStorage.getItem('token')
    await axios.put(
      '/api/client/users/security',
      securitySettings,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    message.success('Security settings saved')
  } catch (error) {
    message.error(error.response?.data?.error || 'Failed to save settings')
  }
}

const deleteAccount = async () => {
  try {
    const token = localStorage.getItem('token')
    await axios.delete('/api/client/users/account', {
      headers: { Authorization: `Bearer ${token}` }
    })
    message.success('Account deleted')
    localStorage.clear()
    router.push('/')
  } catch (error) {
    message.error(error.response?.data?.error || 'Failed to delete account')
  }
}

const loadProfile = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/client/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.data) {
      Object.assign(formState, response.data.user || {})
      Object.assign(planInfo, response.data.plan || {})
      Object.assign(securitySettings, response.data.settings || {})
    }
  } catch (error) {
    message.error('Failed to load profile')
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-container {
  padding: 24px;
}

h1 {
  margin-bottom: 24px;
}
</style>