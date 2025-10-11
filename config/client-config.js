/**
 * 客户端系统配置
 * Client system configuration
 */

module.exports = {
  // 客户端API服务配置
  clientApi: {
    port: process.env.CLIENT_API_PORT || 3001,
    host: process.env.CLIENT_API_HOST || '0.0.0.0',
    baseUrl: process.env.CLIENT_API_BASE_URL || 'http://localhost:3001',
    corsOrigin: process.env.CLIENT_CORS_ORIGIN || 'http://localhost:5173'
  },

  // JWT配置
  jwt: {
    secret: process.env.CLIENT_JWT_SECRET || process.env.JWT_SECRET,
    expiresIn: '7d',
    refreshExpiresIn: '30d'
  },

  // Redis键前缀（与管理端隔离）
  redis: {
    keyPrefix: {
      user: 'client_user:',
      userEmail: 'client_user_email:',
      apiKey: 'client_key:',
      apiKeyHash: 'client_key_hash:',
      session: 'client_session:',
      usage: 'client_usage:',
      rateLimit: 'client_rate:',
      verification: 'client_verify:',
      resetToken: 'client_reset:'
    }
  },

  // 用户注册配置
  registration: {
    requireEmailVerification: process.env.CLIENT_REQUIRE_EMAIL_VERIFY === 'true',
    emailVerificationExpiry: 24 * 60 * 60 * 1000, // 24小时
    allowedEmailDomains: [], // 空数组表示允许所有域名
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true
  },

  // API Key配置
  apiKey: {
    prefix: 'cuk_', // Client User Key
    length: 32,
    defaultRateLimit: {
      rpm: 60, // 每分钟请求数
      rpd: 10000, // 每日请求数
      tpm: 1000000 // 每月token数
    },
    maxKeysPerUser: {
      free: 3,
      basic: 10,
      pro: 50
    }
  },

  // 用户计划配置
  plans: {
    free: {
      name: 'Free',
      price: 0,
      limits: {
        monthlyRequests: 1000,
        monthlyTokens: 100000,
        maxKeys: 3,
        rateLimit: {
          rpm: 20,
          rpd: 1000
        }
      },
      features: [
        'Basic Claude access',
        'Community support',
        'Usage dashboard'
      ]
    },
    basic: {
      name: 'Basic',
      price: 9.99,
      limits: {
        monthlyRequests: 10000,
        monthlyTokens: 1000000,
        maxKeys: 10,
        rateLimit: {
          rpm: 60,
          rpd: 10000
        }
      },
      features: [
        'Full Claude access',
        'Priority support',
        'Advanced analytics',
        'API documentation'
      ]
    },
    pro: {
      name: 'Professional',
      price: 49.99,
      limits: {
        monthlyRequests: 100000,
        monthlyTokens: 10000000,
        maxKeys: 50,
        rateLimit: {
          rpm: 200,
          rpd: 100000
        }
      },
      features: [
        'All AI models access',
        'Dedicated support',
        'Custom rate limits',
        'SLA guarantee',
        'Webhook integration'
      ]
    }
  },

  // 速率限制配置
  rateLimit: {
    // 全局限制（防DDoS）
    global: {
      points: 1000,
      duration: 60, // 秒
      blockDuration: 600 // 封禁时长（秒）
    },
    // 登录限制
    login: {
      points: 5,
      duration: 900, // 15分钟
      blockDuration: 900
    },
    // 注册限制
    register: {
      points: 3,
      duration: 3600, // 1小时
      blockDuration: 3600
    },
    // API调用限制（由用户计划决定）
    api: {
      keyPrefix: 'client_api_rate:',
      blockDuration: 60
    }
  },

  // 邮件配置（如果需要）
  email: {
    enabled: process.env.CLIENT_EMAIL_ENABLED === 'true',
    from: process.env.CLIENT_EMAIL_FROM || 'noreply@claude-relay.com',
    smtp: {
      host: process.env.CLIENT_SMTP_HOST,
      port: process.env.CLIENT_SMTP_PORT || 587,
      secure: process.env.CLIENT_SMTP_SECURE === 'true',
      auth: {
        user: process.env.CLIENT_SMTP_USER,
        pass: process.env.CLIENT_SMTP_PASS
      }
    }
  },

  // 安全配置
  security: {
    bcryptRounds: 10,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15分钟
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7天
    requireHttps: process.env.NODE_ENV === 'production',
    trustedProxies: process.env.CLIENT_TRUSTED_PROXIES?.split(',') || []
  },

  // 日志配置
  logging: {
    level: process.env.CLIENT_LOG_LEVEL || 'info',
    dir: './logs/client',
    maxFiles: '30d',
    maxSize: '20m'
  },

  // 监控配置
  monitoring: {
    enabled: process.env.CLIENT_MONITORING_ENABLED === 'true',
    metricsPort: process.env.CLIENT_METRICS_PORT || 9091
  },

  // 支持的AI服务
  supportedServices: {
    claude: {
      enabled: true,
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      endpoint: process.env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com'
    },
    codex: {
      enabled: false, // 暂时禁用，后续实现
      models: ['code-davinci-002'],
      endpoint: process.env.CODEX_API_ENDPOINT
    }
  },

  // 开发模式
  development: {
    skipEmailVerification: process.env.NODE_ENV === 'development',
    logAllRequests: process.env.NODE_ENV === 'development',
    exposeErrors: process.env.NODE_ENV === 'development'
  }
};