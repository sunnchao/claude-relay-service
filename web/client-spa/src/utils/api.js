import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.DEV ? '/webapi' : '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sessionToken')
    if (token) {
      config.headers['x-user-token'] = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // 401 未授权，清除 token
    if (error.response?.status === 401) {
      localStorage.removeItem('sessionToken')
      // 如果不在登录页，重定向到登录页
      if (window.location.pathname !== '/client/login') {
        window.location.href = '/client/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
