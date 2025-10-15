/**
 * 客户端API Key数据模型
 * Client API Key Data Model
 */

const redisClient = require('../../models/redis')
const { v4: uuidv4 } = require('uuid')
const crypto = require('crypto')
const clientConfig = require('../../../config/client-config')

// 获取 Redis 客户端的辅助函数
const getRedisClient = () => {
  const client = redisClient.getClient()
  if (!client) {
    throw new Error('Redis client not initialized')
  }
  return client
}

class ClientKey {
  constructor(data) {
    this.id = data.id || `ck_${uuidv4()}`
    this.userId = data.userId
    this.key = data.key
    this.keyHash = data.keyHash
    this.name = data.name
    this.description = data.description || ''
    this.permissions = data.permissions || ['claude']
    this.rateLimit = data.rateLimit || clientConfig.apiKey.defaultRateLimit
    this.usage = data.usage || {
      requests: 0,
      tokens: 0,
      lastUsedAt: null
    }
    this.status = data.status || 'active'
    this.expiresAt = data.expiresAt
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  // 转换为JSON（隐藏敏感信息）
  toJSON() {
    const obj = { ...this }
    delete obj.key // 不返回明文密钥
    delete obj.keyHash // 不返回哈希值
    return obj
  }

  // 生成API Key
  static generateKey() {
    const { prefix } = clientConfig.apiKey
    const { length } = clientConfig.apiKey
    const randomBytes = crypto.randomBytes(Math.ceil(length * 0.75))
    const key = randomBytes
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, length)
    return `${prefix}${key}`
  }

  // 哈希API Key
  static hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  // 创建新的API Key
  static async create(userId, keyData) {
    const redis = getRedisClient()

    // 检查用户的Key数量限制
    const user = await require('./clientUser').findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const plan = clientConfig.plans[user.plan]
    const existingKeys = await redis.keys(`${clientConfig.redis.keyPrefix.apiKey}*:${userId}`)

    if (existingKeys.length >= plan.limits.maxKeys) {
      throw new Error(`Maximum number of API keys (${plan.limits.maxKeys}) reached for your plan`)
    }

    // 生成新的API Key
    const apiKey = this.generateKey()
    const keyHash = this.hashKey(apiKey)

    // 创建Key对象
    const key = new ClientKey({
      userId,
      key: apiKey, // 仅在创建时保存，之后不再返回
      keyHash,
      name: keyData.name,
      description: keyData.description,
      permissions: keyData.permissions || ['claude'],
      rateLimit: keyData.rateLimit || plan.limits.rateLimit,
      expiresAt: keyData.expiresAt
    })

    // 保存到Redis
    const pipeline = redis.pipeline()

    // 保存Key数据（不包含明文密钥）
    const saveData = { ...key }
    delete saveData.key // 不保存明文密钥

    pipeline.set(
      `${clientConfig.redis.keyPrefix.apiKey}${key.id}:${userId}`,
      JSON.stringify(saveData)
    )

    // 创建哈希索引（用于快速验证）
    pipeline.set(
      `${clientConfig.redis.keyPrefix.apiKeyHash}${keyHash}`,
      JSON.stringify({
        keyId: key.id,
        userId
      })
    )

    // 如果有过期时间，设置TTL
    if (key.expiresAt) {
      const ttl = Math.floor((new Date(key.expiresAt) - new Date()) / 1000)
      if (ttl > 0) {
        pipeline.expire(`${clientConfig.redis.keyPrefix.apiKey}${key.id}:${userId}`, ttl)
        pipeline.expire(`${clientConfig.redis.keyPrefix.apiKeyHash}${keyHash}`, ttl)
      }
    }

    await pipeline.exec()

    // 返回包含明文密钥的对象（仅在创建时）
    return {
      ...key.toJSON(),
      key: apiKey // 仅在创建时返回明文密钥
    }
  }

  // 通过ID查找Key
  static async findById(keyId, userId) {
    const redis = getRedisClient()
    const keyData = await redis.get(`${clientConfig.redis.keyPrefix.apiKey}${keyId}:${userId}`)

    if (!keyData) {
      return null
    }

    return new ClientKey(JSON.parse(keyData))
  }

  // 通过哈希验证Key
  static async verifyKey(apiKey) {
    const redis = getRedisClient()
    const keyHash = this.hashKey(apiKey)

    // 查找Key信息
    const keyInfo = await redis.get(`${clientConfig.redis.keyPrefix.apiKeyHash}${keyHash}`)

    if (!keyInfo) {
      return null
    }

    const { keyId, userId } = JSON.parse(keyInfo)

    // 获取完整的Key数据
    const key = await this.findById(keyId, userId)

    if (!key || key.status !== 'active') {
      return null
    }

    // 检查是否过期
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      await key.update({ status: 'expired' })
      return null
    }

