/**
 * MySQL API Key 模型
 * MySQL API Key Model
 */

const { DataTypes, Model } = require('sequelize')
const { sequelize } = require('../database')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')

class ApiKey extends Model {
  /**
   * 生成API Key
   */
  static generateKey() {
    const prefix = 'cuk_'
    const length = 32
    const randomBytes = crypto.randomBytes(Math.ceil(length * 0.75))
    const key = randomBytes
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, length)
    return `${prefix}${key}`
  }

  /**
   * 哈希API Key
   */
  static hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  /**
   * 验证API Key
   */
  static async verifyKey(apiKey) {
    const keyHash = this.hashKey(apiKey)
    const apiKeyRecord = await this.findOne({
      where: {
        keyHash,
        status: 'active'
      },
      include: ['user']
    })

    if (!apiKeyRecord) {
      return null
    }

    // 检查是否过期
    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
      await apiKeyRecord.update({ status: 'expired' })
      return null
    }

    return apiKeyRecord
  }

  /**
   * 更新使用统计
   */
  async updateUsage(tokens, requests = 1) {
    this.usageRequests = (this.usageRequests || 0) + requests
    this.usageTokens = (this.usageTokens || 0) + tokens
    this.lastUsedAt = new Date()
    await this.save()
    return {
      requests: this.usageRequests,
      tokens: this.usageTokens
    }
  }

  /**
   * 检查速率限制
   */
  async checkRateLimit() {
    const limits = this.rateLimit || {
      rpm: 60,
      rpd: 10000
    }

    // 这里可以实现更复杂的速率限制逻辑
    // 暂时返回简单的结果
    return {
      allowed: true,
      limit: limits.rpm,
      remaining: limits.rpm - 1,
      resetAt: Date.now() + 60000
    }
  }

  /**
   * 重新生成Key
   */
  async regenerate() {
    const newKey = ApiKey.generateKey()
    const newKeyHash = ApiKey.hashKey(newKey)

    this.keyHash = newKeyHash
    this.keyPrefix = newKey.substring(0, 7)
    this.keySuffix = newKey.slice(-4)
    await this.save()

    return {
      ...this.toJSON(),
      key: newKey
    }
  }

  /**
   * 转换为JSON（隐藏敏感信息）
   */
  toJSON() {
    const values = Object.assign({}, this.get())
    delete values.keyHash
    // 只显示前缀和后缀
    values.keyDisplay = `${values.keyPrefix}${'*'.repeat(25)}${values.keySuffix}`
    return values
  }
}

// 定义模型
ApiKey.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      defaultValue: () => `ck_${uuidv4()}`
    },
    userId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'user_id'
    },
    keyHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: 'key_hash'
    },
    keyPrefix: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'key_prefix'
    },
    keySuffix: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'key_suffix'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: ['claude']
    },
    rateLimit: {
      type: DataTypes.JSON,
      defaultValue: {},
      field: 'rate_limit'
    },
    usageRequests: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'usage_requests'
    },
    usageTokens: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      field: 'usage_tokens'
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      field: 'last_used_at'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired', 'revoked'),
      defaultValue: 'active'
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at'
    },
    ipWhitelist: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'ip_whitelist'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  },
  {
    sequelize,
    modelName: 'ApiKey',
    tableName: 'client_api_keys',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
)

module.exports = ApiKey
