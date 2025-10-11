export default {
  // 通用
  common: {
    loading: '加载中...',
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    search: '搜索',
    reset: '重置',
    actions: '操作',
    status: '状态',
    yes: '是',
    no: '否',
    ok: '确定',
    close: '关闭',
    back: '返回',
    submit: '提交',
    copy: '复制',
    copied: '已复制',
    download: '下载',
    upload: '上传'
  },
  
  // 布局
  layout: {
    title: 'Claude 中转服务',
    copyright: 'Claude 中转服务 ©2024',
    logout: '退出登录',
    logoutSuccess: '退出成功'
  },
  
  // 导航菜单
  menu: {
    home: '首页',
    dashboard: '控制台',
    apiKeys: 'API密钥',
    usage: '使用统计',
    profile: '个人资料',
    login: '登录',
    register: '注册'
  },
  
  // 登录页面
  login: {
    title: '登录',
    email: '邮箱',
    password: '密码',
    emailPlaceholder: '请输入邮箱',
    passwordPlaceholder: '请输入密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    submit: '登录',
    noAccount: '还没有账号？',
    signUpNow: '立即注册',
    loginSuccess: '登录成功！',
    loginFailed: '登录失败',
    emailRequired: '请输入邮箱',
    emailInvalid: '请输入有效的邮箱地址',
    passwordRequired: '请输入密码'
  },
  
  // 注册页面
  register: {
    title: '注册',
    username: '用户名',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    usernamePlaceholder: '请输入用户名',
    emailPlaceholder: '请输入邮箱',
    passwordPlaceholder: '请输入密码（至少8位）',
    confirmPasswordPlaceholder: '请再次输入密码',
    submit: '注册',
    hasAccount: '已有账号？',
    signInNow: '立即登录',
    registerSuccess: '注册成功！',
    registerFailed: '注册失败',
    usernameRequired: '请输入用户名',
    emailRequired: '请输入邮箱',
    emailInvalid: '请输入有效的邮箱地址',
    passwordRequired: '请输入密码',
    passwordMinLength: '密码至少8位',
    confirmPasswordRequired: '请确认密码',
    passwordMismatch: '两次输入的密码不一致'
  },
  
  // 控制台页面
  dashboard: {
    title: '控制台',
    stats: {
      apiKeys: 'API密钥',
      totalRequests: '总请求数',
      tokensUsed: '已用Token',
      currentPlan: '当前套餐'
    },
    usageOverview: '使用概览',
    quickActions: '快速操作',
    createApiKey: '创建API密钥',
    viewDetailedUsage: '查看详细使用情况',
    updateProfile: '更新个人资料',
    recentActivity: '最近活动',
    noData: '暂无数据',
    chartPlaceholder: '使用图表将在这里显示',
    columns: {
      time: '时间',
      apiKey: 'API密钥',
      model: '模型',
      tokens: 'Token数',
      status: '状态'
    }
  },
  
  // API密钥页面
  apiKeys: {
    title: 'API密钥',
    createNewKey: '创建新密钥',
    name: '名称',
    key: '密钥',
    status: '状态',
    created: '创建时间',
    lastUsed: '最后使用',
    actions: '操作',
    namePlaceholder: '我的API密钥',
    descriptionPlaceholder: '可选描述',
    description: '描述',
    permissions: '权限',
    active: '活跃',
    inactive: '未激活',
    reveal: '显示',
    hide: '隐藏',
    edit: '编辑',
    delete: '删除',
    confirmDelete: '确定要删除这个API密钥吗？',
    createModalTitle: '创建新API密钥',
    editModalTitle: '编辑API密钥',
    keyCreatedSuccess: 'API密钥创建成功',
    keyUpdatedSuccess: 'API密钥更新成功',
    keyDeletedSuccess: 'API密钥删除成功',
    operationFailed: '操作失败',
    loadFailed: '加载API密钥失败',
    newKeyTitle: '您的新API密钥',
    importantNotice: '重要提示',
    saveKeyNotice: '请立即保存此API密钥。您将无法再次查看它！',
    confirmSaved: '我已保存此密钥',
    nameRequired: '请输入密钥名称'
  },
  
  // 使用统计页面
  usage: {
    title: '使用统计',
    dateRange: '日期范围',
    model: '模型',
    allModels: '所有模型',
    totalRequests: '总请求数',
    totalTokens: '总Token数',
    averageTokens: '平均Token数',
    dailyUsage: '每日使用量',
    modelDistribution: '模型分布',
    noData: '暂无使用数据',
    export: '导出数据',
    refresh: '刷新',
    columns: {
      date: '日期',
      model: '模型',
      requests: '请求数',
      tokens: 'Token数',
      cost: '费用'
    }
  },
  
  // 个人资料页面
  profile: {
    title: '个人资料',
    basicInfo: '基本信息',
    security: '安全设置',
    username: '用户名',
    email: '邮箱',
    joinDate: '注册时间',
    changePassword: '修改密码',
    currentPassword: '当前密码',
    newPassword: '新密码',
    confirmPassword: '确认密码',
    updateProfile: '更新资料',
    updatePassword: '更新密码',
    updateSuccess: '更新成功',
    updateFailed: '更新失败',
    passwordChanged: '密码已更改',
    currentPasswordRequired: '请输入当前密码',
    newPasswordRequired: '请输入新密码',
    confirmPasswordRequired: '请确认新密码',
    passwordMismatch: '两次输入的密码不一致'
  },
  
  // 首页
  home: {
    title: '欢迎使用Claude中转服务',
    subtitle: '强大、稳定、安全的AI API中转解决方案',
    features: {
      title: '核心特性',
      multiAccount: {
        title: '多账户管理',
        description: '支持同时管理多个Claude和Gemini账户'
      },
      highPerformance: {
        title: '高性能',
        description: '优化的请求处理和响应速度'
      },
      security: {
        title: '安全可靠',
        description: '企业级的数据加密和安全保护'
      },
      statistics: {
        title: '详细统计',
        description: '实时监控使用情况和费用'
      }
    },
    getStarted: '开始使用',
    learnMore: '了解更多'
  },
  
  // 错误消息
  errors: {
    networkError: '网络错误，请稍后重试',
    serverError: '服务器错误',
    unauthorized: '未授权访问',
    forbidden: '禁止访问',
    notFound: '页面不存在',
    timeout: '请求超时',
    unknown: '未知错误'
  },
  
  // 成功消息
  success: {
    operationSuccess: '操作成功',
    saveSuccess: '保存成功',
    deleteSuccess: '删除成功',
    updateSuccess: '更新成功'
  },
  
  // 语言设置
  language: {
    title: '语言',
    chinese: '中文',
    english: 'English'
  }
}