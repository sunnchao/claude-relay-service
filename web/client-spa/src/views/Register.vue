<template>
  <div class="register-container">
    <a-card class="register-card">
      <h2 class="register-title">Create Account</h2>
      <a-form
        :model="formState"
        @finish="onFinish"
        :label-col="{ span: 24 }"
        :wrapper-col="{ span: 24 }"
      >
        <a-form-item
          label="Username"
          name="username"
          :rules="[{ required: true, message: 'Please enter your username' }]"
        >
          <a-input
            v-model:value="formState.username"
            placeholder="Choose a username"
            size="large"
            :prefix-icon="h(UserOutlined)"
          />
        </a-form-item>

        <a-form-item
          label="Email"
          name="email"
          :rules="[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' }
          ]"
        >
          <a-input
            v-model:value="formState.email"
            placeholder="Enter your email"
            size="large"
            :prefix-icon="h(MailOutlined)"
          />
        </a-form-item>

        <a-form-item
          label="Password"
          name="password"
          :rules="[
            { required: true, message: 'Please enter your password' },
            { min: 8, message: 'Password must be at least 8 characters' }
          ]"
        >
          <a-input-password
            v-model:value="formState.password"
            placeholder="Create a password"
            size="large"
            :prefix-icon="h(LockOutlined)"
          />
        </a-form-item>

        <a-form-item
          label="Confirm Password"
          name="confirmPassword"
          :rules="[
            { required: true, message: 'Please confirm your password' },
            { validator: validateConfirmPassword }
          ]"
        >
          <a-input-password
            v-model:value="formState.confirmPassword"
            placeholder="Confirm your password"
            size="large"
            :prefix-icon="h(LockOutlined)"
          />
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="formState.agree">
            I agree to the <a href="#">Terms of Service</a> and
            <a href="#">Privacy Policy</a>
          </a-checkbox>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
            :disabled="!formState.agree"
          >
            Create Account
          </a-button>
        </a-form-item>

        <div class="register-footer">
          Already have an account?
          <router-link to="/login">Sign in</router-link>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, h } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons-vue'
import axios from 'axios'

const router = useRouter()
const loading = ref(false)

const formState = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agree: false
})

const validateConfirmPassword = async (rule, value) => {
  if (value && value !== formState.password) {
    return Promise.reject('Passwords do not match')
  }
  return Promise.resolve()
}

const onFinish = async (values) => {
  loading.value = true
  try {
    const response = await axios.post('/api/client/auth/register', {
      username: formState.username,
      email: formState.email,
      password: formState.password
    })

    if (response.data.success) {
      message.success('Registration successful! Please check your email for verification.')
      router.push('/login')
    }
  } catch (error) {
    message.error(error.response?.data?.error || 'Registration failed')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.register-card {
  width: 100%;
  max-width: 450px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.register-title {
  text-align: center;
  margin-bottom: 24px;
  font-size: 24px;
  font-weight: 600;
}

.register-footer {
  text-align: center;
  margin-top: 16px;
}
</style>