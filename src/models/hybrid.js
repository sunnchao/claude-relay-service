/**
 * 混合数据库适配器
 * 同时使用Redis和MySQL，根据数据类型智能选择存储位置
 *
 * 存储策略：
 * - Redis: 会话数据、缓存、临时数据、实时统计
 * - MySQL: 账户数据、API Keys、持久化日志、使用记录
 */

const logger = require('../utils/logger')

class HybridDatabaseClient {
  constructor() {
    this.redisClient = null
    this.mysqlClient = null
    this.isConnected = false
  }

  async connect() {
    logger.info('🔄 Initializing hybrid database mode (Redis + MySQL)...')

    try {
      // 并行连接Redis和MySQL
      const [redisModule, mysqlModule] = await Promise.all([require('./redis'), require('./mysql')])

      // 连接Redis
      logger.info('🔗 Connecting to Redis...')
      await redisModule.connect()
      this.redisClient = redisModule
      logger.success('✅ Redis connected successfully')

      // 连接MySQL
      logger.info('🔗 Connecting to MySQL...')
      await mysqlModule.connect()
      this.mysqlClient = mysqlModule
      logger.success('✅ MySQL connected successfully')

      this.isConnected = true
      logger.success('✅ Hybrid database mode initialized successfully')
    } catch (error) {
      logger.error('💥 Failed to initialize hybrid database:', error)
      throw error
    }
  }

  async disconnect() {
    const disconnectTasks = []

    if (this.redisClient) {
      disconnectTasks.push(this.redisClient.disconnect())
    }

    if (this.mysqlClient) {
      disconnectTasks.push(this.mysqlClient.disconnect())
    }

    await Promise.all(disconnectTasks)
    this.isConnected = false
    logger.info('👋 Hybrid database disconnected')
  }

  getClient() {
    // 返回Redis客户端用于向后兼容
    return this.redisClient?.getClient?.()
  }

  getClientSafe() {
    if (!this.redisClient || !this.isConnected) {
      throw new Error('Hybrid database is not connected')
    }
    return this.redisClient.getClientSafe()
  }

  getPool() {
    // 返回MySQL连接池
    return this.mysqlClient?.getPool?.()
  }

  getPoolSafe() {
    if (!this.mysqlClient || !this.isConnected) {
      throw new Error('MySQL pool is not connected')
    }
    return this.mysqlClient.getPoolSafe()
  }

  // ========== API Key 管理 - 使用MySQL存储 ==========

  async setApiKey(keyId, keyData, hashedKey = null) {
    // API Key主数据存储在MySQL中
    const mysqlResult = await this.mysqlClient.setApiKey(keyId, keyData, hashedKey)

    // 在Redis中缓存，用于快速查找
    if (hashedKey) {
      await this.redisClient.setApiKeyHash(hashedKey, { id: keyId }, 3600) // 1小时缓存
    }

    return mysqlResult
  }

  async getApiKey(keyId) {
    // 先尝试从Redis缓存获取
    const cacheKey = `cache:api_key:${keyId}`
    const cached = await this.redisClient.client?.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    // 从MySQL获取
    const apiKey = await this.mysqlClient.getApiKey(keyId)

    if (apiKey) {
      // 缓存到Redis（1小时）
      await this.redisClient.client?.set(cacheKey, JSON.stringify(apiKey), 'EX', 3600)
    }

    return apiKey
  }

  async deleteApiKey(keyId) {
    // 从MySQL删除
    const result = await this.mysqlClient.deleteApiKey(keyId)

    // 清理Redis缓存
    const cacheKey = `cache:api_key:${keyId}`
    await this.redisClient.client?.del(cacheKey)

    return result
  }

  async getAllApiKeys() {
    return this.mysqlClient.getAllApiKeys()
  }

  async findApiKeyByHash(hashedKey) {
    // 先从Redis缓存查找
    const cached = await this.redisClient.getApiKeyHash(hashedKey)
    if (cached?.id) {
      return this.getApiKey(cached.id)
    }

    // 从MySQL查找
    const apiKey = await this.mysqlClient.findApiKeyByHash(hashedKey)

    if (apiKey) {
      // 更新Redis缓存
      await this.redisClient.setApiKeyHash(hashedKey, { id: apiKey.id }, 3600)
    }

    return apiKey
  }

  // ========== 使用统计 - 混合存储 ==========

  async incrementTokenUsage(...args) {
    // 实时统计存储在Redis中（性能考虑）
    await this.redisClient.incrementTokenUsage(...args)

    // 异步写入MySQL（不阻塞）
    setImmediate(() => {
      this.mysqlClient.incrementTokenUsage(...args).catch((err) => {
        logger.error('Failed to sync token usage to MySQL:', err)
      })
    })
  }

