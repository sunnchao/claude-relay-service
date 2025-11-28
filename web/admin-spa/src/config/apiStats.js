// API Stats 专用 API 客户端
// 与管理员 API 隔离，不需要认证

class ApiStatsClient {
  constructor() {
    this.baseURL = window.location.origin
    // 开发环境需要为 admin 路径添加 /webapi 前缀
    this.isDev = import.meta.env.DEV
  }

  getAdminToken() {
    try {
      return localStorage.getItem('authToken') || ''
    } catch (error) {
      console.warn('Unable to read auth token for API stats:', error)
      return ''
    }
  }

  async request(url, options = {}) {
    try {
      // 在开发环境中，为 /admin 路径添加 /webapi 前缀
      if (this.isDev && url.startsWith('/admin')) {
        url = '/webapi' + url
      }

      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      }

      const token = this.getAdminToken()
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${this.baseURL}${url}`, {
        credentials: options.credentials || 'same-origin',
        ...options,
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `请求失败: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API Stats request error:', error)
      throw error
    }
  }

  // 获取 API Key ID
  async getKeyId(apiKey) {
    return this.request('/apiStats/api/get-key-id', {
      method: 'POST',
      body: JSON.stringify({ apiKey })
    })
  }

  // 获取用户统计数据
  async getUserStats(apiId) {
    return this.request('/apiStats/api/user-stats', {
      method: 'POST',
      body: JSON.stringify({ apiId })
    })
  }

  // 获取模型使用统计
  async getUserModelStats(apiId, period = 'daily') {
    return this.request('/apiStats/api/user-model-stats', {
      method: 'POST',
      body: JSON.stringify({ apiId, period })
    })
  }

  // 获取 OEM 设置（用于网站名称和图标）
  async getOemSettings() {
    try {
      return await this.request('/admin/oem-settings')
    } catch (error) {
      console.error('Failed to load OEM settings:', error)
      return {
        success: true,
        data: {
          siteName: 'Claude Relay Service',
          siteIcon: '',
          siteIconData: ''
        }
      }
    }
  }

  // 批量查询统计数据
  async getBatchStats(apiIds) {
    return this.request('/apiStats/api/batch-stats', {
      method: 'POST',
      body: JSON.stringify({ apiIds })
    })
  }

  // 批量查询模型统计
  async getBatchModelStats(apiIds, period = 'daily') {
    return this.request('/apiStats/api/batch-model-stats', {
      method: 'POST',
      body: JSON.stringify({ apiIds, period })
    })
  }

  // 获取使用日志
  async getUsageLogs(options = {}) {
    const { apiId, apiKey, limit, offset, params = {} } = options
    const payload = { ...params }

    payload.limit =
      typeof limit !== 'undefined'
        ? limit
        : typeof payload.limit !== 'undefined'
          ? payload.limit
          : 50
    payload.offset =
      typeof offset !== 'undefined'
        ? offset
        : typeof payload.offset !== 'undefined'
          ? payload.offset
          : 0

    if (apiId) {
      payload.apiId = apiId
    } else if (apiKey) {
      payload.apiKey = apiKey
    }

    return this.request('/apiStats/api/usage-logs', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export const apiStatsClient = new ApiStatsClient()
