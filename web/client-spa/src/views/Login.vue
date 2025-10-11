<template>
  <div class="login-container">
    <a-card class="login-card">
      <h2 class="login-title">{{ $t('login.title') }}</h2>
      <a-form
        :model="formState"
        @finish="onFinish"
        :label-col="{ span: 24 }"
        :wrapper-col="{ span: 24 }"
      >
        <a-form-item
          :label="$t('login.email')"
          name="email"
          :rules="[
            { required: true, message: $t('login.emailRequired') },
            { type: 'email', message: $t('login.emailInvalid') }
          ]"
        >
          <a-input
            v-model:value="formState.email"
            :placeholder="$t('login.emailPlaceholder')"
            size="large"
            :prefix-icon="h(MailOutlined)"
          />
        </a-form-item>

        <a-form-item
          :label="$t('login.password')"
          name="password"
          :rules="[{ required: true, message: $t('login.passwordRequired') }]"
        >
          <a-input-password
            v-model:value="formState.password"
            :placeholder="$t('login.passwordPlaceholder')"
            size="large"
            :prefix-icon="h(LockOutlined)"
          />
        </a-form-item>

        <a-form-item>
          <a-checkbox v-model:checked="formState.remember">{{ $t('login.rememberMe') }}</a-checkbox>
          <a style="float: right" href="#">{{ $t('login.forgotPassword') }}</a>
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="loading">
            {{ $t('login.submit') }}
          </a-button>
        </a-form-item>

        <div class="login-footer">
          {{ $t('login.noAccount') }}
          <router-link to="/register">{{ $t('login.signUpNow') }}</router-link>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, h } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { MailOutlined, LockOutlined } from '@ant-design/icons-vue'
import axios from 'axios'

const router = useRouter()
const { t } = useI18n()
const loading = ref(false)

const formState = reactive({
  email: '',
  password: '',
  remember: false
})

const onFinish = async (values) => {
  loading.value = true
  try {
    const response = await axios.post('/api/client/auth/login', {
      email: formState.email,
      password: formState.password
    })

    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('userEmail', formState.email)

      if (formState.remember) {
        localStorage.setItem('rememberEmail', formState.email)
      }

      message.success(t('login.loginSuccess'))
      router.push('/dashboard')
    }
  } catch (error) {
    message.error(error.response?.data?.error || t('login.loginFailed'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-title {
  text-align: center;
  margin-bottom: 24px;
  font-size: 24px;
  font-weight: 600;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
}
</style>