  async getUsageStats(keyId) {
    // 从Redis获取实时统计
    return this.redisClient.getUsageStats(keyId)
  }

  async addUsageRecord(keyId, record, maxRecords = 200) {
    // 使用记录写入MySQL（持久化）
    await this.mysqlClient.addUsageRecord(keyId, record, maxRecords)

    // 同时在Redis中保留最近的记录（快速访问）
    await this.redisClient.addUsageRecord(keyId, record, 50)
  }

  async getUsageRecords(keyId, limit = 50) {
    // 优先从MySQL获取（完整记录）
    try {
      return await this.mysqlClient.getUsageRecords(keyId, limit)
    } catch (error) {
      logger.warn('Failed to get usage records from MySQL, falling back to Redis:', error)
      return this.redisClient.getUsageRecords(keyId, limit)
    }
  }

  // ========== 费用统计 - Redis存储（实时性） ==========

  async getDailyCost(keyId) {
    return this.redisClient.getDailyCost(keyId)
  }

  async incrementDailyCost(keyId, amount) {
    return this.redisClient.incrementDailyCost(keyId, amount)
  }

  async getCostStats(keyId) {
    return this.redisClient.getCostStats(keyId)
  }

  async getWeeklyOpusCost(keyId) {
    return this.redisClient.getWeeklyOpusCost(keyId)
  }

  async incrementWeeklyOpusCost(keyId, amount) {
    return this.redisClient.incrementWeeklyOpusCost(keyId, amount)
  }

  // ========== Claude账户管理 - MySQL存储 ==========

  async setClaudeAccount(accountId, accountData) {
    const result = await this.mysqlClient.setClaudeAccount(accountId, accountData)

    // 清理Redis缓存
    await this.redisClient.client?.del(`cache:claude_account:${accountId}`)

    return result
  }

  async getClaudeAccount(accountId) {
    // 先从Redis缓存获取
    const cacheKey = `cache:claude_account:${accountId}`
    const cached = await this.redisClient.client?.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    // 从MySQL获取
    const account = await this.mysqlClient.getClaudeAccount(accountId)

    if (account) {
      // 缓存到Redis（10分钟）
      await this.redisClient.client?.set(cacheKey, JSON.stringify(account), 'EX', 600)
    }

    return account
  }

  async getAllClaudeAccounts() {
    return this.mysqlClient.getAllClaudeAccounts()
  }

  async deleteClaudeAccount(accountId) {
    const result = await this.mysqlClient.deleteClaudeAccount(accountId)

    // 清理Redis缓存
    await this.redisClient.client?.del(`cache:claude_account:${accountId}`)

    return result
  }

  // ========== Gemini账户管理 - MySQL存储 ==========

  async setGeminiAccount(accountId, accountData) {
    const result = await this.mysqlClient.setGeminiAccount(accountId, accountData)

    // 清理Redis缓存
    await this.redisClient.client?.del(`cache:gemini_account:${accountId}`)

    return result
  }

  async getGeminiAccount(accountId) {
    // 先从Redis缓存获取
    const cacheKey = `cache:gemini_account:${accountId}`
    const cached = await this.redisClient.client?.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    // 从MySQL获取
    const account = await this.mysqlClient.getGeminiAccount(accountId)

    if (account) {
      // 缓存到Redis（10分钟）
      await this.redisClient.client?.set(cacheKey, JSON.stringify(account), 'EX', 600)
    }

    return account
  }

  async getAllGeminiAccounts() {
    return this.mysqlClient.getAllGeminiAccounts()
  }

  async deleteGeminiAccount(accountId) {
    const result = await this.mysqlClient.deleteGeminiAccount(accountId)

    // 清理Redis缓存
    await this.redisClient.client?.del(`cache:gemini_account:${accountId}`)

    return result
  }

  // ========== OpenAI账户管理 - MySQL存储 ==========

  async setOpenAiAccount(accountId, accountData) {
    return this.mysqlClient.setOpenAiAccount(accountId, accountData)
  }

  async getOpenAiAccount(accountId) {
    return this.mysqlClient.getOpenAiAccount(accountId)
  }

  async getAllOpenAIAccounts() {
    return this.mysqlClient.getAllOpenAIAccounts()
  }

  async deleteOpenAiAccount(accountId) {
    return this.mysqlClient.deleteOpenAiAccount(accountId)
  }

  // ========== Droid账户管理 - MySQL存储 ==========