    return key
  }

  // 获取用户的所有Keys
  static async findByUserId(userId) {
    const redis = getRedisClient()
    const keyPatterns = `${clientConfig.redis.keyPrefix.apiKey}*:${userId}`
    const keyIds = await redis.keys(keyPatterns)

    if (keyIds.length === 0) {
      return []
    }

    const keys = await Promise.all(
      keyIds.map(async (keyId) => {
        const keyData = await redis.get(keyId)
        return keyData ? new ClientKey(JSON.parse(keyData)) : null
      })
    )

    return keys.filter((key) => key !== null)
  }

  // 更新Key信息
  async update(updates) {
    const redis = getRedisClient()

    // 更新字段
    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'userId' && key !== 'keyHash') {
        this[key] = updates[key]
      }
    })

    this.updatedAt = new Date().toISOString()

    // 保存到Redis
    const saveData = { ...this }
    delete saveData.key // 确保不保存明文密钥

    await redis.set(
      `${clientConfig.redis.keyPrefix.apiKey}${this.id}:${this.userId}`,
      JSON.stringify(saveData)
    )

    return this
  }

  // 删除Key
  async delete() {
    const redis = getRedisClient()
    const pipeline = redis.pipeline()

    // 删除Key数据
    pipeline.del(`${clientConfig.redis.keyPrefix.apiKey}${this.id}:${this.userId}`)

    // 删除哈希索引
    pipeline.del(`${clientConfig.redis.keyPrefix.apiKeyHash}${this.keyHash}`)

    // 删除相关的速率限制数据
    const rateLimitKeys = await redis.keys(`${clientConfig.redis.keyPrefix.rateLimit}*:${this.id}`)
    if (rateLimitKeys.length > 0) {
      rateLimitKeys.forEach((key) => pipeline.del(key))
    }

    await pipeline.exec()

    return true
  }

  // 更新使用统计
  async updateUsage(tokens, requests = 1) {
    const redis = getRedisClient()
    const now = new Date()

    // 更新使用量
    this.usage.requests += requests
    this.usage.tokens += tokens
    this.usage.lastUsedAt = now.toISOString()

    // 保存更新
    await this.update({ usage: this.usage })

    // 更新日统计
    const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const statsKey = `${clientConfig.redis.keyPrefix.usage}daily:${this.id}:${dayKey}`

    await redis.hincrby(statsKey, 'requests', requests)
    await redis.hincrby(statsKey, 'tokens', tokens)

    // 设置30天过期
    await redis.expire(statsKey, 30 * 24 * 60 * 60)

    return this.usage
  }

  // 检查速率限制
  async checkRateLimit() {
    const redis = getRedisClient()
    const now = Date.now()
    const limits = this.rateLimit

    // 检查每分钟请求限制
    const minuteKey = `${clientConfig.redis.keyPrefix.rateLimit}rpm:${this.id}`
    const minuteCount = (await redis.get(minuteKey)) || 0

    if (parseInt(minuteCount) >= limits.rpm) {
      return {
        allowed: false,
        limit: limits.rpm,
        remaining: 0,
        resetAt: now + 60000
      }
    }

    // 检查每日请求限制
    const dayKey = `${clientConfig.redis.keyPrefix.rateLimit}rpd:${this.id}`
    const dayCount = (await redis.get(dayKey)) || 0

    if (parseInt(dayCount) >= limits.rpd) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      return {
        allowed: false,
        limit: limits.rpd,
        remaining: 0,
        resetAt: tomorrow.getTime()
      }
    }

    // 更新计数器
    const pipeline = redis.pipeline()

    pipeline.incr(minuteKey)
    pipeline.expire(minuteKey, 60)

    pipeline.incr(dayKey)
    pipeline.expire(dayKey, 86400)

    await pipeline.exec()

    return {
      allowed: true,
      limit: limits.rpm,
      remaining: limits.rpm - parseInt(minuteCount) - 1,
      resetAt: now + 60000
    }
  }

  // 重新生成Key
  async regenerate() {
    const redis = getRedisClient()
    const oldKeyHash = this.keyHash

    // 生成新的Key
    const newKey = ClientKey.generateKey()
    const newKeyHash = ClientKey.hashKey(newKey)

    // 更新Key信息
    this.keyHash = newKeyHash
    this.updatedAt = new Date().toISOString()

    // 更新Redis
    const pipeline = redis.pipeline()

    // 删除旧的哈希索引
    pipeline.del(`${clientConfig.redis.keyPrefix.apiKeyHash}${oldKeyHash}`)

    // 创建新的哈希索引
    pipeline.set(
      `${clientConfig.redis.keyPrefix.apiKeyHash}${newKeyHash}`,
      JSON.stringify({
        keyId: this.id,
        userId: this.userId
      })
    )

    // 更新Key数据
    const saveData = { ...this }
    delete saveData.key

    pipeline.set(
      `${clientConfig.redis.keyPrefix.apiKey}${this.id}:${this.userId}`,
      JSON.stringify(saveData)
    )

    await pipeline.exec()

    // 返回新的Key（仅在重新生成时返回）
    return {
      ...this.toJSON(),
      key: newKey
    }
  }

  // 获取使用统计
  async getStatistics(days = 7) {
    const redis = getRedisClient()
    const stats = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      const statsKey = `${clientConfig.redis.keyPrefix.usage}daily:${this.id}:${dayKey}`
      const dayStats = await redis.hgetall(statsKey)

      stats.push({
        date: dayKey,
        requests: parseInt(dayStats?.requests || 0),
        tokens: parseInt(dayStats?.tokens || 0)
      })
    }

    return {
      keyId: this.id,
      name: this.name,
      total: this.usage,
      daily: stats.reverse(),
      limits: this.rateLimit
    }
  }
}

module.exports = ClientKey