  async setDroidAccount(accountId, accountData) {
    return this.mysqlClient.setDroidAccount(accountId, accountData)
  }

  async getDroidAccount(accountId) {
    return this.mysqlClient.getDroidAccount(accountId)
  }

  async getAllDroidAccounts() {
    return this.mysqlClient.getAllDroidAccounts()
  }

  async deleteDroidAccount(accountId) {
    return this.mysqlClient.deleteDroidAccount(accountId)
  }

  // ========== 会话管理 - Redis存储（临时数据） ==========

  async setSession(sessionId, sessionData, ttl = 86400) {
    return this.redisClient.setSession(sessionId, sessionData, ttl)
  }

  async getSession(sessionId) {
    return this.redisClient.getSession(sessionId)
  }

  async deleteSession(sessionId) {
    return this.redisClient.deleteSession(sessionId)
  }

  // ========== OAuth会话管理 - Redis存储 ==========

  async setOAuthSession(sessionId, sessionData, ttl = 600) {
    return this.redisClient.setOAuthSession(sessionId, sessionData, ttl)
  }

  async getOAuthSession(sessionId) {
    return this.redisClient.getOAuthSession(sessionId)
  }

  async deleteOAuthSession(sessionId) {
    return this.redisClient.deleteOAuthSession(sessionId)
  }

  // ========== Sticky会话映射 - Redis存储 ==========

  async setSessionAccountMapping(sessionHash, accountId, ttl = null) {
    return this.redisClient.setSessionAccountMapping(sessionHash, accountId, ttl)
  }

  async getSessionAccountMapping(sessionHash) {
    return this.redisClient.getSessionAccountMapping(sessionHash)
  }

  async extendSessionAccountMappingTTL(sessionHash) {
    return this.redisClient.extendSessionAccountMappingTTL(sessionHash)
  }

  async deleteSessionAccountMapping(sessionHash) {
    return this.redisClient.deleteSessionAccountMapping(sessionHash)
  }

  // ========== 并发控制 - Redis存储（实时性） ==========

  async incrConcurrency(apiKeyId, requestId, leaseSeconds = null) {
    return this.redisClient.incrConcurrency(apiKeyId, requestId, leaseSeconds)
  }

  async refreshConcurrencyLease(apiKeyId, requestId, leaseSeconds = null) {
    return this.redisClient.refreshConcurrencyLease(apiKeyId, requestId, leaseSeconds)
  }

  async decrConcurrency(apiKeyId, requestId) {
    return this.redisClient.decrConcurrency(apiKeyId, requestId)
  }

  async getConcurrency(apiKeyId) {
    return this.redisClient.getConcurrency(apiKeyId)
  }

  // ========== 账户使用统计 - Redis存储 ==========

  async incrementAccountUsage(...args) {
    return this.redisClient.incrementAccountUsage(...args)
  }

  async getAccountUsageStats(accountId, accountType = null) {
    return this.redisClient.getAccountUsageStats(accountId, accountType)
  }

  async getAllAccountsUsageStats() {
    return this.redisClient.getAllAccountsUsageStats()
  }

  async getAccountDailyCost(accountId) {
    return this.redisClient.getAccountDailyCost(accountId)
  }

  // ========== 系统统计 - Redis存储 ==========

  async getSystemStats() {
    return this.redisClient.getSystemStats()
  }

  async getTodayStats() {
    return this.redisClient.getTodayStats()
  }

  async getSystemAverages() {
    return this.redisClient.getSystemAverages()
  }

  async getRealtimeSystemMetrics() {
    return this.redisClient.getRealtimeSystemMetrics()
  }

  // ========== 重置操作 ==========

  async resetAllUsageStats() {
    // 重置Redis中的统计数据
    await this.redisClient.resetAllUsageStats()

    // 清理MySQL中的相关数据（如果有）
    // await this.mysqlClient.resetAllUsageStats()
  }

  // ========== 清理操作 ==========

  async cleanup() {
    // 并行执行清理操作
    await Promise.all([this.redisClient.cleanup(), this.mysqlClient.cleanup()])
  }

  // ========== API Key哈希索引管理 - Redis专用 ==========

  async setApiKeyHash(hashedKey, keyData, ttl = 0) {
    return this.redisClient.setApiKeyHash(hashedKey, keyData, ttl)
  }

  async getApiKeyHash(hashedKey) {
    return this.redisClient.getApiKeyHash(hashedKey)
  }

  async deleteApiKeyHash(hashedKey) {
    return this.redisClient.deleteApiKeyHash(hashedKey)
  }
}

module.exports = new HybridDatabaseClient()
